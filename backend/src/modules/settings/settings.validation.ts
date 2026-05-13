import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido: usa formato #RRGGBB');

export const themeTokensSchema = z.object({
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

export const themeOverridesSchema = z.object({
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

export const publishThemeSchema = z.object({
  preset: z.string().min(1),
  tokens: themeTokensSchema,
  overrides: themeOverridesSchema,
});

export const createCustomPresetSchema = z.object({
  name: z.string().min(2).max(40),
  description: z.string().max(80).optional(),
  tokens: themeTokensSchema,
  overrides: themeOverridesSchema,
});

export const updateCustomPresetSchema = z.object({
  name: z.string().min(2).max(40).optional(),
  description: z.string().max(80).optional(),
  tokens: themeTokensSchema.optional(),
  overrides: themeOverridesSchema.optional(),
});

export const updateSiteSchema = z.object({
  title: z.string().min(1).max(60).optional(),
  faviconUrl: z.string().max(512).optional(),
});

export type PublishThemeInput = z.infer<typeof publishThemeSchema>;
export type CreateCustomPresetInput = z.infer<typeof createCustomPresetSchema>;
export type UpdateCustomPresetInput = z.infer<typeof updateCustomPresetSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
