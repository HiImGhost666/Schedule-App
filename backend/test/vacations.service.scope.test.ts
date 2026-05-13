import { createAppError } from '../src/common/errors/error-catalog';

jest.mock('../src/modules/vacations/vacations.repository', () => ({
  findVacationRequests: jest.fn(),
  countVacationRequests: jest.fn(),
}));

import { countVacationRequests, findVacationRequests } from '../src/modules/vacations/vacations.repository';
import { listVacations } from '../src/modules/vacations/vacations.service';

const mockedFindVacationRequests = findVacationRequests as jest.MockedFunction<typeof findVacationRequests>;
const mockedCountVacationRequests = countVacationRequests as jest.MockedFunction<typeof countVacationRequests>;

describe('vacations.service scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindVacationRequests.mockResolvedValue([]);
    mockedCountVacationRequests.mockResolvedValue(0);
  });

  it('general_manager usa branchId in visibleBranchIds cuando no filtra', async () => {
    await listVacations(
      { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      {
        id: 'gm-1',
        roleName: 'general_manager',
        email: 'gm@test.com',
        name: 'GM',
        branchId: 'branch-a',
        visibleBranchIds: ['branch-b'],
        permissions: ['vacations:read-all'],
      },
    );

    expect(mockedFindVacationRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: { in: ['branch-a', 'branch-b'] },
      }),
      expect.anything(),
    );
  });

  it('general_manager rechaza branch fuera de visibleBranchIds', async () => {
    await expect(
      listVacations(
        { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc', branchId: 'branch-z' },
        {
          id: 'gm-1',
          roleName: 'general_manager',
          email: 'gm@test.com',
          name: 'GM',
          branchId: 'branch-a',
          visibleBranchIds: ['branch-b'],
          permissions: ['vacations:read-all'],
        },
      ),
    ).rejects.toMatchObject(createAppError('FORBIDDEN', 'No puedes consultar vacaciones de otra sucursal'));
  });

  it('general_manager sin visibleBranchIds extra usa solo su branchId en el scope', async () => {
    await listVacations(
      { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      {
        id: 'gm-1',
        roleName: 'general_manager',
        email: 'gm@test.com',
        name: 'GM',
        branchId: 'branch-a',
        visibleBranchIds: [],
        permissions: ['vacations:read-all'],
      },
    );

    expect(mockedFindVacationRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: { in: ['branch-a'] },
      }),
      expect.anything(),
    );
  });

  it('department_manager rechaza branch fuera de visibleBranchIds', async () => {
    await expect(
      listVacations(
        { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc', branchId: 'branch-z' },
        {
          id: 'dm-1',
          roleName: 'department_manager',
          email: 'dm@test.com',
          name: 'DM',
          branchId: 'branch-a',
          visibleBranchIds: ['branch-b'],
          departmentId: 'dept-1',
          permissions: ['vacations:read-all'],
        },
      ),
    ).rejects.toMatchObject(createAppError('FORBIDDEN', 'No puedes consultar vacaciones de otra sucursal'));
  });

  it('employee sin read-all solo ve solicitudes propias', async () => {
    await listVacations(
      { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      {
        id: 'emp-1',
        roleName: 'employee',
        email: 'e@test.com',
        name: 'Emp',
        branchId: 'branch-a',
        permissions: ['vacations:read', 'vacations:create'],
      },
    );

    expect(mockedFindVacationRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp-1',
      }),
      expect.anything(),
    );
  });

  it('aplica búsqueda por nombre/email/employeeId', async () => {
    await listVacations(
      { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc', search: 'maria' },
      {
        id: 'admin-1',
        roleName: 'admin',
        email: 'admin@test.com',
        name: 'Admin',
        permissions: ['vacations:read-all'],
      },
    );

    expect(mockedFindVacationRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        OR: [
          { employee: { name: { contains: 'maria', mode: 'insensitive' } } },
          { employee: { email: { contains: 'maria', mode: 'insensitive' } } },
          { employee: { employeeId: { contains: 'maria', mode: 'insensitive' } } },
        ],
      }),
      expect.anything(),
    );
  });
});
