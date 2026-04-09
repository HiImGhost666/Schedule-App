import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { prisma } from '../../config/database';
import { logAudit } from '../audit/audit.service';
import { notifyScheduleChange } from '../notifications/notifications.service';
import { isBefore, addHours } from 'date-fns';

const router = Router();

const scheduleSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startDatetime: z.coerce.date(),
  endDatetime: z.coerce.date(),
  type: z.string().default('guardia'),
  color: z.string().default('#1e3a5f'),
  location: z.string().optional(),
  notes: z.string().optional(),
  assigneeIds: z.array(z.string()).min(1, 'Al menos una persona debe estar asignada'),
  reason: z.string().optional(),
  hoursPerDay: z.number().min(0.5).max(24).optional().default(8),
  calendarType: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
});

const assigneeInclude = {
  assignments: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } },
    },
  },
  createdBy: { select: { id: true, name: true } },
};

// Get schedules in date range
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { from, to, userId, type } = req.query;

  const where: Record<string, unknown> = {};
  if (from) where.startDatetime = { gte: new Date(from as string) };
  if (to) where.endDatetime = { ...(where.endDatetime as object || {}), lte: new Date(to as string) };
  if (type) where.type = type;
  if (userId) where.assignments = { some: { userId } };

  const schedules = await prisma.schedule.findMany({
    where,
    include: assigneeInclude,
    orderBy: { startDatetime: 'asc' },
  });

  return sendSuccess(res, schedules);
});

// Get weekly schedules
router.get('/week/:year/:week', authMiddleware, async (req: AuthRequest, res: Response) => {
  const year = parseInt(req.params.year);
  const week = parseInt(req.params.week);

  // Calculate ISO week start/end
  const jan4 = new Date(year, 0, 4);
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const schedules = await prisma.schedule.findMany({
    where: {
      startDatetime: { gte: weekStart },
      endDatetime: { lte: weekEnd },
    },
    include: assigneeInclude,
    orderBy: { startDatetime: 'asc' },
  });

  return sendSuccess(res, { schedules, weekStart, weekEnd });
});

// Get single schedule
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const schedule = await prisma.schedule.findUnique({
    where: { id: req.params.id },
    include: assigneeInclude,
  });
  if (!schedule) return sendError(res, 'Guardia no encontrada', 404);
  return sendSuccess(res, schedule);
});

// Create schedule
router.post('/', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten());

  const { assigneeIds, reason, ...scheduleData } = parsed.data;
  const startDt = new Date(scheduleData.startDatetime);
  const endDt = new Date(scheduleData.endDatetime);

  if (isBefore(endDt, startDt)) return sendError(res, 'La fecha de fin debe ser posterior a la de inicio', 400);

  const isLastMinute = isBefore(startDt, addHours(new Date(), 24));

  const schedule = await prisma.schedule.create({
    data: {
      ...scheduleData,
      startDatetime: startDt,
      endDatetime: endDt,
      isLastMinute,
      createdById: req.user!.id,
      assignments: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    include: assigneeInclude,
  });

  await logAudit({ userId: req.user!.id, action: 'CREATE_SCHEDULE', entityType: 'Schedule', entityId: schedule.id, detailsJson: { title: schedule.title, assigneeIds, reason }, ipAddress: req.ip });

  notifyScheduleChange({
    type: 'schedule_created',
    schedule,
    actor: req.user!,
    reason: reason || 'Nueva guardia programada',
    isLastMinute,
  }).catch(() => {});

  return sendSuccess(res, schedule, 'Guardia creada', 201);
});

// Update schedule
router.patch('/:id', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  const updateSchema = scheduleSchema.partial().extend({ reason: z.string().optional() });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400);

  const existing = await prisma.schedule.findUnique({ where: { id: req.params.id }, include: { assignments: true } });
  if (!existing) return sendError(res, 'Guardia no encontrada', 404);

  const { assigneeIds, reason, ...updateData } = parsed.data;

  const startDt = updateData.startDatetime ? new Date(updateData.startDatetime) : existing.startDatetime;
  const isLastMinute = isBefore(startDt, addHours(new Date(), 24));

  const schedule = await prisma.$transaction(async (tx) => {
    if (assigneeIds) {
      await tx.scheduleAssignment.deleteMany({ where: { scheduleId: req.params.id } });
      await tx.scheduleAssignment.createMany({
        data: assigneeIds.map((userId) => ({ scheduleId: req.params.id, userId })),
      });
    }

    return tx.schedule.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(updateData.startDatetime && { startDatetime: new Date(updateData.startDatetime) }),
        ...(updateData.endDatetime && { endDatetime: new Date(updateData.endDatetime) }),
        isLastMinute,
      },
      include: assigneeInclude,
    });
  });

  await logAudit({ userId: req.user!.id, action: 'UPDATE_SCHEDULE', entityType: 'Schedule', entityId: schedule.id, detailsJson: { changes: updateData, reason }, ipAddress: req.ip });

  notifyScheduleChange({
    type: isLastMinute ? 'schedule_lastminute' : 'schedule_modified',
    schedule,
    actor: req.user!,
    reason: reason || 'Sin motivo especificado',
    isLastMinute,
  }).catch(() => {});

  return sendSuccess(res, schedule, 'Guardia actualizada');
});

// Delete schedule
router.delete('/:id', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id }, include: assigneeInclude });
  if (!schedule) return sendError(res, 'Guardia no encontrada', 404);

  await prisma.schedule.delete({ where: { id: req.params.id } });
  await logAudit({ userId: req.user!.id, action: 'DELETE_SCHEDULE', entityType: 'Schedule', entityId: req.params.id, detailsJson: { title: schedule.title, reason }, ipAddress: req.ip });

  notifyScheduleChange({
    type: 'schedule_deleted',
    schedule,
    actor: req.user!,
    reason: reason || 'Sin motivo especificado',
    isLastMinute: false,
  }).catch(() => {});

  return sendSuccess(res, null, 'Guardia eliminada');
});

export default router;
