import type { Request, Response } from 'express';
import { sendError, sendSuccess } from '../../utils/response';
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

export async function listScheduleTypes(_req: Request, res: Response) {
  try {
    const scheduleTypes = await getScheduleTypes();
    sendSuccess(res, scheduleTypes);
  } catch {
    sendError(res, 'Error al obtener tipos de turno', 500);
  }
}

export async function getScheduleType(_req: Request, res: Response) {
  try {
    const scheduleType = await getScheduleTypeById(_req.params.id as string);
    sendSuccess(res, scheduleType);
  } catch {
    sendError(res, 'Tipo de turno no encontrado', 404);
  }
}

export async function createScheduleTypeHandler(req: Request, res: Response) {
  const parsed = createScheduleTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const scheduleType = await createScheduleType(parsed.data);
    sendSuccess(res, scheduleType, undefined, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Error al crear tipo de turno', 400);
  }
}

export async function updateScheduleTypeHandler(req: Request, res: Response) {
  const parsed = updateScheduleTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const scheduleType = await updateScheduleType(req.params.id as string, parsed.data);
    sendSuccess(res, scheduleType);
  } catch (error: any) {
    sendError(res, error.message || 'Error al actualizar tipo de turno', 400);
  }
}

export async function deleteScheduleTypeHandler(req: Request, res: Response) {
  try {
    await deleteScheduleType(req.params.id as string);
    sendSuccess(res, { message: 'Schedule type deleted successfully' });
  } catch (error: any) {
    sendError(res, error.message || 'Error al eliminar tipo de turno', 400);
  }
}
