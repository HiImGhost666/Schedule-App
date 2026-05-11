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
        status: 'active'
      };
      next();
    },
  };
});

jest.mock('../src/modules/notifications/notifications.service', () => ({
  resendNotification: jest.fn(),
  sendToWebhook: jest.fn(),
}));

jest.mock('../src/modules/notifications/notifications.scheduler', () => ({
  sendFridaySummary: jest.fn(),
  sendMondayVacationSummary: jest.fn(),
}));

jest.mock('../src/modules/notifications/notifications.templates', () => ({
  buildAnnouncementCard: jest.fn(() => ({ type: 'message', body: 'card' })),
}));

import notificationsRouter from '../src/modules/notifications/notifications.router';
import * as notificationsService from '../src/modules/notifications/notifications.service';
import { prismaMock } from './singleton';

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationsRouter);

describe('notifications.router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.notificationLog.findMany.mockResolvedValue([] as any);
    prismaMock.notificationLog.count.mockResolvedValue(0 as any);
    prismaMock.webhookConfig.findMany.mockResolvedValue([
      { id: 'wh-1', webhookUrl: 'https://example.com/wh1' },
      { id: 'wh-2', webhookUrl: 'https://example.com/wh2' },
    ] as any);
    (notificationsService.sendToWebhook as jest.Mock).mockResolvedValue({ success: true });
    (notificationsService.resendNotification as jest.Mock).mockResolvedValue({ id: 'log-1', status: 'sent' });
  });

  it('returns paginated logs on GET /logs', async () => {
    const response = await request(app)
      .get('/api/notifications/logs?page=1&limit=20')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(prismaMock.notificationLog.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.notificationLog.count).toHaveBeenCalledTimes(1);
  });

  it('resends notification by id', async () => {
    const response = await request(app)
      .post('/api/notifications/resend/log-1')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(notificationsService.resendNotification).toHaveBeenCalledWith('log-1', 'test-user');
  });

  it('returns 401 on announce when role header is missing', async () => {
    const response = await request(app).post('/api/notifications/announce').send({ message: 'Aviso' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: 'Token de acceso requerido',
      code: 'UNAUTHORIZED',
    });
  });

  it('returns 403 on announce for employee', async () => {
    const response = await request(app)
      .post('/api/notifications/announce')
      .set('x-test-role', 'employee')
      .send({ message: 'Aviso' });

    expect(response.status).toBe(403);
    expect(notificationsService.sendToWebhook).not.toHaveBeenCalled();
  });

  it('validates message on announce endpoint', async () => {
    const response = await request(app)
      .post('/api/notifications/announce')
      .set('x-test-role', 'admin')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  it('sends to specific webhook ids when provided', async () => {
    prismaMock.webhookConfig.findMany.mockResolvedValueOnce([
      { id: 'wh-1', webhookUrl: 'https://example.com/wh1' },
    ] as any);

    const response = await request(app)
      .post('/api/notifications/announce')
      .set('x-test-role', 'admin')
      .send({ message: 'Mensaje importante', webhookConfigIds: ['wh-1'] });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.sent).toBe(1);
    expect(notificationsService.sendToWebhook).toHaveBeenCalledTimes(1);
  });

  it('sends announcement to all enabled webhooks', async () => {
    const response = await request(app)
      .post('/api/notifications/announce')
      .set('x-test-role', 'admin')
      .send({ message: 'Guardia activa' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.sent).toBe(2);
    expect(notificationsService.sendToWebhook).toHaveBeenCalledTimes(2);
  });
});
