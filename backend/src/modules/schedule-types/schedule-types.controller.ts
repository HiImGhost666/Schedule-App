import type { Request, Response } from 'express';
import { sendError, sendSuccess } from '../../utils/response';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { isAppError } from '../../common/errors/app-error';
import {
  getScheduleTypes,
  getScheduleTypeById,
  createScheduleType,
  updateScheduleType,
  deleteScheduleType,
} from './schedule-types.service';
import {
  createScheduleTypeSchema,
  updateScheduleTypeSchema,
} from './schedule-types.http.schemas';

function sendScheduleTypeError(res: Response, error: unknown, fallbackMessage: string) {
  if (isAppError(error)) {
    return sendError(res, error.message, error.statusCode, error.details, error.code);
  }

  return sendError(res, fallbackMessage, 500, undefined, 'INTERNAL_ERROR');
}

export async function listScheduleTypes(_req: Request, res: Response) {
  try {
    const scheduleTypes = await getScheduleTypes();
    return sendSuccess(res, scheduleTypes);
  } catch (error: unknown) {
    return sendScheduleTypeError(res, error, 'Error al obtener tipos de turno');
  }
}

export async function getScheduleType(_req: Request, res: Response) {
  try {
    const scheduleType = await getScheduleTypeById(_req.params.id as string);
    return sendSuccess(res, scheduleType);
  } catch (error: unknown) {
    return sendScheduleTypeError(res, error, 'Error al obtener tipo de turno');
  }
}

export async function createScheduleTypeHandler(req: AuthRequest, res: Response) {
  const parsed = createScheduleTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const scheduleType = await createScheduleType(parsed.data, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, scheduleType, undefined, 201);
  } catch (error: unknown) {
    return sendScheduleTypeError(res, error, 'Error al crear tipo de turno');
  }
}

export async function updateScheduleTypeHandler(req: AuthRequest, res: Response) {
  const parsed = updateScheduleTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const scheduleType = await updateScheduleType(req.params.id as string, parsed.data, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, scheduleType);
  } catch (error: unknown) {
    return sendScheduleTypeError(res, error, 'Error al actualizar tipo de turno');
  }
}

export async function deleteScheduleTypeHandler(req: AuthRequest, res: Response) {
  try {
    await deleteScheduleType(req.params.id as string, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, { message: 'Schedule type deleted successfully' });
  } catch (error: unknown) {
    return sendScheduleTypeError(res, error, 'Error al eliminar tipo de turno');
  }
}
