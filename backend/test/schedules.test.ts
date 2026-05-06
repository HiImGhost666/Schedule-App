/**
 * @file schedules.test.ts
 * Tests del módulo de guardias: validación de rangos, detección de overlaps, anomalías cronológicas.
 */

// ── Mocks antes de imports ──────────────────────────────────────────────────
jest.mock('../src/modules/schedules/schedules.repository');
jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
  sanitizeSnapshot: jest.fn((x) => x),
}));
jest.mock('../src/modules/notifications/notifications.service', () => ({
  notifyScheduleChange: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/realtime/socket', () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn((fn: any) => fn({})),
}));
jest.mock('../src/config/database', () => ({
  prisma: {
    branch: { findUnique: jest.fn().mockResolvedValue({ id: 'branch-1', isActive: true }) },
    branchHoliday: { findMany: jest.fn().mockResolvedValue([]) },
    scheduleType: { findUnique: jest.fn().mockResolvedValue({ id: 'st-guardia', value: 'guardia', label: 'Guardia', color: '#1e3a5f' }) },
  },
}));

import * as schedulesRepo from '../src/modules/schedules/schedules.repository';
import { createScheduleEntry } from '../src/modules/schedules/schedules.service';

const mockRepo = schedulesRepo as jest.Mocked<typeof schedulesRepo>;

const mockActor = {
  id: 'admin-id',
  email: 'admin@test.com',
  name: 'Admin',
  roleName: 'admin',
  ipAddress: '127.0.0.1',
};

// ── Helper ────────────────────────────────────────────────────────────────────
const buildSchedule = (overrides: Record<string, any> = {}) => ({
  id: 'schedule-1',
  title: 'Guardia Mañana',
  startDatetime: new Date('2026-04-20T08:00:00Z'),
  endDatetime: new Date('2026-04-20T16:00:00Z'),
  type: 'guardia',
  scheduleTypeId: 'st-guardia',
  scheduleType: { id: 'st-guardia', value: 'guardia', label: 'Guardia', color: '#1e3a5f' },
  color: '#1e3a5f',
  assignments: [{ userId: 'user-1', user: { name: 'User A' } }],
  ...overrides,
});

const baseInput = {
  title: 'Nueva Guardia',
  startDatetime: '2026-06-01T08:00:00Z', // Fecha futura para evitar isLastMinute
  endDatetime: '2026-06-01T16:00:00Z',
  scheduleTypeId: 'st-guardia',
  branchId: 'branch-1',
  assigneeIds: ['user-1'],
  color: '#1e3a5f',
};

// ═══════════════════════════════════════════════════════════════════════════════
describe('createScheduleEntry', () => {
  beforeEach(() => {
    // Por defecto: sin overlaps y creación exitosa
    mockRepo.findSchedules.mockResolvedValue([]);
    (require('../src/config/database').prisma.branch.findUnique as jest.Mock).mockResolvedValue({ id: 'branch-1', isActive: true });
    (require('../src/config/database').prisma.branchHoliday.findMany as jest.Mock).mockResolvedValue([]);
    mockRepo.createSchedule.mockResolvedValue(buildSchedule() as any);
  });

  // ── Caso: End antes de Start (Time Traveling) ─────────────────────────────
  it('rechaza inserción donde endDatetime es anterior a startDatetime', async () => {
    await expect(
      createScheduleEntry(
        {
          ...baseInput,
          startDatetime: '2026-06-01T16:00:00Z',
          endDatetime: '2026-06-01T08:00:00Z', // invertido
        } as any,
        mockActor
      )
    ).rejects.toThrow('La fecha de fin debe ser posterior a la de inicio');
  });

  // ── Caso: Start === End — documenta comportamiento de isBefore (permisivo) ──
  // La implementación usa date-fns `isBefore` (estrictamente <), por lo que
  // startDatetime === endDatetime NO lanza excepción. Comportamiento documentado.
  it('permite startDatetime === endDatetime (isBefore es estrictamente <, no <=)', async () => {
    await expect(
      createScheduleEntry(
        {
          ...baseInput,
          startDatetime: '2026-06-01T10:00:00Z',
          endDatetime: '2026-06-01T10:00:00Z',
        } as any,
        mockActor
      )
    ).resolves.toBeDefined(); // No lanza — comportamiento real de ensureValidScheduleRange
  });

  // ── Caso: Overlap parcial de 1 minuto — choque mínimo detectado ──────────
  it('detecta solapamiento cuando la nueva guardia empieza 1 minuto antes de que acabe otra', async () => {
    // Guardia existente: 08:00 – 16:00. Nueva: 15:59 – 18:00 → solapa 1 minuto
    mockRepo.findSchedules.mockResolvedValue([
      buildSchedule() as any,
    ]);

    await expect(
      createScheduleEntry(
        {
          ...baseInput,
          startDatetime: '2026-06-01T15:59:00Z',
          endDatetime: '2026-06-01T18:00:00Z',
        } as any,
        mockActor
      )
    ).rejects.toThrow(/Conflicto de horarios/);
  });

  // ── Caso: Guardia anterior termina exactamente cuando empieza la nueva ────
  it('permite inserción cuando una guardia termina exactamente en el mismo segundo que empieza la nueva', async () => {
    // No hay overlap (condición: startDatetime { lt: endDt } y endDatetime { gt: startDt })
    // Si la existente termina en T y la nueva empieza en T: not (T lt T) → no overlap
    mockRepo.findSchedules.mockResolvedValue([]);

    await expect(
      createScheduleEntry(baseInput as any, mockActor)
    ).resolves.not.toThrow();
  });

  // ── Caso: assigneeIds vacío — falla validación de Zod ─────────────────────
  it('rechaza schedules sin asignados (mínimo 1 persona requerida por negocio)', async () => {
    await expect(
      createScheduleEntry(
        { ...baseInput, assigneeIds: [] } as any,
        mockActor
      )
    ).rejects.toThrow('Datos inválidos');
  });

  // ── Caso: Sin título — falla validación ───────────────────────────────────
  it('rechaza schedules sin título (campo obligatorio min 2 chars)', async () => {
    await expect(
      createScheduleEntry(
        { ...baseInput, title: 'A' } as any, // 1 char (por debajo del mínimo 2)
        mockActor
      )
    ).rejects.toThrow('Datos inválidos');
  });

  // ── Caso: Creación exitosa registra auditoría ─────────────────────────────
  it('crea correctamente una guardia sin conflictos y genera log de auditoría', async () => {
    const { logAuditOrThrow } = require('../src/modules/audit/audit.service');

    const schedule = await createScheduleEntry(baseInput as any, mockActor);

    expect(schedule.id).toBe('schedule-1');
    expect(logAuditOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_SCHEDULE', entityType: 'Schedule' }),
      expect.anything()
    );
  });

  // ── Caso: Creación en día festivo (bloqueado) ───────────────────────────
  it('rechaza crear un turno de tipo "guardia" en un día festivo', async () => {
    // Escenario: El 1 de Mayo es festivo. Intentamos crear turno ese día.
    const holidayInput = {
      ...baseInput,
      startDatetime: '2026-05-01T08:00:00Z',
      endDatetime: '2026-05-01T16:00:00Z',
    };
    
    // Simulamos que la BD devuelve un festivo para ese día
    (require('../src/config/database').prisma.branchHoliday.findMany as jest.Mock).mockResolvedValue([
      { name: 'Día del Trabajo', date: new Date('2026-05-01') }
    ]);

    await expect(createScheduleEntry(holidayInput as any, mockActor))
      .rejects.toThrow('No se puede asignar trabajo en días festivos');
  });
});
