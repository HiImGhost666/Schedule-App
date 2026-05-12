import { planningManager } from '../src/modules/planning/planning.manager';
import { prismaMock } from './singleton';

const filters = {
  from: new Date('2026-05-12T00:00:00.000Z'),
  to: new Date('2026-05-18T23:59:59.999Z'),
  branchIds: ['branch-1'],
};

const actor = {
  id: 'manager-1',
  roleName: 'general_manager',
  branchId: 'branch-1',
  departmentId: 'department-1',
  permissions: ['schedules:view'],
};

function buildSchedule(assignmentCount: number, overrides: { id?: string; title?: string } = {}) {
  return {
    id: overrides.id ?? `schedule-${assignmentCount}`,
    title: overrides.title ?? `Turno ${assignmentCount}`,
    startDatetime: new Date('2026-05-12T08:00:00.000Z'),
    endDatetime: new Date('2026-05-12T16:00:00.000Z'),
    branch: { id: 'branch-1', name: 'Sucursal 1' },
    assignments: Array.from({ length: assignmentCount }, (_, index) => ({ userId: `user-${index + 1}` })),
  };
}

describe('PlanningManager.listCoverageRisks', () => {
  it('returns high risk for schedules without assignments', async () => {
    prismaMock.schedule.findMany.mockResolvedValue([buildSchedule(0)] as never);

    const risks = await planningManager.listCoverageRisks(filters, actor);

    expect(risks).toEqual([
      {
        severity: 'high',
        reasons: ['Turno descubierto'],
        schedule: {
          id: 'schedule-0',
          title: 'Turno 0',
          startDatetime: '2026-05-12T08:00:00.000Z',
          endDatetime: '2026-05-12T16:00:00.000Z',
          branch: { id: 'branch-1', name: 'Sucursal 1' },
        },
      },
    ]);
  });

  it('returns medium risk for schedules with a single assignment', async () => {
    prismaMock.schedule.findMany.mockResolvedValue([buildSchedule(1)] as never);

    const risks = await planningManager.listCoverageRisks(filters, actor);

    expect(risks).toHaveLength(1);
    expect(risks[0]).toMatchObject({
      severity: 'medium',
      reasons: ['Turno con una sola persona asignada'],
      schedule: { id: 'schedule-1' },
    });
  });

  it('filters out schedules with two or more assignments', async () => {
    prismaMock.schedule.findMany.mockResolvedValue([
      buildSchedule(0, { id: 'uncovered' }),
      buildSchedule(2, { id: 'covered' }),
    ] as never);

    const risks = await planningManager.listCoverageRisks(filters, actor);

    expect(risks.map((risk) => risk.schedule.id)).toEqual(['uncovered']);
  });

  it('queries schedules by date overlap and scoped branches in a single query', async () => {
    prismaMock.schedule.findMany.mockResolvedValue([] as never);

    await planningManager.listCoverageRisks(filters, actor);

    expect(prismaMock.schedule.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.schedule.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { startDatetime: { lte: filters.to } },
          { endDatetime: { gte: filters.from } },
        ],
        branchId: { in: ['branch-1'] },
      },
      select: expect.objectContaining({
        id: true,
        title: true,
        assignments: { select: { userId: true } },
      }),
      orderBy: { startDatetime: 'asc' },
    });
  });
});
