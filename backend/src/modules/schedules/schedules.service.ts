import { addHours, isBefore } from 'date-fns';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import { createAppError } from '../../common/errors/error-catalog';
import { logAuditOrThrow } from '../audit/audit.service';
import { notifyScheduleChange } from '../notifications/notifications.service';
import {
  createSchedule,
  deleteSchedule,
  findScheduleById,
  findSchedules,
  replaceAssignments,
  updateSchedule,
} from './schedules.repository';

type Actor = { id: string; role: string; email: string; name: string; ipAddress?: string };

type ScheduleCreateInput = {
  title: string;
  description?: string;
  startDatetime: Date;
  endDatetime: Date;
  type: string;
  color: string;
  location?: string;
  notes?: string;
  assigneeIds: string[];
  reason?: string;
  hoursPerDay?: number;
  calendarType?: 'tenerife' | 'las_palmas' | 'none';
};

type ScheduleUpdateInput = Partial<ScheduleCreateInput> & { reason?: string };

export function listSchedules(params: { from?: string; to?: string; userId?: string; type?: string }) {
  const where: Record<string, unknown> = {};
  if (params.from) where.startDatetime = { gte: new Date(params.from) };
  if (params.to) where.endDatetime = { ...(where.endDatetime as object || {}), lte: new Date(params.to) };
  if (params.type) where.type = params.type;
  if (params.userId) where.assignments = { some: { userId: params.userId } };
  return findSchedules(where);
}

export async function listWeekSchedules(year: number, week: number) {
  const jan4 = new Date(year, 0, 4);
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const schedules = await findSchedules({
    AND: [
      { startDatetime: { lte: weekEnd } },
      { endDatetime: { gte: weekStart } },
    ],
  });

  const items = schedules.map((schedule) => ({
    id: schedule.id,
    title: schedule.title,
    startDatetime: schedule.startDatetime,
    endDatetime: schedule.endDatetime,
    type: schedule.type,
    color: schedule.color,
    location: schedule.location,
    notes: schedule.notes,
    isLastMinute: schedule.isLastMinute,
    hoursPerDay: schedule.hoursPerDay,
    calendarType: schedule.calendarType,
    assignees: schedule.assignments.map((assignment) => ({
      id: assignment.user.id,
      name: assignment.user.name,
      avatarUrl: assignment.user.avatarUrl,
    })),
  }));

  return {
    year,
    week,
    weekStart,
    weekEnd,
    total: items.length,
    items,
  };
}

export async function getScheduleById(scheduleId: string) {
  const schedule = await findScheduleById(scheduleId);
  if (!schedule) throw createAppError('NOT_FOUND', 'Guardia no encontrada');
  return schedule;
}

export async function createScheduleEntry(input: ScheduleCreateInput, actor: Actor) {
  const startDt = new Date(input.startDatetime);
  const endDt = new Date(input.endDatetime);
  if (isBefore(endDt, startDt)) {
    throw createAppError('BAD_REQUEST', 'La fecha de fin debe ser posterior a la de inicio');
  }

  const isLastMinute = isBefore(startDt, addHours(new Date(), 24));
  const { assigneeIds, reason, ...scheduleData } = input;

  const schedule = await executeInTransaction(async (tx) => {
    const created = await createSchedule({
      ...scheduleData,
      startDatetime: startDt,
      endDatetime: endDt,
      isLastMinute,
      createdBy: { connect: { id: actor.id } },
      assignments: { create: assigneeIds.map((userId) => ({ userId })) },
    }, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'CREATE_SCHEDULE',
      entityType: 'Schedule',
      entityId: created.id,
      detailsJson: { title: created.title, assigneeIds, reason },
      ipAddress: actor.ipAddress,
    }, tx);

    return created;
  });

  notifyScheduleChange({
    type: 'schedule_created',
    schedule,
    actor,
    reason: reason || 'Nueva guardia programada',
    isLastMinute,
  }).catch(() => {});

  return schedule;
}

export async function updateScheduleEntry(scheduleId: string, input: ScheduleUpdateInput, actor: Actor) {
  const existing = await findScheduleById(scheduleId);
  if (!existing) throw createAppError('NOT_FOUND', 'Guardia no encontrada');

  const { assigneeIds, reason, ...updateData } = input;
  const startDt = updateData.startDatetime ? new Date(updateData.startDatetime) : existing.startDatetime;
  const isLastMinute = isBefore(startDt, addHours(new Date(), 24));

  const schedule = await executeInTransaction(async (tx) => {
    if (assigneeIds) {
      await replaceAssignments(scheduleId, assigneeIds, tx);
    }

    const updated = await updateSchedule(scheduleId, {
      ...updateData,
      ...(updateData.startDatetime && { startDatetime: new Date(updateData.startDatetime) }),
      ...(updateData.endDatetime && { endDatetime: new Date(updateData.endDatetime) }),
      isLastMinute,
    }, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'UPDATE_SCHEDULE',
      entityType: 'Schedule',
      entityId: updated.id,
      detailsJson: { changes: updateData, reason },
      ipAddress: actor.ipAddress,
    }, tx);

    return updated;
  });

  notifyScheduleChange({
    type: isLastMinute ? 'schedule_lastminute' : 'schedule_modified',
    schedule,
    actor,
    reason: reason || 'Sin motivo especificado',
    isLastMinute,
  }).catch(() => {});

  return schedule;
}

export async function deleteScheduleEntry(scheduleId: string, reason: string | undefined, actor: Actor) {
  const schedule = await findScheduleById(scheduleId);
  if (!schedule) throw createAppError('NOT_FOUND', 'Guardia no encontrada');

  await executeInTransaction(async (tx) => {
    await deleteSchedule(scheduleId, tx);
    await logAuditOrThrow({
      userId: actor.id,
      action: 'DELETE_SCHEDULE',
      entityType: 'Schedule',
      entityId: scheduleId,
      detailsJson: { title: schedule.title, reason },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  notifyScheduleChange({
    type: 'schedule_deleted',
    schedule,
    actor,
    reason: reason || 'Sin motivo especificado',
    isLastMinute: false,
  }).catch(() => {});
}
