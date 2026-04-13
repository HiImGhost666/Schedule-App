import { ThemeSettings } from '@prisma/client';
import { prisma } from '../../config/database';
import { DEFAULT_THEME, THEME_PRESETS, ThemeLogoVariant, ThemePayload } from './theme.presets';

const GLOBAL_THEME_KEY = 'global';
const LEGACY_CORPORATE_TEXT_MUTED = '#4f758b';
const SAFE_CORPORATE_TEXT_MUTED = '#466a7f';

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeTheme(theme: ThemePayload): ThemePayload {
  let normalizedTheme = theme;

  if (
    theme.preset === 'corporate'
    && theme.tokens.textMuted.toLowerCase() === LEGACY_CORPORATE_TEXT_MUTED
    && theme.tokens.surfaceMuted.toLowerCase() === '#e3ebf0'
  ) {
    normalizedTheme = {
      ...normalizedTheme,
      tokens: {
        ...normalizedTheme.tokens,
        textMuted: SAFE_CORPORATE_TEXT_MUTED,
      },
    };
  }

  const logoVariant = (normalizedTheme.overrides as { sidebar?: { logoVariant?: string } }).sidebar?.logoVariant;
  const isLogoVariantValid = (value: unknown): value is ThemeLogoVariant => value === 'logo_claro' || value === 'logo_oscuro';

  if (!isLogoVariantValid(logoVariant)) {
    normalizedTheme = {
      ...normalizedTheme,
      overrides: {
        ...normalizedTheme.overrides,
        sidebar: {
          ...normalizedTheme.overrides.sidebar,
          logoVariant: DEFAULT_THEME.overrides.sidebar.logoVariant,
        },
      },
    };
  }

  return normalizedTheme;
}

function mapThemeRow(row: ThemeSettings): ThemePayload & { updatedAt: string; updatedByUserId?: string } {
  const parsedTheme = normalizeTheme({
    preset: row.preset,
    tokens: safeParseJson(row.tokensJson, DEFAULT_THEME.tokens),
    overrides: safeParseJson(row.overridesJson, DEFAULT_THEME.overrides),
  });

  return {
    preset: parsedTheme.preset,
    tokens: parsedTheme.tokens,
    overrides: parsedTheme.overrides,
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

  const mappedTheme = mapThemeRow(row);
  const rawTokens = safeParseJson(row.tokensJson, DEFAULT_THEME.tokens);
  const rawOverrides = safeParseJson(row.overridesJson, DEFAULT_THEME.overrides);
  const hasTokenNormalization = mappedTheme.tokens.textMuted !== rawTokens.textMuted;
  const hasLogoNormalization = mappedTheme.overrides.sidebar.logoVariant !== rawOverrides.sidebar.logoVariant;

  if (hasTokenNormalization || hasLogoNormalization) {
    row = await prisma.themeSettings.update({
      where: { key: GLOBAL_THEME_KEY },
      data: {
        tokensJson: JSON.stringify(mappedTheme.tokens),
        overridesJson: JSON.stringify(mappedTheme.overrides),
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
