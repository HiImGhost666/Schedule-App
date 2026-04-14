import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { TransactionClient } from '../../common/transactions/transaction.utils';

const assigneeInclude = {
  assignments: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } },
    },
  },
  createdBy: { select: { id: true, name: true } },
} as const;

function getDb(tx?: TransactionClient) {
  return tx ?? prisma;
}

export function findSchedules(where: Prisma.ScheduleWhereInput) {
  return prisma.schedule.findMany({
    where,
    include: assigneeInclude,
    orderBy: { startDatetime: 'asc' },
  });
}

export function findScheduleById(id: string, tx?: TransactionClient) {
  return getDb(tx).schedule.findUnique({
    where: { id },
    include: assigneeInclude,
  });
}

export function createSchedule(data: Prisma.ScheduleCreateInput, tx?: TransactionClient) {
  return getDb(tx).schedule.create({
    data,
    include: assigneeInclude,
  });
}

export function updateSchedule(id: string, data: Prisma.ScheduleUpdateInput, tx?: TransactionClient) {
  return getDb(tx).schedule.update({
    where: { id },
    data,
    include: assigneeInclude,
  });
}

export function deleteSchedule(id: string, tx?: TransactionClient) {
  return getDb(tx).schedule.delete({
    where: { id },
  });
}

export function replaceAssignments(scheduleId: string, assigneeIds: string[], tx: TransactionClient) {
  return Promise.all([
    tx.scheduleAssignment.deleteMany({ where: { scheduleId } }),
    tx.scheduleAssignment.createMany({
      data: assigneeIds.map((userId) => ({ scheduleId, userId })),
    }),
  ]);
}
