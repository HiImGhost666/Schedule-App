import cron from 'node-cron';
import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { buildFridaySummaryCard, buildMondayVacationCard } from './notifications.templates';
import { sendToWebhook } from './notifications.service';

export async function sendFridaySummary(sentByUserId?: string) {
  logger.info('Sending Friday schedule summary...');

  const nextWeekStart = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });

  const schedules = await prisma.schedule.findMany({
    where: {
      startDatetime: { gte: nextWeekStart },
      endDatetime: { lte: nextWeekEnd },
    },
    include: {
      assignments: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { startDatetime: 'asc' },
  });

  const weekDays = eachDayOfInterval({ start: nextWeekStart, end: nextWeekEnd });

  const days = weekDays.map((day) => {
    const daySchedules = schedules.filter((s) =>
      isWithinInterval(new Date(s.startDatetime), {
        start: new Date(day.setHours(0, 0, 0, 0)),
        end: new Date(new Date(day).setHours(23, 59, 59, 999)),
      })
    );

    return {
      dayLabel: format(day, "EEEE dd 'de' MMMM", { locale: es }),
      schedules: daySchedules.map((s) => ({
        title: s.title,
        time: `${format(s.startDatetime, 'HH:mm')} - ${format(s.endDatetime, 'HH:mm')}`,
        assignees: s.assignments.map((a) => a.user.name),
        location: s.location,
      })),
    };
  });

  const weekLabel = `${format(nextWeekStart, "dd 'de' MMMM", { locale: es })} — ${format(nextWeekEnd, "dd 'de' MMMM yyyy", { locale: es })}`;
  const card = buildFridaySummaryCard({ weekLabel, days });

  const webhooks = await prisma.webhookConfig.findMany({
    where: { enabled: true, fridayReminderEnabled: true },
  });

  const results = [];
  for (const webhook of webhooks) {
    const result = await sendToWebhook({
      webhookConfigId: webhook.id,
      webhookUrl: webhook.webhookUrl,
      payload: card,
      type: 'friday_reminder',
      message: `Planificación semana ${weekLabel}`,
      sentByUserId,
    });
    results.push(result);
  }

  logger.info(`Friday summary sent to ${results.length} webhook(s)`);
  return results;
}

export async function sendMondayVacationSummary(sentByUserId?: string) {
  logger.info('Sending Monday vacation summary...');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  // Find all 'vacaciones' schedules that overlap with this week
  const vacationSchedules = await prisma.schedule.findMany({
    where: {
      type: 'vacaciones',
      AND: [
        { startDatetime: { lte: weekEnd } },
        { endDatetime: { gte: weekStart } },
      ],
    },
    include: {
      assignments: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { startDatetime: 'asc' },
  });

  // Flatten to individual vacation entries per person
  const vacations = vacationSchedules.flatMap((s) =>
    s.assignments.map((a) => ({
      name: a.user.name,
      from: format(new Date(s.startDatetime), 'dd/MM/yyyy'),
      to: format(new Date(s.endDatetime), 'dd/MM/yyyy'),
    }))
  );

  const weekLabel = `${format(weekStart, "dd 'de' MMMM", { locale: es })} — ${format(weekEnd, "dd 'de' MMMM yyyy", { locale: es })}`;
  const card = buildMondayVacationCard({ weekLabel, vacations });

  const webhooks = await prisma.webhookConfig.findMany({
    where: { enabled: true, fridayReminderEnabled: true },
  });

  const results = [];
  for (const webhook of webhooks) {
    const result = await sendToWebhook({
      webhookConfigId: webhook.id,
      webhookUrl: webhook.webhookUrl,
      payload: card,
      type: 'monday_vacation_summary',
      message: `Vacaciones semana ${weekLabel}`,
      sentByUserId,
    });
    results.push(result);
  }

  logger.info(`Monday vacation summary sent to ${results.length} webhook(s) — ${vacations.length} people on vacation`);
  return results;
}

export function startScheduler() {
  // Every Friday at 12:00 PM — weekly schedule summary
  cron.schedule(
    '0 12 * * 5',
    async () => {
      try {
        await sendFridaySummary();
      } catch (err) {
        logger.error('Friday scheduler error:', err);
      }
    },
    { timezone: 'Europe/Madrid' }
  );

  // Every Monday at 8:30 AM — vacation summary for the current week
  cron.schedule(
    '30 8 * * 1',
    async () => {
      try {
        await sendMondayVacationSummary();
      } catch (err) {
        logger.error('Monday vacation scheduler error:', err);
      }
    },
    { timezone: 'Europe/Madrid' }
  );

  logger.info('Notification scheduler started (Friday 12:00 + Monday 08:30 Europe/Madrid)');
}
