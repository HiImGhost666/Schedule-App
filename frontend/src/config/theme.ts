import type { ThemeConfig } from '@/types';

export const DEFAULT_THEME: ThemeConfig = {
  preset: 'corporate',
  tokens: {
    brandPrimary: '#1e3a5f',
    brandPrimaryHover: '#355d73',
    brandSecondary: '#d63244',
    pageBackground: '#f4f8fa',
    surface: '#ffffff',
    surfaceMuted: '#e3ebf0',
    textPrimary: '#123040',
    textMuted: '#466a7f',
    borderColor: '#ccd8e0',
    success: '#15803d',
    warning: '#b45309',
    danger: '#b91c1c',
  },
  overrides: {
    sidebar: {
      background: '#123040',
      text: '#f8fafc',
      activeBackground: '#d63244',
      activeText: '#ffffff',
    },
    topbar: {
      background: '#ffffff',
      text: '#123040',
    },
    buttons: {
      primaryBackground: '#1e3a5f',
      primaryText: '#ffffff',
      secondaryBackground: '#d63244',
      secondaryText: '#ffffff',
      dangerBackground: '#b91c1c',
      dangerText: '#ffffff',
    },
    badges: {
      adminBackground: '#1e3a5f',
      adminText: '#ffffff',
      managerBackground: '#d63244',
      managerText: '#ffffff',
      viewerBackground: '#e3ebf0',
      viewerText: '#1e4358',
      activeBackground: '#dcfce7',
      activeText: '#166534',
      disabledBackground: '#f3f4f6',
      disabledText: '#4b5563',
      lockedBackground: '#fee2e2',
      lockedText: '#b91c1c',
    },
    calendar: {
      todayBackground: '#d63244',
      activeButtonBackground: '#d63244',
      nowIndicator: '#ef4444',
    },
    toasts: {
      background: '#1e3a5f',
      text: '#ffffff',
      successPrimary: '#d63244',
      successSecondary: '#1e3a5f',
      errorBackground: '#7f1d1d',
      errorText: '#ffffff',
    },
  },
};

export function applyThemeToDocument(theme: ThemeConfig) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  root.style.setProperty('--color-navy-50', theme.tokens.pageBackground);
  root.style.setProperty('--color-navy-100', theme.tokens.surfaceMuted);
  root.style.setProperty('--color-navy-200', theme.tokens.borderColor);
  root.style.setProperty('--color-navy-300', theme.tokens.textMuted);
  root.style.setProperty('--color-navy-400', theme.tokens.textMuted);
  root.style.setProperty('--color-navy-500', theme.tokens.brandPrimary);
  root.style.setProperty('--color-navy-600', theme.tokens.brandPrimaryHover);
  root.style.setProperty('--color-navy-700', theme.tokens.textPrimary);
  root.style.setProperty('--color-navy-800', theme.overrides.sidebar.background);
  root.style.setProperty('--color-navy-900', theme.tokens.textPrimary);

  root.style.setProperty('--color-gold-300', theme.tokens.brandSecondary);
  root.style.setProperty('--color-gold-400', theme.tokens.brandSecondary);
  root.style.setProperty('--color-gold-500', theme.tokens.brandSecondary);

  root.style.setProperty('--theme-surface', theme.tokens.surface);
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
}

export function readCssVariable(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
