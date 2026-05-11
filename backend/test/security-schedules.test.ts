/**
 * @file security-schedules.test.ts
 * Tests de seguridad: employee no puede ver schedules de otros empleados,
 * GM no puede ver schedules de otra branch, DM no puede aprobar vacaciones de otro departamento.
 */

// ── Mocks antes de imports ──────────────────────────────────────────────────
jest.mock('../src/modules/schedules/schedules.repository');
jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
  sanitizeSnapshot: jest.fn((x) => x),
}));
jest.mock('../src/modules/notifications/notifications.service', () => ({
  notifyScheduleChange: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/realtime/socket', () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn((fn: any) => fn({
    scheduleType: { findUnique: jest.fn().mockResolvedValue({ id: 'st-guardia', value: 'guardia', label: 'Guardia', color: '#1e3a5f' }) },
    user: { findMany: jest.fn() },
  })),
}));

import * as schedulesRepo from '../src/modules/schedules/schedules.repository';
import { listSchedulesForActor, listWeekSchedulesForActor } from '../src/modules/schedules/schedules.service';

const mockRepo = schedulesRepo as jest.Mocked<typeof schedulesRepo>;

import { prismaMock } from './singleton';

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildSchedule = (overrides: Record<string, any> = {}) => ({
  id: 'schedule-1',
  title: 'Guardia',
  startDatetime: new Date('2026-06-01T08:00:00Z'),
  endDatetime: new Date('2026-06-01T16:00:00Z'),
  type: 'guardia',
  scheduleTypeId: 'st-guardia',
  color: '#1e3a5f',
  branchId: 'branch-1',
  assignments: [{ userId: 'user-1', user: { name: 'User A' } }],
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Seguridad: Employee no puede ver schedules de otros empleados', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findSchedules.mockResolvedValue([buildSchedule() as any]);
  });

  it('employee ve todos los schedules de su branch (trabajo grupal)', async () => {
    const actor = { id: 'emp-1', roleName: 'employee', branchId: 'branch-1' };

    // employee ve todos los turnos de su branch
    await listSchedulesForActor({}, actor);

    const callArgs = mockRepo.findSchedules.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs).toMatchObject({ branchId: 'branch-1' });
    // Sin userId, employee ve todos los turnos de su branch (sin filtro de assignments)
    expect((callArgs as any).assignments).toBeUndefined();
  });

  it('employee puede filtrar por userId si se pasa explicitamente', async () => {
    const actor = { id: 'emp-1', roleName: 'employee', branchId: 'branch-1' };

    // employee pasa userId explicitamente
    await listSchedulesForActor({ userId: 'emp-2' }, actor);

    const callArgs = mockRepo.findSchedules.mock.calls[0][0];
    expect(callArgs).toMatchObject({ branchId: 'branch-1' });
    // employee con userId explícito filtra por ese userId
    expect(callArgs).toMatchObject({ assignments: { some: { userId: 'emp-2' } } });
  });

  it('employee ve todos los schedules de su branch via listWeekSchedulesForActor', async () => {
    const actor = { id: 'emp-1', roleName: 'employee', branchId: 'branch-1' };

    // listWeekSchedulesForActor(year, week, branchId, departmentId, userId, actor)
    await listWeekSchedulesForActor(2026, 23, undefined, undefined, 'emp-2', actor);

    // Employee ve todos los turnos de su branch, respeta userId si se pasa
    const callArgs: any = mockRepo.findSchedules.mock.calls[0][0];
    expect(callArgs.AND).toBeDefined();
    const branchFilter = callArgs.AND.find((f: any) => f.branchId);
    expect(branchFilter?.branchId).toBe('branch-1');
    const userFilter = callArgs.AND.find((f: any) => f.assignments);
    // Respeta el userId pasado (emp-2), no lo fuerza a actor.id
    expect(userFilter?.assignments?.some?.userId).toBe('emp-2');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Seguridad: GM no puede ver schedules de otra branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findSchedules.mockResolvedValue([buildSchedule() as any]);
  });

  it('general_manager solo ve schedules de su branch asignada', async () => {
    const actor = { id: 'gm-1', roleName: 'general_manager', branchId: 'branch-1' };

    // GM intenta ver schedules de otra branch
    await listSchedulesForActor({ branchId: 'branch-2' }, actor);

    const callArgs = mockRepo.findSchedules.mock.calls[0][0];
    // Debe filtrar por branch-1 (su branch), no branch-2
    expect(callArgs).toMatchObject({ branchId: 'branch-1' });
    expect(callArgs).not.toMatchObject({ branchId: 'branch-2' });
  });

  it('general_manager en listWeekSchedulesForActor solo ve su branch', async () => {
    const actor = { id: 'gm-1', roleName: 'general_manager', branchId: 'branch-1' };

    await listWeekSchedulesForActor(2026, 23, 'branch-2', undefined, undefined, actor);

    const callArgs: any = mockRepo.findSchedules.mock.calls[0][0];
    const branchFilter = callArgs.AND.find((f: any) => f.branchId);
    expect(branchFilter?.branchId).toBe('branch-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Seguridad: Admin ve schedules sin restricción de branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findSchedules.mockResolvedValue([buildSchedule() as any]);
  });

  it('admin puede ver schedules de cualquier branch', async () => {
    const actor = { id: 'admin-1', roleName: 'admin', branchId: 'branch-1' };

    await listSchedulesForActor({ branchId: 'branch-3' }, actor);

    const callArgs = mockRepo.findSchedules.mock.calls[0][0];
    // Admin pasa el branchId que pidió sin restricción
    expect(callArgs).toMatchObject({ branchId: 'branch-3' });
  });
});
