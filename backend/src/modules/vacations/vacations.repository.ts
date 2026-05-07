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

export function findVacationRequests(where: VacationWhere, tx?: TransactionClient): Promise<VacationWithRelations[]> {
  return getDb(tx).vacationRequest.findMany({
    where,
    include: vacationInclude,
    orderBy: { createdAt: 'desc' },
  });
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
