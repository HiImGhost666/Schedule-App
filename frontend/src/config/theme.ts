import type { ThemeConfig } from '@/types';

export const DEFAULT_THEME: ThemeConfig = {
  preset: 'light',
  tokens: {
    brandPrimary: '#0f766e',
    brandPrimaryHover: '#115e59',
    brandSecondary: '#0e7490',
    pageBackground: '#f8fafc',
    surface: '#ffffff',
    surfaceMuted: '#e2e8f0',
    textPrimary: '#0f172a',
    textMuted: '#334155',
    borderColor: '#cbd5e1',
    success: '#166534',
    warning: '#b45309',
    danger: '#b91c1c',
  },
  overrides: {
    sidebar: {
      background: '#0f172a',
      text: '#f8fafc',
      activeBackground: '#0f766e',
      activeText: '#ffffff',
      logoVariant: 'logo_claro',
    },
    topbar: {
      background: '#ffffff',
      text: '#0f172a',
    },
    buttons: {
      primaryBackground: '#0f766e',
      primaryText: '#ffffff',
      secondaryBackground: '#0e7490',
      secondaryText: '#ffffff',
      dangerBackground: '#b91c1c',
      dangerText: '#ffffff',
    },
    badges: {
      adminBackground: '#0f766e',
      adminText: '#ffffff',
      managerBackground: '#0e7490',
      managerText: '#ffffff',
      viewerBackground: '#e2e8f0',
      viewerText: '#1e293b',
      activeBackground: '#dcfce7',
      activeText: '#166534',
      disabledBackground: '#f1f5f9',
      disabledText: '#475569',
      lockedBackground: '#fee2e2',
      lockedText: '#b91c1c',
    },
    calendar: {
      todayBackground: '#0f766e',
      activeButtonBackground: '#0f766e',
      nowIndicator: '#dc2626',
    },
    toasts: {
      background: '#0f172a',
      text: '#ffffff',
      successPrimary: '#0f766e',
      successSecondary: '#0f172a',
      errorBackground: '#7f1d1d',
      errorText: '#ffffff',
    },
  },
};

/**
 * Escala "navy" usada también en fondos (login, cabeceras, hover del sidebar).
 * No debe reutilizar textPrimary: en preset oscuro el texto es claro y bg-navy-900 quedaría invertido.
 */
function navyChromeColors(theme: ThemeConfig): { navy700: string; navy800: string; navy900: string } {
  const sidebar = theme.overrides.sidebar.background;
  const surface = theme.tokens.surface;
  return {
    navy900: sidebar,
    navy800: sidebar,
    navy700: `color-mix(in srgb, ${sidebar} 74%, ${surface} 26%)`,
  };
}

export function applyThemeToDocument(theme: ThemeConfig) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const { navy700, navy800, navy900 } = navyChromeColors(theme);

  root.style.setProperty('--color-navy-50', theme.tokens.pageBackground);
  root.style.setProperty('--color-navy-100', theme.tokens.surfaceMuted);
  root.style.setProperty('--color-navy-200', theme.tokens.borderColor);
  root.style.setProperty('--color-navy-300', theme.tokens.textMuted);
  root.style.setProperty('--color-navy-400', theme.tokens.textMuted);
  root.style.setProperty('--color-navy-500', theme.tokens.brandPrimary);
  root.style.setProperty('--color-navy-600', theme.tokens.brandPrimaryHover);
  root.style.setProperty('--color-navy-700', navy700);
  root.style.setProperty('--color-navy-800', navy800);
  root.style.setProperty('--color-navy-900', navy900);

  root.style.setProperty('--color-gold-300', theme.tokens.brandSecondary);
  root.style.setProperty('--color-gold-400', theme.tokens.brandSecondary);
  root.style.setProperty('--color-gold-500', theme.tokens.brandSecondary);

  root.style.setProperty('--theme-surface', theme.tokens.surface);
  root.style.setProperty('--theme-surface-muted', theme.tokens.surfaceMuted);
  root.style.setProperty('--theme-text-primary', theme.tokens.textPrimary);
  root.style.setProperty('--theme-text-muted', theme.tokens.textMuted);
  root.style.setProperty('--theme-border-color', theme.tokens.borderColor);

  root.style.setProperty('--theme-sidebar-bg', theme.overrides.sidebar.background);
  root.style.setProperty('--theme-sidebar-text', theme.overrides.sidebar.text);
  root.style.setProperty('--theme-sidebar-active-bg', theme.overrides.sidebar.activeBackground);
  root.style.setProperty('--theme-sidebar-active-text', theme.overrides.sidebar.activeText);

  root.style.setProperty('--theme-topbar-bg', theme.overrides.topbar.background);
  root.style.setProperty('--theme-topbar-text', theme.overrides.topbar.text);

  root.style.setProperty('--theme-btn-primary-bg', theme.overrides.buttons.primaryBackground);
  root.style.setProperty('--theme-btn-primary-text', theme.overrides.buttons.primaryText);
  root.style.setProperty('--theme-btn-secondary-bg', theme.overrides.buttons.secondaryBackground);
  root.style.setProperty('--theme-btn-secondary-text', theme.overrides.buttons.secondaryText);
  root.style.setProperty('--theme-btn-danger-bg', theme.overrides.buttons.dangerBackground);
  root.style.setProperty('--theme-btn-danger-text', theme.overrides.buttons.dangerText);

  root.style.setProperty('--theme-badge-admin-bg', theme.overrides.badges.adminBackground);
  root.style.setProperty('--theme-badge-admin-text', theme.overrides.badges.adminText);
  root.style.setProperty('--theme-badge-manager-bg', theme.overrides.badges.managerBackground);
  root.style.setProperty('--theme-badge-manager-text', theme.overrides.badges.managerText);
  root.style.setProperty('--theme-badge-viewer-bg', theme.overrides.badges.viewerBackground);
  root.style.setProperty('--theme-badge-viewer-text', theme.overrides.badges.viewerText);
  root.style.setProperty('--theme-badge-active-bg', theme.overrides.badges.activeBackground);
  root.style.setProperty('--theme-badge-active-text', theme.overrides.badges.activeText);
  root.style.setProperty('--theme-badge-disabled-bg', theme.overrides.badges.disabledBackground);
  root.style.setProperty('--theme-badge-disabled-text', theme.overrides.badges.disabledText);
  root.style.setProperty('--theme-badge-locked-bg', theme.overrides.badges.lockedBackground);
  root.style.setProperty('--theme-badge-locked-text', theme.overrides.badges.lockedText);

  root.style.setProperty('--theme-calendar-today', theme.overrides.calendar.todayBackground);
  root.style.setProperty('--theme-calendar-active-button', theme.overrides.calendar.activeButtonBackground);
  root.style.setProperty('--theme-calendar-now-indicator', theme.overrides.calendar.nowIndicator);

  root.style.setProperty('--theme-toast-bg', theme.overrides.toasts.background);
  root.style.setProperty('--theme-toast-text', theme.overrides.toasts.text);
  root.style.setProperty('--theme-toast-success-primary', theme.overrides.toasts.successPrimary);
  root.style.setProperty('--theme-toast-success-secondary', theme.overrides.toasts.successSecondary);
  root.style.setProperty('--theme-toast-error-bg', theme.overrides.toasts.errorBackground);
  root.style.setProperty('--theme-toast-error-text', theme.overrides.toasts.errorText);

  root.setAttribute('data-theme-preset', theme.preset);
}

export function readCssVariable(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function isDarkThemePreset(
  theme: Pick<ThemeConfig, 'preset'> | null | undefined,
): boolean {
  return theme?.preset === 'dark';
}
