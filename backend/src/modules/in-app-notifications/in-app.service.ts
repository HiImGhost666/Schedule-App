import { prisma } from '../../config/database';

export type InAppNotificationType =
  | 'vacation_approved'
  | 'vacation_rejected'
  | 'vacation_cancelled'
  | 'vacation_requested'
  | 'schedule_assigned'
  | 'schedule_modified'
  | 'schedule_deleted'
  | 'schedule_removed'
  | 'profile_updated'
  | 'password_changed'
  | 'system';

interface CreateInAppNotificationParams {
  userId: string;
  type: InAppNotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Crea una notificación in-app para un usuario específico.
 * Se almacena en la tabla `in_app_notifications` y puede ser consultada
 * desde el frontend para mostrar un badge de notificaciones no leídas.
 */
export async function createInAppNotification(params: CreateInAppNotificationParams) {
  return prisma.inAppNotification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

/**
 * Crea notificaciones in-app para múltiples usuarios a la vez (batch)
 */
export async function createInAppNotificationBatch(
  notifications: Array<{
    userId: string;
    type: InAppNotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }>
) {
  return prisma.inAppNotification.createMany({
    data: notifications.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      metadata: n.metadata ? JSON.stringify(n.metadata) : null,
    })),
  });
}

/**
 * Obtiene las notificaciones no leídas de un usuario
 */
export async function getUnreadNotifications(userId: string) {
  return prisma.inAppNotification.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Obtiene todas las notificaciones de un usuario (con paginación)
 */
export async function getUserNotifications(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.inAppNotification.count({ where: { userId } }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Marca una notificación como leída
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.inAppNotification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

/**
 * Marca todas las notificaciones de un usuario como leídas
 */
export async function markAllAsRead(userId: string) {
  return prisma.inAppNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/**
 * Cuenta las notificaciones no leídas de un usuario
 */
export async function countUnread(userId: string): Promise<number> {
  return prisma.inAppNotification.count({
    where: { userId, readAt: null },
  });
}
