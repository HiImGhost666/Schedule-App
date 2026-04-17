import { Response } from 'express';
import { sendError, sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { isAppError } from '../../common/errors/app-error';
import {
  createScheduleEntry,
  deleteScheduleEntry,
  getScheduleByIdForActor,
  listSchedulesForActor,
  listWeekSchedulesForActor,
  updateScheduleEntry,
} from './schedules.service';
import {
  createScheduleBodySchema,
  deleteScheduleBodySchema,
  listSchedulesQuerySchema,
  listWeekSchedulesQuerySchema,
  scheduleIdParamsSchema,
  updateScheduleBodySchema,
  weekParamsSchema,
} from './schedules.http.schemas';

export async function listSchedulesController(req: AuthRequest, res: Response) {
  const parsed = listSchedulesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const schedules = await listSchedulesForActor(parsed.data, {
      role: req.user!.role,
      branchId: req.user!.branchId,
    });
    return sendSuccess(res, schedules);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function listWeekSchedulesController(req: AuthRequest, res: Response) {
  const parsed = weekParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 'Parámetros de semana inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  const parsedQuery = listWeekSchedulesQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedQuery.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const result = await listWeekSchedulesForActor(parsed.data.year, parsed.data.week, parsedQuery.data.branchId, {
      role: req.user!.role,
      branchId: req.user!.branchId,
    });
    return sendSuccess(res, result);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function getScheduleController(req: AuthRequest, res: Response) {
  const parsed = scheduleIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const schedule = await getScheduleByIdForActor(parsed.data.id, {
      role: req.user!.role,
      branchId: req.user!.branchId,
    });
    return sendSuccess(res, schedule);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function createScheduleController(req: AuthRequest, res: Response) {
  const parsedBody = createScheduleBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const schedule = await createScheduleEntry(parsedBody.data, {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      branchId: req.user!.branchId,
      ipAddress: req.ip,
    });
    return sendSuccess(res, schedule, 'Guardia creada', 201);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function updateScheduleController(req: AuthRequest, res: Response) {
  const parsedParams = scheduleIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = updateScheduleBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const schedule = await updateScheduleEntry(parsedParams.data.id, parsedBody.data, {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      branchId: req.user!.branchId,
      ipAddress: req.ip,
    });
    return sendSuccess(res, schedule, 'Guardia actualizada');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function deleteScheduleController(req: AuthRequest, res: Response) {
  const parsedParams = scheduleIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = deleteScheduleBodySchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    await deleteScheduleEntry(parsedParams.data.id, parsedBody.data.reason, {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      branchId: req.user!.branchId,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Guardia eliminada');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}
