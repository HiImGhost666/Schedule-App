import { Response } from 'express';
import { sendError, sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as shiftPresetsService from './shift-presets.service';
import { createShiftPresetSchema, updateShiftPresetSchema } from './shift-presets.http.schemas';

function getParamId(req: AuthRequest): string {
  return String(req.params.id);
}

export async function listShiftPresetsController(req: AuthRequest, res: Response) {
  try {
    const presets = await shiftPresetsService.listShiftPresets();
    sendSuccess(res, presets);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Error al listar presets');
  }
}

export async function getShiftPresetController(req: AuthRequest, res: Response) {
  try {
    const preset = await shiftPresetsService.getShiftPresetById(getParamId(req));
    if (!preset) {
      sendError(res, 'Shift preset no encontrado', 404);
      return;
    }
    sendSuccess(res, preset);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Error al obtener preset');
  }
}

export async function createShiftPresetController(req: AuthRequest, res: Response) {
  try {
    const parsed = createShiftPresetSchema.parse(req.body);
    const preset = await shiftPresetsService.createShiftPreset(parsed, req.user!.id);
    sendSuccess(res, preset, undefined, 201);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Error al crear preset');
  }
}

export async function updateShiftPresetController(req: AuthRequest, res: Response) {
  try {
    const parsed = updateShiftPresetSchema.parse(req.body);
    const preset = await shiftPresetsService.updateShiftPreset(getParamId(req), parsed, req.user!.id);
    sendSuccess(res, preset);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Error al actualizar preset');
  }
}

export async function deleteShiftPresetController(req: AuthRequest, res: Response) {
  try {
    await shiftPresetsService.deleteShiftPreset(getParamId(req), req.user!.id);
    sendSuccess(res, undefined, undefined, 204);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Error al eliminar preset');
  }
}
