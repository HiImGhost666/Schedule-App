import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { sendError, sendSuccess } from '../../utils/response';
import { logAudit } from '../audit/audit.service';
import { validateThemeContrast } from './theme.accessibility';
import { getThemePresets, getThemeSettings, publishThemeSettings } from './theme.service';

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
  preset: z.enum(['corporate', 'light', 'dark', 'sunrise', 'forest']),
  tokens: themeTokensSchema,
  overrides: themeOverridesSchema,
});

router.get('/theme', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const theme = await getThemeSettings();
  return sendSuccess(res, theme);
});

router.get('/theme/presets', authMiddleware, async (_req: AuthRequest, res: Response) => {
  return sendSuccess(res, getThemePresets());
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

export default router;
