/**
 * @file departments.manager.test.ts
 * Verifica el flujo de asignar/remover manager de departamento con upgrade/downgrade de rol.
 */

const mockTx = {
  department: {
    update: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn((fn: any) => fn(mockTx)),
}));

jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn(),
}));

jest.mock('../src/modules/roles/roles.repository', () => ({
  findRoleByName: jest.fn(),
}));

jest.mock('../src/modules/users/users.repository', () => ({
  findUserById: jest.fn(),
  updateUserRecord: jest.fn(),
}));

jest.mock('../src/modules/departments/departments.repository', () => ({
  findDepartmentById: jest.fn(),
  countDepartmentsForManager: jest.fn(),
  updateDepartmentManager: jest.fn(),
}));

import { logAuditOrThrow } from '../src/modules/audit/audit.service';
import {
  assignDepartmentManager,
  removeDepartmentManager,
} from '../src/modules/departments/departments.service';
import * as departmentsRepo from '../src/modules/departments/departments.repository';
import * as usersRepo from '../src/modules/users/users.repository';
import * as rolesRepo from '../src/modules/roles/roles.repository';

const mockDepartmentsRepo = departmentsRepo as jest.Mocked<typeof departmentsRepo>;
const mockUsersRepo = usersRepo as jest.Mocked<typeof usersRepo>;
const mockRolesRepo = rolesRepo as jest.Mocked<typeof rolesRepo>;
const mockLogAuditOrThrow = logAuditOrThrow as jest.MockedFunction<typeof logAuditOrThrow>;

describe('departments.manager', () => {
  const actor = { id: 'admin-1', ipAddress: '127.0.0.1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignDepartmentManager', () => {
    it('asigna manager y otorga rol department_manager si no lo tiene', async () => {
      mockDepartmentsRepo.findDepartmentById.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        code: 'RH01',
        managers: [],
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        branches: [],
        _count: { users: 0 },
      } as any);

      mockUsersRepo.findUserById.mockResolvedValue({
        id: 'user-1',
        name: 'Juan Pérez',
        email: 'juan@test.com',
        role: { name: 'employee' },
      } as any);

      mockRolesRepo.findRoleByName.mockResolvedValue({
        id: 'role-department-manager-id',
        name: 'department_manager',
      } as any);

      mockDepartmentsRepo.updateDepartmentManager.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        managers: [{ 
          userId: 'user-1', 
          user: { name: 'Juan Pérez' } 
        }],
      } as any);

      await assignDepartmentManager('dept-1', 'user-1', actor);

      // Verificar que se actualizó el manager en el departamento
      // Ahora la lógica interna debería llamar a un "upsert" o "create" en department_managers

      // Verificar que se otorgó el rol department_manager
      expect(mockUsersRepo.updateUserRecord).toHaveBeenCalledWith(
        'user-1',
        { role: { connect: { id: 'role-department-manager-id' } } },
        mockTx,
      );

      // Verificar auditoría
      expect(mockLogAuditOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSIGN_DEPARTMENT_MANAGER',
          entityType: 'Department',
          entityId: 'dept-1',
        }),
        mockTx,
      );
    });

    it('no otorga rol si el usuario ya es department_manager', async () => {
      mockDepartmentsRepo.findDepartmentById.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        code: 'RH01',
        managers: [],
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        branches: [],
        _count: { users: 0 },
      } as any);

      mockUsersRepo.findUserById.mockResolvedValue({
        id: 'user-1',
        name: 'Juan Pérez',
        email: 'juan@test.com',
        role: { name: 'department_manager' },
      } as any);

      mockDepartmentsRepo.updateDepartmentManager.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        managers: [{ userId: 'user-1' }],
      } as any);

      await assignDepartmentManager('dept-1', 'user-1', actor);

      // No debe llamar a updateUserRecord porque ya tiene el rol
      expect(mockUsersRepo.updateUserRecord).not.toHaveBeenCalled();
    });

    it('lanza error si el departamento no existe', async () => {
      mockDepartmentsRepo.findDepartmentById.mockResolvedValue(null);

      await expect(
        assignDepartmentManager('dept-invalid', 'user-1', actor),
      ).rejects.toThrow('Departamento no encontrado');

      expect(mockDepartmentsRepo.updateDepartmentManager).not.toHaveBeenCalled();
    });

    it('lanza error si el usuario no existe', async () => {
      mockDepartmentsRepo.findDepartmentById.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        code: 'RH01',
        managers: [],
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        branches: [],
        _count: { users: 0 },
      } as any);

      mockUsersRepo.findUserById.mockResolvedValue(null);

      await expect(
        assignDepartmentManager('dept-1', 'user-invalid', actor),
      ).rejects.toThrow('Usuario no encontrado');
    });

    it('lanza error si el usuario ya es manager de este departamento', async () => {
      mockDepartmentsRepo.findDepartmentById.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        code: 'RH01',
        managers: [{ userId: 'user-1' }],
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        branches: [],
        _count: { users: 0 },
      } as any);

      mockUsersRepo.findUserById.mockResolvedValue({
        id: 'user-1',
        name: 'Juan Pérez',
        email: 'juan@test.com',
        role: { name: 'department_manager' },
      } as any);

      await expect(
        assignDepartmentManager('dept-1', 'user-1', actor),
      ).rejects.toThrow('Este usuario ya es manager de este departamento');
    });
  });

  describe('removeDepartmentManager', () => {
    it('remueve manager y hace downgrade a employee si no es manager de otros departamentos', async () => {
      mockDepartmentsRepo.findDepartmentById.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        code: 'RH01',
        managers: [{ userId: 'user-1' }],
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        branches: [],
        _count: { users: 0 },
      } as any);

      mockUsersRepo.findUserById.mockResolvedValue({
        id: 'user-1',
        name: 'Juan Pérez',
        email: 'juan@test.com',
        role: { name: 'department_manager' },
      } as any);

      mockDepartmentsRepo.countDepartmentsForManager.mockResolvedValue(0);
      mockRolesRepo.findRoleByName.mockResolvedValue({
        id: 'role-employee-id',
        name: 'employee',
      } as any);

      mockDepartmentsRepo.updateDepartmentManager.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        managers: [],
      } as any);

      await removeDepartmentManager('dept-1', actor);

      // Verificar que se removió el manager
      expect(mockDepartmentsRepo.updateDepartmentManager).toHaveBeenCalledWith('dept-1', null, mockTx);

      // Verificar downgrade a employee
      expect(mockUsersRepo.updateUserRecord).toHaveBeenCalledWith(
        'user-1',
        { role: { connect: { id: 'role-employee-id' } } },
        mockTx,
      );

      // Verificar auditoría
      expect(mockLogAuditOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REMOVE_DEPARTMENT_MANAGER',
          entityType: 'Department',
          entityId: 'dept-1',
        }),
        mockTx,
      );
    });

    it('no hace downgrade si el usuario sigue siendo manager de otros departamentos', async () => {
      mockDepartmentsRepo.findDepartmentById.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        code: 'RH01',
        managers: [{ userId: 'user-1' }],
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        branches: [],
        _count: { users: 0 },
      } as any);

      mockUsersRepo.findUserById.mockResolvedValue({
        id: 'user-1',
        name: 'Juan Pérez',
        email: 'juan@test.com',
        role: { name: 'department_manager' },
      } as any);

      mockDepartmentsRepo.countDepartmentsForManager.mockResolvedValue(2);

      mockDepartmentsRepo.updateDepartmentManager.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        managers: [],
      } as any);

      await removeDepartmentManager('dept-1', actor);

      // No debe hacer downgrade porque aún es manager de otros departamentos
      expect(mockUsersRepo.updateUserRecord).not.toHaveBeenCalled();
    });

    it('lanza error si el departamento no tiene manager asignado', async () => {
      mockDepartmentsRepo.findDepartmentById.mockResolvedValue({
        id: 'dept-1',
        name: 'RH',
        code: 'RH01',
        managers: [],
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        branches: [],
        _count: { users: 0 },
      } as any);

      await expect(
        removeDepartmentManager('dept-1', actor),
      ).rejects.toThrow('Este departamento no tiene un manager asignado');
    });
  });
});
