import axios from 'axios';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { buildScheduleCard, buildVacationCard } from './notifications.templates';

interface ScheduleChangeParams {
  type: string;
  schedule: {
    id: string;
    title: string;
    startDatetime: Date;
    endDatetime: Date;
    location?: string | null;
    assignments: Array<{ user: { name: string } }>;
  };
  actor: { name: string; id?: string };
  reason: string;
  isLastMinute: boolean;
}

interface VacationChangeParams {
  type: string;
  vacation: {
    id: string;
    employee: { name: string };
    startDate: Date;
    endDate: Date;
    note?: string | null;
    rejectionReason?: string | null;
  };
  actor: { name: string; id?: string };
}

export async function notifyVacationChange(params: VacationChangeParams) {
  logger.info(`[notifyVacationChange] type=${params.type} employee=${params.vacation.employee.name}`);

  const card = buildVacationCard({
    type: params.type,
    employeeName: params.vacation.employee.name,
    startDate: params.vacation.startDate,
    endDate: params.vacation.endDate,
    note: params.vacation.note,
    actor: params.actor.name,
    rejectionReason: params.vacation.rejectionReason,
  });

  const webhooks = await prisma.webhookConfig.findMany({
    where: { enabled: true, notifyModifications: true },
  });

  logger.info(`[notifyVacationChange] found ${webhooks.length} webhooks with notifyModifications=true`);

  for (const webhook of webhooks) {
    await sendToWebhook({
      webhookConfigId: webhook.id,
      webhookUrl: webhook.webhookUrl,
      payload: card,
      type: params.type,
      message: `${params.type}: ${params.vacation.employee.name}`,
      sentByUserId: params.actor.id,
    });
  }
}

export async function notifyScheduleChange(params: ScheduleChangeParams) {
  const assignees = params.schedule.assignments.map((a) => a.user.name);

  const card = buildScheduleCard({
    type: params.type,
    title: params.schedule.title,
    startDatetime: params.schedule.startDatetime,
    endDatetime: params.schedule.endDatetime,
    assignees,
    location: params.schedule.location,
    reason: params.reason,
    actor: params.actor.name,
    isLastMinute: params.isLastMinute,
  });

  const webhooks = await prisma.webhookConfig.findMany({
    where: {
      enabled: true,
      ...(params.isLastMinute ? { notifyLastMinute: true } : { notifyModifications: true }),
    },
  });

  for (const webhook of webhooks) {
    await sendToWebhook({
      webhookConfigId: webhook.id,
      webhookUrl: webhook.webhookUrl,
      payload: card,
      type: params.type,
      message: `${params.type}: ${params.schedule.title}`,
      scheduleId: params.schedule.id,
      sentByUserId: params.actor.id,
    });
  }
}

export async function sendToWebhook(params: {
  webhookConfigId?: string;
  webhookUrl: string;
  payload: object;
  type: string;
  message: string;
  scheduleId?: string;
  sentByUserId?: string;
}) {
  let status = 'sent';
  let errorMessage: string | undefined;

  try {
    const response = await axios.post(params.webhookUrl, params.payload, {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    });
    const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    logger.info(`Webhook sent: ${params.type} → ${params.webhookUrl} (${response.status})`);
    logger.info(`Webhook response body: ${responseBody.slice(0, 200)}`);
  } catch (err: unknown) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`Webhook failed: ${params.webhookUrl} — ${errorMessage}`);
  }

  return prisma.notificationLog.create({
    data: {
      type: params.type,
      message: params.message,
      payload: JSON.stringify(params.payload),
      webhookConfigId: params.webhookConfigId,
      sentByUserId: params.sentByUserId,
      status,
      errorMessage,
      scheduleId: params.scheduleId,
    },
  });
}

export async function resendNotification(logId: string, userId: string) {
  const log = await prisma.notificationLog.findUnique({
    where: { id: logId },
    include: { webhookConfig: true },
  });

  if (!log) throw new Error('Notificación no encontrada');
  if (!log.webhookConfig) throw new Error('Webhook no disponible');
  if (!log.payload) throw new Error('Sin payload para reenviar');

  return sendToWebhook({
    webhookConfigId: log.webhookConfigId || undefined,
    webhookUrl: log.webhookConfig.webhookUrl,
    payload: JSON.parse(log.payload),
    type: log.type,
    message: `[Reenvío] ${log.message}`,
    scheduleId: log.scheduleId || undefined,
    sentByUserId: userId,
  });
}
