import { ThemeSettings } from '@prisma/client';
import { prisma } from '../../config/database';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import {
  DEFAULT_THEME,
  BUILT_IN_THEME_PRESETS,
  ThemeLogoVariant,
  ThemePayload,
  ThemePreset,
  isBasePreset,
} from './theme.presets';

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

  const row = await executeInTransaction(async (tx) => {
    return tx.themeSettings.upsert({
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
  });

  return {
    before,
    after: mapThemeRow(row),
  };
}

// ── Custom preset helpers ─────────────────────────────────────────

function generateCustomPresetId(existingIds: string[]): string {
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const letter of letters) {
    const candidate = `custom_${letter}`;
    if (!existingIds.includes(candidate)) return candidate;
  }
  // Fallback with timestamp
  return `custom_${Date.now()}`;
}

function customPresetLabel(id: string): string {
  const letter = id.replace('custom_', '');
  return `Personalizado ${letter}`;
}

function presetRowToThemePreset(row: ThemeSettings): ThemePreset {
  const tokens = safeParseJson(row.tokensJson, DEFAULT_THEME.tokens);
  const overrides = safeParseJson(row.overridesJson, DEFAULT_THEME.overrides);

  // Name/description stored encoded in key as "preset_<id>__<name>__<desc>"
  const parts = row.key.split('__');
  const name = parts[1] ? decodeURIComponent(parts[1]) : customPresetLabel(row.preset);
  const description = parts[2] ? decodeURIComponent(parts[2]) : 'Preset personalizado';

  return {
    id: row.preset,
    name,
    description,
    isBase: false,
    theme: { preset: row.preset, tokens, overrides },
  };
}

function buildCustomPresetKey(id: string, name: string, description: string): string {
  return `preset_${id}__${encodeURIComponent(name)}__${encodeURIComponent(description)}`;
}

export async function getCustomPresets(): Promise<ThemePreset[]> {
  const rows = await prisma.themeSettings.findMany({
    where: { key: { startsWith: 'preset_custom_' } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => presetRowToThemePreset(r));
}

export async function getThemePresets(): Promise<ThemePreset[]> {
  const customPresets = await getCustomPresets();

  // Check if any base preset has an override row in the DB and merge those in.
  // Override rows for base presets use the pattern: preset_<id>__<name>__<desc>
  // We query by preset id (one of the base IDs) and key NOT starting with preset_custom_.
  const baseOverrideRows = await prisma.themeSettings.findMany({
    where: {
      preset: { in: BUILT_IN_THEME_PRESETS.map((p) => p.id) },
      key: { startsWith: 'preset_' },
      NOT: { key: { startsWith: 'preset_custom_' } },
    },
  });

  const baseOverridesById = new Map(
    baseOverrideRows.map((r) => [
      r.preset,
      presetRowToThemePreset(r),
    ])
  );

  const mergedBuiltIns: ThemePreset[] = BUILT_IN_THEME_PRESETS.map((p) => {
    const override = baseOverridesById.get(p.id);
    if (override) {
      return { ...override, isBase: true };
    }
    return p;
  });

  return [...mergedBuiltIns, ...customPresets];
}

export async function createCustomPreset(input: {
  name: string;
  description: string;
  tokens: ThemePayload['tokens'];
  overrides: ThemePayload['overrides'];
  createdByUserId: string;
}): Promise<ThemePreset> {
  const existingCustom = await getCustomPresets();
  const existingIds = existingCustom.map((p) => p.id);
  const newId = generateCustomPresetId(existingIds);
  const key = buildCustomPresetKey(newId, input.name, input.description);

  const row = await prisma.themeSettings.create({
    data: {
      key,
      preset: newId,
      tokensJson: JSON.stringify(input.tokens),
      overridesJson: JSON.stringify(input.overrides),
      updatedByUserId: input.createdByUserId,
    },
  });

  return presetRowToThemePreset(row);
}

export async function updateCustomPreset(
  id: string,
  data: {
    name?: string;
    description?: string;
    tokens?: ThemePayload['tokens'];
    overrides?: ThemePayload['overrides'];
  }
): Promise<ThemePreset> {
  // For base presets look for an override row (prefix preset_<id>__),
  // for custom presets look for the standard prefix preset_custom_.
  const keyPrefix = isBasePreset(id) ? `preset_${id}__` : 'preset_custom_';

  const existing = await prisma.themeSettings.findFirst({
    where: { preset: id, key: { startsWith: keyPrefix } },
  });

  // Resolve current values from DB row or, for base presets on first edit, from built-in definition
  let currentName: string;
  let currentDescription: string;
  let currentTokens: ThemePayload['tokens'];
  let currentOverrides: ThemePayload['overrides'];

  if (existing) {
    const currentPreset = presetRowToThemePreset(existing);
    currentName = currentPreset.name;
    currentDescription = currentPreset.description;
    currentTokens = currentPreset.theme.tokens;
    currentOverrides = currentPreset.theme.overrides;
  } else if (isBasePreset(id)) {
    // No override row yet — seed defaults from the built-in definition
    const builtIn = BUILT_IN_THEME_PRESETS.find((p) => p.id === id);
    if (!builtIn) throw new Error('Preset no encontrado');
    currentName = builtIn.name;
    currentDescription = builtIn.description;
    currentTokens = builtIn.theme.tokens;
    currentOverrides = builtIn.theme.overrides;
  } else {
    throw new Error('Preset no encontrado');
  }

  const newName = data.name ?? currentName;
  const newDescription = data.description ?? currentDescription;
  const newKey = buildCustomPresetKey(id, newName, newDescription);

  let row: ThemeSettings;

  if (existing) {
    row = await prisma.themeSettings.update({
      where: { id: existing.id },
      data: {
        key: newKey,
        ...(data.tokens ? { tokensJson: JSON.stringify(data.tokens) } : {}),
        ...(data.overrides ? { overridesJson: JSON.stringify(data.overrides) } : {}),
      },
    });
  } else {
    // First edit of a base preset — create an override row in the DB
    row = await prisma.themeSettings.create({
      data: {
        key: newKey,
        preset: id,
        tokensJson: JSON.stringify(data.tokens ?? currentTokens),
        overridesJson: JSON.stringify(data.overrides ?? currentOverrides),
      },
    });
  }

  return presetRowToThemePreset(row);
}

export async function deleteCustomPreset(id: string): Promise<void> {
  // For base presets, deleting means removing the override row (restoring built-in defaults).
  // If no override row exists, there is nothing to delete — that is fine.
  const keyPrefix = isBasePreset(id) ? `preset_${id}__` : 'preset_custom_';

  const existing = await prisma.themeSettings.findFirst({
    where: { preset: id, key: { startsWith: keyPrefix } },
  });

  if (!existing) {
    if (!isBasePreset(id)) {
      throw new Error('Preset no encontrado');
    }
    // Base preset with no override row — nothing to do
    return;
  }

  await prisma.themeSettings.delete({ where: { id: existing.id } });
}