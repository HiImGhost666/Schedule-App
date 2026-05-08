import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { TransactionClient } from '../../common/transactions/transaction.utils';

const vacationInclude = {
  employee: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      employeeId: true,
      department: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  },
  reviewer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  branch: {
    select: { id: true, name: true, code: true },
  },
  department: {
    select: { id: true, name: true, code: true },
  },
} as const;

export type VacationWithRelations = Prisma.VacationRequestGetPayload<{
  include: typeof vacationInclude;
}>;

type VacationCreateData = Prisma.Args<typeof prisma.vacationRequest, 'create'>['data'];
type VacationUpdateData = Prisma.Args<typeof prisma.vacationRequest, 'update'>['data'];
type VacationWhere = Prisma.Args<typeof prisma.vacationRequest, 'findMany'>['where'];

function getDb(tx?: TransactionClient) {
  return tx ?? prisma;
}

export function findVacationRequests(
  where: VacationWhere,
  options?: { sortBy?: string; sortOrder?: 'asc' | 'desc'; skip?: number; take?: number },
  tx?: TransactionClient,
): Promise<VacationWithRelations[]> {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  if (options?.sortBy) {
    orderBy[options.sortBy] = options.sortOrder ?? 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  return getDb(tx).vacationRequest.findMany({
    where,
    include: vacationInclude,
    orderBy,
    skip: options?.skip,
    take: options?.take,
  });
}

export function countVacationRequests(where: VacationWhere, tx?: TransactionClient): Promise<number> {
  return getDb(tx).vacationRequest.count({ where });
}

export function findVacationRequestById(id: string, tx?: TransactionClient): Promise<VacationWithRelations | null> {
  return getDb(tx).vacationRequest.findUnique({
    where: { id },
    include: vacationInclude,
  });
}

export function createVacationRequest(data: VacationCreateData, tx?: TransactionClient): Promise<VacationWithRelations> {
  return getDb(tx).vacationRequest.create({
    data,
    include: vacationInclude,
  });
}

export function updateVacationRequest(id: string, data: VacationUpdateData, tx?: TransactionClient): Promise<VacationWithRelations> {
  return getDb(tx).vacationRequest.update({
    where: { id },
    data,
    include: vacationInclude,
  });
}

export function countPendingOverlap(employeeId: string, startDate: Date, endDate: Date, excludeId?: string, tx?: TransactionClient) {
  const where: VacationWhere = {
    employeeId,
    status: 'pending',
    AND: [
      { startDate: { lte: endDate } },
      { endDate: { gte: startDate } },
    ],
  };
  if (excludeId) {
    where.id = { not: excludeId };
  }
  return getDb(tx).vacationRequest.count({ where });
}

/**
 * Busca solicitudes de vacaciones de compañeros del mismo departamento
 * cuyas fechas se solapen con el rango solicitado.
 * Considera estados: approved, pending, colindante
 */
export function findDepartmentOverlap(
  departmentId: string,
  employeeId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
  tx?: TransactionClient,
) {
  const where: VacationWhere = {
    departmentId,
    employeeId: { not: employeeId },
    status: { in: ['approved', 'pending', 'colindante'] as any },
    AND: [
      { startDate: { lte: endDate } },
      { endDate: { gte: startDate } },
    ],
  };
  if (excludeId) {
    where.id = { not: excludeId };
  }
  return getDb(tx).vacationRequest.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });
}
