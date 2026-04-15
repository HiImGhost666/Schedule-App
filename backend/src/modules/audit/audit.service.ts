import { TransactionClient } from '../../common/transactions/transaction.utils';
import { AuditParams } from './domain/audit.types';
import * as auditRepository from './audit.repository';
import { AppError } from '../../common/errors/app-error';

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

export async function logAuditOrThrow(params: AuditParams, tx: TransactionClient) {
  await auditRepository.createAuditLog(buildAuditCreateData(params), tx);
}

export async function logAudit(params: AuditParams, tx?: TransactionClient) {
  if (tx) {
    await logAuditOrThrow(params, tx);
    return;
  }

  try {
    await auditRepository.createAuditLog(buildAuditCreateData(params));
  } catch {
    // Audit failures must not break the main flow outside atomic transactions
  }
}

export async function listAuditLogs(params: {
  page: number;
  limit: number;
  userId?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
}) {
  const where: any = {};
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = { contains: params.action };
  if (params.entityType) where.entityType = params.entityType;
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from && { gte: params.from }),
      ...(params.to && { lte: params.to }),
    };
  }

  const { logs, total } = await auditRepository.findAuditLogs(where, params.page, params.limit);

  return {
    logs: logs.map(log => ({
      ...log,
      detailsJson: parseDetails(log.detailsJson),
    })),
    total,
  };
}

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
