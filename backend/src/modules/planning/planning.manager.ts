import type {
  AvailabilityItem,
  AvailabilityMatrix,
  CrisisModeSummary,
  CoverageRiskItem,
  EquityItem,
  PlanningActor,
  PlanningRangeFilters,
  SubstituteSuggestion,
  ScopedPlanningRangeFilters,
  TemplatePreviewDay,
  TimelineItem,
} from './planning.types';
import { createAppError } from '../../common/errors/error-catalog';
import { prisma } from '../../config/database';
import type { Prisma } from '@prisma/client';
import type { NotificationPreferencesInput, SupportRequestInput } from './planning.validation';

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

function hoursBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / 36e5);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
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

const planningUserSelect = {
  id: true,
  name: true,
  email: true,
  branchId: true,
  departmentId: true,
  branch: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  skills: {
    include: {
      skill: {
        select: { id: true, name: true, category: true, color: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

type PlanningUser = Prisma.UserGetPayload<{ select: typeof planningUserSelect }>;

function toPlanningSkills(user: PlanningUser) {
  return user.skills.map((entry) => entry.skill);
}

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
   * Load active users visible to the current planning query.
   */
  async listUsersInScope(filters: ScopedPlanningRangeFilters): Promise<PlanningUser[]> {
    return prisma.user.findMany({
      where: {
        status: 'active',
        ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      select: planningUserSelect,
      orderBy: { name: 'asc' },
    });
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
    const users = await this.listUsersInScope(filters);

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
        userName: user.name,
        email: user.email,
        branch: user.branch,
        department: user.department,
        skills: toPlanningSkills(user),
        status: userVacations.length > 0 ? 'vacation' : userSchedules.length > 0 ? 'busy' : 'available',
        schedulesCount: userSchedules.length,
        vacationsCount: userVacations.length,
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
    const users = await this.listUsersInScope(filters);

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
        name: user.name,
        branch: user.branch,
        department: user.department,
        skills: toPlanningSkills(user),
        days: availabilityDays,
      };
    });

    return {
      days: days.map(day => day.toISOString()),
      rows: rows,
    };
  }

  /**
   * Rank available substitutes using required skills and recent workload.
   */
  async listSubstituteSuggestions(
    filters: ScopedPlanningRangeFilters & { skillIds?: string[] },
    actor: PlanningActor,
  ): Promise<SubstituteSuggestion[]> {
    const availability = await this.listAvailability(filters, actor);
    const requiredSkillIds = new Set(filters.skillIds ?? []);
    const userIds = availability.map((user) => user.userId);
    const lookback = new Date(filters.from.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentAssignments = userIds.length > 0
      ? await prisma.scheduleAssignment.findMany({
          where: {
            userId: { in: userIds },
            schedule: {
              startDatetime: { gte: lookback },
              endDatetime: { lte: filters.to },
            },
          },
          include: { schedule: true },
        })
      : [];

    const statsByUserId = new Map<string, { hours: number; weekends: number; urgent: number }>();
    recentAssignments.forEach((item) => {
      const current = statsByUserId.get(item.userId) ?? { hours: 0, weekends: 0, urgent: 0 };
      current.hours += hoursBetween(item.schedule.startDatetime, item.schedule.endDatetime);
      if (isWeekend(item.schedule.startDatetime)) current.weekends += 1;
      if (item.schedule.isLastMinute) current.urgent += 1;
      statsByUserId.set(item.userId, current);
    });

    return availability
      .filter((user) => user.status === 'available')
      .map((user) => {
        const skills = user.skills ?? [];
        const matchedSkills = skills.filter((skill) => requiredSkillIds.has(skill.id));
        const equity = statsByUserId.get(user.userId) ?? { hours: 0, weekends: 0, urgent: 0 };
        const sameBranchBonus = user.branch?.id && filters.branchIds?.includes(user.branch.id) ? 6 : 0;
        const skillScore = requiredSkillIds.size === 0 ? 4 : matchedSkills.length * 12;
        const loadPenalty = Math.floor(equity.hours / 20) + (equity.weekends * 2) + (equity.urgent * 2);
        const score = Math.max(0, skillScore + sameBranchBonus - loadPenalty);

        return {
          id: user.userId,
          name: user.userName,
          email: user.email ?? '',
          branch: user.branch,
          department: user.department,
          skills,
          matchedSkills,
          score,
          equity,
          reasons: [
            matchedSkills.length > 0
              ? `${matchedSkills.length} skill(s) coinciden`
              : requiredSkillIds.size > 0
                ? 'Sin skills requeridas'
                : 'Disponible en el rango',
            sameBranchBonus > 0 ? 'Misma sucursal visible' : 'Sucursal de apoyo',
            `${Math.round(equity.hours)}h recientes, ${equity.weekends} finde, ${equity.urgent} urgentes`,
          ],
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));
  }

  /**
   * Calculate fairness indicators for visible users.
   */
  async listEquity(filters: ScopedPlanningRangeFilters): Promise<EquityItem[]> {
    const users = await this.listUsersInScope(filters);
    const userIds = users.map((user) => user.id);

    const [assignments, vacations] = await Promise.all([
      userIds.length > 0
        ? prisma.scheduleAssignment.findMany({
            where: { userId: { in: userIds }, schedule: overlapWhere(filters.from, filters.to) },
            include: { schedule: true },
          })
        : [],
      userIds.length > 0
        ? prisma.vacationRequest.findMany({
            where: {
              employeeId: { in: userIds },
              ...vacationOverlapWhere(filters.from, filters.to),
            },
          })
        : [],
    ]);

    return users
      .map((user) => {
        const ownAssignments = assignments.filter((item) => item.userId === user.id);
        const ownVacations = vacations.filter((item) => item.employeeId === user.id);
        const totalHours = ownAssignments.reduce(
          (sum, item) => sum + hoursBetween(item.schedule.startDatetime, item.schedule.endDatetime),
          0,
        );

        return {
          id: user.id,
          name: user.name,
          branch: user.branch,
          department: user.department,
          totalHours,
          overtimeEstimate: Math.max(0, totalHours - 40),
          weekendShifts: ownAssignments.filter((item) => isWeekend(item.schedule.startDatetime)).length,
          urgentShifts: ownAssignments.filter((item) => item.schedule.isLastMinute).length,
          approvedVacations: ownVacations.filter((item) => item.status === 'approved').length,
          rejectedVacations: ownVacations.filter((item) => item.status === 'rejected').length,
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);
  }

  /**
   * Build a unified operational timeline.
   */
  async listTimeline(filters: ScopedPlanningRangeFilters): Promise<TimelineItem[]> {
    const [schedules, vacations, holidays] = await Promise.all([
      prisma.schedule.findMany({
        where: {
          ...overlapWhere(filters.from, filters.to),
          ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
        },
        select: {
          id: true,
          title: true,
          startDatetime: true,
          branch: { select: { id: true, name: true } },
          assignments: { select: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { startDatetime: 'asc' },
      }),
      prisma.vacationRequest.findMany({
        where: {
          status: 'approved',
          ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
          ...vacationOverlapWhere(filters.from, filters.to),
        },
        select: {
          startDate: true,
          branchId: true,
          employee: { select: { id: true, name: true } },
        },
        orderBy: { startDate: 'asc' },
      }),
      prisma.branchHoliday.findMany({
        where: {
          isActive: true,
          ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
          date: { gte: filters.from, lte: filters.to },
        },
        select: {
          date: true,
          name: true,
          branch: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    return [
      ...holidays.map((item): TimelineItem => ({
        type: 'holiday',
        at: item.date.toISOString(),
        title: item.name,
        branch: item.branch,
        severity: 'info',
      })),
      ...vacations.map((item): TimelineItem => ({
        type: 'vacation',
        at: item.startDate.toISOString(),
        title: `${item.employee.name} de vacaciones`,
        branchId: item.branchId,
        severity: 'info',
      })),
      ...schedules.map((item): TimelineItem => ({
        type: 'schedule',
        at: item.startDatetime.toISOString(),
        title: item.title,
        branch: item.branch,
        severity: item.assignments.length === 0 ? 'high' : item.assignments.length === 1 ? 'medium' : 'normal',
        assignees: item.assignments.map((assignment) => assignment.user),
      })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  /**
   * Summarize high-risk planning signals for crisis mode.
   */
  async getCrisisSummary(filters: ScopedPlanningRangeFilters, actor: PlanningActor): Promise<CrisisModeSummary> {
    const [risks, equity, timeline] = await Promise.all([
      this.listCoverageRisks(filters, actor),
      this.listEquity(filters),
      this.listTimeline(filters),
    ]);

    return {
      highRisks: risks.filter((risk) => risk.severity === 'high'),
      mediumRisks: risks.filter((risk) => risk.severity === 'medium'),
      overloaded: equity
        .filter((item) => item.overtimeEstimate > 0 || item.weekendShifts > 1 || item.urgentShifts > 1)
        .slice(0, 8),
      today: timeline
        .filter((item) => item.severity === 'high' || item.severity === 'medium')
        .slice(0, 10),
    };
  }

  /**
   * Preview coverage candidates for each day in the requested range.
   */
  async getTemplatePreview(
    filters: ScopedPlanningRangeFilters & { skillIds?: string[]; minCoverage: number },
    actor: PlanningActor,
  ): Promise<TemplatePreviewDay[]> {
    const matrix = await this.getAvailabilityMatrix(filters, actor);
    const requiredSkillIds = new Set(filters.skillIds ?? []);
    const minCoverage = Math.max(1, filters.minCoverage);

    return matrix.days.map((date) => {
      const available = matrix.rows
        .filter((row) => row.days.find((day) => day.date === date)?.status === 'available')
        .map((row) => {
          const matchedSkills = row.skills.filter((skill) => requiredSkillIds.has(skill.id));
          return {
            id: row.id,
            name: row.name,
            branch: row.branch,
            department: row.department,
            matchedSkills,
            score: requiredSkillIds.size > 0 ? matchedSkills.length * 10 : 3,
          };
        })
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));

      return {
        date,
        minCoverage,
        recommended: available.slice(0, minCoverage),
        backups: available.slice(minCoverage, minCoverage + 3),
        status: available.length >= minCoverage ? 'covered' : available.length > 0 ? 'partial' : 'uncovered',
      };
    });
  }

  /**
   * List support requests in the visible planning scope.
   */
  async listSupportRequests(filters: ScopedPlanningRangeFilters) {
    return prisma.supportRequest.findMany({
      where: {
        ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        AND: [
          { startDate: { lte: filters.to } },
          { endDate: { gte: filters.from } },
        ],
      },
      include: {
        requester: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a support request for a visible branch.
   */
  async createSupportRequest(input: SupportRequestInput, actor: PlanningActor) {
    await this.resolveScopedFilters({
      from: input.startDate,
      to: input.endDate,
      branchId: input.branchId,
      departmentId: input.departmentId ?? undefined,
    }, actor);

    const target = await prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true },
    });
    if (!target) throw createAppError('NOT_FOUND', 'Empleado de apoyo no encontrado');

    return prisma.supportRequest.create({
      data: {
        requesterId: actor.id,
        targetUserId: input.targetUserId,
        branchId: input.branchId,
        departmentId: input.departmentId || null,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason?.trim() || null,
      },
      include: {
        requester: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Review or cancel a support request after checking branch visibility.
   */
  async reviewSupportRequest(id: string, status: 'accepted' | 'rejected' | 'cancelled', actor: PlanningActor) {
    const existing = await prisma.supportRequest.findUnique({ where: { id } });
    if (!existing) throw createAppError('NOT_FOUND', 'Solicitud de apoyo no encontrada');

    await this.resolveScopedFilters({
      from: existing.startDate,
      to: existing.endDate,
      branchId: existing.branchId,
      departmentId: existing.departmentId ?? undefined,
    }, actor);

    return prisma.supportRequest.update({
      where: { id },
      data: { status, reviewedBy: actor.id, reviewedAt: new Date() },
      include: {
        requester: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Read preferences, creating defaults for first-time users.
   */
  async getNotificationPreferences(actor: PlanningActor) {
    return prisma.userNotificationPreference.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id },
      update: {},
    });
  }

  /**
   * Update notification preferences for the current actor.
   */
  async updateNotificationPreferences(
    actor: PlanningActor,
    data: NotificationPreferencesInput,
  ) {
    return prisma.userNotificationPreference.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, ...data },
      update: data,
    });
  }
}

export const planningManager = new PlanningManager();
