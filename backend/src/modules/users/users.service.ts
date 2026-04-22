import { z } from 'zod';
import { addMinutes } from 'date-fns';
import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/bcrypt';
import { createAppError } from '../../common/errors/error-catalog';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import { BRANCH_CODES } from '../branches/branches.constants';
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
  branchId: z.string().min(1).nullable().optional(),
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
  const { password: _password, branchId: createBranchId, employeeId, forcePasswordChange, ...userData } = parsed.data;

  const user = await executeInTransaction(async (tx) => {
    const user = await createUserRecord({
      ...userData,
      email: normalizedEmail,
      companyPhone: normalizePhone(parsed.data.companyPhone),
      auxiliaryPhone: normalizePhone(parsed.data.auxiliaryPhone),
      passwordHash,
      role: parsed.data.role ?? 'viewer',
      status: parsed.data.status ?? 'active',
      forcePasswordChange: forcePasswordChange ?? true,
      ...(createBranchId
        ? { branch: { connect: { id: createBranchId } } }
        : {}),
      employeeId: employeeId || null,
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
      const employeeId = row.employeeId?.trim() || null;
      const email = normalizeEmail(row.email);
      const name = row.name.trim();

      if (!name) throw new Error('El nombre es obligatorio');
      if (!email) throw new Error('El email es obligatorio');

      const role = row.role.trim();
      const status = row.status.trim();
      const department = row.department.trim().toLowerCase();
      const branchSearch = row.branchId?.trim();
      const companyPhone = row.companyPhone.trim() || undefined;
      const auxiliaryPhone = row.auxiliaryPhone.trim() || undefined;

      if (role && !(USER_ROLES as readonly string[]).includes(role)) throw new Error(`Rol inválido: ${role}`);
      if (status && !(USER_STATUSES as readonly string[]).includes(status)) throw new Error(`Estado inválido: ${status}`);
      if (department && !(USER_DEPARTMENTS as readonly string[]).includes(department)) throw new Error(`Departamento inválido: ${department}`);

      let resolvedBranchId: string | null = null;
      if (branchSearch) {
        const normalizedBranchSearch = branchSearch.toUpperCase();
        const b = allowedBranchCodes.has(normalizedBranchSearch)
          ? branches.find((branch) => branch.code.toUpperCase() === normalizedBranchSearch)
          : branches.find((branch) => branch.name.toLowerCase().includes(branchSearch.toLowerCase()));

        if (!b) {
          throw new Error(`Sucursal inválida: ${branchSearch}. Valores válidos: TFN, GC o nombre de sede`);
        }

        resolvedBranchId = b?.id || null;
      }

      const userRole = (role || undefined) as UserRole | undefined;
      const userStatus = (status || undefined) as UserStatus | undefined;
      const userDept = (department || undefined) as UserDepartment | undefined;

      let existing = null;
      if (employeeId) {
        existing = await prisma.user.findUnique({ where: { employeeId } });
      }
      if (!existing && email) {
        existing = await findUserByEmailOrUsername(email);
      }

      if (!existing) {
        await createUser({
          employeeId,
          name,
          email,
          password: CSV_IMPORT_DEFAULT_PASSWORD.toLowerCase(),
          role: userRole,
          status: userStatus,
          department: userDept,
          branchId: resolvedBranchId,
          companyPhone,
          auxiliaryPhone,
          forcePasswordChange: true
        }, actor);
        created++;
        continue;
      }

      let changed = false;
      const updatePayload: any = {};

      if (employeeId && employeeId !== existing.employeeId) {
        updatePayload.employeeId = employeeId;
        changed = true;
      }

      if (email !== existing.email) {
        updatePayload.email = email;
        changed = true;
      }

      if (name !== existing.name) {
        updatePayload.name = name;
        changed = true;
      }
      
      const existingDepartment = existing.department || undefined;
      if (userDept && userDept !== existingDepartment) {
        updatePayload.department = userDept;
        changed = true;
      }

      const existingCompanyPhone = existing.companyPhone || undefined;
      if (companyPhone && companyPhone !== existingCompanyPhone) {
        updatePayload.companyPhone = companyPhone;
        changed = true;
      }

      const existingAuxiliaryPhone = existing.auxiliaryPhone || undefined;
      if (auxiliaryPhone && auxiliaryPhone !== existingAuxiliaryPhone) {
        updatePayload.auxiliaryPhone = auxiliaryPhone;
        changed = true;
      }

      if (resolvedBranchId !== (existing.branchId || null)) {
        updatePayload.branchId = resolvedBranchId;
        changed = true;
      }

      if (changed) {
        await updateUser(existing.id, updatePayload, actor);
      }

      if (userRole && userRole !== existing.role) {
        await changeUserRole(existing.id, userRole, actor);
        changed = true;
      }

      if (userStatus && userStatus !== existing.status) {
        await changeUserStatus(existing.id, userStatus, actor);
        changed = true;
      }

      if (changed) updated++;
      else unchanged++;

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
