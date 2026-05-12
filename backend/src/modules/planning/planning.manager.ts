import type {
  AvailabilityItem,
  AvailabilityMatrix,
  CoverageRiskItem,
  PlanningActor,
  PlanningRangeFilters,
  ScopedPlanningRangeFilters,
} from './planning.types';
import { createAppError } from '../../common/errors/error-catalog';
import { prisma } from '../../config/database';
import type { Prisma } from '@prisma/client';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function getDaysInRange(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(from);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  while (current <= end) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

function overlapWhere(from: Date, to: Date): Prisma.ScheduleWhereInput {
  return {
    AND: [
      { startDatetime: { lte: to } },
      { endDatetime: { gte: from } },
    ],
  };
}

function vacationOverlapWhere(from: Date, to: Date): Prisma.VacationRequestWhereInput {
  return {
    AND: [
      { startDate: { lte: to } },
      { endDate: { gte: from } },
    ],
  };
}

const coverageScheduleSelect = {
  id: true,
  title: true,
  startDatetime: true,
  endDatetime: true,
  branch: { select: { id: true, name: true } },
  assignments: { select: { userId: true } },
} satisfies Prisma.ScheduleSelect;

type CoverageSchedule = Prisma.ScheduleGetPayload<{ select: typeof coverageScheduleSelect }>;

const coverageVacationSelect = {
  id: true,
  employeeId: true,
  startDate: true,
  endDate: true,
} satisfies Prisma.VacationRequestSelect;

type CoverageVacation = Prisma.VacationRequestGetPayload<{ select: typeof coverageVacationSelect }>;

function toCoverageRisk(
  schedule: CoverageSchedule,
  vacationsByUserId: Map<string, CoverageVacation[]>,
): CoverageRiskItem | null {
  const assignedCount = schedule.assignments.length;
  const vacationConflicts = schedule.assignments.flatMap((assignment) =>
    vacationsByUserId.get(assignment.userId) ?? [],
  );

  if (assignedCount >= 2 && vacationConflicts.length === 0) return null;

  return {
    severity: assignedCount === 0 || vacationConflicts.length > 0 ? 'high' : 'medium',
    reasons: [
      ...(assignedCount === 0 ? ['Turno descubierto'] : []),
      ...(assignedCount === 1 ? ['Turno con una sola persona asignada'] : []),
      ...(vacationConflicts.length > 0
        ? [`${vacationConflicts.length} asignado(s) con vacaciones aprobadas`]
        : []),
    ],
    schedule: {
      id: schedule.id,
      title: schedule.title,
      startDatetime: schedule.startDatetime.toISOString(),
      endDatetime: schedule.endDatetime.toISOString(),
      branch: schedule.branch,
    },
    ...(vacationConflicts.length > 0
      ? {
          vacationConflicts: vacationConflicts.map((vacation) => ({
            userId: vacation.employeeId,
            vacationId: vacation.id,
            startDate: vacation.startDate.toISOString(),
            endDate: vacation.endDate.toISOString(),
          })),
        }
      : {}),
  };
}

export class PlanningManager {
  /**
   * Resolve branch scope for planning queries.
   * Admin users can query all branches. Other roles are limited to their own
   * branch plus any visible branches already attached to the actor.
   */
  async resolveScopedFilters(
    filters: PlanningRangeFilters,
    actor: PlanningActor,
  ): Promise<ScopedPlanningRangeFilters> {
    if (actor.roleName === 'admin') {
      return {
        ...filters,
        branchIds: filters.branchId ? [filters.branchId] : undefined,
      };
    }

    const visibleBranchIds = unique([
      actor.branchId,
      ...(actor.visibleBranchIds ?? []),
    ].filter((branchId): branchId is string => Boolean(branchId)));

    if (filters.branchId) {
      if (!visibleBranchIds.includes(filters.branchId)) {
        throw createAppError('FORBIDDEN', 'No puedes consultar esa sucursal');
      }

      return { ...filters, branchIds: [filters.branchId] };
    }

    return {
      ...filters,
      branchIds: visibleBranchIds.length > 0 ? visibleBranchIds : ['__none__'],
    };
  }

  /**
   * List coverage risks in the requested planning range.
   */
  async listCoverageRisks(
    filters: ScopedPlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<CoverageRiskItem[]> {
    const schedules = await prisma.schedule.findMany({
      where: {
        ...overlapWhere(filters.from, filters.to),
        ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
      },
      select: coverageScheduleSelect,
      orderBy: { startDatetime: 'asc' },
    });

    const assignedUserIds = unique(schedules.flatMap((schedule) =>
      schedule.assignments.map((assignment) => assignment.userId),
    ));
    const approvedVacations = assignedUserIds.length > 0
      ? await prisma.vacationRequest.findMany({
          where: {
            employeeId: { in: assignedUserIds },
            status: 'approved',
            ...vacationOverlapWhere(filters.from, filters.to),
          },
          select: coverageVacationSelect,
        })
      : [];
    const vacationsByUserId = new Map<string, CoverageVacation[]>();
    approvedVacations.forEach((vacation) => {
      const current = vacationsByUserId.get(vacation.employeeId) ?? [];
      current.push(vacation);
      vacationsByUserId.set(vacation.employeeId, current);
    });

    return schedules
      .map((schedule) => toCoverageRisk(schedule, vacationsByUserId))
      .filter((risk): risk is CoverageRiskItem => risk !== null);
  }

  /**
   * List employee availability in the requested planning range.
   */
  async listAvailability(
    filters: ScopedPlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<AvailabilityItem[]> {
    const users = await prisma.user.findMany({
      where: {
        status: 'active',
        ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const userIds = users.map((u) => u.id);

    const schedules = await prisma.schedule.findMany({
      where: {
        ...overlapWhere(filters.from, filters.to),
        assignments: { some: { userId: { in: userIds } } },
      },
      select: {
        id: true,
        startDatetime: true,
        endDatetime: true,
        assignments: { select: { userId: true } },
      },
    });

    const vacations = await prisma.vacationRequest.findMany({
      where: {
        employeeId: { in: userIds },
        status: 'approved',
        ...vacationOverlapWhere(filters.from, filters.to),
      },
      select: {
        id: true,
        employeeId: true,
        startDate: true,
        endDate: true,
      },
    });

    const days = getDaysInRange(filters.from, filters.to);

    // Agrupamos datos por usuario para evitar búsquedas costosas en el bucle anidado
    const schedulesByUserId = new Map<string, typeof schedules>();
    schedules.forEach((s) => {
      s.assignments.forEach((a) => {
        const current = schedulesByUserId.get(a.userId) ?? [];
        current.push(s);
        schedulesByUserId.set(a.userId, current);
      });
    });

    const vacationsByUserId = new Map<string, typeof vacations>();
    vacations.forEach((v) => {
      const current = vacationsByUserId.get(v.employeeId) ?? [];
      current.push(v);
      vacationsByUserId.set(v.employeeId, current);
    });

    return users.map((user) => {
      const userSchedules = schedulesByUserId.get(user.id) ?? [];
      const userVacations = vacationsByUserId.get(user.id) ?? [];

      const availabilityDays = days.map((day) => {
        const dayStart = new Date(day);
        const dayEnd = new Date(day);
        dayEnd.setUTCHours(23, 59, 59, 999);

        // Prioridad: vacaciones > ocupado > disponible
        const isVacation = userVacations.some(
          (v) => v.startDate <= dayEnd && v.endDate >= dayStart,
        );
        if (isVacation) return { date: day.toISOString(), status: 'vacation' as const };

        const isBusy = userSchedules.some(
          (s) => s.startDatetime <= dayEnd && s.endDatetime >= dayStart,
        );
        if (isBusy) return { date: day.toISOString(), status: 'busy' as const };

        return { date: day.toISOString(), status: 'available' as const };
      });

      return {
        userId: user.id,
        userName: user.name || `${user.firstName} ${user.lastName}`.trim(),
        branch: user.branch,
        department: user.department,
        days: availabilityDays,
      };
    });
  }

  /**
   * Build the daily availability matrix in the requested planning range.
   */
  async getAvailabilityMatrix(
    filters: ScopedPlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<AvailabilityMatrix> {
    const users = await prisma.user.findMany({
      where: {
        status: 'active',
        ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const userIds = users.map((u) => u.id);

    const schedules = await prisma.schedule.findMany({
      where: {
        ...overlapWhere(filters.from, filters.to),
        assignments: { some: { userId: { in: userIds } } },
      },
      select: {
        id: true,
        title: true,
        startDatetime: true,
        endDatetime: true,
        assignments: { select: { userId: true } },
      },
    });

    const vacations = await prisma.vacationRequest.findMany({
      where: {
        employeeId: { in: userIds },
        status: 'approved',
        ...vacationOverlapWhere(filters.from, filters.to),
      },
      select: {
        id: true,
        employeeId: true,
        startDate: true,
        endDate: true,
      },
    });

    const days = getDaysInRange(filters.from, filters.to);

    // Agrupamos datos por usuario para evitar búsquedas costosas en el bucle anidado
    const schedulesByUserId = new Map<string, typeof schedules>();
    schedules.forEach((s) => {
      s.assignments.forEach((a) => {
        const current = schedulesByUserId.get(a.userId) ?? [];
        current.push(s);
        schedulesByUserId.set(a.userId, current);
      });
    });

    const vacationsByUserId = new Map<string, typeof vacations>();
    vacations.forEach((v) => {
      const current = vacationsByUserId.get(v.employeeId) ?? [];
      current.push(v);
      vacationsByUserId.set(v.employeeId, current);
    });

    const rows = users.map((user) => {
      const userSchedules = schedulesByUserId.get(user.id) ?? [];
      const userVacations = vacationsByUserId.get(user.id) ?? [];

      const availabilityDays = days.map((day) => {
        const dayStart = new Date(day);
        const dayEnd = new Date(day);
        dayEnd.setUTCHours(23, 59, 59, 999);

        // Prioridad: vacaciones > ocupado > disponible
        const isVacation = userVacations.some(
          (v) => v.startDate <= dayEnd && v.endDate >= dayStart,
        );
        if (isVacation) return { date: day.toISOString(), status: 'vacation' as const, schedules: [] };

        const busySchedules = userSchedules.filter(
          (s) => s.startDatetime <= dayEnd && s.endDatetime >= dayStart,
        );
        if (busySchedules.length > 0) {
          return {
            date: day.toISOString(),
            status: 'busy' as const,
            schedules: busySchedules.map(s => ({ id: s.id, title: s.title })),
          };
        }

        return { date: day.toISOString(), status: 'available' as const, schedules: [] };
      });

      return {
        id: user.id,
        name: user.name || `${user.firstName} ${user.lastName}`.trim(),
        branch: user.branch,
        department: user.department,
        days: availabilityDays,
      };
    });

    return {
      days: days.map(day => day.toISOString()),
      rows: rows,
    };
  }
}

export const planningManager = new PlanningManager();
