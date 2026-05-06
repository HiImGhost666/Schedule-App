/**
 * @file audit.test.ts
 * Tests del motor de auditoría y rollback: protecciones de irreversibilidad, duplicados, snapshots incompletos.
 */

// ── Mocks antes de imports ──────────────────────────────────────────────────
const mockTransaction = {
  schedule: { upsert: jest.fn() },
  user: { update: jest.fn(), upsert: jest.fn() },
  webhookConfig: { delete: jest.fn(), upsert: jest.fn() },
  auditLog: { update: jest.fn() },
  department: { upsert: jest.fn(), delete: jest.fn() },
  departmentBranch: { deleteMany: jest.fn(), createMany: jest.fn() },
};

jest.mock('../src/modules/audit/audit.repository');
jest.mock('../src/modules/schedules/schedules.repository');
jest.mock('../src/modules/users/users.repository');
jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn((fn: any) => fn(mockTransaction)),
}));

import * as auditRepo from '../src/modules/audit/audit.repository';
import { rollbackAudit, getAuditLogById, listAuditLogs } from '../src/modules/audit/audit.service';
import { IRREVERSIBLE_ACTIONS } from '../src/modules/audit/domain/audit.types';
import * as usersRepo from '../src/modules/users/users.repository';

const mockAuditRepo = auditRepo as jest.Mocked<typeof auditRepo>;
const mockUsersRepo = usersRepo as jest.Mocked<typeof usersRepo>;

// ── Helper ────────────────────────────────────────────────────────────────────
const buildLog = (overrides: Record<string, any> = {}) => ({
  id: 'log-1',
  userId: 'user-1',
  action: 'UPDATE',
  entityType: 'User',
  entityId: 'user-99',
  detailsJson: JSON.stringify({
    before: { id: 'user-99', name: 'Anterior', email: 'ant@test.com', roleId: 'role-viewer-id', status: 'active' },
    after: { id: 'user-99', name: 'Posterior', email: 'ant@test.com', roleId: 'role-admin-id', status: 'active' },
  }),
  ipAddress: '127.0.0.1',
  createdAt: new Date(),
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('rollbackAudit', () => {
  beforeEach(() => {
    mockAuditRepo.createAuditLog.mockResolvedValue({
      id: 'rollback-log',
      createdAt: new Date(),
      userId: 'admin-id',
    } as any);
  });

  // ── Caso: Log no encontrado (404) ─────────────────────────────────────────
  it('lanza NOT_FOUND si el log de auditoría no existe', async () => {
    mockAuditRepo.findAuditLogById.mockResolvedValue(null as any);

    await expect(rollbackAudit('nonexistent-id', 'admin', '127.0.0.1'))
      .rejects.toThrow('Log no encontrado');
  });

  // ── Caso: Intentar revertir acciones IRREVERSIBLES ─────────────────────────
  // Probamos cada acción de la lista de inflexibilidad negocial
  IRREVERSIBLE_ACTIONS.forEach((action) => {
    it(`bloquea el rollback de la acción irreversible: "${action}"`, async () => {
      mockAuditRepo.findAuditLogById.mockResolvedValue(
        buildLog({ action, detailsJson: JSON.stringify({ before: { id: 'x' } }) }) as any
      );
      mockAuditRepo.createAuditLog.mockResolvedValue(undefined as any);

      await expect(rollbackAudit('log-1', 'admin', '127.0.0.1'))
        .rejects.toThrow(/no puede ser revertida/);
    });
  });

  // ── Caso: Log sin snapshot "before" → no rollbackeable ───────────────────
  it('rechaza rollback de un log UPDATE sin información "before" en detailsJson', async () => {
    mockAuditRepo.findAuditLogById.mockResolvedValue(
      buildLog({ action: 'UPDATE', detailsJson: JSON.stringify({ after: { id: 'x' } }) }) as any // sin before
    );

    await expect(rollbackAudit('log-1', 'admin', '127.0.0.1'))
      .rejects.toThrow(/snapshot/i);
  });

  // ── Caso: Log con detailsJson = null → también rechazado ─────────────────
  it('rechaza rollback cuando detailsJson es null (log incompleto)', async () => {
    mockAuditRepo.findAuditLogById.mockResolvedValue(
      buildLog({ action: 'UPDATE', detailsJson: null }) as any
    );

    await expect(rollbackAudit('log-1', 'admin', '127.0.0.1'))
      .rejects.toThrow();
  });

  // ── Caso: Rollback de usuario recalcula derivedUsername ───────────────────
  it('recalcula el derivedUsername al revertir un UPDATE_USER a un email normal', async () => {
    const logWithUserUpdate = buildLog({
      action: 'UPDATE_USER',
      entityType: 'User',
      detailsJson: JSON.stringify({
        before: { email: 'restaurado@example.com', name: 'Nombre Viejo' },
        after: { email: 'cambiado@example.com', name: 'Nombre Nuevo' },
      }),
    });
    mockAuditRepo.findAuditLogById.mockResolvedValue(logWithUserUpdate as any);

    await rollbackAudit('log-1', 'admin-id');

    expect(mockUsersRepo.updateUserRecord).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        email: 'restaurado@example.com',
        derivedUsername: 'restaurado',
      }),
      expect.anything()
    );
  });

  it('maneja el derivedUsername para emails anonimizados (revoked_) en un rollback', async () => {
    const logWithUserUpdate = buildLog({
      action: 'UPDATE_USER',
      entityType: 'User',
      detailsJson: JSON.stringify({
        before: { email: 'revoked_12345_test@example.com', name: 'Usuario Revocado' },
      }),
    });
    mockAuditRepo.findAuditLogById.mockResolvedValue(logWithUserUpdate as any);

    await rollbackAudit('log-1', 'admin-id');

    expect(mockUsersRepo.updateUserRecord).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ derivedUsername: 'revoked_12345_test@example.com' }),
      expect.anything()
    );
  });

  it('restaura un Department con sus branchIds al hacer rollback de un UPDATE_DEPARTMENT', async () => {
    mockAuditRepo.findAuditLogById.mockResolvedValue(
      buildLog({
        action: 'UPDATE_DEPARTMENT',
        entityType: 'Department',
        entityId: 'dept-1',
        detailsJson: JSON.stringify({
          before: {
            id: 'dept-1',
            name: 'Recursos Humanos',
            code: 'RH01',
            description: 'Equipo interno',
            isActive: true,
            branchIds: ['branch-1', 'branch-2'],
          },
          after: {
            id: 'dept-1',
            name: 'RRHH',
            code: 'RH02',
            description: 'Equipo interno nuevo',
            isActive: true,
            branchIds: ['branch-2'],
          },
        }),
      }) as any,
    );

    await rollbackAudit('log-1', 'admin-id');

    expect(mockTransaction.department.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'dept-1' },
      create: expect.objectContaining({
        id: 'dept-1',
        name: 'Recursos Humanos',
        code: 'RH01',
      }),
      update: expect.objectContaining({
        name: 'Recursos Humanos',
        code: 'RH01',
      }),
    }));
    expect(mockTransaction.departmentBranch.deleteMany).toHaveBeenCalledWith({ where: { departmentId: 'dept-1' } });
    expect(mockTransaction.departmentBranch.createMany).toHaveBeenCalledWith({
      data: [
        { departmentId: 'dept-1', branchId: 'branch-1' },
        { departmentId: 'dept-1', branchId: 'branch-2' },
      ],
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('getAuditLogById', () => {
  // ── Caso: Log no encontrado ──────────────────────────────────────────────
  it('lanza NOT_FOUND si el id de auditoría no existe en BD', async () => {
    mockAuditRepo.findAuditLogById.mockResolvedValue(null as any);

    await expect(getAuditLogById('ghost-id'))
      .rejects.toThrow('Registro de auditoría no encontrado');
  });

  // ── Caso: Retorna el log decodificado ─────────────────────────────────────
  it('devuelve el log con detailsJson parseado desde string a objeto', async () => {
    const rawLog = buildLog();
    mockAuditRepo.findAuditLogById.mockResolvedValue(rawLog as any);

    const result = await getAuditLogById('log-1');

    expect(result.id).toBe('log-1');
    // detailsJson debe venir como objeto, no como string crudo
    expect(typeof result.detailsJson).toBe('object');
    expect((result.detailsJson as any).before).toBeDefined();
  });
});

describe('listAuditLogs', () => {
  beforeEach(() => {
    mockAuditRepo.findAuditLogs.mockResolvedValue({ logs: [], total: 0 } as any);
  });

  it('usa orden por defecto createdAt desc cuando no se envía sort', async () => {
    await listAuditLogs({ page: 1, limit: 20 });

    expect(mockAuditRepo.findAuditLogs).toHaveBeenCalledWith(
      expect.any(Object),
      1,
      20,
      'createdAt',
      'desc',
    );
  });

  it('propaga sortBy/sortOrder hacia repositorio', async () => {
    await listAuditLogs({
      page: 3,
      limit: 15,
      sortBy: 'action',
      sortOrder: 'asc',
    });

    expect(mockAuditRepo.findAuditLogs).toHaveBeenCalledWith(
      expect.any(Object),
      3,
      15,
      'action',
      'asc',
    );
  });
});
