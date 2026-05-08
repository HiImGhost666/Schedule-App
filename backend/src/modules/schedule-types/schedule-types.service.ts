import { prisma } from '../../config/database';
import { createAppError } from '../../common/errors/error-catalog';
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

  return prisma.scheduleType.create({
    data: input,
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

  return prisma.scheduleType.update({
    where: { id },
    data: input,
  });
}

export async function deleteScheduleType(id: string) {
  const _scheduleType = await getScheduleTypeById(id);

  // Check if it's being used by schedules
  const usageCount = await prisma.schedule.count({
    where: { scheduleTypeId: id },
  });

  if (usageCount > 0) {
    throw createAppError('BAD_REQUEST', 'Cannot delete schedule type that is being used by existing schedules');
  }

  return prisma.scheduleType.update({
    where: { id },
    data: { isActive: false },
  });
}