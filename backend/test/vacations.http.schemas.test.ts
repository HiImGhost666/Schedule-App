/**
 * @file vacations.http.schemas.test.ts
 * Tests de validación Zod para los schemas HTTP de vacaciones.
 */

import {
  createVacationRequestSchema,
  approveVacationSchema,
  rejectVacationSchema,
  vacationIdParamsSchema,
  listVacationsQuerySchema,
  vacationCalendarQuerySchema,
} from '../src/modules/vacations/vacations.http.schemas';

describe('vacations.http.schemas', () => {
  describe('createVacationRequestSchema', () => {
    // 2026-07-01 = miercoles, 2026-07-03 = viernes (ambos laborables)
    it('accepts valid vacation request', () => {
      const result = createVacationRequestSchema.safeParse({
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-03T00:00:00.000Z',
        note: 'Vacaciones familiares',
      });
      expect(result.success).toBe(true);
    });

    it('rejects weekend start date', () => {
      // 2026-07-04 = sabado
      const result = createVacationRequestSchema.safeParse({
        startDate: '2026-07-04T00:00:00.000Z',
        endDate: '2026-07-06T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('rejects end date before start date', () => {
      const result = createVacationRequestSchema.safeParse({
        startDate: '2026-07-03T00:00:00.000Z',
        endDate: '2026-07-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('accepts request without note', () => {
      const result = createVacationRequestSchema.safeParse({
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-03T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('approveVacationSchema', () => {
    it('accepts with note', () => {
      const result = approveVacationSchema.safeParse({ note: 'Aprobado' });
      expect(result.success).toBe(true);
    });

    it('accepts without note', () => {
      const result = approveVacationSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('rejectVacationSchema', () => {
    it('accepts with rejection reason', () => {
      const result = rejectVacationSchema.safeParse({ rejectionReason: 'No disponible' });
      expect(result.success).toBe(true);
    });

    it('rejects empty rejection reason', () => {
      const result = rejectVacationSchema.safeParse({ rejectionReason: '' });
      expect(result.success).toBe(false);
    });

    it('rejects missing rejection reason', () => {
      const result = rejectVacationSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('vacationIdParamsSchema', () => {
    it('accepts valid id', () => {
      const result = vacationIdParamsSchema.safeParse({ id: 'vac-1' });
      expect(result.success).toBe(true);
    });

    it('rejects empty id', () => {
      const result = vacationIdParamsSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('listVacationsQuerySchema', () => {
    it('accepts empty query (defaults)', () => {
      const result = listVacationsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('accepts valid filters', () => {
      const result = listVacationsQuerySchema.safeParse({
        status: 'pending',
        branchId: 'b-1',
        page: '2',
        pageSize: '10',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('vacationCalendarQuerySchema', () => {
    it('accepts valid year and week', () => {
      const result = vacationCalendarQuerySchema.safeParse({ year: '2026', week: '27' });
      expect(result.success).toBe(true);
    });

    it('accepts only year (week is now optional)', () => {
      const result = vacationCalendarQuerySchema.safeParse({ year: '2026' });
      expect(result.success).toBe(true);
    });

    it('accepts from/to range', () => {
      const result = vacationCalendarQuerySchema.safeParse({
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-30T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty object (no params at all)', () => {
      const result = vacationCalendarQuerySchema.safeParse({});
      expect(result.success).toBe(true); // todos son opcionales
    });
  });
});
