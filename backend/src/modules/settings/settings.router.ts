import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

  const violations = validateThemeContrast(parsed.data, 3.5);
  if (violations.length > 0) {
    return sendError(res, 'El tema no cumple contraste mínimo', 400, {
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

  return sendSuccess(res, published.after, 'Apariencia publicada');
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

  const violations = validateThemeContrast({ preset: 'custom', tokens: parsed.data.tokens, overrides: parsed.data.overrides }, 3.5);
  if (violations.length > 0) {
    return sendError(res, 'El tema no cumple contraste mínimo', 400, {
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

  const parsed = updateCustomPresetSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos invalidos', 400, parsed.error.flatten());
  }

  if (parsed.data.tokens && parsed.data.overrides) {
    const violations = validateThemeContrast({ preset: id, tokens: parsed.data.tokens, overrides: parsed.data.overrides }, 3.5);
    if (violations.length > 0) {
      return sendError(res, 'El tema no cumple contraste mínimo', 400, {
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

// ── Favicon upload ───────────────────────────────────────────────

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure uploads directory exists on startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const faviconStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.ico';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `favicon-${uniqueSuffix}${ext}`);
  },
});

const faviconUpload = multer({
  storage: faviconStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.ico', '.png', '.svg', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Usa ICO, PNG, SVG, JPG o WEBP.'));
    }
  },
});

router.post(
  '/upload-favicon',
  authMiddleware,
  requireRole('admin'),
  faviconUpload.single('favicon'),
  (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return sendError(res, 'No se recibió ningún archivo', 400);
    }
    const faviconUrl = `/uploads/${req.file.filename}`;
    return sendSuccess(res, { faviconUrl }, 'Favicon subido correctamente');
  }
);

// ── Site branding (title + favicon) ──────────────────────────────

const SITE_TITLE_KEY = 'site_title';
const SITE_FAVICON_KEY = 'site_favicon_url';
const SITE_TITLE_DEFAULT = 'Sistema de Guardias';
const SITE_FAVICON_DEFAULT = '/uploads/favicon.ico';

async function getSiteSetting(key: string, defaultValue: string): Promise<string> {
  const row = await (await import('../../config/database')).prisma.themeSettings.findUnique({
    where: { key },
  });
  return row ? row.tokensJson : defaultValue;
}

async function setSiteSetting(key: string, value: string, updatedByUserId?: string): Promise<void> {
  await (await import('../../config/database')).prisma.themeSettings.upsert({
    where: { key },
    create: {
      key,
      preset: 'site_setting',
      tokensJson: value,
      overridesJson: '{}',
      updatedByUserId,
    },
    update: {
      tokensJson: value,
      updatedByUserId,
    },
  });
}

router.get('/site', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const [title, faviconUrl] = await Promise.all([
    getSiteSetting(SITE_TITLE_KEY, SITE_TITLE_DEFAULT),
    getSiteSetting(SITE_FAVICON_KEY, SITE_FAVICON_DEFAULT),
  ]);
  return sendSuccess(res, { title, faviconUrl });
});

const updateSiteSchema = z.object({
  title: z.string().min(1).max(60).optional(),
  faviconUrl: z.string().max(512).optional(),
});

router.put('/site', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = updateSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten());
  }

  const updates: Promise<void>[] = [];
  if (parsed.data.title !== undefined) {
    updates.push(setSiteSetting(SITE_TITLE_KEY, parsed.data.title, req.user?.id));
  }
  if (parsed.data.faviconUrl !== undefined) {
    updates.push(setSiteSetting(SITE_FAVICON_KEY, parsed.data.faviconUrl, req.user?.id));
  }

  await Promise.all(updates);

  await logAudit({
    userId: req.user?.id,
    action: 'UPDATE_SITE_SETTINGS',
    entityType: 'SiteSettings',
    entityId: 'global',
    detailsJson: { changes: parsed.data },
    ipAddress: req.ip,
  });

  return sendSuccess(res, parsed.data, 'Configuración del sitio actualizada');
});

export default router;