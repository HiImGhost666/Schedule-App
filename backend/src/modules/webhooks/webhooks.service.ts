import { prisma } from '../../config/database';
import { createAppError } from '../../common/errors/error-catalog';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import { logAuditOrThrow } from '../audit/audit.service';

export async function createWebhook(data: {
  name: string;
  webhookUrl: string;
  enabled: boolean;
  notifyModifications: boolean;
  notifyLastMinute: boolean;
  fridayReminderEnabled: boolean;
  mondayVacationReminderEnabled: boolean;
  fridayReminderTime: string;
  scope: 'general' | 'department' | 'branch';
  departmentId?: string | null;
  branchId?: string | null;
}, actorId: string, ipAddress?: string) {
  return executeInTransaction(async (tx) => {
    const webhook = await tx.webhookConfig.create({ data });

    await logAuditOrThrow({
      userId: actorId,
      action: 'CREATE_WEBHOOK',
      entityType: 'WebhookConfig',
      entityId: webhook.id,
      detailsJson: { before: null, after: webhook },
      ipAddress,
    }, tx);

    return webhook;
  });
}

export async function updateWebhook(id: string, data: Partial<{
  name: string;
  webhookUrl: string;
  enabled: boolean;
  notifyModifications: boolean;
  notifyLastMinute: boolean;
  fridayReminderEnabled: boolean;
  mondayVacationReminderEnabled: boolean;
  fridayReminderTime: string;
  scope: 'general' | 'department' | 'branch';
  departmentId?: string | null;
  branchId?: string | null;
}>, actorId: string, ipAddress?: string) {
  const existing = await prisma.webhookConfig.findUnique({ where: { id } });
  if (!existing) throw createAppError('NOT_FOUND', 'Webhook no encontrado');

  return executeInTransaction(async (tx) => {
    const webhook = await tx.webhookConfig.update({ where: { id }, data });

    await logAuditOrThrow({
      userId: actorId,
      action: 'UPDATE_WEBHOOK',
      entityType: 'WebhookConfig',
      entityId: id,
      detailsJson: { before: existing, after: webhook },
      ipAddress,
    }, tx);

    return webhook;
  });
}

export async function deleteWebhook(id: string, actorId: string, ipAddress?: string) {
  const existing = await prisma.webhookConfig.findUnique({ where: { id } });
  if (!existing) throw createAppError('NOT_FOUND', 'Webhook no encontrado');

  return executeInTransaction(async (tx) => {
    await tx.webhookConfig.delete({ where: { id } });

    await logAuditOrThrow({
      userId: actorId,
      action: 'DELETE_WEBHOOK',
      entityType: 'WebhookConfig',
      entityId: id,
      detailsJson: { before: existing, after: null },
      ipAddress,
    }, tx);
  });
}
