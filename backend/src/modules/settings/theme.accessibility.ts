import { ThemePayload } from './theme.presets';

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function toLinear(value: number) {
  const sRgb = value / 255;
  if (sRgb <= 0.03928) return sRgb / 12.92;
  return ((sRgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(foreground: string, background: string) {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

interface ContrastPair {
  component: string;
  label: string;
  foreground: string;
  background: string;
  foregroundPath: string;
  backgroundPath: string;
}

export interface ContrastViolation {
  component: string;
  label: string;
  ratio: number;
  minRatio: number;
  foreground: string;
  background: string;
  foregroundPath: string;
  backgroundPath: string;
  message: string;
}

export function validateThemeContrast(theme: ThemePayload, minRatio = 4.5) {
  const pairs: ContrastPair[] = [
    {
      component: 'Base / Superficies',
      label: 'Texto principal en superficies',
      foreground: theme.tokens.textPrimary,
      background: theme.tokens.surface,
      foregroundPath: 'tokens.textPrimary',
      backgroundPath: 'tokens.surface',
    },
    {
      component: 'Base / Superficies',
      label: 'Texto secundario en superficie suave',
      foreground: theme.tokens.textMuted,
      background: theme.tokens.surfaceMuted,
      foregroundPath: 'tokens.textMuted',
      backgroundPath: 'tokens.surfaceMuted',
    },
    {
      component: 'Sidebar',
      label: 'Texto sidebar',
      foreground: theme.overrides.sidebar.text,
      background: theme.overrides.sidebar.background,
      foregroundPath: 'overrides.sidebar.text',
      backgroundPath: 'overrides.sidebar.background',
    },
    {
      component: 'Sidebar',
      label: 'Elemento activo sidebar',
      foreground: theme.overrides.sidebar.activeText,
      background: theme.overrides.sidebar.activeBackground,
      foregroundPath: 'overrides.sidebar.activeText',
      backgroundPath: 'overrides.sidebar.activeBackground',
    },
    {
      component: 'TopBar',
      label: 'Texto topbar',
      foreground: theme.overrides.topbar.text,
      background: theme.overrides.topbar.background,
      foregroundPath: 'overrides.topbar.text',
      backgroundPath: 'overrides.topbar.background',
    },
    {
      component: 'Botones',
      label: 'Boton primario',
      foreground: theme.overrides.buttons.primaryText,
      background: theme.overrides.buttons.primaryBackground,
      foregroundPath: 'overrides.buttons.primaryText',
      backgroundPath: 'overrides.buttons.primaryBackground',
    },
    {
      component: 'Botones',
      label: 'Boton secundario',
      foreground: theme.overrides.buttons.secondaryText,
      background: theme.overrides.buttons.secondaryBackground,
      foregroundPath: 'overrides.buttons.secondaryText',
      backgroundPath: 'overrides.buttons.secondaryBackground',
    },
    {
      component: 'Botones',
      label: 'Boton de peligro',
      foreground: theme.overrides.buttons.dangerText,
      background: theme.overrides.buttons.dangerBackground,
      foregroundPath: 'overrides.buttons.dangerText',
      backgroundPath: 'overrides.buttons.dangerBackground',
    },
    {
      component: 'Badges',
      label: 'Badge admin',
      foreground: theme.overrides.badges.adminText,
      background: theme.overrides.badges.adminBackground,
      foregroundPath: 'overrides.badges.adminText',
      backgroundPath: 'overrides.badges.adminBackground',
    },
    {
      component: 'Badges',
      label: 'Badge manager',
      foreground: theme.overrides.badges.managerText,
      background: theme.overrides.badges.managerBackground,
      foregroundPath: 'overrides.badges.managerText',
      backgroundPath: 'overrides.badges.managerBackground',
    },
    {
      component: 'Badges',
      label: 'Badge viewer',
      foreground: theme.overrides.badges.viewerText,
      background: theme.overrides.badges.viewerBackground,
      foregroundPath: 'overrides.badges.viewerText',
      backgroundPath: 'overrides.badges.viewerBackground',
    },
    {
      component: 'Badges',
      label: 'Badge activo',
      foreground: theme.overrides.badges.activeText,
      background: theme.overrides.badges.activeBackground,
      foregroundPath: 'overrides.badges.activeText',
      backgroundPath: 'overrides.badges.activeBackground',
    },
    {
      component: 'Badges',
      label: 'Badge deshabilitado',
      foreground: theme.overrides.badges.disabledText,
      background: theme.overrides.badges.disabledBackground,
      foregroundPath: 'overrides.badges.disabledText',
      backgroundPath: 'overrides.badges.disabledBackground',
    },
    {
      component: 'Badges',
      label: 'Badge bloqueado',
      foreground: theme.overrides.badges.lockedText,
      background: theme.overrides.badges.lockedBackground,
      foregroundPath: 'overrides.badges.lockedText',
      backgroundPath: 'overrides.badges.lockedBackground',
    },
    {
      component: 'Toasts',
      label: 'Toast',
      foreground: theme.overrides.toasts.text,
      background: theme.overrides.toasts.background,
      foregroundPath: 'overrides.toasts.text',
      backgroundPath: 'overrides.toasts.background',
    },
    {
      component: 'Toasts',
      label: 'Toast de error',
      foreground: theme.overrides.toasts.errorText,
      background: theme.overrides.toasts.errorBackground,
      foregroundPath: 'overrides.toasts.errorText',
      backgroundPath: 'overrides.toasts.errorBackground',
    },
    {
      component: 'Calendario',
      label: 'Hoy en calendario (texto blanco)',
      foreground: '#ffffff',
      background: theme.overrides.calendar.todayBackground,
      foregroundPath: 'fixed.#ffffff',
      backgroundPath: 'overrides.calendar.todayBackground',
    },
  ];

  const violations: ContrastViolation[] = [];
  for (const pair of pairs) {
    const ratio = contrastRatio(pair.foreground, pair.background);
    if (ratio < minRatio) {
      violations.push({
        component: pair.component,
        label: pair.label,
        ratio,
        minRatio,
        foreground: pair.foreground,
        background: pair.background,
        foregroundPath: pair.foregroundPath,
        backgroundPath: pair.backgroundPath,
        message: `${pair.component} -> ${pair.label}: ${ratio.toFixed(2)}:1 (min ${minRatio}:1)`,
      });
    }
  }

  return violations;
}
