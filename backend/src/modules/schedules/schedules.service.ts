import { z } from 'zod';
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
import {
  buildOverlapRangeFilter,
  ensureValidScheduleRange,
  isLastMinuteSchedule,
  parseOptionalDate,
} from './domain/schedule.rules';

type Actor = { id: string; role: string; email: string; name: string; ipAddress?: string };
const scheduleCreateInputSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startDatetime: z.coerce.date(),
  endDatetime: z.coerce.date(),
  type: z.string().default('guardia'),
  color: z.string().default('#1e3a5f'),
  location: z.string().optional(),
  notes: z.string().optional(),
  assigneeIds: z.array(z.string()).min(1, 'Al menos una persona debe estar asignada'),
  reason: z.string().optional(),
  hoursPerDay: z.number().min(0.5).max(24).optional().default(8),
  calendarType: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
});

const scheduleUpdateInputSchema = scheduleCreateInputSchema.partial().extend({
  reason: z.string().optional(),
});

type ScheduleCreateInput = z.infer<typeof scheduleCreateInputSchema>;
type ScheduleUpdateInput = z.infer<typeof scheduleUpdateInputSchema>;

export function listSchedules(params: { from?: string; to?: string; userId?: string; type?: string }) {
  const where: Record<string, unknown> = {};
  const fromDate = parseOptionalDate(params.from);
  const toDate = parseOptionalDate(params.to);
  const rangeFilter = buildOverlapRangeFilter(fromDate, toDate);
  if (rangeFilter) Object.assign(where, rangeFilter);
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
      email: assignment.user.email,
      avatarUrl: assignment.user.avatarUrl,
      department: assignment.user.department,
      companyPhone: assignment.user.companyPhone,
      auxiliaryPhone: assignment.user.auxiliaryPhone,
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
  const parsed = scheduleCreateInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createAppError('BAD_REQUEST', 'Datos inválidos', parsed.error.flatten());
  }

  const startDt = new Date(parsed.data.startDatetime);
  const endDt = new Date(parsed.data.endDatetime);
  ensureValidScheduleRange(startDt, endDt);

  const isLastMinute = isLastMinuteSchedule(startDt);
  const { assigneeIds, reason, ...scheduleData } = parsed.data;

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
  const parsed = scheduleUpdateInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createAppError('BAD_REQUEST', 'Datos inválidos', parsed.error.flatten());
  }

  const existing = await findScheduleById(scheduleId);
  if (!existing) throw createAppError('NOT_FOUND', 'Guardia no encontrada');

  const { assigneeIds, reason, ...updateData } = parsed.data;
  const startDt = updateData.startDatetime ? new Date(updateData.startDatetime) : existing.startDatetime;
  const endDt = updateData.endDatetime ? new Date(updateData.endDatetime) : existing.endDatetime;
  ensureValidScheduleRange(startDt, endDt);
  const isLastMinute = isLastMinuteSchedule(startDt);

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
