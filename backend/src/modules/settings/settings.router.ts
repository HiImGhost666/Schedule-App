import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { sendError, sendSuccess } from '../../utils/response';
import { logAudit } from '../audit/audit.service';
import { validateThemeContrast } from './theme.accessibility';
import {
  getThemePresets,
  getThemeSettings,
  publishThemeSettings,
  getCustomPresets,
  createCustomPreset,
  updateCustomPreset,
  deleteCustomPreset,
} from './theme.service';
import { isBasePreset } from './theme.presets';

const router = Router();

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color invalido: usa formato #RRGGBB');

const themeTokensSchema = z.object({
  brandPrimary: hexColor,
  brandPrimaryHover: hexColor,
  brandSecondary: hexColor,
  pageBackground: hexColor,
  surface: hexColor,
  surfaceMuted: hexColor,
  textPrimary: hexColor,
  textMuted: hexColor,
  borderColor: hexColor,
  success: hexColor,
  warning: hexColor,
  danger: hexColor,
});

const themeOverridesSchema = z.object({
  sidebar: z.object({
    background: hexColor,
    text: hexColor,
    activeBackground: hexColor,
    activeText: hexColor,
    logoVariant: z.enum(['logo_claro', 'logo_oscuro']),
  }),
  topbar: z.object({
    background: hexColor,
    text: hexColor,
  }),
  buttons: z.object({
    primaryBackground: hexColor,
    primaryText: hexColor,
    secondaryBackground: hexColor,
    secondaryText: hexColor,
    dangerBackground: hexColor,
    dangerText: hexColor,
  }),
  badges: z.object({
    adminBackground: hexColor,
    adminText: hexColor,
    managerBackground: hexColor,
    managerText: hexColor,
    viewerBackground: hexColor,
    viewerText: hexColor,
    activeBackground: hexColor,
    activeText: hexColor,
    disabledBackground: hexColor,
    disabledText: hexColor,
    lockedBackground: hexColor,
    lockedText: hexColor,
  }),
  calendar: z.object({
    todayBackground: hexColor,
    activeButtonBackground: hexColor,
    nowIndicator: hexColor,
  }),
  toasts: z.object({
    background: hexColor,
    text: hexColor,
    successPrimary: hexColor,
    successSecondary: hexColor,
    errorBackground: hexColor,
    errorText: hexColor,
  }),
});

const publishThemeSchema = z.object({
  preset: z.string().min(1),
  tokens: themeTokensSchema,
  overrides: themeOverridesSchema,
});

const createCustomPresetSchema = z.object({
  name: z.string().min(2).max(40),
  description: z.string().max(80).optional(),
  tokens: themeTokensSchema,
  overrides: themeOverridesSchema,
});

const updateCustomPresetSchema = z.object({
  name: z.string().min(2).max(40).optional(),
  description: z.string().max(80).optional(),
  tokens: themeTokensSchema.optional(),
  overrides: themeOverridesSchema.optional(),
});

// ── Active theme ──────────────────────────────────────────────────

router.get('/theme', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const theme = await getThemeSettings();
  return sendSuccess(res, theme);
});

router.put('/theme', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = publishThemeSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Configuracion de tema invalida', 400, parsed.error.flatten());
  }

  const violations = validateThemeContrast(parsed.data, 4.5);
  if (violations.length > 0) {
    return sendError(res, 'El tema no cumple contraste minimo WCAG AA', 400, {
      violations,
      violationMessages: violations.map((item) => item.message),
    });
  }

  const published = await publishThemeSettings(parsed.data, req.user?.id);
  await logAudit({
    userId: req.user?.id,
    action: 'UPDATE_THEME',
    entityType: 'ThemeSettings',
    entityId: 'global',
    detailsJson: {
      preset: parsed.data.preset,
      before: published.before,
      after: published.after,
      changedFields: ['preset', 'tokens', 'overrides'],
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return sendSuccess(res, published.after, 'Tema global publicado');
});

// ── Presets (built-in + custom) ───────────────────────────────────

router.get('/theme/presets', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const presets = await getThemePresets();
  return sendSuccess(res, presets);
});

// ── Custom preset CRUD ────────────────────────────────────────────

router.post('/theme/presets', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = createCustomPresetSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos invalidos', 400, parsed.error.flatten());
  }

  const violations = validateThemeContrast({ preset: 'custom', tokens: parsed.data.tokens, overrides: parsed.data.overrides }, 4.5);
  if (violations.length > 0) {
    return sendError(res, 'El tema no cumple contraste minimo WCAG AA', 400, {
      violations,
      violationMessages: violations.map((item) => item.message),
    });
  }

  const preset = await createCustomPreset({
    name: parsed.data.name,
    description: parsed.data.description ?? '',
    tokens: parsed.data.tokens,
    overrides: parsed.data.overrides,
    createdByUserId: req.user!.id,
  });

  await logAudit({
    userId: req.user?.id,
    action: 'CREATE_CUSTOM_PRESET',
    entityType: 'ThemePreset',
    entityId: preset.id,
    detailsJson: { name: preset.name },
    ipAddress: req.ip,
  });

  return sendSuccess(res, preset, 'Preset creado', 201);
});

router.patch('/theme/presets/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (isBasePreset(id)) {
    return sendError(res, 'Los presets base no se pueden modificar', 403);
  }

  const parsed = updateCustomPresetSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos invalidos', 400, parsed.error.flatten());
  }

  if (parsed.data.tokens && parsed.data.overrides) {
    const violations = validateThemeContrast({ preset: id, tokens: parsed.data.tokens, overrides: parsed.data.overrides }, 4.5);
    if (violations.length > 0) {
      return sendError(res, 'El tema no cumple contraste minimo WCAG AA', 400, {
        violations,
        violationMessages: violations.map((item) => item.message),
      });
    }
  }

  try {
    const preset = await updateCustomPreset(id, parsed.data);
    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE_CUSTOM_PRESET',
      entityType: 'ThemePreset',
      entityId: id,
      detailsJson: { name: preset.name },
      ipAddress: req.ip,
    });
    return sendSuccess(res, preset, 'Preset actualizado');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar preset';
    return sendError(res, message, 404);
  }
});

router.delete('/theme/presets/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (isBasePreset(id)) {
    return sendError(res, 'Los presets base no se pueden eliminar', 403);
  }

  try {
    await deleteCustomPreset(id);
    await logAudit({
      userId: req.user?.id,
      action: 'DELETE_CUSTOM_PRESET',
      entityType: 'ThemePreset',
      entityId: id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Preset eliminado');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar preset';
    return sendError(res, message, 404);
  }
});

export default router;
