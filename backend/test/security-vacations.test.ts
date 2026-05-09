/**
 * @file security-vacations.test.ts
 * Tests de seguridad: DM no puede aprobar vacaciones de otro departamento,
 * permisos de webhooks y settings.
 */

// ── Mocks antes de imports ──────────────────────────────────────────────────
jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
  sanitizeSnapshot: jest.fn((x) => x),
}));
jest.mock('../src/realtime/socket', () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock('../src/modules/notifications/notifications.service', () => ({
  notifyScheduleChange: jest.fn().mockResolvedValue(undefined),
  notifyVacationChange: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/modules/in-app-notifications/in-app.service', () => ({
  createInAppNotification: jest.fn().mockResolvedValue(undefined),
}));

import { prismaMock } from './singleton';
import { approveVacationEntry } from '../src/modules/vacations/vacations.service';

// ═══════════════════════════════════════════════════════════════════════════════
describe('Seguridad: DM no puede aprobar vacaciones de otro departamento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('department_manager puede aprobar vacaciones de su propio departamento', async () => {
    const actor = {
      id: 'dm-1',
      roleName: 'department_manager',
      email: 'dm@test.com',
      name: 'DM',
      branchId: 'branch-1',
      departmentId: 'dept-1',
      ipAddress: '127.0.0.1',
    };

    // Mock: la solicitud de vacaciones pertenece a un usuario del mismo departamento
    (prismaMock as any).vacationRequest.findUnique.mockResolvedValue({
      id: 'vac-1',
      userId: 'user-1',
      employeeId: 'user-1',
      status: 'pending',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-05'),
      branchId: 'branch-1',
      departmentId: 'dept-1',
      user: {
        id: 'user-1',
        departmentId: 'dept-1',
        department: { id: 'dept-1', name: 'Mi Depto' },
      },
    });

    // Mock: el DM pertenece al mismo departamento
    (prismaMock as any).user.findUnique.mockResolvedValue({
      id: 'dm-1',
      departmentId: 'dept-1',
    });

    // Mock: update
    (prismaMock as any).vacationRequest.update.mockResolvedValue({});

    await expect(
      approveVacationEntry('vac-1', { note: 'aprobado' }, actor)
    ).resolves.not.toThrow();
  });

  it('department_manager NO puede aprobar vacaciones de otro departamento', async () => {
    const actor = {
      id: 'dm-1',
      roleName: 'department_manager',
      email: 'dm@test.com',
      name: 'DM',
      branchId: 'branch-1',
      departmentId: 'dept-1',
      ipAddress: '127.0.0.1',
    };

    // Mock: la solicitud pertenece a un usuario de OTRO departamento
    (prismaMock as any).vacationRequest.findUnique.mockResolvedValue({
      id: 'vac-2',
      userId: 'user-2',
      employeeId: 'user-2',
      status: 'pending',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-05'),
      branchId: 'branch-1',
      departmentId: 'dept-2',
      user: {
        id: 'user-2',
        departmentId: 'dept-2',
        department: { id: 'dept-2', name: 'Otro Depto' },
      },
    });

    // Mock: el DM pertenece a dept-1
    (prismaMock as any).user.findUnique.mockResolvedValue({
      id: 'dm-1',
      departmentId: 'dept-1',
    });

    await expect(
      approveVacationEntry('vac-2', { note: 'aprobado' }, actor)
    ).rejects.toThrow(/departamento/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Permisos: Webhooks endpoints requieren webhooks:view/webhooks:manage', () => {
  it('webhooks:view existe en DEFAULT_ROLE_PERMISSIONS para general_manager', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DEFAULT_ROLE_PERMISSIONS } = require('../src/modules/roles/roles.constants');
    const gmPerms = DEFAULT_ROLE_PERMISSIONS.general_manager;
    expect(gmPerms).toContain('webhooks:view');
  });

  it('webhooks:manage NO está en DEFAULT_ROLE_PERMISSIONS para general_manager', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DEFAULT_ROLE_PERMISSIONS } = require('../src/modules/roles/roles.constants');
    const gmPerms = DEFAULT_ROLE_PERMISSIONS.general_manager;
    expect(gmPerms).not.toContain('webhooks:manage');
  });

  it('settings:manage existe en DEFAULT_ROLE_PERMISSIONS para admin', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DEFAULT_ROLE_PERMISSIONS } = require('../src/modules/roles/roles.constants');
    const adminPerms = DEFAULT_ROLE_PERMISSIONS.admin;
    expect(adminPerms).toContain('settings:manage');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Notificaciones in-app', () => {
  it('se crea notificación al aprobar vacaciones', async () => {
    const createInAppNotification = jest.requireMock('../src/modules/in-app-notifications/in-app.service')
      .createInAppNotification;

    const actor = {
      id: 'admin-1',
      roleName: 'admin',
      email: 'admin@test.com',
      name: 'Admin',
      branchId: 'branch-1',
      ipAddress: '127.0.0.1',
    };

    (prismaMock as any).vacationRequest.findUnique.mockResolvedValue({
      id: 'vac-3',
      userId: 'user-1',
      employeeId: 'user-1',
      status: 'pending',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-05'),
      branchId: 'branch-1',
      departmentId: 'dept-1',
      user: { id: 'user-1', departmentId: 'dept-1', department: { id: 'dept-1', name: 'Depto' } },
    });

    (prismaMock as any).user.findUnique.mockResolvedValue({
      id: 'admin-1',
      departmentId: 'dept-1',
    });

    (prismaMock as any).vacationRequest.update.mockResolvedValue({});

    await approveVacationEntry('vac-3', { note: 'aprobado' }, actor);

    expect(createInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'vacation_approved' })
    );
  });
});
