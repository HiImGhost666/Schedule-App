import { Router, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { prisma } from '../../config/database';
import { sendToWebhook } from '../notifications/notifications.service';
import { buildTestCard } from '../notifications/notifications.templates';
import { logAudit } from '../audit/audit.service';

const router = Router();

const getParam = (value: string | string[] | undefined): string | undefined => (
  Array.isArray(value) ? value[0] : value
);

const asyncRoute = (handler: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

function isPrismaColumnTooLongError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    meta?: { target?: unknown };
    message?: unknown;
  };

  if (candidate.code !== 'P2000') {
    return false;
  }

  const target = candidate.meta?.target;
  if (Array.isArray(target)) {
    return target.some((item) => String(item).toLowerCase().includes(columnName.toLowerCase()));
  }

  if (typeof target === 'string') {
    return target.toLowerCase().includes(columnName.toLowerCase());
  }

  return typeof candidate.message === 'string' && candidate.message.toLowerCase().includes(columnName.toLowerCase());
}

function handleWebhookPersistenceError(error: unknown, res: Response): boolean {
  if (isPrismaColumnTooLongError(error, 'webhook_url')) {
    sendError(
      res,
      'La URL del webhook es demasiado larga para el almacenamiento actual',
      400,
      { fieldErrors: { webhookUrl: ['URL demasiado larga'] } },
      'BAD_REQUEST'
    );
    return true;
  }

  return false;
}

const webhookSchema = z.object({
  name: z.string().min(2),
  webhookUrl: z.string().url('URL inválida'),
  enabled: z.boolean().default(true),
  notifyModifications: z.boolean().default(true),
  notifyLastMinute: z.boolean().default(true),
  fridayReminderEnabled: z.boolean().default(true),
  mondayVacationReminderEnabled: z.boolean().default(true),
  fridayReminderTime: z.string().default('12:00'),
});

router.get('/', authMiddleware, requirePermission('settings:manage'), asyncRoute(async (_req: AuthRequest, res: Response) => {
  const webhooks = await prisma.webhookConfig.findMany({ orderBy: { createdAt: 'desc' } });
  return sendSuccess(res, webhooks);
}));

router.post('/', authMiddleware, requirePermission('settings:manage'), asyncRoute(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');

  let webhook;
  try {
    webhook = await prisma.webhookConfig.create({ data: parsed.data });
  } catch (error) {
    if (handleWebhookPersistenceError(error, res)) {
      return;
    }
    return next(error);
  }

  await logAudit({ userId: req.user!.id, action: 'CREATE_WEBHOOK', entityType: 'WebhookConfig', entityId: webhook.id, detailsJson: { before: null, after: webhook }, ipAddress: req.ip });
  return sendSuccess(res, webhook, 'Webhook creado', 201);
}));

router.patch('/:id', authMiddleware, requirePermission('settings:manage'), asyncRoute(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const id = getParam(req.params.id);
  if (!id) return sendError(res, 'ID de webhook invalido', 400, null, 'BAD_REQUEST');

  const parsed = webhookSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');

  const existing = await prisma.webhookConfig.findUnique({ where: { id } });
  if (!existing) return sendError(res, 'Webhook no encontrado', 404);

  let webhook;
  try {
    webhook = await prisma.webhookConfig.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (handleWebhookPersistenceError(error, res)) {
      return;
    }
    return next(error);
  }

  await logAudit({ userId: req.user!.id, action: 'UPDATE_WEBHOOK', entityType: 'WebhookConfig', entityId: id, detailsJson: { before: existing, after: webhook }, ipAddress: req.ip });
  return sendSuccess(res, webhook, 'Webhook actualizado');
}));

router.delete('/:id', authMiddleware, requirePermission('settings:manage'), asyncRoute(async (req: AuthRequest, res: Response) => {
  const id = getParam(req.params.id);
  if (!id) return sendError(res, 'ID de webhook invalido', 400, null, 'BAD_REQUEST');

  const existing = await prisma.webhookConfig.findUnique({ where: { id } });
  if (!existing) return sendError(res, 'Webhook no encontrado', 404);

  await prisma.webhookConfig.delete({ where: { id } });
  await logAudit({ userId: req.user!.id, action: 'DELETE_WEBHOOK', entityType: 'WebhookConfig', entityId: id, detailsJson: { before: existing, after: null }, ipAddress: req.ip });
  return sendSuccess(res, null, 'Webhook eliminado');
}));

router.post('/:id/test', authMiddleware, requirePermission('settings:manage'), asyncRoute(async (req: AuthRequest, res: Response) => {
  const id = getParam(req.params.id);
  if (!id) return sendError(res, 'ID de webhook invalido', 400, null, 'BAD_REQUEST');

  const webhook = await prisma.webhookConfig.findUnique({ where: { id } });
  if (!webhook) return sendError(res, 'Webhook no encontrado', 404);

  const card = buildTestCard(webhook.name);
  const result = await sendToWebhook({
    webhookConfigId: webhook.id,
    webhookUrl: webhook.webhookUrl,
    payload: card,
    type: 'test',
    message: `Prueba de webhook: ${webhook.name}`,
    sentByUserId: req.user!.id,
  });

  if (result.status === 'failed') {
    return sendError(res, `Error al enviar: ${result.errorMessage}`, 500);
  }
  return sendSuccess(res, null, 'Mensaje de prueba enviado correctamente');
}));

export default router;
