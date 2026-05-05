import express from 'express';
import request from 'supertest';

jest.mock('../src/middleware/auth.middleware', () => {
  const { DEFAULT_ROLE_PERMISSIONS } = require('../src/modules/roles/roles.constants');
  return {
    authMiddleware: (req: any, _res: any, next: any) => {
      req.user = { 
        id: 'admin-1', 
        roleName: 'admin', 
        permissions: DEFAULT_ROLE_PERMISSIONS['admin'],
        status: 'active'
      };
      next();
    },
  };
});

jest.mock('../src/modules/audit/audit.service', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/modules/notifications/notifications.service', () => ({
  sendToWebhook: jest.fn(),
}));

jest.mock('../src/modules/notifications/notifications.templates', () => ({
  buildTestCard: jest.fn(() => ({})),
}));

jest.mock('../src/config/database', () => ({
  prisma: {
    webhookConfig: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import webhooksRouter from '../src/modules/webhooks/webhooks.router';
import { errorHandler } from '../src/middleware/errorHandler.middleware';
import { prisma } from '../src/config/database';

const prismaMock = prisma as unknown as {
  webhookConfig: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksRouter);
app.use(errorHandler);

function buildWebhookUrl(totalLength: number): string {
  const base = 'https://example.com/';
  if (totalLength <= base.length) {
    return base.slice(0, totalLength);
  }
  return `${base}${'a'.repeat(totalLength - base.length)}`;
}

describe('webhooks.router validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.webhookConfig.create.mockResolvedValue({
      id: 'wh-1',
      name: 'Ops Teams',
      webhookUrl: buildWebhookUrl(8000),
      enabled: true,
      notifyModifications: true,
      notifyLastMinute: true,
      fridayReminderEnabled: true,
      mondayVacationReminderEnabled: true,
      fridayReminderTime: '12:00',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.webhookConfig.findUnique.mockResolvedValue({
      id: 'wh-1',
      name: 'Ops Teams',
      webhookUrl: buildWebhookUrl(8000),
    });
    prismaMock.webhookConfig.update.mockResolvedValue({
      id: 'wh-1',
      webhookUrl: buildWebhookUrl(7000),
    });
  });

  it('acepta URL válida muy larga en POST', async () => {
    const response = await request(app)
      .post('/api/webhooks')
      .send({
        name: 'Canal guardias',
        webhookUrl: buildWebhookUrl(8000),
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(prismaMock.webhookConfig.create).toHaveBeenCalledTimes(1);
  });

  it('rechaza URL inválida en POST con BAD_REQUEST', async () => {
    const response = await request(app)
      .post('/api/webhooks')
      .send({
        name: 'Canal guardias',
        webhookUrl: 'url-invalida',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('BAD_REQUEST');
    expect(prismaMock.webhookConfig.create).not.toHaveBeenCalled();
  });

  it('rechaza URL inválida en PATCH con BAD_REQUEST', async () => {
    const response = await request(app)
      .patch('/api/webhooks/wh-1')
      .send({
        webhookUrl: 'url-invalida',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('BAD_REQUEST');
    expect(prismaMock.webhookConfig.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.webhookConfig.update).not.toHaveBeenCalled();
  });

  it('mapea error P2000 de webhook_url a 400 controlado', async () => {
    prismaMock.webhookConfig.create.mockRejectedValueOnce({
      code: 'P2000',
      meta: { target: ['webhook_url'] },
      message: 'The provided value for the column is too long for the column\'s type. Column: webhook_url',
    });

    const response = await request(app)
      .post('/api/webhooks')
      .send({
        name: 'Canal guardias',
        webhookUrl: buildWebhookUrl(8000),
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('BAD_REQUEST');
    expect(response.body.error).toContain('demasiado larga');
  });
});
