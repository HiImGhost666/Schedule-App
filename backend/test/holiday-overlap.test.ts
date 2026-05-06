import { prisma } from '../src/config/database';
import { createScheduleEntry } from '../src/modules/schedules/schedules.service';
import * as schedulesRepo from '../src/modules/schedules/schedules.repository';

// Mocking needed services for the business logic test
jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
  sanitizeSnapshot: jest.fn((x) => x),
}));
jest.mock('../src/modules/notifications/notifications.service', () => ({
  notifyScheduleChange: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/realtime/socket', () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock('../src/modules/schedules/schedules.repository');
jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn(async (fn: any) => await fn({})),
}));

// We mock the DB partially
jest.mock('../src/config/database', () => ({
  prisma: {
    branch: {
      findUnique: jest.fn(),
    },
    branchHoliday: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    }
  },
}));

const mockRepo = schedulesRepo as jest.Mocked<typeof schedulesRepo>;

const mockActor = {
  id: 'admin-1',
  role: 'admin',
  email: 'admin@test.com',
  name: 'Admin',
};

describe('Holiday and Task Overlap Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bloquea la creación de tarea de guardia en un día festivo', async () => {
    // Escenario: 1 de Junio es festivo en Sucursal A
    (prisma.branch.findUnique as jest.Mock).mockResolvedValue({ id: 'b-1', isActive: true });
    
    // Simulamos que existe un festivo ese día
    (prisma.branchHoliday.findMany as jest.Mock).mockResolvedValue([{
      id: 'h-1',
      name: 'Festivo Test',
      date: new Date('2026-06-01')
    }]);

    await expect(createScheduleEntry({
      title: 'Guardia de Festivo',
      startDatetime: new Date('2026-06-01T08:00:00Z'),
      endDatetime: new Date('2026-06-01T16:00:00Z'),
      branchId: 'b-1',
      assigneeIds: ['u-1'],
      type: 'guardia',
      color: '#1e3a5f',
      hoursPerDay: 8,
      confirmed: false,
    }, mockActor)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('No se puede asignar trabajo en días festivos: Festivo Test')
    });
  });

  it('permite crear una tarea de tipo "otro" en un día festivo (excepción)', async () => {
    (prisma.branch.findUnique as jest.Mock).mockResolvedValue({ id: 'b-1', isActive: true });
    (prisma.branchHoliday.findMany as jest.Mock).mockResolvedValue([{
      id: 'h-1',
      name: 'Festivo Test',
      date: new Date('2026-06-01')
    }]);

    mockRepo.findSchedules.mockResolvedValue([]);
    mockRepo.createSchedule.mockResolvedValue({ id: 's-1', title: 'Tarea Excepcional', type: 'otro' } as any);

    const result = await createScheduleEntry({
      title: 'Tarea Excepcional',
      startDatetime: new Date('2026-06-01T08:00:00Z'),
      endDatetime: new Date('2026-06-01T16:00:00Z'),
      branchId: 'b-1',
      assigneeIds: ['u-1'],
      type: 'otro',
      color: '#1e3a5f',
      hoursPerDay: 8,
      confirmed: false,
    }, mockActor);

    expect(result).toBeDefined();
    expect(mockRepo.createSchedule).toHaveBeenCalled();
  });
});
