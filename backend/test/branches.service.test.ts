import {
  bulkDeleteSharedHolidays,
  bulkUpdateSharedHolidays,
  listBranchHolidays,
} from '../src/modules/branches/branches.service';
import * as branchesRepository from '../src/modules/branches/branches.repository';

jest.mock('../src/modules/branches/branches.repository');
jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn(async (operation: any) => operation({ tx: true })),
}));

const repo = branchesRepository as jest.Mocked<typeof branchesRepository>;

const actor = {
  id: 'admin-1',
  ipAddress: '127.0.0.1',
};

describe('branches.service grouped holidays', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('agrupa festivos compartidos cuando groupShared=true y branchId=all', async () => {
    repo.findBranchHolidays.mockResolvedValue([
      {
        id: 'h-1',
        branchId: 'b-1',
        date: new Date('2026-01-01T00:00:00Z'),
        originalDate: null,
        name: 'Año Nuevo',
        type: 'nacional',
        scope: 'national',
        isPartial: false,
        isActive: true,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        branch: { id: 'b-1', name: 'Madrid', code: 'MAD01' },
      } as any,
      {
        id: 'h-2',
        branchId: 'b-2',
        date: new Date('2026-01-01T00:00:00Z'),
        originalDate: null,
        name: 'Año Nuevo',
        type: 'nacional',
        scope: 'national',
        isPartial: false,
        isActive: true,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-02T00:00:00Z'),
        branch: { id: 'b-2', name: 'Barcelona', code: 'BCN02' },
      } as any,
    ]);

    const result = await listBranchHolidays('all', {
      includeInactive: true,
      groupShared: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      branchId: 'all',
      name: 'Año Nuevo',
      holidayIds: ['h-1', 'h-2'],
      sharedCount: 2,
    });
  });
});

describe('branches.service shared holiday bulk actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('actualiza en bloque todos los festivos indicados', async () => {
    repo.findBranchHolidaysByIds.mockResolvedValue([
      { id: 'h-1' } as any,
      { id: 'h-2' } as any,
    ]);
    repo.updateBranchHolidaysByIds.mockResolvedValue({ count: 2 } as any);

    await bulkUpdateSharedHolidays(
      {
        holidayIds: ['h-1', 'h-2'],
        name: 'Festivo Nacional',
      },
      actor,
    );

    expect(repo.findBranchHolidaysByIds).toHaveBeenCalledWith(['h-1', 'h-2'], { tx: true });
    expect(repo.updateBranchHolidaysByIds).toHaveBeenCalledWith(
      ['h-1', 'h-2'],
      expect.objectContaining({ name: 'Festivo Nacional' }),
      { tx: true },
    );
  });

  it('elimina en bloque todos los festivos indicados', async () => {
    repo.findBranchHolidaysByIds.mockResolvedValue([
      { id: 'h-1' } as any,
      { id: 'h-2' } as any,
    ]);
    repo.deleteBranchHolidaysByIds.mockResolvedValue({ count: 2 } as any);

    await bulkDeleteSharedHolidays(['h-1', 'h-2'], actor);

    expect(repo.findBranchHolidaysByIds).toHaveBeenCalledWith(['h-1', 'h-2'], { tx: true });
    expect(repo.deleteBranchHolidaysByIds).toHaveBeenCalledWith(['h-1', 'h-2'], { tx: true });
  });
});
