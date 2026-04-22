import express from 'express';
import request from 'supertest';

jest.mock('../src/middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const role = req.header('x-test-role');

    if (!role) {
      return res.status(401).json({
        success: false,
        error: 'Token de acceso requerido',
        code: 'UNAUTHORIZED',
      });
    }

    req.user = { id: 'test-user', role, name: 'Test User' };
    next();
  },
}));

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

jest.mock('../src/config/database', () => ({
  prisma: {
    notificationLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    webhookConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import notificationsRouter from '../src/modules/notifications/notifications.router';
import { prisma } from '../src/config/database';
import * as notificationsService from '../src/modules/notifications/notifications.service';

const prismaMock = prisma as unknown as {
  notificationLog: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
  webhookConfig: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
};

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationsRouter);

describe('notifications.router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.notificationLog.findMany.mockResolvedValue([]);
    prismaMock.notificationLog.count.mockResolvedValue(0);
    prismaMock.webhookConfig.findMany.mockResolvedValue([
      { id: 'wh-1', webhookUrl: 'https://example.com/wh1' },
      { id: 'wh-2', webhookUrl: 'https://example.com/wh2' },
    ]);
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

  it('returns 403 on announce for viewer', async () => {
    const response = await request(app)
      .post('/api/notifications/announce')
      .set('x-test-role', 'viewer')
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

  it('returns 404 when explicit webhook does not exist', async () => {
    prismaMock.webhookConfig.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/api/notifications/announce')
      .set('x-test-role', 'admin')
      .send({ message: 'Mensaje importante', webhookConfigId: 'missing-wh' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(notificationsService.sendToWebhook).not.toHaveBeenCalled();
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
