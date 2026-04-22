import { AuditParams, IRREVERSIBLE_ACTIONS } from './domain/audit.types';
import { Prisma } from '@prisma/client';
import * as auditRepository from './audit.repository';
import * as scheduleRepository from '../schedules/schedules.repository';
import * as userRepository from '../users/users.repository';
import { AppError } from '../../common/errors/app-error';
import { executeInTransaction, TransactionClient } from '../../common/transactions/transaction.utils';
import { REALTIME_EVENTS } from '../../realtime/events';
import { publishRealtimeEvent } from '../../realtime/socket';

export * from './domain/audit.types';

function buildAuditCreateData(params: AuditParams) {
  return {
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    detailsJson: params.detailsJson ? JSON.stringify(params.detailsJson) : undefined,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };
}

function parseDetails(detailsJson: string | null) {
  if (!detailsJson) return null;
  try {
    return JSON.parse(detailsJson);
  } catch {
    return detailsJson;
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIrreversibleAction(action: string): action is (typeof IRREVERSIBLE_ACTIONS)[number] {
  return (IRREVERSIBLE_ACTIONS as readonly string[]).includes(action);
}

/** Desinfecta los payloads de auditoría eliminando campos comprometedores (passwords, tokens) mediante recorrido recursivo. */
export function sanitizeSnapshot<T>(data: T): T {
  if (!data) return data;
  const sanitized = JSON.parse(JSON.stringify(data)) as unknown; // Clonación profunda simple
  
  const sensitiveFields = ['passwordHash', 'password', 'token', 'refreshToken'];
  
  const removeSensitive = (obj: unknown): void => {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        removeSensitive(item);
      }
      return;
    }

    if (!isObjectRecord(obj)) return;

    for (const key of Object.keys(obj)) {
      if (sensitiveFields.includes(key)) {
        delete obj[key];
      } else {
        removeSensitive(obj[key]);
      }
    }
  };

  removeSensitive(sanitized);
  return sanitized as T;
}

/**
 * @description Inserta un log de auditoría forzando su permanencia (fail-fast) dentro de un bloque transaccional Prisma.
 * @param params @param tx
 */
export async function logAuditOrThrow(params: AuditParams, tx: TransactionClient) {
  const created = await auditRepository.createAuditLog(buildAuditCreateData(params), tx);
  
  publishRealtimeEvent(REALTIME_EVENTS.AUDIT_CREATED, {
    entity: 'audit',
    action: 'created',
    id: created.id,
    changedAt: created.createdAt.toISOString(),
    actorId: created.userId,
    meta: {
      action: created.action,
      entityType: created.entityType,
      entityId: created.entityId,
    },
  });
}

/**
 * @description Emite un registro de auditoría flexible: si falla fuera de una transacción, no corrompe la ejecución principal subyacente.
 * @param params @param tx
 */
export async function logAudit(params: AuditParams, tx?: TransactionClient) {
  if (tx) {
    await logAuditOrThrow(params, tx);
    return;
  }

  try {
    const created = await auditRepository.createAuditLog(buildAuditCreateData(params));
    publishRealtimeEvent(REALTIME_EVENTS.AUDIT_CREATED, {
      entity: 'audit',
      action: 'created',
      id: created.id,
      changedAt: created.createdAt.toISOString(),
      actorId: created.userId,
      meta: {
        action: created.action,
        entityType: created.entityType,
        entityId: created.entityId,
      },
    });
  } catch {
    // Audit failures must not break the main flow outside atomic transactions
  }
}

/** Paginador del historial que soporta filtros complejos (fechas, entidad, actor y flag reversible/irreversible). */
export async function listAuditLogs(params: {
  page: number;
  limit: number;
  userId?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  reversible?: 'true' | 'false';
}) {
  const auditWhere: auditRepository.AuditLogWhere = {};
  if (params.userId) auditWhere.userId = params.userId;
  const actionFilter: Prisma.StringFilter = {};
  if (params.action) actionFilter.contains = params.action;
  if (params.entityType) auditWhere.entityType = params.entityType;
  if (params.from || params.to) {
    auditWhere.createdAt = {
      ...(params.from && { gte: params.from }),
      ...(params.to && { lte: params.to }),
    };
  }
  // Filtros de pestaña: reversible vs irreversible
  if (params.reversible === 'true') {
    actionFilter.notIn = [...IRREVERSIBLE_ACTIONS];
  } else if (params.reversible === 'false') {
    delete actionFilter.contains;
    actionFilter.in = [...IRREVERSIBLE_ACTIONS];
  }

  if (Object.keys(actionFilter).length > 0) {
    auditWhere.action = actionFilter;
  }

  const { logs, total } = await auditRepository.findAuditLogs(auditWhere, params.page, params.limit);

  return {
    logs: logs.map(log => ({
      ...log,
      detailsJson: parseDetails(log.detailsJson),
    })),
    total,
  };
}

/**
 * @description Retorna el log decodificado y sanitizado de la base de datos o revienta (404) si no existe.
 * @param id
 */
export async function getAuditLogById(id: string) {
  const log = await auditRepository.findAuditLogById(id);
  if (!log) {
    throw new AppError('NOT_FOUND', 404, 'Registro de auditoría no encontrado');
  }

  return {
    ...log,
    detailsJson: parseDetails(log.detailsJson),
  };
}

/**
 * @description Restaura un evento manipulado (creación/edición) inyectando el snapshot state-before dentro del contenedor. Emite su propio Audit.
 * @param logId @param actorId @param ipAddress
 */
export async function rollbackAudit(logId: string, actorId: string, ipAddress?: string) {
  const log = await auditRepository.findAuditLogById(logId);
  if (!log) throw new AppError('NOT_FOUND', 404, 'Log no encontrado');

  const details = parseDetails(log.detailsJson);
  if (!details || !details.before) {
    if (log.action.startsWith('CREATE')) {
      // Create is a special case where "before" is null, but we can rollback by deleting.
    } else {
      throw new AppError('BAD_REQUEST', 400, 'Este log no contiene información suficiente para un rollback (falta snapshot "before")');
    }
  }

  // Verificar si la acción es irreversible o ya ha sido revertida
  if (isIrreversibleAction(log.action)) {
    throw new AppError('BAD_REQUEST', 400, `La acción "${log.action}" no puede ser revertida`);
  }

  if ((log as any).rolledBackAt) {
    throw new AppError('BAD_REQUEST', 400, 'Este cambio ya ha sido revertido');
  }

  return executeInTransaction(async (tx) => {
    const { entityId, entityType, action } = log;
    if (!entityId) throw new AppError('INTERNAL_ERROR', 500, 'El log no tiene un entityId asociado');

    let rollbackResult;

    // Lógica por tipo de entidad y acción
    if (entityType === 'Schedule') {
      if (action === 'CREATE_SCHEDULE') {
        await scheduleRepository.deleteSchedule(entityId, tx);
      } else if (action === 'UPDATE_SCHEDULE' || action === 'DELETE_SCHEDULE') {
        const { assigneeIds, ...data } = details.before;
        // Restaurar base
        rollbackResult = await tx.schedule.upsert({
          where: { id: entityId },
          create: { ...data, id: entityId },
          update: data,
        });
        // Restaurar asignaciones
        if (assigneeIds) {
          await scheduleRepository.replaceAssignments(entityId, assigneeIds, tx);
        }

        // Emitir evento de tiempo real para que Calendario se actualice
        publishRealtimeEvent(REALTIME_EVENTS.SCHEDULE_UPDATED, {
          entity: 'schedule',
          action: 'updated',
          id: entityId,
          changedAt: new Date().toISOString(),
          actorId,
        });
      }
    } else if (entityType === 'User') {
      if (action === 'CREATE_USER') {
        // En este sistema los usuarios se deshabilitan, pero un rollback de creación podría ser un borrado real o deshabilitado.
        // Optamos por deshabilitarlo para evitar romper integridad referencial si ya se usó.
        const targetEmail = details.after?.email || details.email || 'unknown';
        rollbackResult = await userRepository.updateUserRecord(entityId, { status: 'disabled', email: `revoked_${Date.now()}_${targetEmail}` }, tx);

        publishRealtimeEvent(REALTIME_EVENTS.USER_DELETED, {
          entity: 'user',
          action: 'deleted',
          id: entityId,
          changedAt: new Date().toISOString(),
          actorId,
        });
      } else {
        // UPDATE_USER, USER_STATUS_CHANGE, USER_ROLE_CHANGE, DELETE_USER
        const data = details.before;
        rollbackResult = await userRepository.updateUserRecord(entityId, data, tx);

        publishRealtimeEvent(REALTIME_EVENTS.USER_UPDATED, {
          entity: 'user',
          action: 'updated',
          id: entityId,
          changedAt: new Date().toISOString(),
          actorId,
        });
      }
    } else if (entityType === 'WebhookConfig') {
      if (action === 'CREATE_WEBHOOK') {
        rollbackResult = await tx.webhookConfig.delete({ where: { id: entityId } });
      } else {
        const { id, createdAt, updatedAt, ...data } = details.before;
        rollbackResult = await tx.webhookConfig.upsert({
          where: { id: entityId },
          create: { ...details.before, id: entityId },
          update: data,
        });
      }
    } else {
      throw new AppError('BAD_REQUEST', 400, `Rollback no implementado para la entidad: ${entityType}`);
    }

    // Marcar el registro original como revertido
    // Al usar Prisma.AuditLog.update, @updatedAt se disparará automáticamente,
    // desplazando el registro a la parte superior del listado (si se ordena por updatedAt: desc)
    await tx.auditLog.update({
      where: { id: logId },
      data: {
        rolledBackAt: new Date(),
        rolledBackByUserId: actorId,
      },
    });

    return rollbackResult;
  });
}
