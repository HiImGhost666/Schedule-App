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
jest.mock('../src/config/database', () => ({
  prisma: {
    branch: {
      findUnique: jest.fn().mockResolvedValue({ id: 'branch-1' }),
    },
    // Añadimos mocks para roles y departamentos para que los tests sean más claros
    // y no dependan de valores mágicos.
    role: {
      findFirst: jest.fn((args) => {
        if (args.where.name === 'employee') return Promise.resolve({ id: 'role-employee-id', name: 'employee' });
        if (args.where.name === 'admin') return Promise.resolve({ id: 'role-admin-id', name: 'admin' });
        return Promise.resolve(null);
      }),
    },
    department: {
      findUnique: jest.fn().mockResolvedValue({ id: 'dept-1' }),
    },
  },
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
import { prisma } from '../src/config/database';
import {
  createUser,
  updateUser,
  changeUserStatus,
  resetUserPassword,
  forceUserPasswordChange,
  deleteUser,
  getUsersList,
} from '../src/modules/users/users.service';

const mockRepo = usersRepo as jest.Mocked<typeof usersRepo>;

const mockActor = { id: 'admin-id-1', roleName: 'admin', email: 'admin@test.com', name: 'Admin', ipAddress: '127.0.0.1' };
const mockPrisma = prisma as unknown as {
  branch: { findUnique: jest.Mock };
};

// ── Helper para crear un usuario ficticio compatible ────────────────────────
const buildUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-id-1',
  employeeId: 'LAB-0001',
  email: 'test@example.com',
  name: 'Test User',
  roleId: 'role-viewer-id',
  departmentId: 'dept-1', // Add default departmentId for consistency
  branchId: 'branch-1', // Add default branchId for consistency
  status: 'active',
  failedAttempts: 0,
  passwordHash: 'hashed',
  lockedUntil: null,
  forcePasswordChange: false,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('createUser', () => {
  beforeEach(() => {
    mockRepo.findUserByEmployeeId.mockResolvedValue(null as any);
    mockRepo.findUserByEmail.mockResolvedValue(null as any);
    mockRepo.findUserByDerivedUsername.mockResolvedValue(null as any);
    mockRepo.reserveNextEmployeeId.mockResolvedValue('LAB-0002');
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1' });
    mockRepo.updateUserRecord.mockResolvedValue(buildUser({ id: 'existing-id' }) as any);
  });

  // ── Caso: branchId obligatorio ───────────────────────────────────────────────
  it('rechaza la creación si no se envía sucursal, departamento o rol', async () => {
    // Missing branchId
    await expect(
      createUser({ email: 'nuevo@example.com', password: 'Secure123!', name: 'Test', departmentId: 'dept-1', role: 'employee' } as any, mockActor)
    ).rejects.toThrow();

    // Missing departmentId
    await expect(
      createUser({ email: 'nuevo@example.com', password: 'Secure123!', name: 'Test', branchId: 'branch-1', role: 'employee' } as any, mockActor)
    ).rejects.toThrow();
    // Missing role
    await expect(
      createUser({ email: 'nuevo@example.com', password: 'Secure123!', name: 'Test', branchId: 'branch-1', departmentId: 'dept-1' } as any, mockActor)
    ).rejects.toThrow();
  });

  // ── Caso: Email duplicado → conflicto ───────────────────────────────────────
  it('rechaza la creación cuando el email ya existe', async () => {
    const existing = buildUser({ id: 'existing-id', email: 'test@example.com', employeeId: 'LAB-0001' });
    mockRepo.findUserByEmail.mockResolvedValue(existing as any);

    await expect(
      createUser(
        {
          email: 'TEST@example.com',
          password: 'Secure123!',
          name: 'Test Updated',
          departmentId: 'dept-1',
          branchId: 'branch-1',
        },
        mockActor
      )
    ).rejects.toThrow('El email ya está registrado');

    expect(mockRepo.updateUserRecord).not.toHaveBeenCalled();
  });

  // ── Caso: employeeId duplicado → conflicto ──────────────────────────────────
  it('rechaza la creación cuando el employeeId ya existe', async () => {
    await expect(
      createUser(
        {
          email: 'nuevo@example.com',
          departmentId: 'dept-1',
          employeeId: 'LAB-0007',
          password: 'Secure123!',
          name: 'Test Updated',
          departmentId: 'dept-1',
          branchId: 'branch-1',
        },
        mockActor
      )
    ).rejects.toThrow('El employeeId ya está registrado');

    expect(mockRepo.updateUserRecord).not.toHaveBeenCalled();
  });

  // ── Caso: Email + employeeId apuntando a mismo usuario sigue en conflicto ───
  it('mantiene semántica strict-create aunque email y employeeId apunten al mismo usuario', async () => {
    const existing = buildUser({ id: 'existing-id', employeeId: 'LAB-0007', email: 'otro@example.com' });
    mockRepo.findUserByEmployeeId.mockResolvedValue(existing as any);
    mockRepo.findUserByEmail.mockResolvedValue(existing as any);

    await expect(
      createUser(
      {
        email: 'otro@example.com',
        employeeId: 'LAB-0007',
        password: 'Secure123!',
        name: 'Test Updated',
        departmentId: 'dept-1',
        branchId: 'branch-1',
      },
      mockActor
    )).rejects.toThrow('El email ya está registrado');
  });

  // ── Caso: Username derivado duplicado (mismo prefijo antes del @) ──────────
  it('rechaza la creación si el username derivado del email ya existe', async () => {
    mockRepo.findUserByDerivedUsername.mockResolvedValue(
      buildUser({ id: 'other-id', email: 'otro@dominio.com' }) as any
    );

    await expect(
      createUser({ email: 'libre@dominio.com', password: 'Secure123!', name: 'Test', branchId: 'branch-1', departmentId: 'dept-1', role: 'employee' }, mockActor)
    ).rejects.toThrow('El username ya está registrado');
  });

  // ── Caso: Password demasiado corta (valor límite = 8 chars, probamos 7) ─────
  it('rechaza password de 7 caracteres (por debajo del límite mínimo de 8)', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null as any);

    await expect(
      createUser({ email: 'nuevo@example.com', password: 'Only7!x', name: 'Test', branchId: 'branch-1', departmentId: 'dept-1', role: 'employee' }, mockActor)
    ).rejects.toThrow(); // Zod valida min(8)
  });

  // ── Caso: Creación exitosa limpia ────────────────────────────────────────────
  it('crea el usuario cuando no existen conflictos de identidad', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null as any);
    mockRepo.createUserRecord.mockResolvedValue(buildUser({ id: 'new-id', employeeId: 'LAB-0002' }) as any);

    const user = await createUser( // Ensure all mandatory fields are provided
      { email: 'nuevo@example.com', password: 'Secure123!', name: 'Nuevo User', branchId: 'branch-1' },
      mockActor
    );
    expect(user.id).toBe('new-id');
    expect(user.employeeId).toBe('LAB-0002');
  });

  it('aplica estado required cuando se crea con forcePasswordChange=true', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null as any);
    mockRepo.createUserRecord.mockResolvedValue(buildUser({ id: 'new-id', employeeId: 'LAB-0002' }) as any);

    await createUser( // Ensure all mandatory fields are provided
      {
        email: 'nuevo2@example.com',
        password: 'Secure123!',
        name: 'Nuevo User 2',
        branchId: 'branch-1',
        departmentId: 'dept-1',
        role: 'employee',
        forcePasswordChange: true,
      },
      mockActor
    );

    expect(mockRepo.createUserRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        forcePasswordChange: true,
        passwordChangePolicy: 'required',
      }),
      expect.anything()
    );
  });
});

const mockUserUpdateInput = {
  name: 'Updated Name',
  email: 'updated@example.com',
  departmentId: 'dept-2',
  branchId: 'branch-2',
  role: 'admin', // Role is also updatable
};

// ═══════════════════════════════════════════════════════════════════════════════
describe('updateUser', () => {
  beforeEach(() => {
    mockRepo.findUserById.mockResolvedValue(buildUser() as any);
    mockRepo.findUserIdentityConflict.mockResolvedValue(null as any);
    mockRepo.updateUserRecord.mockResolvedValue(buildUser(mockUserUpdateInput) as any); // Use mockUserUpdateInput
  });

  it('rechaza la actualización si el nuevo email genera un username derivado en conflicto', async () => {
    mockRepo.findUserIdentityConflict.mockResolvedValue({ id: 'other-user', email: 'conflicto@otrodominio.com' } as any);

    await expect( // Ensure all mandatory fields are provided for the update input
      updateUser('user-id-1', { email: 'conflicto@dominio.com', departmentId: 'dept-1', branchId: 'branch-1', role: 'employee' }, mockActor)
    ).rejects.toThrow('El username ya está registrado');
  });

  it('actualiza correctamente el usuario con nuevos datos de departamento, sucursal y rol', async () => {
    // Mock findUserById to return a user with default department and branch
    mockRepo.findUserById.mockResolvedValue(buildUser({
      departmentId: 'dept-1',
      branchId: 'branch-1',
      role: 'employee', // Assuming a default role
    }) as any);
    const updatedUser = await updateUser('user-id-1', mockUserUpdateInput, mockActor);

    expect(mockRepo.updateUserRecord).toHaveBeenCalledWith('user-id-1', expect.objectContaining(mockUserUpdateInput), expect.anything());
    expect(updatedUser).toMatchObject(mockUserUpdateInput);
  });
  it('actualiza el derivedUsername cuando se cambia el email', async () => {
    await updateUser('user-id-1', { email: 'nuevo.email@example.com' }, mockActor);

    expect(mockRepo.updateUserRecord).toHaveBeenCalledWith(
      'user-id-1',
      expect.objectContaining({
        departmentId: 'dept-1', // Assuming default department for existing user
        branchId: 'branch-1', // Assuming default branch for existing user
        email: 'nuevo.email@example.com',
        derivedUsername: 'nuevo.email',
      }),
      expect.anything()
    );
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
  it('obliga estado required en reset de contraseña (valor límite de seguridad)', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser() as any);
    mockRepo.updateUserRecord.mockResolvedValue(buildUser() as any);

    await resetUserPassword('user-id-1', 'NewSecure123!', mockActor);

    expect(mockRepo.updateUserRecord).toHaveBeenCalledWith(
      'user-id-1',
      expect.objectContaining({
        forcePasswordChange: true,
        passwordChangePolicy: 'required',
        passwordChangedAt: expect.any(Date),
      }),
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

describe('forceUserPasswordChange', () => {
  it('marca required sin resetear hash de contraseña', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser({ id: 'target-id' }) as any);
    mockRepo.updateUserRecord.mockResolvedValue(buildUser({ id: 'target-id' }) as any);

    await forceUserPasswordChange('target-id', mockActor);

    expect(mockRepo.updateUserRecord).toHaveBeenCalledWith(
      'target-id',
      expect.objectContaining({
        forcePasswordChange: true,
        passwordChangePolicy: 'required',
      }),
      expect.anything()
    );
  });
});

describe('getUsersList', () => {
  beforeEach(() => {
    mockRepo.listUsers.mockResolvedValue([[], 0] as any);
  });

  it('usa orden por defecto createdAt desc cuando no se envía sort', async () => {
    await getUsersList({ page: 1, limit: 20 });

    expect(mockRepo.listUsers).toHaveBeenCalledWith(
      undefined,
      1,
      20,
      'createdAt',
      'desc',
    );
  });

  it('propaga sortBy/sortOrder hacia el repositorio', async () => {
    await getUsersList({
      page: 2,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(mockRepo.listUsers).toHaveBeenCalledWith(
      undefined,
      2,
      10,
      'name',
      'asc',
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
  it('modifica el email y derivedUsername añadiendo prefijo deleted_ (mecanismo de soft-delete)', async () => {
    mockRepo.findUserById.mockResolvedValue(buildUser({ id: 'victim-id', email: 'victim@example.com' }) as any);
    mockRepo.updateUserRecord.mockResolvedValue(buildUser() as any);

    await deleteUser('victim-id', mockActor);

    expect(mockRepo.updateUserRecord).toHaveBeenCalledWith(
      'victim-id',
      expect.objectContaining({
        email: expect.stringMatching(/^deleted_/),
        derivedUsername: expect.stringMatching(/^deleted_/),
        status: 'disabled',
      }),
      expect.anything()
    );
  });
});
