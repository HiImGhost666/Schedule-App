import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { prisma } from '../../config/database';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import { TransactionClient } from '../../common/transactions/transaction.utils';
import {
  createCustomPreset,
  deleteCustomPreset,
  getThemePresets,
  getThemeSettings,
  publishThemeSettings,
  updateCustomPreset,
} from './theme.service';
import { isBasePreset } from './theme.presets';
import type {
  CreateCustomPresetInput,
  PublishThemeInput,
  UpdateCustomPresetInput,
  UpdateSiteInput,
} from './settings.validation';

export const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const SITE_TITLE_KEY = 'site_title';
const SITE_FAVICON_KEY = 'site_favicon_url';
const SITE_TITLE_DEFAULT = 'Gestión de Turnos';
const SITE_FAVICON_DEFAULT = '/uploads/favicon.ico';

type SettingsActor = {
  id?: string;
  ipAddress?: string;
  userAgent?: string | string[];
};

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

export const faviconUpload = multer({
  storage: faviconStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.ico', '.png', '.svg', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Usa ICO, PNG, SVG, JPG o WEBP.'));
    }
  },
});

async function writeAudit(params: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  detailsJson?: object;
  ipAddress?: string;
  userAgent?: string | string[];
}, tx: TransactionClient) {
  await logAuditOrThrow({
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    detailsJson: params.detailsJson,
    ipAddress: params.ipAddress,
    userAgent: Array.isArray(params.userAgent) ? params.userAgent[0] : params.userAgent,
  }, tx);
}

function localUploadPathFromUrl(url: string | undefined): string | null {
  if (!url?.startsWith('/uploads/')) return null;

  const filename = path.basename(url);
  const resolved = path.resolve(UPLOADS_DIR, filename);
  const uploadsRoot = path.resolve(UPLOADS_DIR);

  if (!resolved.startsWith(`${uploadsRoot}${path.sep}`)) return null;
  return resolved;
}

async function removeLocalUploadIfSafe(url: string | undefined) {
  const filePath = localUploadPathFromUrl(url);
  if (!filePath) return;

  try {
    await fsPromises.unlink(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function getSiteSetting(key: string, defaultValue: string, tx: TransactionClient = prisma as unknown as TransactionClient): Promise<string> {
  const row = await tx.themeSettings.findUnique({ where: { key } });
  return row ? row.tokensJson : defaultValue;
}

async function setSiteSetting(key: string, value: string, updatedByUserId: string | undefined, tx: TransactionClient): Promise<void> {
  await tx.themeSettings.upsert({
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

export async function readThemeSettings() {
  return getThemeSettings();
}

export async function publishTheme(input: PublishThemeInput, actor: SettingsActor) {
  const published = await publishThemeSettings(input, actor.id);
  await prisma.$transaction(async (tx) => {
    await writeAudit({
      userId: actor.id,
      action: 'UPDATE_THEME',
      entityType: 'ThemeSettings',
      entityId: 'global',
      detailsJson: {
        preset: input.preset,
        before: published.before,
        after: published.after,
        changedFields: ['preset', 'tokens', 'overrides'],
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    }, tx);
  });

  return published.after;
}

export async function listThemePresets() {
  return getThemePresets();
}

export async function createThemePreset(input: CreateCustomPresetInput, actor: SettingsActor) {
  const preset = await createCustomPreset({
    name: input.name,
    description: input.description ?? '',
    tokens: input.tokens,
    overrides: input.overrides,
    createdByUserId: actor.id!,
  });

  await prisma.$transaction(async (tx) => {
    await writeAudit({
      userId: actor.id,
      action: 'CREATE_CUSTOM_PRESET',
      entityType: 'ThemePreset',
      entityId: preset.id,
      detailsJson: { before: null, after: sanitizeSnapshot(preset) },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  return preset;
}

export async function updateThemePreset(id: string, input: UpdateCustomPresetInput, actor: SettingsActor) {
  const before = (await getThemePresets()).find((preset) => preset.id === id);
  const preset = await updateCustomPreset(id, input);

  await prisma.$transaction(async (tx) => {
    await writeAudit({
      userId: actor.id,
      action: 'UPDATE_CUSTOM_PRESET',
      entityType: 'ThemePreset',
      entityId: id,
      detailsJson: { before: sanitizeSnapshot(before), after: sanitizeSnapshot(preset) },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  return preset;
}

export async function deleteThemePreset(id: string, actor: SettingsActor) {
  if (isBasePreset(id)) {
    return { blocked: true as const };
  }

  const before = (await getThemePresets()).find((preset) => preset.id === id);
  await deleteCustomPreset(id);

  await prisma.$transaction(async (tx) => {
    await writeAudit({
      userId: actor.id,
      action: 'DELETE_CUSTOM_PRESET',
      entityType: 'ThemePreset',
      entityId: id,
      detailsJson: { before: sanitizeSnapshot(before), after: null },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  return { blocked: false as const };
}

export function buildUploadedFaviconResponse(file?: Express.Multer.File) {
  if (!file) return null;
  return { faviconUrl: `/uploads/${file.filename}` };
}

export async function readSiteSettings() {
  const [title, faviconUrl] = await Promise.all([
    getSiteSetting(SITE_TITLE_KEY, SITE_TITLE_DEFAULT),
    getSiteSetting(SITE_FAVICON_KEY, SITE_FAVICON_DEFAULT),
  ]);

  return { title, faviconUrl };
}

export async function updateSiteSettings(input: UpdateSiteInput, actor: SettingsActor) {
  const before = await readSiteSettings();

  await prisma.$transaction(async (tx) => {
    if (input.title !== undefined) {
      await setSiteSetting(SITE_TITLE_KEY, input.title, actor.id, tx);
    }
    if (input.faviconUrl !== undefined) {
      await setSiteSetting(SITE_FAVICON_KEY, input.faviconUrl, actor.id, tx);
    }

    await writeAudit({
      userId: actor.id,
      action: 'UPDATE_SITE_SETTINGS',
      entityType: 'SiteSettings',
      entityId: 'global',
      detailsJson: { before, after: { ...before, ...input }, changes: input },
      ipAddress: actor.ipAddress,
    }, tx);
  });

  if (input.faviconUrl !== undefined && input.faviconUrl !== before.faviconUrl) {
    await removeLocalUploadIfSafe(before.faviconUrl);
  }

  return input;
}
