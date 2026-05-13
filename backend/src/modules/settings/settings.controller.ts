import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendError, sendSuccess } from '../../utils/response';
import { isAppError } from '../../common/errors/app-error';
import { validateThemeContrast } from './theme.accessibility';
import {
  createCustomPresetSchema,
  publishThemeSchema,
  updateCustomPresetSchema,
  updateSiteSchema,
} from './settings.validation';
import {
  buildUploadedFaviconResponse,
  createThemePreset,
  deleteThemePreset,
  listThemePresets,
  publishTheme,
  readSiteSettings,
  readThemeSettings,
  updateSiteSettings,
  updateThemePreset,
} from './settings.service';

const getParam = (value: string | string[] | undefined): string | undefined => (
  Array.isArray(value) ? value[0] : value
);

function actorFromRequest(req: AuthRequest) {
  return {
    id: req.user?.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

function sendSettingsError(res: Response, error: unknown, fallbackMessage: string, fallbackStatus = 500) {
  if (isAppError(error)) {
    return sendError(res, error.message, error.statusCode, error.details, error.code);
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return sendError(res, message, fallbackStatus);
}

export async function getThemeController(_req: AuthRequest, res: Response) {
  try {
    const theme = await readThemeSettings();
    return sendSuccess(res, theme);
  } catch (error: unknown) {
    return sendSettingsError(res, error, 'Error al obtener tema');
  }
}

export async function publishThemeController(req: AuthRequest, res: Response) {
  const parsed = publishThemeSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Configuración de tema inválida', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  const violations = validateThemeContrast(parsed.data, 3.5);
  if (violations.length > 0) {
    return sendError(res, 'El tema no cumple contraste mínimo', 400, {
      violations,
      violationMessages: violations.map((item) => item.message),
    }, 'BAD_REQUEST');
  }

  try {
    const published = await publishTheme(parsed.data, actorFromRequest(req));
    return sendSuccess(res, published, 'Apariencia publicada');
  } catch (error: unknown) {
    return sendSettingsError(res, error, 'Error al publicar tema');
  }
}

export async function listThemePresetsController(_req: AuthRequest, res: Response) {
  try {
    const presets = await listThemePresets();
    return sendSuccess(res, presets);
  } catch (error: unknown) {
    return sendSettingsError(res, error, 'Error al listar presets');
  }
}

export async function createThemePresetController(req: AuthRequest, res: Response) {
  const parsed = createCustomPresetSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  const violations = validateThemeContrast({ preset: 'custom', tokens: parsed.data.tokens, overrides: parsed.data.overrides }, 3.5);
  if (violations.length > 0) {
    return sendError(res, 'El tema no cumple contraste mínimo', 400, {
      violations,
      violationMessages: violations.map((item) => item.message),
    }, 'BAD_REQUEST');
  }

  try {
    const preset = await createThemePreset(parsed.data, actorFromRequest(req));
    return sendSuccess(res, preset, 'Preset creado', 201);
  } catch (error: unknown) {
    return sendSettingsError(res, error, 'Error al crear preset');
  }
}

export async function updateThemePresetController(req: AuthRequest, res: Response) {
  const id = getParam(req.params.id);
  if (!id) return sendError(res, 'ID de preset inválido', 400);

  const parsed = updateCustomPresetSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  if (parsed.data.tokens && parsed.data.overrides) {
    const violations = validateThemeContrast({ preset: id, tokens: parsed.data.tokens, overrides: parsed.data.overrides }, 3.5);
    if (violations.length > 0) {
      return sendError(res, 'El tema no cumple contraste mínimo', 400, {
        violations,
        violationMessages: violations.map((item) => item.message),
      }, 'BAD_REQUEST');
    }
  }

  try {
    const preset = await updateThemePreset(id, parsed.data, actorFromRequest(req));
    return sendSuccess(res, preset, 'Preset actualizado');
  } catch (error: unknown) {
    return sendSettingsError(res, error, 'Error al actualizar preset', 404);
  }
}

export async function deleteThemePresetController(req: AuthRequest, res: Response) {
  const id = getParam(req.params.id);
  if (!id) return sendError(res, 'ID de preset inválido', 400);

  try {
    const result = await deleteThemePreset(id, actorFromRequest(req));
    if (result.blocked) {
      return sendError(res, 'No se puede eliminar un preset base', 403, null, 'FORBIDDEN');
    }

    return sendSuccess(res, null, 'Preset eliminado');
  } catch (error: unknown) {
    return sendSettingsError(res, error, 'Error al eliminar preset', 404);
  }
}

export function uploadFaviconController(req: AuthRequest, res: Response) {
  const payload = buildUploadedFaviconResponse(req.file);
  if (!payload) {
    return sendError(res, 'No se recibió ningún archivo', 400);
  }

  return sendSuccess(res, payload, 'Favicon subido correctamente');
}

export async function getSiteSettingsController(_req: AuthRequest, res: Response) {
  try {
    const site = await readSiteSettings();
    return sendSuccess(res, site);
  } catch (error: unknown) {
    return sendSettingsError(res, error, 'Error al obtener configuración del sitio');
  }
}

export async function updateSiteSettingsController(req: AuthRequest, res: Response) {
  const parsed = updateSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const updated = await updateSiteSettings(parsed.data, actorFromRequest(req));
    return sendSuccess(res, updated, 'Configuración del sitio actualizada');
  } catch (error: unknown) {
    return sendSettingsError(res, error, 'Error al actualizar configuración del sitio');
  }
}
