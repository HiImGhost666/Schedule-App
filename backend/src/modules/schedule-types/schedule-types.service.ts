import { prisma } from '../../config/database';
import { createAppError } from '../../common/errors/error-catalog';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import type { CreateScheduleTypeInput, UpdateScheduleTypeInput } from './schedule-types.http.schemas';

type ScheduleTypeActor = { id?: string; ipAddress?: string };

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

export async function createScheduleType(input: CreateScheduleTypeInput, actor?: ScheduleTypeActor) {
  // Check if value already exists
  const existing = await prisma.scheduleType.findUnique({
    where: { value: input.value },
  });

  if (existing && existing.isActive) {
    throw createAppError('BAD_REQUEST', 'Schedule type with this value already exists');
  }

  if (existing && !existing.isActive) {
    // Si el tipo de turno existe pero está inactivo, lo reactivamos con los nuevos datos
    return executeInTransaction(async (tx) => {
      const updated = await tx.scheduleType.update({
        where: { id: existing.id },
        data: { ...input, isActive: true },
      });
      await logAuditOrThrow({
        userId: actor?.id,
        action: 'UPDATE_SCHEDULE_TYPE',
        entityType: 'ScheduleType',
        entityId: existing.id,
        ipAddress: actor?.ipAddress,
        detailsJson: { before: sanitizeSnapshot(existing), after: sanitizeSnapshot(updated) },
      }, tx);
      return updated;
    });
  }

  return executeInTransaction(async (tx) => {
    const scheduleType = await tx.scheduleType.create({ data: input });
    await logAuditOrThrow({
      userId: actor?.id,
      action: 'CREATE_SCHEDULE_TYPE',
      entityType: 'ScheduleType',
      entityId: scheduleType.id,
      ipAddress: actor?.ipAddress,
      detailsJson: { before: null, after: sanitizeSnapshot(scheduleType) },
    }, tx);
    return scheduleType;
  });
}

export async function updateScheduleType(id: string, input: UpdateScheduleTypeInput, actor?: ScheduleTypeActor) {
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
      userId: actor?.id,
      action: 'UPDATE_SCHEDULE_TYPE',
      entityType: 'ScheduleType',
      entityId: id,
      ipAddress: actor?.ipAddress,
      detailsJson: { before: sanitizeSnapshot(scheduleType), after: sanitizeSnapshot(updated) },
    }, tx);
    return updated;
  });
}

export async function deleteScheduleType(id: string, actor?: ScheduleTypeActor) {
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
      userId: actor?.id,
      action: 'DELETE_SCHEDULE_TYPE',
      entityType: 'ScheduleType',
      entityId: id,
      ipAddress: actor?.ipAddress,
      detailsJson: { before: sanitizeSnapshot(scheduleType), after: sanitizeSnapshot(updated) },
    }, tx);
    return updated;
  });
}
