import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { prisma } from '../../config/database';
import { sendToWebhook } from '../notifications/notifications.service';
import { buildTestCard } from '../notifications/notifications.templates';
import { logAudit } from '../audit/audit.service';

const router = Router();

const webhookSchema = z.object({
  name: z.string().min(2),
  webhookUrl: z.string().url(),
  enabled: z.boolean().default(true),
  notifyModifications: z.boolean().default(true),
  notifyLastMinute: z.boolean().default(true),
  fridayReminderEnabled: z.boolean().default(true),
  fridayReminderTime: z.string().default('12:00'),
});

router.get('/', authMiddleware, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const webhooks = await prisma.webhookConfig.findMany({ orderBy: { createdAt: 'desc' } });
  return sendSuccess(res, webhooks);
});

router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten());

  const webhook = await prisma.webhookConfig.create({ data: parsed.data });
  await logAudit({ userId: req.user!.id, action: 'CREATE_WEBHOOK', entityType: 'WebhookConfig', entityId: webhook.id, detailsJson: { name: webhook.name }, ipAddress: req.ip });
  return sendSuccess(res, webhook, 'Webhook creado', 201);
});

router.patch('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = webhookSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400);

  const existing = await prisma.webhookConfig.findUnique({ where: { id: req.params.id } });
  if (!existing) return sendError(res, 'Webhook no encontrado', 404);

  const webhook = await prisma.webhookConfig.update({ where: { id: req.params.id }, data: parsed.data });
  await logAudit({ userId: req.user!.id, action: 'UPDATE_WEBHOOK', entityType: 'WebhookConfig', entityId: req.params.id, detailsJson: parsed.data, ipAddress: req.ip });
  return sendSuccess(res, webhook, 'Webhook actualizado');
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const existing = await prisma.webhookConfig.findUnique({ where: { id: req.params.id } });
  if (!existing) return sendError(res, 'Webhook no encontrado', 404);

  await prisma.webhookConfig.delete({ where: { id: req.params.id } });
  await logAudit({ userId: req.user!.id, action: 'DELETE_WEBHOOK', entityType: 'WebhookConfig', entityId: req.params.id, detailsJson: { name: existing.name }, ipAddress: req.ip });
  return sendSuccess(res, null, 'Webhook eliminado');
});

router.post('/:id/test', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const webhook = await prisma.webhookConfig.findUnique({ where: { id: req.params.id } });
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
});

export default router;
