import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { prisma } from '../../config/database';
import { resendNotification, sendToWebhook } from './notifications.service';
import { sendFridaySummary, sendMondayVacationSummary } from './notifications.scheduler';
import { buildAnnouncementCard } from './notifications.templates';

const router = Router();

const getParam = (value: string | string[] | undefined): string | undefined => (
  Array.isArray(value) ? value[0] : value
);

router.get('/logs', authMiddleware, requirePermission('settings:manage'), async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const { type, status } = req.query;

  const where: Prisma.Args<typeof prisma.notificationLog, 'findMany'>['where'] = {};
  if (typeof type === 'string') where.type = type;
  if (typeof status === 'string') where.status = status;

  const [logs, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      include: {
        webhookConfig: { select: { id: true, name: true } },
        sentBy: { select: { id: true, name: true } },
      },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return sendPaginated(res, logs, total, page, limit);
});

router.post('/resend/:logId', authMiddleware, requirePermission('settings:manage'), async (req: AuthRequest, res: Response) => {
  try {
    const logId = getParam(req.params.logId);
    if (!logId) return sendError(res, 'logId invalido', 400);

    const result = await resendNotification(logId, req.user!.id);
    return sendSuccess(res, result, 'Notificación reenviada');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al reenviar';
    return sendError(res, message, 400);
  }
});

router.post('/friday-summary', authMiddleware, requirePermission('settings:manage'), async (req: AuthRequest, res: Response) => {
  try {
    const results = await sendFridaySummary(req.user!.id);
    return sendSuccess(res, { sent: results.length }, `Resumen enviado a ${results.length} webhook(s)`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al enviar resumen';
    return sendError(res, message, 500);
  }
});

router.post('/vacation-summary', authMiddleware, requirePermission('settings:manage'), async (req: AuthRequest, res: Response) => {
  try {
    const results = await sendMondayVacationSummary(req.user!.id);
    return sendSuccess(res, { sent: results.length }, `Resumen de vacaciones enviado a ${results.length} webhook(s)`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al enviar resumen';
    return sendError(res, message, 500);
  }
});

router.post('/announce', authMiddleware, requirePermission('settings:manage'), async (req: AuthRequest, res: Response) => {
  const { message, webhookConfigId } = req.body;
  if (!message) return sendError(res, 'Mensaje requerido', 400);

  const card = buildAnnouncementCard(message, req.user!.name);

  let webhooks;
  if (webhookConfigId) {
    const wh = await prisma.webhookConfig.findUnique({ where: { id: webhookConfigId } });
    if (!wh) return sendError(res, 'Webhook no encontrado', 404);
    webhooks = [wh];
  } else {
    webhooks = await prisma.webhookConfig.findMany({ where: { enabled: true } });
  }

  const results = [];
  for (const wh of webhooks) {
    const result = await sendToWebhook({
      webhookConfigId: wh.id,
      webhookUrl: wh.webhookUrl,
      payload: card,
      type: 'manual_announcement',
      message,
      sentByUserId: req.user!.id,
    });
    results.push(result);
  }

  return sendSuccess(res, { sent: results.length }, 'Anuncio enviado');
});

export default router;
