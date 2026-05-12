import { Response } from 'express';
import { sendError, sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { isAppError } from '../../common/errors/app-error';
import * as shiftPresetsService from './shift-presets.service';
import { createShiftPresetSchema, updateShiftPresetSchema } from './shift-presets.http.schemas';

function getParamId(req: AuthRequest): string {
  return String(req.params.id);
}

function sendShiftPresetError(res: Response, error: unknown, fallbackMessage: string) {
  if (isAppError(error)) {
    return sendError(res, error.message, error.statusCode, error.details, error.code);
  }

  return sendError(res, fallbackMessage, 500, undefined, 'INTERNAL_ERROR');
}

export async function listShiftPresetsController(req: AuthRequest, res: Response) {
  try {
    const presets = await shiftPresetsService.listShiftPresets();
    return sendSuccess(res, presets);
  } catch (error: unknown) {
    return sendShiftPresetError(res, error, 'Error al listar presets');
  }
}

export async function getShiftPresetController(req: AuthRequest, res: Response) {
  try {
    const preset = await shiftPresetsService.getShiftPresetById(getParamId(req));
    if (!preset) {
      return sendError(res, 'Shift preset no encontrado', 404);
    }
    return sendSuccess(res, preset);
  } catch (error: unknown) {
    return sendShiftPresetError(res, error, 'Error al obtener preset');
  }
}

export async function createShiftPresetController(req: AuthRequest, res: Response) {
  const parsed = createShiftPresetSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const preset = await shiftPresetsService.createShiftPreset(parsed.data, req.user!.id);
    return sendSuccess(res, preset, undefined, 201);
  } catch (error: unknown) {
    return sendShiftPresetError(res, error, 'Error al crear preset');
  }
}

export async function updateShiftPresetController(req: AuthRequest, res: Response) {
  const parsed = updateShiftPresetSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const preset = await shiftPresetsService.updateShiftPreset(getParamId(req), parsed.data, req.user!.id);
    return sendSuccess(res, preset);
  } catch (error: unknown) {
    return sendShiftPresetError(res, error, 'Error al actualizar preset');
  }
}

export async function deleteShiftPresetController(req: AuthRequest, res: Response) {
  try {
    await shiftPresetsService.deleteShiftPreset(getParamId(req), req.user!.id);
    return sendSuccess(res, undefined, undefined, 204);
  } catch (error: unknown) {
    return sendShiftPresetError(res, error, 'Error al eliminar preset');
  }
}
