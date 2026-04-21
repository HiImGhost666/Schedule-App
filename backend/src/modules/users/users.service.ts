import { z } from 'zod';
import { addMinutes } from 'date-fns';
import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/bcrypt';
import { createAppError } from '../../common/errors/error-catalog';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import {
  buildUsersWhere,
  createUserRecord,
  findUserByEmail,
  findUserByDerivedUsername,
  findUserDetailById,
  findUserById,
  findUserIdentityConflict,
  findUserByNormalizedEmailOrDerivedUsername,
  listUserSchedules,
  listUsers,
  updateUserRecord,
} from './users.repository';
import {
  extractUsernameFromEmail,
  normalizeEmail,
  normalizePhone,
} from './domain/user.factory';
import { REALTIME_EVENTS } from '../../realtime/events';
import { publishRealtimeEvent } from '../../realtime/socket';
import { USER_DEPARTMENTS, type UserDepartment } from './users.constants';

const createUserInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
  department: z.enum(USER_DEPARTMENTS).optional(),
  avatarUrl: z.string().url().optional(),
  islandCalendar: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1).nullable().optional(),
  forcePasswordChange: z.boolean().optional(),
});

const updateUserInputSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  department: z.enum(USER_DEPARTMENTS).optional(),
  avatarUrl: z.string().optional(),
  islandCalendar: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1).nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

type ActorContext = { id: string; ipAddress?: string };

/** Normaliza el identificador logístico a formato case-insensitive limpio. */
function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

async function ensureBranchExists(branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) {
    throw createAppError('BAD_REQUEST', 'La sucursal seleccionada no existe');
  }
}

/**
 * @description Crea un usuario validando duplicados (email/username), hashea password y emite evento en tiempo real.
 * @param input @param actor
 */
export async function createUser(input: CreateUserInput, actor?: ActorContext) {
  const parsed = createUserInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createAppError('BAD_REQUEST', 'Datos inválidos', parsed.error.flatten());
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const username = extractUsernameFromEmail(normalizedEmail);

  const existingUser = await findUserByNormalizedEmailOrDerivedUsername(normalizedEmail, username);
  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw createAppError('CONFLICT', 'El email ya está registrado');
    }
    throw createAppError('CONFLICT', 'El username ya está registrado');
  }

  if (parsed.data.branchId) {
    await ensureBranchExists(parsed.data.branchId);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const { password: _password, branchId: createBranchId, forcePasswordChange, ...userData } = parsed.data;

  const user = await executeInTransaction(async (tx) => {
    const user = await createUserRecord({
      ...userData,
      email: normalizedEmail,
      companyPhone: normalizePhone(parsed.data.companyPhone),
      auxiliaryPhone: normalizePhone(parsed.data.auxiliaryPhone),
      passwordHash,
      role: parsed.data.role ?? 'viewer',
      status: parsed.data.status ?? 'active',
      islandCalendar: parsed.data.islandCalendar ?? 'none',
      forcePasswordChange: forcePasswordChange ?? false,
      ...(createBranchId
        ? { branch: { connect: { id: createBranchId } } }
        : {}),
    }, tx);

    if (actor?.id) {
      await logAuditOrThrow({
        userId: actor.id,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: user.id,
        detailsJson: {
          before: null,
          after: sanitizeSnapshot(user),
        },
        ipAddress: actor.ipAddress,
      }, tx);
    }

    return user;
  });

  publishRealtimeEvent(REALTIME_EVENTS.USER_CREATED, {
    entity: 'user',
    action: 'created',
    id: user.id,
    changedAt: new Date().toISOString(),
    actorId: actor?.id ?? null,
    meta: {
      role: user.role,
      status: user.status,
    },
  });

  return user;
}

/**
 * @description Resuelve un usuario priorizando coincidencia por email exacto y con fallback al username derivado.
 * @param identifier
 */
export async function findUserByEmailOrUsername(identifier: string) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (!normalizedIdentifier) return null;

  if (normalizedIdentifier.includes('@')) {
    const user = await findUserByEmail(normalizedIdentifier);
    if (user && !user.email.startsWith('deleted_')) return user;
    return null;
  }

  return findUserByDerivedUsername(normalizedIdentifier);
}

/**
 * @description Obtiene una lista paginada de usuarios filtrada en la base por nombre, rol o estado.
 * @param params
 */
export async function getUsersList(params: { page: number; limit: number; search?: string; email?: string; role?: string; status?: string }) {
  const normalizedEmail = params.email ? normalizeEmail(params.email) : undefined;
  const where = buildUsersWhere(params.search, params.role, params.status, normalizedEmail);
  const [users, total] = await listUsers(where, params.page, params.limit);
  return { users, total };
}

/**
 * @description Lanza error 404 (NOT_FOUND) si el usuario solicitado vía ID no existe.
 * @param userId
 */
export async function getUserById(userId: string) {
  const user = await findUserDetailById(userId);
  if (!user) {
    throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  }
  return user;
}

/** Modifica datos estructurales o de contacto del usuario tras verificar que no invada/colisione identidades. */
export async function updateUser(userId: string, data: {
  name?: string;
  email?: string;
  department?: UserDepartment;
  avatarUrl?: string;
  islandCalendar?: 'tenerife' | 'las_palmas' | 'none';
  companyPhone?: string;
  auxiliaryPhone?: string;
  branchId?: string | null;
}, actor: ActorContext) {
  const parsed = updateUserInputSchema.safeParse(data);
  if (!parsed.success) {
    throw createAppError('BAD_REQUEST', 'Datos inválidos', parsed.error.flatten());
  }

  const user = await findUserById(userId);
  if (!user) throw createAppError('NOT_FOUND', 'Usuario no encontrado');

  if (parsed.data.email && parsed.data.email !== user.email) {
    const normalizedEmail = normalizeEmail(parsed.data.email);
    const username = extractUsernameFromEmail(normalizedEmail);
    const conflict = await findUserIdentityConflict(normalizedEmail, username, userId);

    if (conflict) {
      if (conflict.email === normalizedEmail) {
        throw createAppError('CONFLICT', 'El email ya está en uso');
      }
      throw createAppError('CONFLICT', 'El username ya está registrado');
    }
  }

  if (parsed.data.branchId) {
    await ensureBranchExists(parsed.data.branchId);
  }

  const updated = await executeInTransaction(async (tx) => {
    const normalizedCompanyPhone = normalizePhone(parsed.data.companyPhone);
    const normalizedAuxiliaryPhone = normalizePhone(parsed.data.auxiliaryPhone);

    const { branchId: updateBranchId, ...updateData } = parsed.data;

    const updated = await updateUserRecord(
      userId,
      {
        ...updateData,
        companyPhone: normalizedCompanyPhone,
        auxiliaryPhone: normalizedAuxiliaryPhone,
        ...(parsed.data.email ? { email: normalizeEmail(parsed.data.email) } : {}),
        ...(updateBranchId === undefined
          ? {}
          : updateBranchId
            ? { branch: { connect: { id: updateBranchId } } }
            : { branch: { disconnect: true } }),
      },
      tx,
    );
    await logAuditOrThrow({
      userId: actor.id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: userId,
      detailsJson: {
        before: sanitizeSnapshot(user),
        after: sanitizeSnapshot(updated),
      },
      ipAddress: actor.ipAddress,
    }, tx);
    return updated;
  });

  publishRealtimeEvent(REALTIME_EVENTS.USER_UPDATED, {
    entity: 'user',
    action: 'updated',
    id: userId,
    changedAt: new Date().toISOString(),
    actorId: actor.id,
    meta: {
      role: updated.role,
      status: updated.status,
    },
  });

  return updated;
}

/**
 * @description Altera el estado logístico del usuario (ej. bloqueos), limpiando candados residuales y guardando rastro.
 * @param userId @param status @param actor
 */
export async function changeUserStatus(userId: string, status: 'active' | 'disabled' | 'locked', actor: ActorContext) {
  const user = await findUserById(userId);
  if (!user) throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  if (userId === actor.id) throw createAppError('BAD_REQUEST', 'No puedes cambiar tu propio estado');

  const updateData: Parameters<typeof updateUserRecord>[1] = { status };
  if (status === 'active') {
    updateData.failedAttempts = 0;
    updateData.lockedUntil = null;
  }
  if (status === 'locked') {
    updateData.lockedUntil = addMinutes(new Date(), 99999);
  }

  await executeInTransaction(async (tx) => {
    const updated = await updateUserRecord(userId, updateData, tx);
    await logAuditOrThrow({
      userId: actor.id,
      action: 'USER_STATUS_CHANGE',
      entityType: 'User',
      entityId: userId,
      detailsJson: {
        before: sanitizeSnapshot(user),
        after: sanitizeSnapshot(updated),
      },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  publishRealtimeEvent(REALTIME_EVENTS.USER_STATUS_CHANGED, {
    entity: 'user',
    action: 'statusChanged',
    id: userId,
    changedAt: new Date().toISOString(),
    actorId: actor.id,
    meta: {
      status,
    },
  });
}

/**
 * @description Promueve o degrada los privilegios del usuario de forma atómica.
 * @param userId @param role @param actor
 */
export async function changeUserRole(userId: string, role: 'admin' | 'manager' | 'viewer', actor: ActorContext) {
  const user = await findUserById(userId);
  if (!user) throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  if (userId === actor.id) throw createAppError('BAD_REQUEST', 'No puedes cambiar tu propio rol');

  await executeInTransaction(async (tx) => {
    const updated = await updateUserRecord(userId, { role }, tx);
    await logAuditOrThrow({
      userId: actor.id,
      action: 'USER_ROLE_CHANGE',
      entityType: 'User',
      entityId: userId,
      detailsJson: {
        before: sanitizeSnapshot(user),
        after: sanitizeSnapshot(updated),
      },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  publishRealtimeEvent(REALTIME_EVENTS.USER_ROLE_CHANGED, {
    entity: 'user',
    action: 'roleChanged',
    id: userId,
    changedAt: new Date().toISOString(),
    actorId: actor.id,
    meta: {
      role,
    },
  });
}

/**
 * @description Fuerza el cambio transaccional del hash de acceso aliviando intentos fallidos de la BD.
 * @param userId @param newPassword @param actor
 */
export async function resetUserPassword(userId: string, newPassword: string, actor: ActorContext) {
  const user = await findUserById(userId);
  if (!user) throw createAppError('NOT_FOUND', 'Usuario no encontrado');

  const passwordHash = await hashPassword(newPassword);
  await executeInTransaction(async (tx) => {
    await updateUserRecord(userId, {
      passwordHash,
      forcePasswordChange: true,
      failedAttempts: 0,
      lockedUntil: null,
      status: 'active',
    }, tx);
    await logAuditOrThrow({
      userId: actor.id,
      action: 'RESET_PASSWORD',
      entityType: 'User',
      entityId: userId,
      ipAddress: actor.ipAddress,
    }, tx);
  });
}

/**
 * @description Ejecuta soft-delete (modificando prefix del email) impidiendo nuevos logins pero archivando su historial.
 * @param userId @param actor
 */
export async function deleteUser(userId: string, actor: ActorContext) {
  const user = await findUserById(userId);
  if (!user) throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  if (userId === actor.id) throw createAppError('BAD_REQUEST', 'No puedes eliminar tu propia cuenta');

  await executeInTransaction(async (tx) => {
    const updated = await updateUserRecord(userId, { status: 'disabled', email: `deleted_${Date.now()}_${user.email}` }, tx);
    await logAuditOrThrow({
      userId: actor.id,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: userId,
      detailsJson: {
        before: sanitizeSnapshot(user),
        after: sanitizeSnapshot(updated),
      },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  publishRealtimeEvent(REALTIME_EVENTS.USER_DELETED, {
    entity: 'user',
    action: 'deleted',
    id: userId,
    changedAt: new Date().toISOString(),
    actorId: actor.id,
  });
}

/**
 * @description Recupera en lista turnos y ausencias (Schedules) de este usuario enclavado a dos parámetros cronológicos opcionales.
 * @param userId @param from @param to
 */
export async function getUserSchedules(userId: string, from?: string, to?: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  }

  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (from) {
    fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) {
      throw createAppError('BAD_REQUEST', 'Parámetro from inválido');
    }
  }

  if (to) {
    toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) {
      throw createAppError('BAD_REQUEST', 'Parámetro to inválido');
    }
  }

  if (fromDate && toDate && fromDate > toDate) {
    throw createAppError('BAD_REQUEST', 'El rango de fechas es inválido: from debe ser menor o igual a to');
  }

  return listUserSchedules(userId, fromDate, toDate);
}
