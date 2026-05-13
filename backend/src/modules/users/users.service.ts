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
  type SortOrder,
  type UsersSortBy,
  updateUserRecord,
} from './users.repository';
import {
  extractUsernameFromEmail,
  normalizeEmail,
  normalizePhone,
} from './domain/user.factory';
import { REALTIME_EVENTS } from '../../realtime/events';
import { publishRealtimeEvent } from '../../realtime/socket';
import { ROLE_NAMES } from '../roles/roles.constants';
import { USER_STATUSES, CSV_IMPORT_DEFAULT_PASSWORD, type UserStatus } from './users.constants';
import { type UserCsvRow } from '../../utils/csv';
import {
  buildClearedPasswordChangeFields,
  buildRequiredPasswordChangeFields,
  resolvePasswordChangeState,
} from '../auth/password-change-policy';
import {
  findDepartmentById,
} from '../departments/departments.repository';

async function resolveRoleId(roleId?: string, roleName?: string): Promise<string | null> {
  if (roleId) return roleId;
  if (!roleName) return null;
  const role = await prisma.role.findFirst({ where: { name: roleName }, select: { id: true } });
  return role?.id ?? null;
}

type UserScope = {
  branchId?: string | null;
  departmentId?: string | null;
};

/**
 * Valida que el actor tenga permiso para operar sobre el scope (branchId / departmentId) indicado.
 * - admin → siempre pasa
 * - general_manager → debe coincidir branchId
 * - department_manager → debe ser manager del departmentId indicado
 * - employee → pasa (ya bloqueado por middleware de permisos)
 * - roles desconocidos → pasan libre (extensible)
 */
async function assertUserScope(actorId: string, targetScope: UserScope): Promise<void> {
  if (!targetScope.branchId && !targetScope.departmentId) return;

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { roleId: true, branchId: true },
  });
  if (!actor) throw createAppError('NOT_FOUND', 'Usuario actor no encontrado');
  if (!actor.roleId) return;

  const role = await prisma.role.findUnique({
    where: { id: actor.roleId },
    select: { name: true },
  });

  switch (role?.name) {
    case 'admin':
      return; // admin siempre pasa

    case 'general_manager':
      if (targetScope.branchId && actor.branchId !== targetScope.branchId) {
        throw createAppError('FORBIDDEN', 'No tienes permiso para gestionar usuarios de otra sucursal');
      }
      return;

    case 'department_manager':
      if (targetScope.departmentId) {
        const isManager = await prisma.departmentManager.findUnique({
          where: { departmentId_userId: { departmentId: targetScope.departmentId, userId: actorId } },
        });
        if (!isManager) {
          throw createAppError('FORBIDDEN', 'No tienes permiso para gestionar usuarios de otro departamento');
        }
      }
      return;

    default:
      return; // roles desconocidos pasan libre (extensible)
  }
}

/**
 * Valida restricciones específicas de negocio para department_manager en operaciones de update.
 * El DM no puede cambiar branchId ni role del usuario.
 */
function validateDmUpdateRestrictions(updateData: Record<string, unknown>): void {
  if (updateData.branchId !== undefined) {
    throw createAppError('FORBIDDEN', 'No tienes permiso para cambiar la sucursal de un usuario');
  }
  if (updateData.roleId !== undefined || updateData.role !== undefined) {
    throw createAppError('FORBIDDEN', 'No tienes permiso para cambiar el rol de un usuario');
  }
}


const createUserInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().optional(),
  status: z.enum(USER_STATUSES).optional(),
  departmentId: z.string().optional(),
  departmentIds: z.array(z.string().min(1)).optional(),
  avatarUrl: z.string().url().optional(),

  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1),
  visibleBranchIds: z.array(z.string().min(1)).optional(),
  skillIds: z.array(z.string().min(1)).optional(),
  employeeId: z.string().optional().nullable(),
  forcePasswordChange: z.boolean().optional(),
  role: z.enum(ROLE_NAMES).optional(),
});


const updateUserInputSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  departmentId: z.string().optional().nullable(),
  departmentIds: z.array(z.string().min(1)).optional(),
  avatarUrl: z.string().optional(),

  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1).nullable().optional(),
  visibleBranchIds: z.array(z.string().min(1)).optional(),
  skillIds: z.array(z.string().min(1)).optional(),
  employeeId: z.string().optional().nullable(),
  roleId: z.string().optional(),
  role: z.enum(ROLE_NAMES).optional(),
});


export type CreateUserInput = z.infer<typeof createUserInputSchema>;
type CreateUserOptions = {
  upsertExisting?: boolean;
};

type ActorContext = { id: string; ipAddress?: string };
type UserReadActor = {
  id: string;
  roleName?: string | null;
  branchId?: string | null;
  visibleBranchIds?: string[];
};

/** Normaliza el identificador logístico a formato case-insensitive limpio. */
function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function normalizeEmployeeId(employeeId?: string | null) {
  const normalized = employeeId?.trim().toUpperCase();
  return normalized ? normalized : undefined;
}

function resolvePasswordChangeFields(
  requestedForcePasswordChange: boolean | undefined,
  existingUser?: {
    forcePasswordChange?: boolean | null;
    passwordChangePolicy?: string | null;
    passwordChangeWarnedAt?: Date | null;
    passwordChangeDeadlineAt?: Date | null;
  } | null,
) {
  if (requestedForcePasswordChange === true) {
    return buildRequiredPasswordChangeFields();
  }

  if (existingUser) {
    return {
      forcePasswordChange: resolvePasswordChangeState(existingUser) === 'required',
      passwordChangePolicy: existingUser.passwordChangePolicy ?? 'none',
      passwordChangeWarnedAt: existingUser.passwordChangeWarnedAt ?? null,
      passwordChangeDeadlineAt: existingUser.passwordChangeDeadlineAt ?? null,
    };
  }

  return buildClearedPasswordChangeFields();
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

async function ensureBranchesExist(branchIds: string[]) {
  const uniqueIds = [...new Set(branchIds)];
  if (uniqueIds.length === 0) return;
  const found = await prisma.branch.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } });
  if (found.length !== uniqueIds.length) {
    throw createAppError('BAD_REQUEST', 'Una o varias sucursales visibles no existen');
  }
}

async function ensureSkillsExist(skillIds: string[]) {
  const uniqueIds = [...new Set(skillIds)];
  if (uniqueIds.length === 0) return;
  const found = await prisma.skill.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: { id: true },
  });
  if (found.length !== uniqueIds.length) {
    throw createAppError('BAD_REQUEST', 'Una o varias skills no existen o están inactivas');
  }
}

async function replaceVisibleBranches(userId: string, branchIds: string[], tx: TransactionClient) {
  const uniqueIds = [...new Set(branchIds)];
  await tx.userVisibleBranch.deleteMany({ where: { userId } });
  if (uniqueIds.length === 0) return;
  await tx.userVisibleBranch.createMany({
    data: uniqueIds.map((branchId) => ({ userId, branchId })),
    skipDuplicates: true,
  });
}

async function replaceUserSkills(userId: string, skillIds: string[], actorId: string | undefined, tx: TransactionClient) {
  const uniqueIds = [...new Set(skillIds)];
  await tx.userSkill.deleteMany({ where: { userId } });
  if (uniqueIds.length === 0) return;
  await tx.userSkill.createMany({
    data: uniqueIds.map((skillId) => ({ userId, skillId, assignedById: actorId })),
    skipDuplicates: true,
  });
}

async function ensureDepartmentExists(departmentId: string, branchId?: string | null) {
  const department = await findDepartmentById(departmentId);
  if (!department) {
    throw createAppError('BAD_REQUEST', 'El departamento seleccionado no existe');
  }
  if (branchId && !department.branches?.some((link) => link.branchId === branchId)) {
    throw createAppError('BAD_REQUEST', 'El departamento no pertenece a la sucursal seleccionada');
  }
  return department;
}

function resolveDepartmentId(departmentId?: string | null, departmentIds?: string[]): string | null | undefined {
  if (departmentIds !== undefined) return departmentIds[0] ?? null;
  if (departmentId !== undefined) return departmentId ?? null;
  return undefined;
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
  const selectedDepartmentId = resolveDepartmentId(parsed.data.departmentId, parsed.data.departmentIds) ?? undefined;
  const visibleBranchIds = parsed.data.visibleBranchIds ?? [];
  const skillIds = parsed.data.skillIds ?? [];
  await ensureBranchExists(parsed.data.branchId);
  await ensureBranchesExist(visibleBranchIds);
  await ensureSkillsExist(skillIds);
  if (actor?.id) {
    await assertUserScope(actor.id, { branchId: parsed.data.branchId });
    await Promise.all(visibleBranchIds.map((branchId) => assertUserScope(actor.id!, { branchId })));
  }
  if (selectedDepartmentId) {
    await ensureDepartmentExists(selectedDepartmentId, parsed.data.branchId);
  }
  const {
    password: _password,
    branchId: createBranchId,
    departmentId: _departmentId,
    departmentIds: _departmentIds,
    visibleBranchIds: _visibleBranchIds,
    skillIds: _skillIds,
    forcePasswordChange,
    roleId,
    role,
    ...userData
  } = parsed.data;

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
      roleId: (await resolveRoleId(roleId, role)) ?? identity.existingUser?.roleId ?? (await resolveRoleId(undefined, 'employee')),

      status: parsed.data.status ?? identity.existingUser?.status ?? 'active',
      avatarUrl: parsed.data.avatarUrl ?? identity.existingUser?.avatarUrl ?? null,
      passwordChangedAt: identity.existingUser?.passwordChangedAt ?? new Date(),
      ...resolvePasswordChangeFields(forcePasswordChange, identity.existingUser),
      ...(createBranchId ? { branchId: createBranchId } : {}),
      employeeId: identity.employeeId,
    };

    const user = identity.createNew
      ? await createUserRecord({
          ...baseUserData,
          ...(selectedDepartmentId ? { departmentId: selectedDepartmentId } : {}),
          passwordHash: await hashPassword(parsed.data.password),
        }, tx)
      : await updateUserRecord(identity.existingUser!.id, {
          ...baseUserData,
          ...(selectedDepartmentId !== undefined ? { departmentId: selectedDepartmentId } : {}),
        }, tx);

    await replaceVisibleBranches(user.id, visibleBranchIds, tx);
    await replaceUserSkills(user.id, skillIds, actor?.id, tx);

    const finalUser = (await findUserDetailById(user.id, tx)) ?? user;

    if (actor?.id) {
      await logAuditOrThrow({
        userId: actor.id,
        action: identity.createNew || !shouldUpsertExisting ? 'CREATE_USER' : 'UPDATE_USER',
        entityType: 'User',
        entityId: finalUser.id,
        detailsJson: {
          before: identity.createNew ? null : sanitizeSnapshot(identity.existingUser),
          after: sanitizeSnapshot(finalUser),
        },
        ipAddress: actor.ipAddress,
      }, tx);
    }

    return { user: finalUser, created: identity.createNew };
  });

  publishRealtimeEvent(result.created ? REALTIME_EVENTS.USER_CREATED : REALTIME_EVENTS.USER_UPDATED, {
    entity: 'user',
    action: result.created ? 'created' : 'updated',
    id: result.user.id,
    changedAt: new Date().toISOString(),
    actorId: actor?.id ?? null,
    meta: {
      roleId: result.user.roleId,
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
export async function getUsersList(params: {
  page: number;
  limit: number;
  search?: string;
  email?: string;
  roleId?: string;
  status?: string;
  departmentId?: string;
  employeeId?: string;
  branchId?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: UsersSortBy;
  sortOrder?: SortOrder;
  role?: string;
}, actor?: ActorContext) {
  // Forzar filtros según el rol del actor
  if (actor?.id) {
    const actorUser = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { roleId: true, branchId: true },
    });
    if (actorUser?.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: actorUser.roleId },
        select: { name: true },
      });
      switch (role?.name) {
        case 'general_manager':
          if (actorUser.branchId) {
            params.branchId = actorUser.branchId;
          }
          break;
        // department_manager: podría forzar departmentId en el futuro
        // admin: sin restricciones
      }
    }
  }

  const normalizedEmail = params.email ? normalizeEmail(params.email) : undefined;

  const lastLoginFrom = params.lastLoginFrom ? new Date(params.lastLoginFrom) : undefined;
  const lastLoginTo = params.lastLoginTo ? new Date(params.lastLoginTo) : undefined;
  const createdFrom = params.createdFrom ? new Date(params.createdFrom) : undefined;
  const createdTo = params.createdTo ? new Date(params.createdTo) : undefined;

  const where = buildUsersWhere({
    search: params.search,
    roleId: params.roleId,
    role: params.role,
    status: params.status,

    email: normalizedEmail,
    departmentId: params.departmentId,
    employeeId: params.employeeId,
    branchId: params.branchId,
    lastLoginFrom,
    lastLoginTo,
    createdFrom,
    createdTo,
  });
  const [users, total] = await listUsers(
    where,
    params.page,
    params.limit,
    params.sortBy ?? 'createdAt',
    params.sortOrder ?? 'desc',
  );
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
  const {
    tokenVersion: _tokenVersion,
    failedAttempts: _failedAttempts,
    forcePasswordChange: _forcePasswordChange,
    passwordChangePolicy: _passwordChangePolicy,
    passwordChangeWarnedAt: _passwordChangeWarnedAt,
    passwordChangeDeadlineAt: _passwordChangeDeadlineAt,
    ...safeUser
  } = user;
  return safeUser;
}

/** Modifica datos estructurales o de contacto del usuario tras verificar que no invada/colisione identidades. */
export async function updateUser(userId: string, data: {
  name?: string;
  email?: string;
  departmentId?: string | null;
  departmentIds?: string[];
  avatarUrl?: string;
  companyPhone?: string;
  auxiliaryPhone?: string;
  branchId?: string | null;
  employeeId?: string | null;
  visibleBranchIds?: string[];
  skillIds?: string[];
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
  if (parsed.data.visibleBranchIds) {
    await ensureBranchesExist(parsed.data.visibleBranchIds);
  }
  if (parsed.data.skillIds) {
    await ensureSkillsExist(parsed.data.skillIds);
  }

  const targetBranchId = parsed.data.branchId ?? (user as { branchId?: string | null }).branchId ?? null;
  const selectedDepartmentId = resolveDepartmentId(parsed.data.departmentId, parsed.data.departmentIds);
  await assertUserScope(actor.id, { branchId: targetBranchId, departmentId: selectedDepartmentId ?? undefined });
  if (parsed.data.visibleBranchIds) {
    await Promise.all(parsed.data.visibleBranchIds.map((branchId) => assertUserScope(actor.id, { branchId })));
  }

  // Solo aplicar restricciones de DM si el actor es department_manager
  const actorUser = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { roleId: true },
  });
  if (actorUser?.roleId) {
    const actorRole = await prisma.role.findUnique({
      where: { id: actorUser.roleId },
      select: { name: true },
    });
    if (actorRole?.name === 'department_manager') {
      validateDmUpdateRestrictions(parsed.data as Record<string, unknown>);
    }
  }
  if (selectedDepartmentId) {
    await ensureDepartmentExists(selectedDepartmentId, targetBranchId);
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

  const {
    branchId: updateBranchId,
    departmentId: _departmentId2,
    departmentIds: _departmentIds2,
    visibleBranchIds,
    skillIds,
    employeeId,
    roleId,
    role,
    ...updateData
  } = parsed.data;

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
            ? { branchId: updateBranchId }
            : { branchId: null }),
        ...((roleId || role)
          ? { roleId: await resolveRoleId(roleId, role) }
          : {}),
      } as Parameters<typeof updateUserRecord>[1],
      tx,
    );

    if (selectedDepartmentId !== undefined) {
      await updateUserRecord(userId, { departmentId: selectedDepartmentId ?? null }, tx);
    } else if (updateBranchId !== undefined) {
      // No action needed for department when branch changes
    }

    if (visibleBranchIds !== undefined) {
      await replaceVisibleBranches(userId, visibleBranchIds, tx);
    }
    if (skillIds !== undefined) {
      await replaceUserSkills(userId, skillIds, actor.id, tx);
    }

    const finalUser = (await findUserDetailById(userId, tx)) ?? updated;
    await logAuditOrThrow({
      userId: actor.id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: userId,
      detailsJson: {
        before: sanitizeSnapshot(user),
        after: sanitizeSnapshot(finalUser),
      },
      ipAddress: actor.ipAddress,
    }, tx);
    return finalUser;
  });

  publishRealtimeEvent(REALTIME_EVENTS.USER_UPDATED, {
    entity: 'user',
    action: 'updated',
    id: userId,
    changedAt: new Date().toISOString(),
    actorId: actor.id,
    meta: {
      roleId: updated.roleId,
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
  await assertUserScope(actor.id, { branchId: user.branchId });

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
 * @param userId @param roleInfo @param actor
 */
export async function changeUserRole(userId: string, roleInfo: { roleId?: string; role?: string }, actor: ActorContext) {
  const user = await findUserById(userId);
  if (!user) throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  if (userId === actor.id) throw createAppError('BAD_REQUEST', 'No puedes cambiar tu propio rol');
  await assertUserScope(actor.id, { branchId: user.branchId });

  const roleId = await resolveRoleId(roleInfo.roleId, roleInfo.role);
  if (!roleId) throw createAppError('BAD_REQUEST', 'Rol inválido');

  await executeInTransaction(async (tx) => {

    const updated = await updateUserRecord(userId, { roleId }, tx);
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
      roleId,
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
      passwordChangedAt: new Date(),
      ...buildRequiredPasswordChangeFields(),
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
 * @description Marca al usuario para cambio obligatorio de contraseña sin resetearla manualmente.
 * @param userId @param actor
 */
export async function forceUserPasswordChange(userId: string, actor: ActorContext) {
  const user = await findUserById(userId);
  if (!user) throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  if (userId === actor.id) throw createAppError('BAD_REQUEST', 'No puedes forzar cambio de contraseña sobre tu propia cuenta');

  await executeInTransaction(async (tx) => {
    const updated = await updateUserRecord(userId, buildRequiredPasswordChangeFields(), tx);
    await logAuditOrThrow({
      userId: actor.id,
      action: 'FORCE_PASSWORD_CHANGE',
      entityType: 'User',
      entityId: userId,
      detailsJson: {
        before: sanitizeSnapshot(user),
        after: sanitizeSnapshot(updated),
      },
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
  await assertUserScope(actor.id, { branchId: user.branchId });

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
export async function getUserSchedules(userId: string, actor: UserReadActor, from?: string, to?: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  }

  if (actor.roleName !== 'admin') {
    const visibleBranchIds = [...new Set([actor.branchId, ...(actor.visibleBranchIds ?? [])].filter(Boolean) as string[])];
    if (visibleBranchIds.length === 0) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    if (!user.branchId || !visibleBranchIds.includes(user.branchId)) {
      throw createAppError('FORBIDDEN', 'No tienes permiso para consultar horarios de esa sucursal');
    }
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

  const dbRoles = await prisma.role.findMany({ select: { id: true, name: true } });

  for (const row of rows) {
    try {
      const employeeId = normalizeEmployeeId(row.employeeId);
      const email = normalizeEmail(row.email);
      const name = row.name.trim();

      if (!name) throw new Error('El nombre es obligatorio');
      if (!email) throw new Error('El email es obligatorio');

      const role = row.role.trim().toLowerCase();
      const status = row.status.trim().toLowerCase();
      const department = row.department.trim();
      const branchSearch = row.branchId?.trim();
      const companyPhone = row.companyPhone.trim() || undefined;
      const auxiliaryPhone = row.auxiliaryPhone.trim() || undefined;

      if (!branchSearch) throw new Error('La sucursal es obligatoria');
      if (role && !(ROLE_NAMES as readonly string[]).includes(role)) throw new Error(`Rol inválido: ${role}`);
      if (status && !(USER_STATUSES as readonly string[]).includes(status)) throw new Error(`Estado inválido: ${status}`);

      const normalizedBranchSearch = branchSearch.toUpperCase();
      const branch = allowedBranchCodes.has(normalizedBranchSearch)
        ? branches.find((item) => item.code.toUpperCase() === normalizedBranchSearch)
        : branches.find((item) => item.name.toLowerCase().includes(branchSearch.toLowerCase()));

      if (!branch) {
        throw new Error(`Sucursal inválida: ${branchSearch}. Valores válidos: TFN, GC o nombre de sede`);
      }

      const resolvedBranchId = branch.id;
      let resolvedDepartmentId: string | undefined;
      if (department) {
        const match = await prisma.department.findFirst({
          where: { code: department.toUpperCase() },
          include: { branches: true },
        });
        if (!match) {
          throw new Error(`Departamento inválido: ${department}`);
        }
        if (!match.branches.some((link) => link.branchId === resolvedBranchId)) {
          throw new Error(`Departamento fuera de la sucursal seleccionada: ${department}`);
        }
        resolvedDepartmentId = match.id;
      }
      const userRoleId = role ? dbRoles.find((r: { id: string; name: string }) => r.name === role)?.id : undefined;
      const userStatus = (status || undefined) as UserStatus | undefined;

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

      const targetRoleId = userRoleId ?? existing?.roleId ?? undefined;
      const targetStatus = userStatus ?? (existing?.status as UserStatus | undefined);
      const targetDepartmentId = resolvedDepartmentId ?? ((existing as { departmentId?: string | null } | null)?.departmentId ?? undefined);
      const targetCompanyPhone = companyPhone ?? (existing?.companyPhone ?? undefined);
      const targetAuxiliaryPhone = auxiliaryPhone ?? (existing?.auxiliaryPhone ?? undefined);
      const targetEmployeeId = employeeId ?? normalizedExistingEmployeeId ?? undefined;
      const targetForcePasswordChange = existing
        ? resolvePasswordChangeState(existing) === 'required'
        : true;

      const hasChanges = !existing
        || name !== existing.name
        || email !== existing.email
        || targetRoleId !== existing.roleId
        || targetStatus !== existing.status
        || (targetDepartmentId ?? undefined) !== ((existing as { departmentId?: string | null } | null)?.departmentId ?? undefined)
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
        roleId: targetRoleId,
        status: targetStatus,
        ...(targetDepartmentId ? { departmentId: targetDepartmentId } : {}),
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
