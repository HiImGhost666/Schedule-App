/**
 * @file audit.test.ts
 * Tests del motor de auditoría y rollback: protecciones de irreversibilidad, duplicados, snapshots incompletos.
 */

// ── Mocks antes de imports ──────────────────────────────────────────────────
jest.mock('../src/modules/audit/audit.repository');
jest.mock('../src/modules/schedules/schedules.repository');
jest.mock('../src/modules/users/users.repository');
jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn((fn: any) => fn({ schedule: { upsert: jest.fn() }, user: { upsert: jest.fn() } })),
}));

import * as auditRepo from '../src/modules/audit/audit.repository';
import { rollbackAudit, getAuditLogById } from '../src/modules/audit/audit.service';
import { IRREVERSIBLE_ACTIONS } from '../src/modules/audit/domain/audit.types';

const mockAuditRepo = auditRepo as jest.Mocked<typeof auditRepo>;

// ── Helper ────────────────────────────────────────────────────────────────────
const buildLog = (overrides: Record<string, any> = {}) => ({
  id: 'log-1',
  userId: 'user-1',
  action: 'UPDATE',
  entityType: 'User',
  entityId: 'user-99',
  detailsJson: JSON.stringify({
    before: { id: 'user-99', name: 'Anterior', email: 'ant@test.com', role: 'viewer', status: 'active' },
    after: { id: 'user-99', name: 'Posterior', email: 'ant@test.com', role: 'admin', status: 'active' },
  }),
  ipAddress: '127.0.0.1',
  createdAt: new Date(),
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('rollbackAudit', () => {
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
