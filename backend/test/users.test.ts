/**
 * @file users.test.ts
 * Tests del módulo de usuarios: colisiones de identidad, estados, reseteo de password y soft-delete.
 */

// ── Mocks de repositorios (antes de importar el servicio) ───────────────────
jest.mock('../src/modules/users/users.repository');
jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
  sanitizeSnapshot: jest.fn((x) => x),
}));
jest.mock('../src/realtime/socket', () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock('../src/utils/bcrypt', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  comparePassword: jest.fn(),
}));
jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn((fn: any) => fn({})),
}));

import * as usersRepo from '../src/modules/users/users.repository';
import {
  createUser,
  changeUserStatus,
  resetUserPassword,
  deleteUser,
} from '../src/modules/users/users.service';

const mockRepo = usersRepo as jest.Mocked<typeof usersRepo>;

const mockActor = { id: 'admin-id-1', ipAddress: '127.0.0.1' };

// ── Helper para crear un usuario ficticio compatible ────────────────────────
const buildUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-id-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'viewer',
  status: 'active',
  failedAttempts: 0,
  passwordHash: 'hashed',
  lockedUntil: null,
  forcePasswordChange: false,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('createUser', () => {
  // ── Caso: Email duplicado ────────────────────────────────────────────────────
  it('rechaza la creación si el email normalizado ya está registrado', async () => {
    mockRepo.findUserByNormalizedEmailOrDerivedUsername.mockResolvedValue(
      buildUser({ email: 'test@example.com' }) as any
    );

    await expect(
      createUser({ email: 'TEST@example.com', password: 'Secure123!', name: 'Test' }, mockActor)
    ).rejects.toThrow('El email ya está registrado');
  });

  // ── Caso: Username derivado duplicado (mismo prefijo antes del @) ───────────
  it('rechaza la creación si el username derivado del email ya existe', async () => {
    mockRepo.findUserByNormalizedEmailOrDerivedUsername.mockResolvedValue(
      buildUser({ email: 'otro@dominio.com' }) as any // email diferente → colisión en username
    );

    await expect(
      createUser({ email: 'libre@dominio.com', password: 'Secure123!', name: 'Test' }, mockActor)
    ).rejects.toThrow('El username ya está registrado');
  });

  // ── Caso: Password demasiado corta (valor límite = 8 chars, probamos 7) ─────
  it('rechaza password de 7 caracteres (por debajo del límite mínimo de 8)', async () => {
    mockRepo.findUserByNormalizedEmailOrDerivedUsername.mockResolvedValue(null);

    await expect(
      createUser({ email: 'nuevo@example.com', password: 'Only7!x', name: 'Test' }, mockActor)
    ).rejects.toThrow(); // Zod valida min(8)
  });

  // ── Caso: Creación exitosa limpia ────────────────────────────────────────────
  it('crea el usuario cuando no existen conflictos de identidad', async () => {
    mockRepo.findUserByNormalizedEmailOrDerivedUsername.mockResolvedValue(null);
    mockRepo.createUserRecord.mockResolvedValue(buildUser({ id: 'new-id' }) as any);

    const user = await createUser(
      { email: 'nuevo@example.com', password: 'Secure123!', name: 'Nuevo User' },
      mockActor
    );
    expect(user.id).toBe('new-id');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('changeUserStatus', () => {
  // ── Caso: Usuario destino no encontrado (404) ────────────────────────────────
  it('lanza NOT_FOUND si el usuario no existe en BD', async () => {
    mockRepo.findUserById.mockResolvedValue(null as any);

    await expect(
      changeUserStatus('ghost-id', 'disabled', mockActor)
    ).rejects.toThrow('Usuario no encontrado');
  });

  // ── Caso: Auto-modificación prohibida (anomalía corporativa) ─────────────────
  it('no permite que un usuario cambie su propio estado', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser({ id: mockActor.id }) as any);

    await expect(
      changeUserStatus(mockActor.id, 'disabled', { id: mockActor.id, ipAddress: '' })
    ).rejects.toThrow('No puedes cambiar tu propio estado');
  });

  // ── Caso: Cambio de estado válido en otra cuenta ─────────────────────────────
  it('deshabilita exitosamente una cuenta de otro usuario', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser({ id: 'target-id' }) as any);
    mockRepo.updateUserRecord.mockResolvedValue(buildUser({ id: 'target-id', status: 'disabled' }) as any);

    await expect(
      changeUserStatus('target-id', 'disabled', mockActor)
    ).resolves.not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('resetUserPassword', () => {
  // ── Caso: Usuario inexistente ────────────────────────────────────────────────
  it('lanza NOT_FOUND si intentamos resetear password de usuario que no existe', async () => {
    mockRepo.findUserById.mockResolvedValue(null as any);

    await expect(
      resetUserPassword('ghost-id', 'NewSecure123!', mockActor)
    ).rejects.toThrow('Usuario no encontrado');
  });

  // ── Caso: flag forcePasswordChange se fija a true → CRÍTICO de seguridad ─────
  it('obliga forcePasswordChange: true en el update (valor límite de seguridad)', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser() as any);
    mockRepo.updateUserRecord.mockResolvedValue(buildUser() as any);

    await resetUserPassword('user-id-1', 'NewSecure123!', mockActor);

    expect(mockRepo.updateUserRecord).toHaveBeenCalledWith(
      'user-id-1',
      expect.objectContaining({ forcePasswordChange: true }),
      expect.anything() // tx
    );
  });

  // ── Caso: también limpia failedAttempts y lockedUntil ────────────────────────
  it('reinicia failedAttempts y lockedUntil al resetear la password', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser({ failedAttempts: 4 }) as any);
    mockRepo.updateUserRecord.mockResolvedValue(buildUser() as any);

    await resetUserPassword('user-id-1', 'NewSecure123!', mockActor);

    expect(mockRepo.updateUserRecord).toHaveBeenCalledWith(
      'user-id-1',
      expect.objectContaining({ failedAttempts: 0, lockedUntil: null }),
      expect.anything()
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('deleteUser', () => {
  // ── Caso: No puede eliminarse a sí mismo ────────────────────────────────────
  it('no permite el soft-delete de la propia cuenta del actor', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser({ id: mockActor.id }) as any);

    await expect(
      deleteUser(mockActor.id, { id: mockActor.id, ipAddress: '' })
    ).rejects.toThrow('No puedes eliminar tu propia cuenta');
  });

  // ── Caso: Soft-delete cambia el email con prefijo "deleted_" ────────────────
  it('modifica el email añadiendo prefijo deleted_ (mecanismo de soft-delete)', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser({ id: 'victim-id' }) as any);
    mockRepo.updateUserRecord.mockResolvedValue(buildUser() as any);

    await deleteUser('victim-id', mockActor);

    expect(mockRepo.updateUserRecord).toHaveBeenCalledWith(
      'victim-id',
      expect.objectContaining({
        email: expect.stringMatching(/^deleted_/),
        status: 'disabled',
      }),
      expect.anything()
    );
  });
});
