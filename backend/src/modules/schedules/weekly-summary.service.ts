import { prisma } from '../../config/database';
import { findSchedules } from './schedules.repository';
import { computeWeeklySummary, getWeekInfo } from './domain/schedule.rules';
import type { WeeklyWorkSummary } from '@prisma/client';

/**
 * Recalcula el resumen semanal de horas para un usuario en una semana ISO específica.
 *
 * Busca todos los schedules del usuario en esa semana, calcula las horas totales,
 * el desglose diario y las horas extra, y guarda/actualiza el resumen en BD.
 *
 * Esta función es no-bloqueante: se llama con .catch(() => {}) para no interferir
 * con la operación principal (crear/editar/borrar schedule).
 */
export async function recalculateWeeklySummary(
  userId: string,
  year: number,
  week: number,
): Promise<WeeklyWorkSummary> {
  // Calcular inicio y fin de la semana ISO
  const jan4 = new Date(year, 0, 4);
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Obtener todos los schedules del usuario en esa semana
  const schedules = await findSchedules({
    assignments: { some: { userId } },
    AND: [
      { startDatetime: { lte: weekEnd } },
      { endDatetime: { gte: weekStart } },
    ],
  });

  // Calcular horas totales y extra
  const summary = computeWeeklySummary(
    schedules.map((s) => ({
      startDatetime: s.startDatetime,
      endDatetime: s.endDatetime,
      hoursPerDay: s.hoursPerDay,
    })),
  );

  // Guardar/actualizar en BD
  return prisma.weeklyWorkSummary.upsert({
    where: { userId_year_week: { userId, year, week } },
    create: {
      userId,
      year,
      week,
      totalHours: summary.totalHours,
      baseHours: summary.baseHours,
      overtimeHours: summary.overtimeHours,
      dailyBreakdown: JSON.stringify(summary.dailyBreakdown),
    },
    update: {
      totalHours: summary.totalHours,
      baseHours: summary.baseHours,
      overtimeHours: summary.overtimeHours,
      dailyBreakdown: JSON.stringify(summary.dailyBreakdown),
      calculatedAt: new Date(),
    },
  });
}

/**
 * Recalcula los resúmenes semanales para todos los usuarios asignados a un schedule.
 * Se llama después de crear, modificar o eliminar un schedule.
 *
 * Como un schedule multi-día puede abarcar dos semanas ISO, recalcula ambas.
 */
export async function recalculateWeeklySummariesForAssignees(
  assigneeIds: string[],
  startDatetime: Date,
  endDatetime: Date,
): Promise<void> {
  const weeks = new Set<string>();

  // Obtener todas las semanas ISO que cubre el schedule
  const startWeek = getWeekInfo(startDatetime);
  const endWeek = getWeekInfo(endDatetime);
  weeks.add(`${startWeek.year}-${startWeek.week}`);
  if (endWeek.year !== startWeek.year || endWeek.week !== startWeek.week) {
    weeks.add(`${endWeek.year}-${endWeek.week}`);
  }

  // Recalcular para cada asignado y cada semana
  const promises: Promise<unknown>[] = [];
  for (const userId of assigneeIds) {
    for (const weekKey of weeks) {
      const [yearStr, weekStr] = weekKey.split('-');
      promises.push(
        recalculateWeeklySummary(userId, parseInt(yearStr, 10), parseInt(weekStr, 10)),
      );
    }
  }

  await Promise.all(promises);
}

/**
 * Obtiene el resumen semanal de un usuario.
 */
export async function getWeeklySummary(
  userId: string,
  year: number,
  week: number,
): Promise<WeeklyWorkSummary | null> {
  return prisma.weeklyWorkSummary.findUnique({
    where: { userId_year_week: { userId, year, week } },
  });
}

/**
 * Obtiene los resúmenes semanales de un usuario para un rango de semanas.
 */
export async function getWeeklySummaries(
  userId: string,
  year: number,
  fromWeek: number,
  toWeek: number,
): Promise<WeeklyWorkSummary[]> {
  return prisma.weeklyWorkSummary.findMany({
    where: {
      userId,
      year,
      week: { gte: fromWeek, lte: toWeek },
    },
    orderBy: { week: 'asc' },
  });
}

/**
 * Resultado del resumen semanal de equipo.
 */
export interface TeamWeeklySummaryItem {
  userId: string;
  userName: string;
  totalHours: number;
  baseHours: number;
  overtimeHours: number;
  dailyBreakdown: Record<string, number>;
}

/**
 * Obtiene los resúmenes semanales de todo un equipo para una semana específica.
 *
 * @param year - Año ISO
 * @param week - Semana ISO
 * @param filters - Filtros opcionales (branchId, departmentId)
 * @returns Array de resúmenes por usuario
 */
export async function getTeamWeeklySummaries(
  year: number,
  week: number,
  filters?: { branchId?: string; departmentId?: string },
): Promise<TeamWeeklySummaryItem[]> {
  // Construir filtro de usuarios
  const userWhere: Record<string, unknown> = { status: 'active' };
  if (filters?.branchId) userWhere.branchId = filters.branchId;
  if (filters?.departmentId) userWhere.departmentId = filters.departmentId;

  const users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, name: true },
  });

  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  // Obtener resúmenes semanales de esos usuarios
  const summaries = await prisma.weeklyWorkSummary.findMany({
    where: {
      userId: { in: userIds },
      year,
      week,
    },
  });

  const summaryMap = new Map(summaries.map((s) => [s.userId, s]));

  return users.map((user) => {
    const summary = summaryMap.get(user.id);
    return {
      userId: user.id,
      userName: user.name,
      totalHours: summary?.totalHours ?? 0,
      baseHours: summary?.baseHours ?? 40,
      overtimeHours: summary?.overtimeHours ?? 0,
      dailyBreakdown: summary?.dailyBreakdown ? JSON.parse(summary.dailyBreakdown) : {},
    };
  });
}
