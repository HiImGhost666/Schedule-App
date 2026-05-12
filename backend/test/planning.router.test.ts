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
        branchId: 'branch-1',
        departmentId: 'department-1',
        permissions,
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
      };
      next();
    },
  };
});

import planningRouter from '../src/modules/planning/planning.router';

const app = express();
app.use(express.json());
app.use('/api/planning', planningRouter);

const range = 'from=2026-05-12T00:00:00.000Z&to=2026-05-18T23:59:59.999Z';

describe('planning.router', () => {
  it('returns empty coverage risks scaffold for users with schedule view permission', async () => {
    const response = await request(app)
      .get(`/api/planning/coverage-risks?${range}`)
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [] });
  });

  it('returns empty availability scaffold for managers with schedule view permission', async () => {
    const response = await request(app)
      .get(`/api/planning/availability?${range}`)
      .set('x-test-role', 'general_manager');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [] });
  });

  it('returns empty availability matrix scaffold for managers with schedule view permission', async () => {
    const response = await request(app)
      .get(`/api/planning/availability-matrix?${range}`)
      .set('x-test-role', 'department_manager');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { days: [], rows: [] } });
  });

  it('returns 401 when authentication is missing', async () => {
    const response = await request(app).get(`/api/planning/coverage-risks?${range}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('validates range query parameters', async () => {
    const response = await request(app)
      .get('/api/planning/coverage-risks?from=bad-date&to=2026-05-18')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('BAD_REQUEST');
  });
});
