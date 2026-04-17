import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { createAppError } from '../../common/errors/error-catalog';
import { logAudit } from '../audit/audit.service';

type Actor = { id: string; ipAddress?: string };

type BranchInput = {
  name: string;
  code: string;
  address?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  timezone?: string;
};

type BranchHolidayInput = {
  date: Date;
  name: string;
  type: 'nacional' | 'autonomica' | 'local' | 'mejora' | 'regional' | 'company';
  scope?: 'national' | 'regional' | 'local' | 'company';
};

function deriveHolidayScope(type: BranchHolidayInput['type']): NonNullable<BranchHolidayInput['scope']> {
  if (type === 'nacional') return 'national';
  if (type === 'regional') return 'regional';
  if (type === 'company') return 'company';
  return 'local';
}

function normalizeBranchCode(code: string) {
  return code.trim().toUpperCase();
}

function toDayStart(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function ensureDateRange(from?: string, to?: string) {
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  if (fromDate && Number.isNaN(fromDate.getTime())) {
    throw createAppError('BAD_REQUEST', 'Parámetro from inválido');
  }
  if (toDate && Number.isNaN(toDate.getTime())) {
    throw createAppError('BAD_REQUEST', 'Parámetro to inválido');
  }
  if (fromDate && toDate && fromDate > toDate) {
    throw createAppError('BAD_REQUEST', 'El rango de fechas es inválido');
  }

  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate };
}

async function ensureBranch(branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw createAppError('NOT_FOUND', 'Sucursal no encontrada');
  return branch;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
  );
}

export async function listBranches(params: { includeInactive: boolean }) {
  return prisma.branch.findMany({
    where: params.includeInactive ? {} : { isActive: true },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
}

export async function createBranch(data: BranchInput, actor: Actor) {
  const code = normalizeBranchCode(data.code);

  const existing = await prisma.branch.findUnique({ where: { code } });
  if (existing) {
    throw createAppError('CONFLICT', 'Ya existe una sucursal con ese código');
  }

  const branch = await prisma.branch.create({
    data: {
      ...data,
      code,
      countryCode: data.countryCode?.toUpperCase() ?? 'ES',
      timezone: data.timezone ?? 'Europe/Madrid',
    },
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

export async function updateBranch(branchId: string, data: Partial<BranchInput>, actor: Actor) {
  await ensureBranch(branchId);

  if (data.code) {
    const code = normalizeBranchCode(data.code);
    const conflict = await prisma.branch.findFirst({
      where: { code, id: { not: branchId } },
      select: { id: true },
    });

    if (conflict) {
      throw createAppError('CONFLICT', 'Ya existe una sucursal con ese código');
    }

    data.code = code;
  }

  const updated = await prisma.branch.update({
    where: { id: branchId },
    data: {
      ...data,
      ...(data.countryCode ? { countryCode: data.countryCode.toUpperCase() } : {}),
    },
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

export async function deleteBranch(branchId: string, actor: Actor) {
  const branch = await ensureBranch(branchId);

  const activeBranches = await prisma.branch.count({ where: { isActive: true } });
  if (branch.isActive && activeBranches <= 1) {
    throw createAppError('BAD_REQUEST', 'Debe existir al menos una sucursal activa');
  }

  await prisma.branch.update({
    where: { id: branchId },
    data: { isActive: false },
  });

  await logAudit({
    userId: actor.id,
    action: 'DELETE_BRANCH',
    entityType: 'Branch',
    entityId: branchId,
    detailsJson: { name: branch.name, code: branch.code },
    ipAddress: actor.ipAddress,
  });
}

export async function hardDeleteBranch(branchId: string, actor: Actor) {
  const branch = await ensureBranch(branchId);

  const activeBranches = await prisma.branch.count({ where: { isActive: true } });
  if (branch.isActive && activeBranches <= 1) {
    throw createAppError('BAD_REQUEST', 'Debe existir al menos una sucursal activa');
  }

  const linkedSchedules = await prisma.schedule.count({ where: { branchId } });
  if (linkedSchedules > 0) {
    throw createAppError(
      'BAD_REQUEST',
      'No se puede eliminar definitivamente: la sucursal tiene turnos asociados. Desactívala o reasigna/elimina sus turnos primero.',
      { linkedSchedules }
    );
  }

  await prisma.branch.delete({ where: { id: branchId } });

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
  params: { year?: number; from?: string; to?: string; includeInactive: boolean },
) {
  await ensureBranch(branchId);

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

  return prisma.branchHoliday.findMany({
    where: {
      branchId,
      ...(params.includeInactive ? {} : { isActive: true }),
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    orderBy: [{ date: 'asc' }, { name: 'asc' }],
  });
}

export async function createBranchHoliday(branchId: string, data: BranchHolidayInput, actor: Actor) {
  const branch = await ensureBranch(branchId);
  if (!branch.isActive) throw createAppError('BAD_REQUEST', 'La sucursal está desactivada');

  try {
    const holiday = await prisma.branchHoliday.create({
      data: {
        branchId,
        date: toDayStart(data.date),
        name: data.name.trim(),
        type: data.type,
        scope: data.scope ?? deriveHolidayScope(data.type),
      },
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
  actor: Actor,
) {
  await ensureBranch(branchId);

  const existing = await prisma.branchHoliday.findFirst({ where: { id: holidayId, branchId } });
  if (!existing) throw createAppError('NOT_FOUND', 'Festivo no encontrado');

  try {
    const nextScope = data.scope ?? (data.type ? deriveHolidayScope(data.type) : undefined);

    const updated = await prisma.branchHoliday.update({
      where: { id: holidayId },
      data: {
        ...(data.date ? { date: toDayStart(data.date) } : {}),
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(nextScope ? { scope: nextScope } : {}),
      },
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

export async function deleteBranchHoliday(branchId: string, holidayId: string, actor: Actor) {
  await ensureBranch(branchId);

  const existing = await prisma.branchHoliday.findFirst({ where: { id: holidayId, branchId } });
  if (!existing) throw createAppError('NOT_FOUND', 'Festivo no encontrado');

  await prisma.branchHoliday.delete({ where: { id: holidayId } });

  await logAudit({
    userId: actor.id,
    action: 'DELETE_BRANCH_HOLIDAY',
    entityType: 'BranchHoliday',
    entityId: holidayId,
    detailsJson: { branchId, date: existing.date.toISOString(), name: existing.name },
    ipAddress: actor.ipAddress,
  });
}
