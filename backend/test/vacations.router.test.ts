/**
 * @file vacations.router.test.ts
 * Tests del router de vacaciones: autenticación, permisos, validación de body.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../src/middleware/auth.middleware', () => {
  const { DEFAULT_ROLE_PERMISSIONS } = require('../src/modules/roles/roles.constants');
  return {
    authMiddleware: (req: any, res: any, next: any) => {
      const role = req.header('x-test-role') as any;

      if (!role) {
        return res.status(401).json({
          success: false,
          error: 'Token de acceso requerido',
          code: 'UNAUTHORIZED',
        });
      }

      const permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
      req.user = {
        id: 'test-user',
        roleName: role,
        permissions,
        name: 'Test User',
        email: 'test@example.com',
        branchId: 'b-1',
        departmentId: 'dept-1',
        status: 'active',
      };
      next();
    },
  };
});

jest.mock('../src/modules/vacations/vacations.service', () => ({
  listVacations: jest.fn(),
  getVacationById: jest.fn(),
  createVacationEntry: jest.fn(),
  approveVacationEntry: jest.fn(),
  rejectVacationEntry: jest.fn(),
  cancelVacationEntry: jest.fn(),
  getVacationCalendar: jest.fn(),
}));

import vacationsRouter from '../src/modules/vacations/vacations.router';
import * as vacationsService from '../src/modules/vacations/vacations.service';

const mockService = vacationsService as jest.Mocked<typeof vacationsService>;

const app = express();
app.use(express.json());
app.use('/api/vacations', vacationsRouter);

// 2026-07-01 = miércoles, 2026-07-03 = viernes (ambos laborables)
const validVacationItem = {
  startDate: '2026-07-01T00:00:00.000Z',
  endDate: '2026-07-03T00:00:00.000Z',
  note: 'Vacaciones familiares',
};

describe('vacations.router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('returns 200 for admin', async () => {
      mockService.listVacations.mockResolvedValue([] as any);

      const response = await request(app)
        .get('/api/vacations')
        .set('x-test-role', 'admin');

      expect(response.status).toBe(200);
      expect(mockService.listVacations).toHaveBeenCalledTimes(1);
    });

    it('returns 200 for employee', async () => {
      mockService.listVacations.mockResolvedValue([] as any);

      const response = await request(app)
        .get('/api/vacations')
        .set('x-test-role', 'employee');

      expect(response.status).toBe(200);
      expect(mockService.listVacations).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/vacations');

      expect(response.status).toBe(401);
      expect(mockService.listVacations).not.toHaveBeenCalled();
    });
  });

  describe('GET /calendar', () => {
    it('returns 200 for admin', async () => {
      mockService.getVacationCalendar.mockResolvedValue([] as any);

      const response = await request(app)
        .get('/api/vacations/calendar?year=2026&week=27')
        .set('x-test-role', 'admin');

      expect(response.status).toBe(200);
      expect(mockService.getVacationCalendar).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/vacations/calendar?year=2026&week=27');

      expect(response.status).toBe(401);
      expect(mockService.getVacationCalendar).not.toHaveBeenCalled();
    });
  });

  describe('GET /:id', () => {
    it('returns 200 for admin', async () => {
      mockService.getVacationById.mockResolvedValue({ id: 'vac-1' } as any);

      const response = await request(app)
        .get('/api/vacations/vac-1')
        .set('x-test-role', 'admin');

      expect(response.status).toBe(200);
      expect(mockService.getVacationById).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/vacations/vac-1');

      expect(response.status).toBe(401);
      expect(mockService.getVacationById).not.toHaveBeenCalled();
    });
  });

  describe('POST /', () => {
    it('creates vacation for admin', async () => {
      mockService.createVacationEntry.mockResolvedValue({ id: 'vac-1' } as any);

      const response = await request(app)
        .post('/api/vacations')
        .set('x-test-role', 'admin')
        .send(validVacationItem);

      expect(response.status).toBe(201);
      expect(mockService.createVacationEntry).toHaveBeenCalledTimes(1);
    });

    it('returns 201 for employee (employee can create vacations)', async () => {
      mockService.createVacationEntry.mockResolvedValue({ id: 'vac-1' } as any);

      const response = await request(app)
        .post('/api/vacations')
        .set('x-test-role', 'employee')
        .send(validVacationItem);

      expect(response.status).toBe(201);
      expect(mockService.createVacationEntry).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/vacations')
        .send(validVacationItem);

      expect(response.status).toBe(401);
      expect(mockService.createVacationEntry).not.toHaveBeenCalled();
    });

    it('returns 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/vacations')
        .set('x-test-role', 'admin')
        .send({});

      expect(response.status).toBe(400);
      expect(mockService.createVacationEntry).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /:id/approve', () => {
    it('approves vacation for admin', async () => {
      mockService.approveVacationEntry.mockResolvedValue({ id: 'vac-1' } as any);

      const response = await request(app)
        .patch('/api/vacations/vac-1/approve')
        .set('x-test-role', 'admin')
        .send({ note: 'Aprobado' });

      expect(response.status).toBe(200);
      expect(mockService.approveVacationEntry).toHaveBeenCalledTimes(1);
    });

    it('returns 403 for employee (requires vacations:approve)', async () => {
      const response = await request(app)
        .patch('/api/vacations/vac-1/approve')
        .set('x-test-role', 'employee')
        .send({ note: 'Aprobado' });

      expect(response.status).toBe(403);
      expect(mockService.approveVacationEntry).not.toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .patch('/api/vacations/vac-1/approve')
        .send({ note: 'Aprobado' });

      expect(response.status).toBe(401);
      expect(mockService.approveVacationEntry).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /:id/reject', () => {
    it('rejects vacation for admin', async () => {
      mockService.rejectVacationEntry.mockResolvedValue({ id: 'vac-1' } as any);

      const response = await request(app)
        .patch('/api/vacations/vac-1/reject')
        .set('x-test-role', 'admin')
        .send({ rejectionReason: 'Motivo de rechazo' });

      expect(response.status).toBe(200);
      expect(mockService.rejectVacationEntry).toHaveBeenCalledTimes(1);
    });

    it('returns 403 for employee (requires vacations:approve)', async () => {
      const response = await request(app)
        .patch('/api/vacations/vac-1/reject')
        .set('x-test-role', 'employee')
        .send({ rejectionReason: 'Motivo de rechazo' });

      expect(response.status).toBe(403);
      expect(mockService.rejectVacationEntry).not.toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .patch('/api/vacations/vac-1/reject')
        .send({ rejectionReason: 'Motivo de rechazo' });

      expect(response.status).toBe(401);
      expect(mockService.rejectVacationEntry).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:id', () => {
    it('cancels vacation for admin', async () => {
      mockService.cancelVacationEntry.mockResolvedValue({ id: 'vac-1' } as any);

      const response = await request(app)
        .delete('/api/vacations/vac-1')
        .set('x-test-role', 'admin');

      expect(response.status).toBe(200);
      expect(mockService.cancelVacationEntry).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/vacations/vac-1');

      expect(response.status).toBe(401);
      expect(mockService.cancelVacationEntry).not.toHaveBeenCalled();
    });
  });
});
