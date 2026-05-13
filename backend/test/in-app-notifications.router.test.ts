/**
 * @file in-app-notifications.router.test.ts
 * Pruebas HTTP del router de notificaciones in-app (integración router + servicio mockeado).
 */

import express from 'express';
import request from 'supertest';

jest.mock('../src/middleware/auth.middleware', () => {
  const { DEFAULT_ROLE_PERMISSIONS } = require('../src/modules/roles/roles.constants');
  return {
    authMiddleware: (req: any, res: any, next: any) => {
      const role = req.header('x-test-role') as string;

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

jest.mock('../src/modules/in-app-notifications/in-app.service', () => ({
  countUnread: jest.fn(),
  getUnreadNotifications: jest.fn(),
  getUserNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  deleteAllNotifications: jest.fn(),
}));

import inAppRouter from '../src/modules/in-app-notifications/in-app.router';
import * as inAppService from '../src/modules/in-app-notifications/in-app.service';

const mockService = inAppService as jest.Mocked<typeof inAppService>;

const app = express();
app.use(express.json());
app.use('/api/in-app-notifications', inAppRouter);

describe('in-app-notifications.router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /unread-count', () => {
    it('returns count for authenticated user', async () => {
      mockService.countUnread.mockResolvedValue(3);

      const response = await request(app)
        .get('/api/in-app-notifications/unread-count')
        .set('x-test-role', 'employee');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ count: 3 });
      expect(mockService.countUnread).toHaveBeenCalledWith('test-user');
    });

    it('returns 401 without auth', async () => {
      const response = await request(app).get('/api/in-app-notifications/unread-count');

      expect(response.status).toBe(401);
      expect(mockService.countUnread).not.toHaveBeenCalled();
    });
  });

  describe('GET /unread', () => {
    it('returns unread list', async () => {
      mockService.getUnreadNotifications.mockResolvedValue([{ id: 'n1' }] as any);

      const response = await request(app)
        .get('/api/in-app-notifications/unread')
        .set('x-test-role', 'employee');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([{ id: 'n1' }]);
      expect(mockService.getUnreadNotifications).toHaveBeenCalledWith('test-user');
    });
  });

  describe('GET /', () => {
    it('returns paginated notifications', async () => {
      mockService.getUserNotifications.mockResolvedValue({
        items: [{ id: 'n1' }],
        total: 5,
        page: 2,
        pageSize: 10,
      });

      const response = await request(app)
        .get('/api/in-app-notifications?page=2&pageSize=10')
        .set('x-test-role', 'employee');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([{ id: 'n1' }]);
      expect(response.body.pagination).toMatchObject({
        total: 5,
        page: 2,
        limit: 10,
        totalPages: 1,
      });
      expect(mockService.getUserNotifications).toHaveBeenCalledWith('test-user', 2, 10);
    });
  });

  describe('PATCH /:id/read', () => {
    it('marks notification as read', async () => {
      mockService.markAsRead.mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/in-app-notifications/notif-1/read')
        .set('x-test-role', 'employee');

      expect(response.status).toBe(200);
      expect(mockService.markAsRead).toHaveBeenCalledWith('notif-1', 'test-user');
    });
  });

  describe('POST /read-all', () => {
    it('marks all as read', async () => {
      mockService.markAllAsRead.mockResolvedValue({ count: 4 } as any);

      const response = await request(app)
        .post('/api/in-app-notifications/read-all')
        .set('x-test-role', 'employee');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ count: 4 });
      expect(mockService.markAllAsRead).toHaveBeenCalledWith('test-user');
    });
  });

  describe('DELETE /:id', () => {
    it('deletes single notification', async () => {
      mockService.deleteNotification.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/in-app-notifications/notif-x')
        .set('x-test-role', 'employee');

      expect(response.status).toBe(200);
      expect(mockService.deleteNotification).toHaveBeenCalledWith('notif-x', 'test-user');
    });
  });

  describe('DELETE /', () => {
    it('deletes all notifications for user', async () => {
      mockService.deleteAllNotifications.mockResolvedValue({ count: 12 });

      const response = await request(app)
        .delete('/api/in-app-notifications')
        .set('x-test-role', 'employee');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ count: 12 });
      expect(mockService.deleteAllNotifications).toHaveBeenCalledWith('test-user');
    });
  });
});
