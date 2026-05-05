/**
 * @file theme.service.test.ts
 * Tests del servicio de tema global: ensure, publicación, presets personalizados, borrado.
 */

import { prismaMock } from './singleton';
import { DEFAULT_THEME, BUILT_IN_THEME_PRESETS } from '../src/modules/settings/theme.presets';

jest.mock('../src/common/transactions/transaction.utils', () => ({
  executeInTransaction: jest.fn(async (operation: any) => operation(prismaMock)),
}));
import {
  ensureGlobalThemeSettings,
  getThemeSettings,
  publishThemeSettings,
  getCustomPresets,
  getThemePresets,
  createCustomPreset,
  deleteCustomPreset,
} from '../src/modules/settings/theme.service';

const defaultTokens = DEFAULT_THEME.tokens;
const defaultOverrides = DEFAULT_THEME.overrides;

function buildGlobalRow(overrides: {
  id?: string;
  preset?: string;
  tokensJson?: string;
  overridesJson?: string;
  updatedByUserId?: string | null;
} = {}) {
  return {
    id: 'row-1',
    key: 'global',
    preset: overrides.preset ?? 'light',
    tokensJson: overrides.tokensJson ?? JSON.stringify(defaultTokens),
    overridesJson: overrides.overridesJson ?? JSON.stringify(defaultOverrides),
    updatedByUserId: overrides.updatedByUserId ?? null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-15T00:00:00.000Z'),
    ...overrides,
  };
}

describe('theme.service — ensureGlobalThemeSettings / getThemeSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea fila global con tema por defecto si no existe', async () => {
    const created = buildGlobalRow({ id: 'new-id' });
    prismaMock.themeSettings.findUnique.mockResolvedValueOnce(null);
    prismaMock.themeSettings.create.mockResolvedValueOnce(created as any);

    const result = await ensureGlobalThemeSettings();

    expect(prismaMock.themeSettings.findUnique).toHaveBeenCalledWith({ where: { key: 'global' } });
    expect(prismaMock.themeSettings.create).toHaveBeenCalled();
    expect(result.preset).toBe(DEFAULT_THEME.preset);
    expect(result.updatedAt).toBe(created.updatedAt.toISOString());
  });

  it('devuelve el tema mapeado sin tocar la BD si no hay normalización pendiente', async () => {
    const row = buildGlobalRow();
    prismaMock.themeSettings.findUnique.mockResolvedValueOnce(row as any);

    const result = await getThemeSettings();

    expect(prismaMock.themeSettings.update).not.toHaveBeenCalled();
    expect(result.preset).toBe('light');
  });

  it('migra colores corporate legacy (textMuted + surfaceMuted) y persiste', async () => {
    const legacyTokens = {
      ...defaultTokens,
      textMuted: '#4f758b',
      surfaceMuted: '#e3ebf0',
    };
    const rowBefore = buildGlobalRow({
      preset: 'corporate',
      tokensJson: JSON.stringify(legacyTokens),
    });
    const rowAfter = {
      ...rowBefore,
      tokensJson: JSON.stringify({ ...legacyTokens, textMuted: '#466a7f' }),
    };
    prismaMock.themeSettings.findUnique.mockResolvedValueOnce(rowBefore as any);
    prismaMock.themeSettings.update.mockResolvedValueOnce(rowAfter as any);

    const result = await ensureGlobalThemeSettings();

    expect(prismaMock.themeSettings.update).toHaveBeenCalled();
    const updateArg = prismaMock.themeSettings.update.mock.calls[0][0];
    const savedTokens = JSON.parse(updateArg.data.tokensJson as string);
    expect(savedTokens.textMuted.toLowerCase()).toBe('#466a7f');
    expect(result.tokens.textMuted.toLowerCase()).toBe('#466a7f');
  });
});

describe('theme.service — publishThemeSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hace upsert y devuelve before/after', async () => {
    const beforeRow = buildGlobalRow();
    const afterRow = buildGlobalRow({
      preset: 'dark',
      tokensJson: JSON.stringify({ ...defaultTokens, textPrimary: '#ffffff' }),
    });
    prismaMock.themeSettings.findUnique.mockResolvedValue(beforeRow as any);
    prismaMock.themeSettings.upsert.mockResolvedValue(afterRow as any);

    const newTheme = {
      preset: 'dark',
      tokens: { ...defaultTokens, textPrimary: '#ffffff' },
      overrides: defaultOverrides,
    };
    const out = await publishThemeSettings(newTheme, 'user-1');

    expect(out.before.preset).toBe('light');
    expect(out.after.preset).toBe('dark');
    expect(prismaMock.themeSettings.upsert).toHaveBeenCalled();
  });
});

describe('theme.service — presets personalizados y listado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCustomPresets mapea nombre y descripción desde la clave', async () => {
    const name = 'Mi Tema';
    const desc = 'Una prueba';
    const key = `preset_custom_C__${encodeURIComponent(name)}__${encodeURIComponent(desc)}`;
    prismaMock.themeSettings.findMany.mockResolvedValueOnce([
      {
        id: 'c1',
        key,
        preset: 'custom_C',
        tokensJson: JSON.stringify(defaultTokens),
        overridesJson: JSON.stringify(defaultOverrides),
        updatedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ]);

    const list = await getCustomPresets();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('custom_C');
    expect(list[0].name).toBe(name);
    expect(list[0].description).toBe(desc);
    expect(list[0].isBase).toBe(false);
  });

  it('getThemePresets incluye todos los built-in cuando no hay filas de override', async () => {
    prismaMock.themeSettings.findMany
      .mockResolvedValueOnce([]) // getCustomPresets
      .mockResolvedValueOnce([]); // baseOverrideRows

    const all = await getThemePresets();
    expect(all.length).toBeGreaterThanOrEqual(BUILT_IN_THEME_PRESETS.length);
    for (const expected of BUILT_IN_THEME_PRESETS) {
      const found = all.find((p) => p.id === expected.id);
      expect(found).toBeDefined();
      // light/corporate/dark isBase true; sunrise/forest son built-in pero no "base" editables
      expect(found?.isBase).toBe(expected.isBase);
    }
  });

  it('createCustomPreset asigna id custom_C si no hay otros', async () => {
    prismaMock.themeSettings.findMany.mockResolvedValueOnce([]); // getCustomPresets
    const created = {
      id: 'new-preset',
      key: 'preset_custom_C__N__D',
      preset: 'custom_C',
      tokensJson: JSON.stringify(defaultTokens),
      overridesJson: JSON.stringify(defaultOverrides),
      updatedByUserId: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.themeSettings.create.mockResolvedValueOnce(created as any);

    const p = await createCustomPreset({
      name: 'N',
      description: 'D',
      tokens: defaultTokens,
      overrides: defaultOverrides,
      createdByUserId: 'admin-1',
    });
    expect(p.id).toBe('custom_C');
    expect(p.name).toBe('N');
    expect(prismaMock.themeSettings.create).toHaveBeenCalled();
  });
});

describe('theme.service — deleteCustomPreset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza si el preset custom no existe', async () => {
    prismaMock.themeSettings.findFirst.mockResolvedValueOnce(null);

    await expect(deleteCustomPreset('custom_X')).rejects.toThrow('Preset no encontrado');
  });

  it('no lanza en preset base sin fila de override (no-op)', async () => {
    prismaMock.themeSettings.findFirst.mockResolvedValueOnce(null);

    await expect(deleteCustomPreset('light')).resolves.toBeUndefined();
    expect(prismaMock.themeSettings.delete).not.toHaveBeenCalled();
  });
});
