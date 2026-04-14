import { Response } from 'express';
import { sendError, sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { isAppError } from '../../common/errors/app-error';
import { z } from 'zod';
import {
  createScheduleEntry,
  deleteScheduleEntry,
  getScheduleById,
  listSchedules,
  listWeekSchedules,
  updateScheduleEntry,
} from './schedules.service';

const weekParamsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  week: z.coerce.number().int().min(1).max(53),
});

export async function listSchedulesController(req: AuthRequest, res: Response) {
  const schedules = await listSchedules({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    userId: req.query.userId as string | undefined,
    type: req.query.type as string | undefined,
  });
  return sendSuccess(res, schedules);
}

export async function listWeekSchedulesController(req: AuthRequest, res: Response) {
  const parsed = weekParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 'Parámetros de semana inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  const result = await listWeekSchedules(parsed.data.year, parsed.data.week);
  return sendSuccess(res, result);
}

export async function getScheduleController(req: AuthRequest, res: Response) {
  try {
    const schedule = await getScheduleById(req.params.id);
    return sendSuccess(res, schedule);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function createScheduleController(req: AuthRequest, res: Response) {
  try {
    const schedule = await createScheduleEntry(req.body, {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      ipAddress: req.ip,
    });
    return sendSuccess(res, schedule, 'Guardia creada', 201);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function updateScheduleController(req: AuthRequest, res: Response) {
  try {
    const schedule = await updateScheduleEntry(req.params.id, req.body, {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      ipAddress: req.ip,
    });
    return sendSuccess(res, schedule, 'Guardia actualizada');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function deleteScheduleController(req: AuthRequest, res: Response) {
  try {
    await deleteScheduleEntry(req.params.id, req.body?.reason, {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Guardia eliminada');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}
