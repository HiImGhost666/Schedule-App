import { createAppError } from '../src/common/errors/error-catalog';

jest.mock('../src/modules/vacations/vacations.repository', () => ({
  findVacationRequestById: jest.fn(),
  updateVacationRequest: jest.fn(),
}));

jest.mock('../src/modules/vacations/domain/vacations.rules', () => ({
  ensureCanCancel: jest.fn(),
  ensureCanReview: jest.fn(),
}));

jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn(async (fn: any) => fn({})),
}));

jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn(),
  sanitizeSnapshot: (value: unknown) => value,
}));

jest.mock('../src/modules/notifications/notifications.service', () => ({
  notifyVacationChange: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/modules/in-app-notifications/in-app.service', () => ({
  createInAppNotification: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/modules/schedules/weekly-summary.service', () => ({
  recalculateWeeklySummariesForVacation: jest.fn(() => Promise.resolve()),
}));

import { cancelVacationEntry } from '../src/modules/vacations/vacations.service';
import { findVacationRequestById, updateVacationRequest } from '../src/modules/vacations/vacations.repository';
import { ensureCanCancel, ensureCanReview } from '../src/modules/vacations/domain/vacations.rules';

const mockedFindVacationRequestById = findVacationRequestById as jest.MockedFunction<typeof findVacationRequestById>;
const mockedUpdateVacationRequest = updateVacationRequest as jest.MockedFunction<typeof updateVacationRequest>;
const mockedEnsureCanCancel = ensureCanCancel as jest.MockedFunction<typeof ensureCanCancel>;
const mockedEnsureCanReview = ensureCanReview as jest.MockedFunction<typeof ensureCanReview>;

describe('vacations.service cancelVacationEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite a employee cancelar su propia solicitud pendiente', async () => {
    mockedFindVacationRequestById.mockResolvedValue({
      id: 'vac-1',
      employeeId: 'emp-1',
      status: 'pending',
      branchId: 'b-1',
      departmentId: 'dept-1',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-03T00:00:00.000Z'),
      branch: { timezone: 'Europe/Madrid' },
    } as any);
    mockedUpdateVacationRequest.mockResolvedValue({
      id: 'vac-1',
      status: 'cancelled',
      employeeId: 'emp-1',
    } as any);

    const result = await cancelVacationEntry('vac-1', {
      id: 'emp-1',
      roleName: 'employee',
      email: 'emp@example.com',
      name: 'Employee',
      permissions: ['vacations:cancel'],
    });

    expect(mockedEnsureCanCancel).toHaveBeenCalledWith('pending');
    expect(mockedEnsureCanReview).not.toHaveBeenCalled();
    expect(mockedUpdateVacationRequest).toHaveBeenCalledWith(
      'vac-1',
      { status: 'cancelled' },
      expect.anything(),
    );
    expect(result).toMatchObject({ id: 'vac-1', status: 'cancelled' });
  });

  it('rechaza cancelación de employee sobre solicitud de otra persona', async () => {
    mockedFindVacationRequestById.mockResolvedValue({
      id: 'vac-2',
      employeeId: 'emp-2',
      status: 'pending',
      branchId: 'b-1',
      departmentId: 'dept-1',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-03T00:00:00.000Z'),
      branch: { timezone: 'Europe/Madrid' },
    } as any);

    await expect(
      cancelVacationEntry('vac-2', {
        id: 'emp-1',
        roleName: 'employee',
        email: 'emp@example.com',
        name: 'Employee',
        permissions: ['vacations:cancel'],
      }),
    ).rejects.toMatchObject(createAppError('FORBIDDEN', 'Solo puedes cancelar tus propias solicitudes'));

    expect(mockedUpdateVacationRequest).not.toHaveBeenCalled();
  });
});
