import { Prisma } from '@prisma/client';
import { createAppError } from '../../common/errors/error-catalog';
import { logAudit } from '../audit/audit.service';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import {
  countActiveBranches,
  countSchedulesByBranch,
  createBranchHolidayRecord,
  createBranchRecord,
  deleteBranchHolidayRecord,
  findBranchByCode,
  findBranchById,
  findBranchCodeConflict,
  findBranchHolidayByIdAndBranch,
  findBranchHolidaysByIds,
  findBranchHolidays,
  findBranches,
  hardDeleteBranchRecord,
  softDeleteBranchRecord,
  deleteBranchHolidaysByIds,
  updateBranchHolidaysByIds,
  updateBranchHolidayRecord,
  updateBranchRecord,
} from './branches.repository';
import { ensureDateRange, normalizeBranchCode, normalizeHolidayDate, resolveHolidayScope } from './domain/branches.rules';
import {
  BranchActor,
  BulkHolidayActionInput,
  GroupedBranchHoliday,
  BranchHolidayInput,
  BranchInput,
  ListBranchHolidaysParams,
  ListBranchesParams,
} from './domain/branches.types';

async function ensureBranch(branchId: string) {
  const branch = await findBranchById(branchId);
  if (!branch) throw createAppError('NOT_FOUND', 'Sucursal no encontrada');
  return branch;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
  );
}

type BranchHolidayWithBranch = Awaited<ReturnType<typeof findBranchHolidays>>[number];

function buildGroupedHolidayKey(holiday: BranchHolidayWithBranch) {
  return [
    holiday.date.toISOString().slice(0, 10),
    holiday.name.trim().toLowerCase(),
    holiday.type,
    holiday.isPartial ? '1' : '0',
  ].join('|');
}

function groupBranchHolidays(
  holidays: BranchHolidayWithBranch[],
): GroupedBranchHoliday[] {
  const groupedMap = new Map<string, GroupedBranchHoliday>();

  holidays.forEach((holiday) => {
    const key = buildGroupedHolidayKey(holiday);
    const current = groupedMap.get(key);

    if (!current) {
      groupedMap.set(key, {
        id: `shared-${key}`,
        branchId: 'all',
        date: holiday.date,
        originalDate: holiday.originalDate,
        name: holiday.name,
        type: holiday.type,
        scope: holiday.scope as GroupedBranchHoliday['scope'],
        isPartial: holiday.isPartial,
        isActive: holiday.isActive,
        createdAt: holiday.createdAt,
        updatedAt: holiday.updatedAt,
        branch: null,
        holidayIds: [holiday.id],
        branches: holiday.branch ? [{ ...holiday.branch }] : [],
        sharedCount: 1,
      });
      return;
    }

    current.holidayIds.push(holiday.id);
    current.sharedCount += 1;
    if (holiday.updatedAt > current.updatedAt) {
      current.updatedAt = holiday.updatedAt;
    }
    if (holiday.createdAt < current.createdAt) {
      current.createdAt = holiday.createdAt;
    }
    if (holiday.branch && !current.branches.some((branch) => branch.id === holiday.branch.id)) {
      current.branches.push({ ...holiday.branch });
    }
  });

  return [...groupedMap.values()].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    return a.name.localeCompare(b.name, 'es');
  });
}

export async function listBranches(params: ListBranchesParams) {
  return findBranches(params.includeInactive ? {} : { isActive: true });
}

export async function createBranch(data: BranchInput, actor: BranchActor) {
  const code = normalizeBranchCode(data.code);

  const existing = await findBranchByCode(code);
  if (existing) {
    throw createAppError('CONFLICT', 'Ya existe una sucursal con ese código');
  }

  const branch = await createBranchRecord({
    ...data,
    code,
    countryCode: data.countryCode?.toUpperCase() ?? 'ES',
    timezone: data.timezone ?? 'Europe/Madrid',
  });

  await logAudit({
    userId: actor.id,
    action: 'CREATE_BRANCH',
    entityType: 'Branch',
    entityId: branch.id,
    detailsJson: { name: branch.name, code: branch.code },
    ipAddress: actor.ipAddress,
  });

  return branch;
}

export async function updateBranch(branchId: string, data: Partial<BranchInput>, actor: BranchActor) {
  await ensureBranch(branchId);

  if (data.code) {
    const code = normalizeBranchCode(data.code);
    const conflict = await findBranchCodeConflict(code, branchId);

    if (conflict) {
      throw createAppError('CONFLICT', 'Ya existe una sucursal con ese código');
    }

    data.code = code;
  }

  const updated = await updateBranchRecord(branchId, {
    ...data,
    ...(data.countryCode ? { countryCode: data.countryCode.toUpperCase() } : {}),
  });

  await logAudit({
    userId: actor.id,
    action: 'UPDATE_BRANCH',
    entityType: 'Branch',
    entityId: branchId,
    detailsJson: data,
    ipAddress: actor.ipAddress,
  });

  return updated;
}

export async function deleteBranch(branchId: string, actor: BranchActor) {
  const branch = await ensureBranch(branchId);

  const activeBranches = await countActiveBranches();
  if (branch.isActive && activeBranches <= 1) {
    throw createAppError('BAD_REQUEST', 'Debe existir al menos una sucursal activa');
  }

  await softDeleteBranchRecord(branchId);

  await logAudit({
    userId: actor.id,
    action: 'DELETE_BRANCH',
    entityType: 'Branch',
    entityId: branchId,
    detailsJson: { name: branch.name, code: branch.code },
    ipAddress: actor.ipAddress,
  });
}

export async function hardDeleteBranch(branchId: string, actor: BranchActor) {
  const branch = await ensureBranch(branchId);

  const activeBranches = await countActiveBranches();
  if (branch.isActive && activeBranches <= 1) {
    throw createAppError('BAD_REQUEST', 'Debe existir al menos una sucursal activa');
  }

  const linkedSchedules = await countSchedulesByBranch(branchId);
  if (linkedSchedules > 0) {
    throw createAppError(
      'BAD_REQUEST',
      'No se puede eliminar definitivamente: la sucursal tiene turnos asociados. Desactívala o reasigna/elimina sus turnos primero.',
      { linkedSchedules }
    );
  }

  await hardDeleteBranchRecord(branchId);

  await logAudit({
    userId: actor.id,
    action: 'HARD_DELETE_BRANCH',
    entityType: 'Branch',
    entityId: branchId,
    detailsJson: { name: branch.name, code: branch.code },
    ipAddress: actor.ipAddress,
  });
}

export async function listBranchHolidays(
  branchId: string,
  params: ListBranchHolidaysParams,
) {
  if (branchId !== 'all') {
    await ensureBranch(branchId);
  }

  const { fromDate, toDate } = ensureDateRange(params.from, params.to);

  let dateFilter: Prisma.DateTimeFilter | undefined;
  if (params.year) {
    const yearStart = new Date(params.year, 0, 1);
    const yearEnd = new Date(params.year, 11, 31, 23, 59, 59, 999);
    dateFilter = { gte: yearStart, lte: yearEnd };
  }

  if (fromDate || toDate) {
    dateFilter = {
      ...(dateFilter ?? {}),
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  const holidays = await findBranchHolidays({
    ...(branchId !== 'all' ? { branchId } : {}),
    ...(params.includeInactive ? {} : { isActive: true }),
    ...(dateFilter ? { date: dateFilter } : {}),
  });

  if (branchId === 'all' && params.groupShared) {
    return groupBranchHolidays(holidays);
  }

  return holidays;
}

export async function createBranchHoliday(branchId: string, data: BranchHolidayInput, actor: BranchActor) {
  const branch = await ensureBranch(branchId);
  if (!branch.isActive) throw createAppError('BAD_REQUEST', 'La sucursal está desactivada');

  try {
    const holiday = await createBranchHolidayRecord({
      branchId,
      date: normalizeHolidayDate(data.date),
      name: data.name.trim(),
      type: data.type,
      scope: resolveHolidayScope(data)!,
    });

    await logAudit({
      userId: actor.id,
      action: 'CREATE_BRANCH_HOLIDAY',
      entityType: 'BranchHoliday',
      entityId: holiday.id,
      detailsJson: {
        branchId,
        date: holiday.date.toISOString(),
        name: holiday.name,
        type: holiday.type,
      },
      ipAddress: actor.ipAddress,
    });

    return holiday;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createAppError('CONFLICT', 'Ya existe un festivo con esa fecha y nombre en esta sucursal');
    }
    throw error;
  }
}

export async function updateBranchHoliday(
  branchId: string,
  holidayId: string,
  data: Partial<BranchHolidayInput>,
  actor: BranchActor,
) {
  await ensureBranch(branchId);

  const existing = await findBranchHolidayByIdAndBranch(holidayId, branchId);
  if (!existing) throw createAppError('NOT_FOUND', 'Festivo no encontrado');

  try {
    const nextScope = resolveHolidayScope(data);

    const updated = await updateBranchHolidayRecord(holidayId, {
      ...(data.date ? { date: normalizeHolidayDate(data.date) } : {}),
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.type ? { type: data.type } : {}),
      ...(nextScope ? { scope: nextScope } : {}),
    });

    await logAudit({
      userId: actor.id,
      action: 'UPDATE_BRANCH_HOLIDAY',
      entityType: 'BranchHoliday',
      entityId: holidayId,
      detailsJson: data,
      ipAddress: actor.ipAddress,
    });

    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createAppError('CONFLICT', 'Ya existe un festivo con esa fecha y nombre en esta sucursal');
    }
    throw error;
  }
}

export async function deleteBranchHoliday(branchId: string, holidayId: string, actor: BranchActor) {
  await ensureBranch(branchId);

  const existing = await findBranchHolidayByIdAndBranch(holidayId, branchId);
  if (!existing) throw createAppError('NOT_FOUND', 'Festivo no encontrado');

  await deleteBranchHolidayRecord(holidayId);

  await logAudit({
    userId: actor.id,
    action: 'DELETE_BRANCH_HOLIDAY',
    entityType: 'BranchHoliday',
    entityId: holidayId,
    detailsJson: { branchId, date: existing.date.toISOString(), name: existing.name },
    ipAddress: actor.ipAddress,
  });
}

export async function bulkUpdateSharedHolidays(
  data: BulkHolidayActionInput,
  actor: BranchActor,
) {
  const uniqueIds = [...new Set(data.holidayIds)];
  const nextScope = resolveHolidayScope(data);

  await executeInTransaction(async (tx) => {
    const holidays = await findBranchHolidaysByIds(uniqueIds, tx);
    if (holidays.length !== uniqueIds.length) {
      throw createAppError('NOT_FOUND', 'Uno o más festivos no existen');
    }

    await updateBranchHolidaysByIds(
      uniqueIds,
      {
        ...(data.date ? { date: normalizeHolidayDate(data.date) } : {}),
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(nextScope ? { scope: nextScope } : {}),
        ...(data.isPartial !== undefined ? { isPartial: data.isPartial } : {}),
      },
      tx,
    );

    await logAudit({
      userId: actor.id,
      action: 'BULK_UPDATE_BRANCH_HOLIDAY',
      entityType: 'BranchHoliday',
      entityId: 'all',
      detailsJson: {
        holidayIds: uniqueIds,
        updates: {
          ...(data.date ? { date: normalizeHolidayDate(data.date).toISOString() } : {}),
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.type ? { type: data.type } : {}),
          ...(nextScope ? { scope: nextScope } : {}),
          ...(data.isPartial !== undefined ? { isPartial: data.isPartial } : {}),
        },
      },
      ipAddress: actor.ipAddress,
    }, tx);
  });
}

export async function bulkDeleteSharedHolidays(
  holidayIds: string[],
  actor: BranchActor,
) {
  const uniqueIds = [...new Set(holidayIds)];

  await executeInTransaction(async (tx) => {
    const holidays = await findBranchHolidaysByIds(uniqueIds, tx);
    if (holidays.length !== uniqueIds.length) {
      throw createAppError('NOT_FOUND', 'Uno o más festivos no existen');
    }

    await deleteBranchHolidaysByIds(uniqueIds, tx);

    await logAudit({
      userId: actor.id,
      action: 'BULK_DELETE_BRANCH_HOLIDAY',
      entityType: 'BranchHoliday',
      entityId: 'all',
      detailsJson: {
        holidayIds: uniqueIds,
        deletedCount: uniqueIds.length,
      },
      ipAddress: actor.ipAddress,
    }, tx);
  });
}
