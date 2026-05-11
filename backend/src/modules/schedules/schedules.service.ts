import { z } from 'zod';
import { prisma } from '../../config/database';
import { executeInTransaction, type TransactionClient } from '../../common/transactions/transaction.utils';
import { createAppError } from '../../common/errors/error-catalog';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import { notifyScheduleChange } from '../notifications/notifications.service';
import { createInAppNotificationBatch } from '../in-app-notifications/in-app.service';
import { REALTIME_EVENTS } from '../../realtime/events';
import { publishRealtimeEvent } from '../../realtime/socket';
import {
  createSchedule,
  deleteSchedule,
  findScheduleById,
  findSchedules,
  replaceAssignments,
  ScheduleWhere,
  ScheduleWithRelations,
  updateSchedule,
} from './schedules.repository';
import {
  buildOverlapRangeFilter,
  ensureValidScheduleRange,
  isLastMinuteSchedule,
  parseOptionalDate,
} from './domain/schedule.rules';
import { recalculateWeeklySummariesForAssignees } from './weekly-summary.service';

type Actor = { id: string; roleName: string; email: string; name: string; branchId?: string | null; ipAddress?: string };
const scheduleCreateInputSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startDatetime: z.coerce.date(),
  endDatetime: z.coerce.date(),
  scheduleTypeId: z.string().min(1, 'El tipo de turno es obligatorio'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (must be #RRGGBB)').optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  branchId: z.string().min(1).optional(),
  assigneeIds: z.array(z.string()).min(1, 'Al menos una persona debe estar asignada'),
  reason: z.string().optional(),
  hoursPerDay: z.number().min(0.5).max(24).optional().default(8),
  confirmed: z.boolean().optional().default(false),
});


const scheduleUpdateInputSchema = scheduleCreateInputSchema.partial().extend({
  reason: z.string().optional(),
});

type ScheduleCreateInput = z.infer<typeof scheduleCreateInputSchema>;
type ScheduleUpdateInput = z.infer<typeof scheduleUpdateInputSchema>;
type ScheduleCreateResult = { schedule: ScheduleWithRelations; reason?: string; isLastMinute: boolean };

async function getActorDepartmentId(actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { departmentId: true },
  });
  return actor?.departmentId;
}

async function ensureDepartmentManagerAssignees(actorId: string, assigneeIds: string[]) {
  const actorDepartmentId = await getActorDepartmentId(actorId);
  if (!actorDepartmentId) {
    throw createAppError('FORBIDDEN', 'No tienes un departamento asignado');
  }

  const assignees = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, departmentId: true },
  });

  if (assignees.length !== assigneeIds.length) {
    throw createAppError('BAD_REQUEST', 'Al menos un usuario asignado no existe');
  }

  if (assignees.some((assignee) => assignee.departmentId !== actorDepartmentId)) {
    throw createAppError('FORBIDDEN', 'Solo puedes crear guardias para tu departamento');
  }
}

function ensureAssignmentsBelongToDepartment(actorDepartmentId: string, schedule: { assignments: Array<{ user: { department?: { id: string } | null } }> }) {
  if (schedule.assignments.some((a) => a.user.department?.id !== actorDepartmentId)) {
    throw createAppError('FORBIDDEN', 'Solo puedes modificar guardias de tu departamento');
  }
}

async function ensureActiveBranch(branchId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, isActive: true },
  });
  if (!branch) throw createAppError('NOT_FOUND', 'Sucursal no encontrada');
  if (!branch.isActive) throw createAppError('BAD_REQUEST', 'La sucursal está desactivada');
}

function ensureNoBatchOverlaps(items: ScheduleCreateInput[]) {
  const overlaps: string[] = [];
  const assignedRanges = new Map<string, { start: Date; end: Date; index: number }[]>();

  items.forEach((item, index) => {
    const start = new Date(item.startDatetime);
    const end = new Date(item.endDatetime);

    item.assigneeIds.forEach((assigneeId) => {
      const existing = assignedRanges.get(assigneeId) ?? [];
      for (const range of existing) {
        if (start < range.end && end > range.start) {
          overlaps.push(`assignee:${assigneeId} items:${range.index + 1}-${index + 1}`);
        }
      }
      existing.push({ start, end, index });
      assignedRanges.set(assigneeId, existing);
    });
  });

  if (overlaps.length > 0) {
    throw createAppError('BAD_REQUEST', 'Conflicto de horarios dentro del lote', { conflicts: overlaps });
  }
}

async function createScheduleEntryInternal(
  input: ScheduleCreateInput,
  actor: Actor,
  tx: TransactionClient,
): Promise<ScheduleCreateResult> {
  const startDt = new Date(input.startDatetime);
  const endDt = new Date(input.endDatetime);
  ensureValidScheduleRange(startDt, endDt);

  const { assigneeIds, reason, branchId, confirmed, scheduleTypeId, ...scheduleData } = input;
  const targetBranchId = branchId ?? actor.branchId ?? undefined;

  const scheduleType = await tx.scheduleType.findUnique({ where: { id: scheduleTypeId } });
  if (!scheduleType) throw createAppError('BAD_REQUEST', 'Tipo de turno no encontrado');

  if (targetBranchId) {
    await ensureActiveBranch(targetBranchId);
    await ensureNoHolidayOverlap(targetBranchId, startDt, endDt, scheduleType.value, confirmed);
  }

  // VUL-6: Validar que todos los assigneeIds existan en BD antes de crear
  const existingUsers = await tx.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true },
  });
  const missingIds = assigneeIds.filter(id => !existingUsers.some(u => u.id === id));
  if (missingIds.length > 0) {
    throw createAppError('BAD_REQUEST', `Los siguientes usuarios no existen: ${missingIds.join(', ')}`);
  }

  // Evitar bypass por nombre de rol si no es admin.
  if (actor.roleName !== 'admin') {
    // Employee no puede crear schedules bajo ninguna circunstancia
    if (actor.roleName === 'employee') {
      throw createAppError('FORBIDDEN', 'No tienes permiso para crear turnos');
    }

    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }

    if (actor.roleName === 'general_manager') {
      if (targetBranchId !== actor.branchId) {
        throw createAppError('FORBIDDEN', 'Solo puedes crear guardias en tu sucursal asignada');
      }
    } else if (actor.roleName === 'department_manager') {
      await ensureDepartmentManagerAssignees(actor.id, assigneeIds);
    } else {
      if (targetBranchId !== actor.branchId) {
        throw createAppError('FORBIDDEN', 'Solo puedes crear guardias en tu sucursal asignada');
      }
    }
  }

  await ensureNoOverlaps(assigneeIds, startDt, endDt, undefined, tx);

  const isLastMinute = isLastMinuteSchedule(startDt);

  const schedule = await createSchedule({
    ...scheduleData,
    color: scheduleData.color || scheduleType.color,
    scheduleType: { connect: { id: scheduleTypeId } },
    startDatetime: startDt,
    endDatetime: endDt,
    isLastMinute,
    ...(targetBranchId ? { branch: { connect: { id: targetBranchId } } } : {}),
    createdBy: { connect: { id: actor.id } },
    assignments: { create: assigneeIds.map((userId) => ({ userId })) },
  }, tx);

  await logAuditOrThrow({
    userId: actor.id,
    action: 'CREATE_SCHEDULE',
    entityType: 'Schedule',
    entityId: schedule.id,
    detailsJson: {
      before: null,
      after: sanitizeSnapshot({ ...schedule, assigneeIds }),
      reason,
    },
    ipAddress: actor.ipAddress,
  }, tx);

  return { schedule, reason, isLastMinute };
}

export function listSchedulesForActor(
  params: { from?: string; to?: string; userId?: string; type?: string; branchId?: string },
  actor: Pick<Actor, 'roleName' | 'branchId' | 'id'>,
) {
  const where: ScheduleWhere = {};
  const fromDate = parseOptionalDate(params.from);
  const toDate = parseOptionalDate(params.to);
  const rangeFilter = buildOverlapRangeFilter(fromDate, toDate);
  if (rangeFilter) Object.assign(where, rangeFilter);
  if (params.type) where.scheduleType = { value: params.type };
  if (params.userId) where.assignments = { some: { userId: params.userId } };

  // Admin: puede ver todas las sucursales, o filtrar por branchId explícito
  if (actor.roleName === 'admin') {
    if (params.branchId) where.branchId = params.branchId;
    return findSchedules(where);
  }

  // General manager: solo ve su sucursal
  if (actor.roleName === 'general_manager') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    where.branchId = actor.branchId;
    return findSchedules(where);
  }

  // Department manager: solo ve su sucursal (puede filtrar por departamento vía query params)
  if (actor.roleName === 'department_manager') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    where.branchId = actor.branchId;
    return findSchedules(where);
  }

  // Employee: solo ve schedules de su sucursal (trabajo grupal)
  if (actor.roleName === 'employee') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    where.branchId = actor.branchId;
    // Employee ve todos los turnos de su branch para trabajo grupal
    // Si pasa userId explícitamente, filtra por ese usuario
    if (params.userId) {
      where.assignments = { some: { userId: params.userId } };
    }
    return findSchedules(where);
  }

  throw createAppError('FORBIDDEN', 'Rol no autorizado para consultar turnos');
}

/**
 * @description Construye matriz semanal ISO 8601, buscando eventos que intercepten dentro del lunes-domingo de la semana provista.
 * @param year @param week
 */
export async function listWeekSchedules(year: number, week: number, branchId?: string, departmentId?: string, userId?: string) {
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
      ...(branchId ? [{ branchId }] : []),
      ...(departmentId ? [{ assignments: { some: { user: { departmentId } } } }] : []),
      ...(userId ? [{ assignments: { some: { userId } } }] : []),
    ],
  });


  const items = schedules.map((schedule) => ({
    id: schedule.id,
    title: schedule.title,
    startDatetime: schedule.startDatetime,
    endDatetime: schedule.endDatetime,
    type: schedule.scheduleType?.value ?? 'unknown',
    color: schedule.color,
    scheduleTypeId: schedule.scheduleTypeId,
    location: schedule.location,
    notes: schedule.notes,
    isLastMinute: schedule.isLastMinute,
    hoursPerDay: schedule.hoursPerDay,
    branchId: schedule.branchId,
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

export async function listWeekSchedulesForActor(
  year: number,
  week: number,
  branchId: string | undefined,
  departmentId: string | undefined,
  userId: string | undefined,
  actor: Pick<Actor, 'roleName' | 'branchId' | 'id'>,
) {
  // Admin: puede ver cualquier sucursal, o filtrar por branchId explícito
  if (actor.roleName === 'admin') {
    return listWeekSchedules(year, week, branchId, departmentId, userId);
  }

  // General manager: solo ve su sucursal
  if (actor.roleName === 'general_manager') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    return listWeekSchedules(year, week, actor.branchId, departmentId, userId);
  }

  // Department manager: solo ve su sucursal
  if (actor.roleName === 'department_manager') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    return listWeekSchedules(year, week, actor.branchId, departmentId, userId);
  }

  // Employee: solo ve su sucursal (trabajo grupal)
  if (actor.roleName === 'employee') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    // Employee ve todos los turnos de su branch para trabajo grupal
    // Si pasa userId explícitamente, filtra por ese usuario
    return listWeekSchedules(year, week, actor.branchId, departmentId, userId);
  }

  throw createAppError('FORBIDDEN', 'Rol no autorizado para consultar turnos');
}

/** Evita empalmes validando que la constelación de asignados esté libre en la brecha dt_ini a dt_fin. */
async function ensureNoOverlaps(assigneeIds: string[], startDt: Date, endDt: Date, excludeScheduleId?: string, tx?: TransactionClient) {
  const overlapping = await findSchedules({
    ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
    assignments: {
      some: {
        userId: { in: assigneeIds },
      },
    },
    AND: [
      { startDatetime: { lt: endDt } },
      { endDatetime: { gt: startDt } },
    ],
  }, tx);

  if (overlapping.length > 0) {
    const conflicts = overlapping.flatMap((s) => {
      const conflictedUsers = s.assignments
        .filter((a) => assigneeIds.includes(a.userId))
        .map((a) => a.user.name);
      
      const typeValue = s.scheduleType?.value ?? 'unknown';
      const typeDesc = typeValue === 'vacaciones' ? 'está de vacaciones' : 
                      typeValue === 'ausencia' ? 'está ausente' : 
                      `ya tiene el turno "${s.title}"`;

      return conflictedUsers.map(name => `${name} ${typeDesc}`);
    });

    const uniqueConflicts = [...new Set(conflicts)];
    throw createAppError(
      'BAD_REQUEST',
      `Conflicto de horarios: ${uniqueConflicts.join(', ')}`,
      { conflicts: uniqueConflicts }
    );
  }
}

/** Verifica que no se asigne trabajo en días festivos (excepto excepciones como 'otro' o 'excepcion').
 *  Si `confirmed` es `true`, se salta la validación permitiendo crear tareas en festivos (ej. horas extra). */
async function ensureNoHolidayOverlap(branchId: string, startDt: Date, endDt: Date, type: string, confirmed = false) {
  const exceptions = ['vacaciones', 'ausencia', 'otro', 'excepcion'];
  if (exceptions.includes(type)) return;
  if (confirmed) return;

  const holidays = await prisma.branchHoliday.findMany({
    where: {
      branchId,
      date: {
        gte: new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate()),
        lte: new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate()),
      },
    },
  });

  if (holidays.length > 0) {
    const names = holidays.map(h => h.name).join(', ');
    throw createAppError('BAD_REQUEST', `No se puede asignar trabajo en días festivos: ${names}`);
  }
}


/**
 * @description Retorna una guardia unitaria identificada con su ID; revienta (404) si es irreconocible.
 * @param scheduleId
 */
export async function getScheduleById(scheduleId: string) {
  const schedule = await findScheduleById(scheduleId);
  if (!schedule) throw createAppError('NOT_FOUND', 'Guardia no encontrada');
  return schedule;
}

export async function getScheduleByIdForActor(scheduleId: string, actor: Pick<Actor, 'roleName' | 'branchId'>) {
  const schedule = await getScheduleById(scheduleId);

  // Admin: puede ver cualquier schedule
  if (actor.roleName === 'admin') {
    return schedule;
  }

  // General manager: solo puede ver schedules de su sucursal
  if (actor.roleName === 'general_manager') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    if (schedule.branchId !== actor.branchId) {
      throw createAppError('FORBIDDEN', 'No puedes ver guardias de otras sucursales');
    }
    return schedule;
  }

  // Department manager: solo puede ver schedules de su sucursal
  if (actor.roleName === 'department_manager') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    if (schedule.branchId !== actor.branchId) {
      throw createAppError('FORBIDDEN', 'No puedes ver guardias de otras sucursales');
    }
    return schedule;
  }

  // Employee: solo puede ver schedules de su sucursal
  if (actor.roleName === 'employee') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }
    if (schedule.branchId !== actor.branchId) {
      throw createAppError('FORBIDDEN', 'No puedes ver guardias de otras sucursales');
    }
    return schedule;
  }

  throw createAppError('FORBIDDEN', 'Rol no autorizado para consultar guardias');
}

/**
 * @description Inserta guardias en BD bajo validaciones estrictas (Anti-Overlap); despacha triggers informativos (Realtime/Emails).
 * @param input @param actor
 */
export async function createScheduleEntry(input: ScheduleCreateInput, actor: Actor) {
  const parsed = scheduleCreateInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createAppError('BAD_REQUEST', 'Datos inválidos', parsed.error.flatten());
  }

  const result = await executeInTransaction((tx) => createScheduleEntryInternal(parsed.data, actor, tx));

  // Recalcular resumen semanal de horas para los asignados (no-bloqueante)
  recalculateWeeklySummariesForAssignees(
    parsed.data.assigneeIds,
    new Date(parsed.data.startDatetime),
    new Date(parsed.data.endDatetime),
  ).catch(() => {});

  notifyScheduleChange({
    type: 'schedule_created',
    schedule: result.schedule,
    actor,
    reason: result.reason || 'Nueva guardia programada',
    isLastMinute: result.isLastMinute,
  }).catch(() => {});

  // Notificación in-app a los asignados
  createInAppNotificationBatch(
    parsed.data.assigneeIds.map(userId => ({
      userId,
      type: 'schedule_assigned',
      title: 'Nuevo turno asignado',
      message: `Se te ha asignado un nuevo turno: "${result.schedule.title}" el ${result.schedule.startDatetime.toLocaleDateString()} de ${result.schedule.startDatetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} a ${result.schedule.endDatetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Asignado por ${actor.name}.`,
      link: '/schedule',
      metadata: { scheduleId: result.schedule.id, assignedBy: actor.id },
    })),
  ).catch(() => {});

  publishRealtimeEvent(REALTIME_EVENTS.SCHEDULE_CREATED, {
    entity: 'schedule',
    action: 'created',
    id: result.schedule.id,
    changedAt: new Date().toISOString(),
    actorId: actor.id,
    meta: {
      type: result.schedule.scheduleType?.value ?? 'unknown',
      isLastMinute: result.isLastMinute,
    },
  });

  return result.schedule;
}

export async function createScheduleEntriesBulk(inputs: ScheduleCreateInput[], actor: Actor) {
  const parsedItems = inputs.map((item) => {
    const parsed = scheduleCreateInputSchema.safeParse(item);
    if (!parsed.success) {
      throw createAppError('BAD_REQUEST', 'Datos inválidos', parsed.error.flatten());
    }
    return parsed.data;
  });

  ensureNoBatchOverlaps(parsedItems);

  // VUL-6: Validar que todos los assigneeIds existan antes de crear (bulk)
  const bulkAssigneeIds = parsedItems.flatMap(item => item.assigneeIds);
  const uniqueBulkAssigneeIds = [...new Set(bulkAssigneeIds)];
  const existingUsers = (await prisma.user.findMany({
    where: { id: { in: uniqueBulkAssigneeIds } },
    select: { id: true },
  })) ?? [];
  const missingIds = uniqueBulkAssigneeIds.filter(id => !existingUsers.some(u => u.id === id));
  if (missingIds.length > 0) {
    throw createAppError('BAD_REQUEST', `Los siguientes usuarios no existen: ${missingIds.join(', ')}`);
  }

  const results = await executeInTransaction(async (tx) => {
    const created: ScheduleCreateResult[] = [];
    for (const item of parsedItems) {
      const result = await createScheduleEntryInternal(item, actor, tx);
      created.push(result);
    }
    return created;
  });

  // Recalcular resúmenes semanales para todos los asignados (no-bloqueante)
  const allAssigneeIds = new Set<string>();
  for (const item of parsedItems) {
    for (const id of item.assigneeIds) {
      allAssigneeIds.add(id);
    }
  }
  const minStart = new Date(Math.min(...parsedItems.map(i => new Date(i.startDatetime).getTime())));
  const maxEnd = new Date(Math.max(...parsedItems.map(i => new Date(i.endDatetime).getTime())));
  recalculateWeeklySummariesForAssignees(Array.from(allAssigneeIds), minStart, maxEnd).catch(() => {});

  results.forEach((result) => {
    notifyScheduleChange({
      type: 'schedule_created',
      schedule: result.schedule,
      actor,
      reason: result.reason || 'Nueva guardia programada',
      isLastMinute: result.isLastMinute,
    }).catch(() => {});

    publishRealtimeEvent(REALTIME_EVENTS.SCHEDULE_CREATED, {
      entity: 'schedule',
      action: 'created',
      id: result.schedule.id,
      changedAt: new Date().toISOString(),
      actorId: actor.id,
      meta: {
        type: result.schedule.scheduleType?.value ?? 'unknown',
        isLastMinute: result.isLastMinute,
      },
    });
  });

  return results.map((result) => result.schedule);
}

/**
 * @description Efectúa mutaciones de un bloque asignado, depura colisiones en su nueva fecha y salva state "before-after" en auditoría.
 * @param scheduleId @param input @param actor
 */
export async function updateScheduleEntry(scheduleId: string, input: ScheduleUpdateInput, actor: Actor) {
  const parsed = scheduleUpdateInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createAppError('BAD_REQUEST', 'Datos inválidos', parsed.error.flatten());
  }

  const existing = await findScheduleById(scheduleId);
  if (!existing) throw createAppError('NOT_FOUND', 'Guardia no encontrada');

  const { assigneeIds, reason, branchId, confirmed, scheduleTypeId, ...updateData } = parsed.data;
  const nextBranchId = branchId ?? existing.branchId;
  if (nextBranchId) await ensureActiveBranch(nextBranchId);

  if (actor.roleName !== 'admin') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }

    if (actor.roleName === 'general_manager') {
      if (existing.branchId !== actor.branchId) {
        throw createAppError('FORBIDDEN', 'Solo puedes editar guardias de tu sucursal asignada');
      }
      if (nextBranchId !== actor.branchId) {
        throw createAppError('FORBIDDEN', 'No puedes mover una guardia fuera de tu sucursal asignada');
      }
    } else if (actor.roleName === 'department_manager') {
      const actorDepartmentId = await getActorDepartmentId(actor.id);
      if (!actorDepartmentId) {
        throw createAppError('FORBIDDEN', 'No tienes un departamento asignado');
      }

      if (assigneeIds) {
        await ensureDepartmentManagerAssignees(actor.id, assigneeIds);
      } else {
        ensureAssignmentsBelongToDepartment(actorDepartmentId, existing);
      }
    } else {
      if (existing.branchId !== actor.branchId) {
        throw createAppError('FORBIDDEN', 'Solo puedes editar guardias de tu sucursal asignada');
      }
      if (nextBranchId !== actor.branchId) {
        throw createAppError('FORBIDDEN', 'No puedes mover una guardia fuera de tu sucursal asignada');
      }
    }
  }

  const startDt = updateData.startDatetime ? new Date(updateData.startDatetime) : existing.startDatetime;
  const endDt = updateData.endDatetime ? new Date(updateData.endDatetime) : existing.endDatetime;
  ensureValidScheduleRange(startDt, endDt);
  const isLastMinute = isLastMinuteSchedule(startDt);

  if (nextBranchId) {
    const typeValue = scheduleTypeId
      ? (await prisma.scheduleType.findUnique({ where: { id: scheduleTypeId } }))?.value
      : existing.scheduleType?.value ?? 'unknown';
    if (!typeValue) throw createAppError('BAD_REQUEST', 'Tipo de turno no encontrado');
    await ensureNoHolidayOverlap(nextBranchId, startDt, endDt, typeValue, confirmed);
  }


  await ensureNoOverlaps(assigneeIds || existing.assignments.map((a: { userId: string }) => a.userId), startDt, endDt, scheduleId);

  // Determine which schedule type to use (either the new one or the existing one)
  const typeIdForColor = scheduleTypeId || existing.scheduleTypeId;
  const scheduleTypeForColor = typeIdForColor 
    ? await prisma.scheduleType.findUnique({ where: { id: typeIdForColor } })
    : null;

  const schedule = await executeInTransaction(async (tx) => {
    if (assigneeIds) {
      await replaceAssignments(scheduleId, assigneeIds, tx);
    }

    const updated = await updateSchedule(scheduleId, {
      ...updateData,
      color: updateData.color || scheduleTypeForColor?.color || existing.color,
      ...(branchId ? { branch: { connect: { id: branchId } } } : {}),
      ...(scheduleTypeId ? { scheduleType: { connect: { id: scheduleTypeId } } } : {}),
      ...(updateData.startDatetime && { startDatetime: new Date(updateData.startDatetime) }),
      ...(updateData.endDatetime && { endDatetime: new Date(updateData.endDatetime) }),
      isLastMinute,
    }, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'UPDATE_SCHEDULE',
      entityType: 'Schedule',
      entityId: updated.id,
      detailsJson: {
        before: sanitizeSnapshot({
          ...existing,
          assigneeIds: existing.assignments.map((a: { userId: string }) => a.userId)
        }),
        after: sanitizeSnapshot({
          ...updated,
          assigneeIds: assigneeIds || existing.assignments.map((a: { userId: string }) => a.userId)
        }),
        reason
      },
      ipAddress: actor.ipAddress,
    }, tx);

    return updated;
  });

  // Recalcular resumen semanal de horas para los asignados (no-bloqueante)
  const affectedAssigneeIds = assigneeIds || existing.assignments.map((a: { userId: string }) => a.userId);
  recalculateWeeklySummariesForAssignees(affectedAssigneeIds, startDt, endDt).catch(() => {});

  notifyScheduleChange({
    type: isLastMinute ? 'schedule_lastminute' : 'schedule_modified',
    schedule,
    actor,
    reason: reason || 'Sin motivo especificado',
    isLastMinute,
  }).catch(() => {});

  // Notificación in-app a los asignados sobre cambios
  const finalAssigneeIds = assigneeIds || existing.assignments.map((a: { userId: string }) => a.userId);
  createInAppNotificationBatch(
    finalAssigneeIds.map(userId => ({
      userId,
      type: 'schedule_modified',
      title: 'Turno modificado',
      message: `El turno "${schedule.title}" del ${schedule.startDatetime.toLocaleDateString()} ha sido modificado por ${actor.name}.${reason ? ` Motivo: ${reason}` : ''}`,
      link: '/schedule',
      metadata: { scheduleId: schedule.id, updatedBy: actor.id },
    })),
  ).catch(() => {});

  publishRealtimeEvent(REALTIME_EVENTS.SCHEDULE_UPDATED, {
    entity: 'schedule',
    action: 'updated',
    id: schedule.id,
    changedAt: new Date().toISOString(),
    actorId: actor.id,
    meta: {
      type: schedule.scheduleType?.value ?? 'unknown',
      isLastMinute,
    },
  });

  return schedule;
}

/**
 * @description Obtiene alertas de turnos próximos (próximos 7 días) sin personal o con personal único.
 * @param actor
 */
export async function getScheduleAlerts(actor: Actor) {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const where: ScheduleWhere = {
    startDatetime: { gte: now, lte: sevenDaysLater },
  };

  // Filtrar por scope del actor
  if (actor.roleName !== 'admin') {
    if (actor.roleName === 'general_manager' && actor.branchId) {
      where.branchId = actor.branchId;
    } else if (actor.roleName === 'department_manager') {
      const actorDepartmentId = await getActorDepartmentId(actor.id);
      if (actorDepartmentId) {
        where.assignments = {
          some: {
            user: { departmentId: actorDepartmentId },
          },
        };
      }
    } else if (actor.branchId) {
      where.branchId = actor.branchId;
    }
  }

  const schedules = await findSchedules(where);

  const alerts: Array<{
    type: 'unassigned' | 'solo';
    scheduleId: string;
    title: string;
    date: string;
    assigneeName?: string;
  }> = [];

  for (const schedule of schedules) {
    if (schedule.assignments.length === 0) {
      alerts.push({
        type: 'unassigned',
        scheduleId: schedule.id,
        title: schedule.title,
        date: schedule.startDatetime.toISOString(),
      });
    } else if (schedule.assignments.length === 1) {
      alerts.push({
        type: 'solo',
        scheduleId: schedule.id,
        title: schedule.title,
        date: schedule.startDatetime.toISOString(),
        assigneeName: schedule.assignments[0].user.name,
      });
    }
  }

  return alerts;
}

export async function deleteScheduleEntry(scheduleId: string, reason: string | undefined, actor: Actor) {
  const schedule = await findScheduleById(scheduleId);
  if (!schedule) throw createAppError('NOT_FOUND', 'Guardia no encontrada');

  if (actor.roleName !== 'admin') {
    if (!actor.branchId) {
      throw createAppError('FORBIDDEN', 'No tienes una sucursal asignada');
    }

    if (actor.roleName === 'general_manager') {
      if (schedule.branchId !== actor.branchId) {
        throw createAppError('FORBIDDEN', 'Solo puedes eliminar guardias de tu sucursal asignada');
      }
    } else if (actor.roleName === 'department_manager') {
      const actorDepartmentId = await getActorDepartmentId(actor.id);
      if (!actorDepartmentId) {
        throw createAppError('FORBIDDEN', 'No tienes un departamento asignado');
      }
      ensureAssignmentsBelongToDepartment(actorDepartmentId, schedule);
    } else {
      if (schedule.branchId !== actor.branchId) {
        throw createAppError('FORBIDDEN', 'Solo puedes eliminar guardias de tu sucursal asignada');
      }
    }
  }

  await executeInTransaction(async (tx) => {
    await deleteSchedule(scheduleId, tx);
    await logAuditOrThrow({
      userId: actor.id,
      action: 'DELETE_SCHEDULE',
      entityType: 'Schedule',
      entityId: scheduleId,
      detailsJson: {
        before: sanitizeSnapshot({
          ...schedule,
          assigneeIds: schedule.assignments.map((a: { userId: string }) => a.userId)
        }),
        after: null,
        reason
      },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  // Recalcular resumen semanal de horas para los asignados (no-bloqueante)
  recalculateWeeklySummariesForAssignees(
    schedule.assignments.map((a: { userId: string }) => a.userId),
    schedule.startDatetime,
    schedule.endDatetime,
  ).catch(() => {});

  notifyScheduleChange({
    type: 'schedule_deleted',
    schedule,
    actor,
    reason: reason || 'Sin motivo especificado',
    isLastMinute: false,
  }).catch(() => {});

  // Notificación in-app a los asignados sobre eliminación
  createInAppNotificationBatch(
    schedule.assignments.map((a: { userId: string }) => ({
      userId: a.userId,
      type: 'schedule_deleted',
      title: 'Turno eliminado',
      message: `El turno "${schedule.title}" del ${schedule.startDatetime.toLocaleDateString()} ha sido eliminado por ${actor.name}.${reason ? ` Motivo: ${reason}` : ''}`,
      link: '/schedule',
      metadata: { scheduleId: schedule.id, deletedBy: actor.id },
    })),
  ).catch(() => {});

  publishRealtimeEvent(REALTIME_EVENTS.SCHEDULE_DELETED, {
    entity: 'schedule',
    action: 'deleted',
    id: scheduleId,
    changedAt: new Date().toISOString(),
    actorId: actor.id,
    meta: {
      type: schedule.scheduleType?.value ?? 'unknown',
    },
  });
}
