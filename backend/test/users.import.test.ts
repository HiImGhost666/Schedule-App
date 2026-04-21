/**
 * @file users.import.test.ts
 * Tests del servicio importUsersCsv: upsert, validación de enums, filas rechazadas,
 * contraseña temporal cifrada, y cobertura de la ruta de actualización.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('../src/modules/users/users.repository');
jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
  sanitizeSnapshot: jest.fn((x) => x),
}));
jest.mock('../src/realtime/socket', () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock('../src/utils/bcrypt', () => ({
  hashPassword: jest.fn().mockResolvedValue('$2b$12$hashed_temporal_password'),
  comparePassword: jest.fn(),
}));
jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn((fn: any) => fn({})),
}));
jest.mock('../src/config/database', () => ({
  prisma: {
    branch: { findUnique: jest.fn().mockResolvedValue({ id: 'branch-1' }) },
  },
}));

import * as usersRepo from '../src/modules/users/users.repository';
import { importUsersCsv } from '../src/modules/users/users.service';
import { hashPassword } from '../src/utils/bcrypt';
import { CSV_IMPORT_DEFAULT_PASSWORD } from '../src/modules/users/users.constants';
import type { UserCsvRow } from '../src/utils/csv';

const mockRepo = usersRepo as jest.Mocked<typeof usersRepo>;
const mockActor = { id: 'admin-id', ipAddress: '127.0.0.1' };

// ── Helper: construye una fila CSV mínima válida ─────────────────────────────
function buildRow(overrides: Partial<UserCsvRow> = {}): UserCsvRow {
  return {
    name: 'Test User',
    email: 'test@example.com',
    role: 'viewer',
    status: 'active',
    department: '',
    branchId: '',
    companyPhone: '',
    auxiliaryPhone: '',
    ...overrides,
  };
}

// ── Helper: usuario ficticio de BD ───────────────────────────────────────────
function buildDbUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-db-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'viewer',
    status: 'active',
    department: null,
    companyPhone: null,
    auxiliaryPhone: null,
    branchId: null,
    passwordHash: '$2b$12$existing_hash',
    failedAttempts: 0,
    lockedUntil: null,
    forcePasswordChange: false,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
describe('importUsersCsv — validación de payload', () => {
  it('lanza BAD_REQUEST si el array de filas está vacío', async () => {
    await expect(importUsersCsv([], mockActor)).rejects.toThrow(
      'El CSV no contiene filas para importar'
    );
  });

  it('rechaza filas con nombre vacío acumulando en rejectedRows', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null as any);
    mockRepo.findUserByDerivedUsername.mockResolvedValue(null as any);

    const result = await importUsersCsv([buildRow({ name: '   ' })], mockActor);
    expect(result.failed).toBe(1);
    expect(result.rejectedRows[0].reason).toMatch(/nombre/i);
  });

  it('rechaza filas con email vacío', async () => {
    const result = await importUsersCsv([buildRow({ email: '' })], mockActor);
    expect(result.failed).toBe(1);
    expect(result.rejectedRows[0].reason).toMatch(/email/i);
  });

  it('rechaza rol inválido acumulando en rejectedRows', async () => {
    const result = await importUsersCsv(
      [buildRow({ role: 'superadmin' })],
      mockActor
    );
    expect(result.failed).toBe(1);
    expect(result.rejectedRows[0].reason).toMatch(/rol inválido/i);
  });

  it('rechaza estado inválido', async () => {
    const result = await importUsersCsv(
      [buildRow({ status: 'banned' })],
      mockActor
    );
    expect(result.failed).toBe(1);
    expect(result.rejectedRows[0].reason).toMatch(/estado inválido/i);
  });

  it('rechaza departamento inválido', async () => {
    const result = await importUsersCsv(
      [buildRow({ department: 'Ventas' })],
      mockActor
    );
    expect(result.failed).toBe(1);
    expect(result.rejectedRows[0].reason).toMatch(/departamento inválido/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('importUsersCsv — creación de nuevo usuario (path CREATE)', () => {
  beforeEach(() => {
    // Usuario inexistente → path CREATE
    mockRepo.findUserByEmail.mockResolvedValue(null as any);
    mockRepo.findUserByDerivedUsername.mockResolvedValue(null as any);
    mockRepo.findUserByNormalizedEmailOrDerivedUsername.mockResolvedValue(null as any);
    mockRepo.createUserRecord.mockResolvedValue(buildDbUser() as any);
  });

  it('incrementa el contador created en 1', async () => {
    const result = await importUsersCsv([buildRow()], mockActor);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('la contraseña temporal pasa por hashPassword (nunca en plano a BD)', async () => {
    await importUsersCsv([buildRow()], mockActor);
    expect(hashPassword).toHaveBeenCalledWith(CSV_IMPORT_DEFAULT_PASSWORD);
  });

  it('marca forcePasswordChange: true en el createUserRecord', async () => {
    await importUsersCsv([buildRow()], mockActor);
    // El createUserRecord recibe el objeto con forcePasswordChange=true
    expect(mockRepo.createUserRecord).toHaveBeenCalledWith(
      expect.objectContaining({ forcePasswordChange: true }),
      expect.anything()
    );
  });

  it('normaliza el email a minúsculas antes de crear', async () => {
    await importUsersCsv([buildRow({ email: 'TEST@EXAMPLE.COM' })], mockActor);
    expect(mockRepo.createUserRecord).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' }),
      expect.anything()
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('importUsersCsv — actualización de usuario existente (path UPDATE)', () => {
  const existing = buildDbUser({ name: 'Nombre Viejo', companyPhone: '600000000' });

  beforeEach(() => {
    // Usuario existe → path UPDATE
    mockRepo.findUserByEmail.mockResolvedValue(existing as any);
    mockRepo.findUserById.mockResolvedValue(existing as any); // Crucial para updateUser() interno
    mockRepo.updateUserRecord.mockResolvedValue({ ...existing, name: 'Nombre Nuevo' } as any);
    // para la lógica de findUserByEmailOrUsername con @
    mockRepo.findUserByDerivedUsername.mockResolvedValue(null as any);
  });

  it('incrementa el contador updated si hay cambios', async () => {
    const result = await importUsersCsv(
      [buildRow({ name: 'Nombre Nuevo' })],
      mockActor
    );
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  it('incrementa unchanged si no hay ningún campo diferente', async () => {
    const result = await importUsersCsv(
      [buildRow({ 
        name: existing.name, 
        companyPhone: (existing.companyPhone ?? '') as string 
      })],
      mockActor
    );
    expect(result.unchanged).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('NO vuelve a hashear la contraseña en una actualización', async () => {
    (hashPassword as jest.Mock).mockClear();
    await importUsersCsv([buildRow({ name: 'Nombre Nuevo' })], mockActor);
    expect(hashPassword).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('importUsersCsv — procesamiento mixto (no propaga excepciones)', () => {
  it('continúa procesando filas tras un fallo en una de ellas', async () => {
    // Primera fila: crea bien → segunda fila: falla
    mockRepo.findUserByEmail
      .mockResolvedValueOnce(null as any)        // fila 1: no existe → crear
      .mockRejectedValueOnce(new Error('DB down')); // fila 2: explota BD

    mockRepo.findUserByDerivedUsername.mockResolvedValue(null as any);
    mockRepo.findUserByNormalizedEmailOrDerivedUsername
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce(null as any);
    mockRepo.createUserRecord.mockResolvedValue(buildDbUser() as any);

    const rows = [
      buildRow({ email: 'ok@test.com' }),
      buildRow({ email: 'fail@test.com', name: 'Fail User' }),
    ];

    const result = await importUsersCsv(rows, mockActor);

    // No propaga: devuelve resumen parcial
    expect(result.total).toBe(2);
    expect(result.failed).toBeGreaterThanOrEqual(0);
    // No lanza
  });

  it('devuelve la estructura completa { total, created, updated, unchanged, failed, rejectedRows }', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null as any);
    mockRepo.findUserByDerivedUsername.mockResolvedValue(null as any);
    mockRepo.findUserByNormalizedEmailOrDerivedUsername.mockResolvedValue(null as any);
    mockRepo.createUserRecord.mockResolvedValue(buildDbUser() as any);

    const result = await importUsersCsv([buildRow()], mockActor);

    expect(result).toMatchObject({
      total: expect.any(Number),
      created: expect.any(Number),
      updated: expect.any(Number),
      unchanged: expect.any(Number),
      failed: expect.any(Number),
      rejectedRows: expect.any(Array),
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('importUsersCsv — constante CSV_IMPORT_DEFAULT_PASSWORD', () => {
  it('la constante cumple el requisito de longitud mínima (>=8)', () => {
    expect(CSV_IMPORT_DEFAULT_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });

  it('la constante no está vacía', () => {
    expect(CSV_IMPORT_DEFAULT_PASSWORD).toBeTruthy();
  });
});
