import { z } from 'zod';
import { addMinutes } from 'date-fns';
import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/bcrypt';
import { createAppError } from '../../common/errors/error-catalog';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import type { TransactionClient } from '../../common/transactions/transaction.utils';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import { BRANCH_CODES } from '../branches/branches.constants';
import {
  buildUsersWhere,
  createUserRecord,
  findUserByEmail,
  findUserByDerivedUsername,
  findUserDetailById,
  findUserById,
  findUserByEmployeeId,
  findUserIdentityConflict,
  listUserSchedules,
  listUsers,
  reserveNextEmployeeId,
  updateUserRecord,
} from './users.repository';
import {
  extractUsernameFromEmail,
  normalizeEmail,
  normalizePhone,
} from './domain/user.factory';
import { REALTIME_EVENTS } from '../../realtime/events';
import { publishRealtimeEvent } from '../../realtime/socket';
import { USER_DEPARTMENTS, USER_ROLES, USER_STATUSES, CSV_IMPORT_DEFAULT_PASSWORD, type UserRole, type UserStatus, type UserDepartment } from './users.constants';
import { type UserCsvRow } from '../../utils/csv';

const createUserInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  department: z.enum(USER_DEPARTMENTS).optional(),
  avatarUrl: z.string().url().optional(),

  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1),
  employeeId: z.string().optional().nullable(),
  forcePasswordChange: z.boolean().optional(),
});

const updateUserInputSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  department: z.enum(USER_DEPARTMENTS).optional(),
  avatarUrl: z.string().optional(),

  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1).nullable().optional(),
  employeeId: z.string().optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
type CreateUserOptions = {
  upsertExisting?: boolean;
};

type ActorContext = { id: string; ipAddress?: string };

/** Normaliza el identificador logístico a formato case-insensitive limpio. */
function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function normalizeEmployeeId(employeeId?: string | null) {
  const normalized = employeeId?.trim().toUpperCase();
  return normalized ? normalized : undefined;
}

async function resolveUserUpsertTarget(
  input: { email: string; employeeId?: string | null },
  tx?: TransactionClient,
) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedEmployeeId = normalizeEmployeeId(input.employeeId);
  const username = extractUsernameFromEmail(normalizedEmail);

  const [existingByEmployeeId, existingByEmail] = await Promise.all([
    normalizedEmployeeId ? findUserByEmployeeId(normalizedEmployeeId, tx) : Promise.resolve(null),
    findUserByEmail(normalizedEmail, tx),
  ]);
  const usernameConflict = await findUserByDerivedUsername(username, tx);

  if (usernameConflict) {
    const conflictsWithTarget =
      usernameConflict.id === existingByEmployeeId?.id
      || usernameConflict.id === existingByEmail?.id;

    if (!conflictsWithTarget) {
      throw createAppError('CONFLICT', 'El username ya está registrado');
    }
  }

  if (normalizedEmployeeId) {
    if (existingByEmployeeId && existingByEmail && existingByEmployeeId.id !== existingByEmail.id) {
      throw createAppError('CONFLICT', 'El employeeId ya está registrado en otro usuario');
    }

    const existingEmailEmployeeId = (existingByEmail as { employeeId?: string | null } | null)?.employeeId;

    if (
      existingByEmail
      && existingEmailEmployeeId
      && normalizeEmployeeId(existingEmailEmployeeId) !== normalizedEmployeeId
    ) {
      throw createAppError('CONFLICT', 'El email ya está asociado a otro employeeId');
    }

    return {
      existingUser: existingByEmployeeId ?? existingByEmail,
      employeeId: normalizedEmployeeId,
      createNew: !existingByEmployeeId && !existingByEmail,
      username,
    };
  }

  if (existingByEmail) {
    const existingEmailEmployeeId = (existingByEmail as { employeeId?: string | null }).employeeId;

    return {
      existingUser: existingByEmail,
      employeeId: normalizeEmployeeId(existingEmailEmployeeId) ?? await reserveNextEmployeeId(tx),
      createNew: false,
      username,
    };
  }

  return {
    existingUser: null,
    employeeId: await reserveNextEmployeeId(tx),
    createNew: true,
    username,
  };
}

async function resolveUserCreateTarget(
  input: { email: string; employeeId?: string | null },
  tx?: TransactionClient,
) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedEmployeeId = normalizeEmployeeId(input.employeeId);
  const username = extractUsernameFromEmail(normalizedEmail);

  const [existingByEmail, existingByEmployeeId, existingByUsername] = await Promise.all([
    findUserByEmail(normalizedEmail, tx),
    normalizedEmployeeId ? findUserByEmployeeId(normalizedEmployeeId, tx) : Promise.resolve(null),
    findUserByDerivedUsername(username, tx),
  ]);

  if (existingByEmail) {
    throw createAppError('CONFLICT', 'El email ya está registrado');
  }

  if (existingByEmployeeId) {
    throw createAppError('CONFLICT', 'El employeeId ya está registrado');
  }

  if (existingByUsername) {
    throw createAppError('CONFLICT', 'El username ya está registrado');
  }

  return {
    existingUser: null,
    employeeId: normalizedEmployeeId ?? await reserveNextEmployeeId(tx),
    createNew: true,
    username,
  };
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
export async function createUser(input: CreateUserInput, actor?: ActorContext, options?: CreateUserOptions) {
  const parsed = createUserInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createAppError('BAD_REQUEST', 'Datos inválidos', parsed.error.flatten());
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const normalizedName = parsed.data.name.trim();
  const normalizedEmployeeId = normalizeEmployeeId(parsed.data.employeeId);
  const shouldUpsertExisting = options?.upsertExisting ?? false;
  await ensureBranchExists(parsed.data.branchId);
  const { password: _password, branchId: createBranchId, forcePasswordChange, ...userData } = parsed.data;

  const result = await executeInTransaction(async (tx) => {
    const identity = shouldUpsertExisting
      ? await resolveUserUpsertTarget(
          { email: normalizedEmail, employeeId: normalizedEmployeeId },
          tx,
        )
      : await resolveUserCreateTarget(
          { email: normalizedEmail, employeeId: normalizedEmployeeId },
          tx,
        );

    const baseUserData = {
      ...userData,
      name: normalizedName,
      email: normalizedEmail,
      derivedUsername: identity.username,
      companyPhone: normalizePhone(parsed.data.companyPhone) ?? identity.existingUser?.companyPhone ?? null,
      auxiliaryPhone: normalizePhone(parsed.data.auxiliaryPhone) ?? identity.existingUser?.auxiliaryPhone ?? null,
      role: parsed.data.role ?? identity.existingUser?.role ?? 'viewer',
      status: parsed.data.status ?? identity.existingUser?.status ?? 'active',
      avatarUrl: parsed.data.avatarUrl ?? identity.existingUser?.avatarUrl ?? null,
      department: parsed.data.department ?? identity.existingUser?.department ?? null,
      forcePasswordChange: forcePasswordChange ?? identity.existingUser?.forcePasswordChange ?? false,
      ...(createBranchId ? { branch: { connect: { id: createBranchId } } } : {}),
      employeeId: identity.employeeId,
    };

    const user = identity.createNew
      ? await createUserRecord({
          ...baseUserData,
          passwordHash: await hashPassword(parsed.data.password),
        }, tx)
      : await updateUserRecord(identity.existingUser!.id, baseUserData, tx);

    if (actor?.id) {
      await logAuditOrThrow({
        userId: actor.id,
        action: identity.createNew || !shouldUpsertExisting ? 'CREATE_USER' : 'UPDATE_USER',
        entityType: 'User',
        entityId: user.id,
        detailsJson: {
          before: identity.createNew ? null : sanitizeSnapshot(identity.existingUser),
          after: sanitizeSnapshot(user),
        },
        ipAddress: actor.ipAddress,
      }, tx);
    }

    return { user, created: identity.createNew };
  });

  publishRealtimeEvent(result.created ? REALTIME_EVENTS.USER_CREATED : REALTIME_EVENTS.USER_UPDATED, {
    entity: 'user',
    action: result.created ? 'created' : 'updated',
    id: result.user.id,
    changedAt: new Date().toISOString(),
    actorId: actor?.id ?? null,
    meta: {
      role: result.user.role,
      status: result.user.status,
    },
  });

  return result.user;
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
  companyPhone?: string;
  auxiliaryPhone?: string;
  branchId?: string | null;
  employeeId?: string | null;
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

  if (parsed.data.employeeId !== undefined) {
    const normalizedEmployeeId = normalizeEmployeeId(parsed.data.employeeId);
    const currentEmployeeId = normalizeEmployeeId((user as { employeeId?: string | null }).employeeId);

    if (normalizedEmployeeId !== currentEmployeeId) {
      throw createAppError('BAD_REQUEST', 'El employeeId se asigna automáticamente y no puede modificarse manualmente');
    }
  }

  const updated = await executeInTransaction(async (tx) => {
    const normalizedCompanyPhone = normalizePhone(parsed.data.companyPhone);
    const normalizedAuxiliaryPhone = normalizePhone(parsed.data.auxiliaryPhone);

    const { branchId: updateBranchId, employeeId, ...updateData } = parsed.data;

    const updated = await updateUserRecord(
      userId,
      {
        ...updateData,
        companyPhone: normalizedCompanyPhone,
        auxiliaryPhone: normalizedAuxiliaryPhone,
        employeeId: employeeId !== undefined ? employeeId : undefined,
        ...(parsed.data.email
          ? {
              email: normalizeEmail(parsed.data.email),
              derivedUsername: extractUsernameFromEmail(normalizeEmail(parsed.data.email)),
            }
          : {}),
        ...(updateBranchId === undefined
          ? {}
          : updateBranchId
            ? { branch: { connect: { id: updateBranchId } } }
            : { branch: { disconnect: true } }),
      } as Parameters<typeof updateUserRecord>[1],
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
    const newEmail = `deleted_${Date.now()}_${user.email}`;
    const updated = await updateUserRecord(userId, { status: 'disabled', email: newEmail, derivedUsername: newEmail }, tx);
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

export async function importUsersCsv(rows: UserCsvRow[], actor: ActorContext) {
  if (!rows.length) {
    throw createAppError('BAD_REQUEST', 'El CSV no contiene filas para importar');
  }

  const allowedBranchCodes: Set<string> = new Set(Object.values(BRANCH_CODES));
  const branches = await prisma.branch.findMany({ select: { id: true, code: true, name: true } });
  const rejectedRows: Array<UserCsvRow & { reason: string }> = [];
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    try {
      const employeeId = normalizeEmployeeId(row.employeeId);
      const email = normalizeEmail(row.email);
      const name = row.name.trim();

      if (!name) throw new Error('El nombre es obligatorio');
      if (!email) throw new Error('El email es obligatorio');

      const role = row.role.trim().toLowerCase();
      const status = row.status.trim().toLowerCase();
      const department = row.department.trim().toLowerCase();
      const branchSearch = row.branchId?.trim();
      const companyPhone = row.companyPhone.trim() || undefined;
      const auxiliaryPhone = row.auxiliaryPhone.trim() || undefined;

      if (!branchSearch) throw new Error('La sucursal es obligatoria');
      if (role && !(USER_ROLES as readonly string[]).includes(role)) throw new Error(`Rol inválido: ${role}`);
      if (status && !(USER_STATUSES as readonly string[]).includes(status)) throw new Error(`Estado inválido: ${status}`);
      if (department && !(USER_DEPARTMENTS as readonly string[]).includes(department)) throw new Error(`Departamento inválido: ${department}`);

      const normalizedBranchSearch = branchSearch.toUpperCase();
      const branch = allowedBranchCodes.has(normalizedBranchSearch)
        ? branches.find((item) => item.code.toUpperCase() === normalizedBranchSearch)
        : branches.find((item) => item.name.toLowerCase().includes(branchSearch.toLowerCase()));

      if (!branch) {
        throw new Error(`Sucursal inválida: ${branchSearch}. Valores válidos: TFN, GC o nombre de sede`);
      }

      const resolvedBranchId = branch.id;
      const userRole = (role || undefined) as UserRole | undefined;
      const userStatus = (status || undefined) as UserStatus | undefined;
      const userDept = (department || undefined) as UserDepartment | undefined;

      const [existingByEmployeeId, existingByEmail] = await Promise.all([
        employeeId ? findUserByEmployeeId(employeeId) : Promise.resolve(null),
        findUserByEmail(email),
      ]);

      if (employeeId && existingByEmployeeId && existingByEmail && existingByEmployeeId.id !== existingByEmail.id) {
        throw new Error('El employeeId ya está registrado en otro usuario');
      }

      if (
        employeeId
        && existingByEmail
        && (existingByEmail as { employeeId?: string | null }).employeeId
        && normalizeEmployeeId((existingByEmail as { employeeId?: string | null }).employeeId) !== employeeId
      ) {
        throw new Error('El email ya está asociado a otro employeeId');
      }

      const existing = existingByEmployeeId ?? existingByEmail;

      const normalizedExistingEmployeeId = normalizeEmployeeId((existing as { employeeId?: string | null } | null)?.employeeId);
      const shouldGenerateEmployeeId = !employeeId && !normalizedExistingEmployeeId;

      const targetRole = userRole ?? (existing?.role as UserRole | undefined);
      const targetStatus = userStatus ?? (existing?.status as UserStatus | undefined);
      const targetDepartment = userDept ?? ((existing?.department ?? undefined) as UserDepartment | undefined);
      const targetCompanyPhone = companyPhone ?? (existing?.companyPhone ?? undefined);
      const targetAuxiliaryPhone = auxiliaryPhone ?? (existing?.auxiliaryPhone ?? undefined);
      const targetEmployeeId = employeeId ?? normalizedExistingEmployeeId ?? undefined;
      const targetForcePasswordChange = existing ? !!existing.forcePasswordChange : true;

      const hasChanges = !existing
        || name !== existing.name
        || email !== existing.email
        || targetRole !== existing.role
        || targetStatus !== existing.status
        || (targetDepartment ?? undefined) !== (existing.department ?? undefined)
        || (targetCompanyPhone ?? undefined) !== (existing.companyPhone ?? undefined)
        || (targetAuxiliaryPhone ?? undefined) !== (existing.auxiliaryPhone ?? undefined)
        || (existing.branchId ?? null) !== resolvedBranchId
        || (targetEmployeeId ?? undefined) !== (normalizeEmployeeId((existing as { employeeId?: string | null } | null)?.employeeId) ?? undefined)
        || shouldGenerateEmployeeId;

      if (!hasChanges) {
        unchanged++;
        continue;
      }

      await createUser({
        employeeId,
        name,
        email,
        password: CSV_IMPORT_DEFAULT_PASSWORD,
        role: targetRole,
        status: targetStatus,
        department: targetDepartment,
        branchId: resolvedBranchId,
        companyPhone: targetCompanyPhone,
        auxiliaryPhone: targetAuxiliaryPhone,
        forcePasswordChange: targetForcePasswordChange,
        ...(targetEmployeeId ? { employeeId: targetEmployeeId } : {}),
      }, actor, { upsertExisting: true });

      if (!existing) {
        created++;
        continue;
      }

      updated++;

    } catch (err: any) {
      rejectedRows.push({
        ...row,
        reason: err.message || 'Error desconocido'
      });
    }
  }

  return {
    total: rows.length,
    created,
    updated,
    unchanged,
    failed: rejectedRows.length,
    rejectedRows
  };
}
