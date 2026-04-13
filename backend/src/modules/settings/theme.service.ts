import { ThemeSettings } from '@prisma/client';
import { prisma } from '../../config/database';
import { DEFAULT_THEME, THEME_PRESETS, ThemePayload } from './theme.presets';

const GLOBAL_THEME_KEY = 'global';

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapThemeRow(row: ThemeSettings): ThemePayload & { updatedAt: string; updatedByUserId?: string } {
  return {
    preset: row.preset,
    tokens: safeParseJson(row.tokensJson, DEFAULT_THEME.tokens),
    overrides: safeParseJson(row.overridesJson, DEFAULT_THEME.overrides),
    updatedAt: row.updatedAt.toISOString(),
    updatedByUserId: row.updatedByUserId ?? undefined,
  };
}

export async function ensureGlobalThemeSettings() {
  let row = await prisma.themeSettings.findUnique({ where: { key: GLOBAL_THEME_KEY } });

  if (!row) {
    row = await prisma.themeSettings.create({
      data: {
        key: GLOBAL_THEME_KEY,
        preset: DEFAULT_THEME.preset,
        tokensJson: JSON.stringify(DEFAULT_THEME.tokens),
        overridesJson: JSON.stringify(DEFAULT_THEME.overrides),
      },
    });
  }

  return mapThemeRow(row);
}

export async function getThemeSettings() {
  return ensureGlobalThemeSettings();
}

export async function publishThemeSettings(theme: ThemePayload, updatedByUserId?: string) {
  const before = await ensureGlobalThemeSettings();

  const row = await prisma.themeSettings.upsert({
    where: { key: GLOBAL_THEME_KEY },
    create: {
      key: GLOBAL_THEME_KEY,
      preset: theme.preset,
      tokensJson: JSON.stringify(theme.tokens),
      overridesJson: JSON.stringify(theme.overrides),
      updatedByUserId,
    },
    update: {
      preset: theme.preset,
      tokensJson: JSON.stringify(theme.tokens),
      overridesJson: JSON.stringify(theme.overrides),
      updatedByUserId,
    },
  });

  return {
    before,
    after: mapThemeRow(row),
  };
}

export function getThemePresets() {
  return THEME_PRESETS;
}
