import { prisma } from '../../config/database';
import { createAppError } from '../../common/errors/error-catalog';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import type { CreateScheduleTypeInput, UpdateScheduleTypeInput } from './schedule-types.http.schemas';

export async function getScheduleTypes() {
  return prisma.scheduleType.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getScheduleTypeById(id: string) {
  const scheduleType = await prisma.scheduleType.findUnique({
    where: { id, isActive: true },
  });

  if (!scheduleType) {
    throw createAppError('NOT_FOUND', 'Schedule type not found');
  }

  return scheduleType;
}

export async function getScheduleTypeByValue(value: string) {
  const scheduleType = await prisma.scheduleType.findUnique({
    where: { value, isActive: true },
  });

  if (!scheduleType) {
    throw createAppError('NOT_FOUND', 'Schedule type not found');
  }

  return scheduleType;
}

export async function createScheduleType(input: CreateScheduleTypeInput) {
  // Check if value already exists
  const existing = await prisma.scheduleType.findUnique({
    where: { value: input.value },
  });

  if (existing) {
    throw createAppError('BAD_REQUEST', 'Schedule type with this value already exists');
  }

  return executeInTransaction(async (tx) => {
    const scheduleType = await tx.scheduleType.create({ data: input });
    await logAuditOrThrow({
      userId: 'system',
      action: 'CREATE_SCHEDULE_TYPE',
      entityType: 'ScheduleType',
      entityId: scheduleType.id,
      detailsJson: { before: null, after: sanitizeSnapshot(scheduleType) },
    }, tx);
    return scheduleType;
  });
}

export async function updateScheduleType(id: string, input: UpdateScheduleTypeInput) {
  const scheduleType = await getScheduleTypeById(id);

  // Check if updating value and it conflicts
  if (input.value && input.value !== scheduleType.value) {
    const existing = await prisma.scheduleType.findUnique({
      where: { value: input.value },
    });
    if (existing) {
      throw createAppError('BAD_REQUEST', 'Schedule type with this value already exists');
    }
  }

  return executeInTransaction(async (tx) => {
    const updated = await tx.scheduleType.update({ where: { id }, data: input });
    await logAuditOrThrow({
      userId: 'system',
      action: 'UPDATE_SCHEDULE_TYPE',
      entityType: 'ScheduleType',
      entityId: id,
      detailsJson: { before: sanitizeSnapshot(scheduleType), after: sanitizeSnapshot(updated) },
    }, tx);
    return updated;
  });
}

export async function deleteScheduleType(id: string) {
  const scheduleType = await getScheduleTypeById(id);

  // Check if it's being used by schedules
  const usageCount = await prisma.schedule.count({
    where: { scheduleTypeId: id },
  });

  if (usageCount > 0) {
    throw createAppError('BAD_REQUEST', 'Cannot delete schedule type that is being used by existing schedules');
  }

  return executeInTransaction(async (tx) => {
    const updated = await tx.scheduleType.update({
      where: { id },
      data: { isActive: false },
    });
    await logAuditOrThrow({
      userId: 'system',
      action: 'DELETE_SCHEDULE_TYPE',
      entityType: 'ScheduleType',
      entityId: id,
      detailsJson: { before: sanitizeSnapshot(scheduleType), after: sanitizeSnapshot(updated) },
    }, tx);
    return updated;
  });
}
