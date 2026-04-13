export interface ThemeTokens {
  brandPrimary: string;
  brandPrimaryHover: string;
  brandSecondary: string;
  pageBackground: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textMuted: string;
  borderColor: string;
  success: string;
  warning: string;
  danger: string;
}

export type ThemeLogoVariant = 'logo_claro' | 'logo_oscuro';

export interface ThemeOverrides {
  sidebar: {
    background: string;
    text: string;
    activeBackground: string;
    activeText: string;
    logoVariant: ThemeLogoVariant;
  };
  topbar: {
    background: string;
    text: string;
  };
  buttons: {
    primaryBackground: string;
    primaryText: string;
    secondaryBackground: string;
    secondaryText: string;
    dangerBackground: string;
    dangerText: string;
  };
  badges: {
    adminBackground: string;
    adminText: string;
    managerBackground: string;
    managerText: string;
    viewerBackground: string;
    viewerText: string;
    activeBackground: string;
    activeText: string;
    disabledBackground: string;
    disabledText: string;
    lockedBackground: string;
    lockedText: string;
  };
  calendar: {
    todayBackground: string;
    activeButtonBackground: string;
    nowIndicator: string;
  };
  toasts: {
    background: string;
    text: string;
    successPrimary: string;
    successSecondary: string;
    errorBackground: string;
    errorText: string;
  };
}

export interface ThemePayload {
  preset: string;
  tokens: ThemeTokens;
  overrides: ThemeOverrides;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: ThemePayload;
}

const corporateTheme: ThemePayload = {
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
      logoVariant: 'logo_claro',
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

const lightTheme: ThemePayload = {
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

const darkTheme: ThemePayload = {
  preset: 'dark',
  tokens: {
    brandPrimary: '#38bdf8',
    brandPrimaryHover: '#0ea5e9',
    brandSecondary: '#f97316',
    pageBackground: '#020617',
    surface: '#0f172a',
    surfaceMuted: '#1e293b',
    textPrimary: '#e2e8f0',
    textMuted: '#94a3b8',
    borderColor: '#334155',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#f87171',
  },
  overrides: {
    sidebar: {
      background: '#020617',
      text: '#e2e8f0',
      activeBackground: '#0ea5e9',
      activeText: '#082f49',
      logoVariant: 'logo_claro',
    },
    topbar: {
      background: '#0f172a',
      text: '#e2e8f0',
    },
    buttons: {
      primaryBackground: '#0ea5e9',
      primaryText: '#082f49',
      secondaryBackground: '#f97316',
      secondaryText: '#111827',
      dangerBackground: '#dc2626',
      dangerText: '#ffffff',
    },
    badges: {
      adminBackground: '#0ea5e9',
      adminText: '#082f49',
      managerBackground: '#f97316',
      managerText: '#111827',
      viewerBackground: '#334155',
      viewerText: '#e2e8f0',
      activeBackground: '#14532d',
      activeText: '#bbf7d0',
      disabledBackground: '#334155',
      disabledText: '#cbd5e1',
      lockedBackground: '#7f1d1d',
      lockedText: '#fecaca',
    },
    calendar: {
      todayBackground: '#c2410c',
      activeButtonBackground: '#0ea5e9',
      nowIndicator: '#ef4444',
    },
    toasts: {
      background: '#020617',
      text: '#e2e8f0',
      successPrimary: '#22c55e',
      successSecondary: '#020617',
      errorBackground: '#7f1d1d',
      errorText: '#fecaca',
    },
  },
};

const sunriseTheme: ThemePayload = {
  preset: 'sunrise',
  tokens: {
    brandPrimary: '#7c2d12',
    brandPrimaryHover: '#9a3412',
    brandSecondary: '#ea580c',
    pageBackground: '#fff7ed',
    surface: '#ffffff',
    surfaceMuted: '#ffedd5',
    textPrimary: '#431407',
    textMuted: '#7c2d12',
    borderColor: '#fed7aa',
    success: '#166534',
    warning: '#b45309',
    danger: '#b91c1c',
  },
  overrides: {
    sidebar: {
      background: '#7c2d12',
      text: '#ffedd5',
      activeBackground: '#c2410c',
      activeText: '#ffffff',
      logoVariant: 'logo_claro',
    },
    topbar: {
      background: '#ffffff',
      text: '#431407',
    },
    buttons: {
      primaryBackground: '#7c2d12',
      primaryText: '#ffffff',
      secondaryBackground: '#c2410c',
      secondaryText: '#ffffff',
      dangerBackground: '#b91c1c',
      dangerText: '#ffffff',
    },
    badges: {
      adminBackground: '#7c2d12',
      adminText: '#ffffff',
      managerBackground: '#c2410c',
      managerText: '#ffffff',
      viewerBackground: '#ffedd5',
      viewerText: '#7c2d12',
      activeBackground: '#dcfce7',
      activeText: '#166534',
      disabledBackground: '#fef3c7',
      disabledText: '#92400e',
      lockedBackground: '#fee2e2',
      lockedText: '#b91c1c',
    },
    calendar: {
      todayBackground: '#c2410c',
      activeButtonBackground: '#c2410c',
      nowIndicator: '#dc2626',
    },
    toasts: {
      background: '#7c2d12',
      text: '#ffffff',
      successPrimary: '#ea580c',
      successSecondary: '#7c2d12',
      errorBackground: '#7f1d1d',
      errorText: '#ffffff',
    },
  },
};

const forestTheme: ThemePayload = {
  preset: 'forest',
  tokens: {
    brandPrimary: '#14532d',
    brandPrimaryHover: '#166534',
    brandSecondary: '#0f766e',
    pageBackground: '#f0fdf4',
    surface: '#ffffff',
    surfaceMuted: '#dcfce7',
    textPrimary: '#052e16',
    textMuted: '#166534',
    borderColor: '#bbf7d0',
    success: '#15803d',
    warning: '#a16207',
    danger: '#b91c1c',
  },
  overrides: {
    sidebar: {
      background: '#14532d',
      text: '#dcfce7',
      activeBackground: '#0f766e',
      activeText: '#ecfeff',
      logoVariant: 'logo_claro',
    },
    topbar: {
      background: '#ffffff',
      text: '#052e16',
    },
    buttons: {
      primaryBackground: '#14532d',
      primaryText: '#ffffff',
      secondaryBackground: '#0f766e',
      secondaryText: '#ffffff',
      dangerBackground: '#b91c1c',
      dangerText: '#ffffff',
    },
    badges: {
      adminBackground: '#14532d',
      adminText: '#ffffff',
      managerBackground: '#0f766e',
      managerText: '#ffffff',
      viewerBackground: '#dcfce7',
      viewerText: '#166534',
      activeBackground: '#bbf7d0',
      activeText: '#14532d',
      disabledBackground: '#f1f5f9',
      disabledText: '#475569',
      lockedBackground: '#fee2e2',
      lockedText: '#b91c1c',
    },
    calendar: {
      todayBackground: '#0f766e',
      activeButtonBackground: '#14532d',
      nowIndicator: '#dc2626',
    },
    toasts: {
      background: '#14532d',
      text: '#ffffff',
      successPrimary: '#0f766e',
      successSecondary: '#14532d',
      errorBackground: '#7f1d1d',
      errorText: '#ffffff',
    },
  },
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'light',
    name: 'Claro',
    description: 'Contraste suave y fondo claro',
    theme: lightTheme,
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    description: 'Paleta original de la aplicacion',
    theme: corporateTheme,
  },
  {
    id: 'dark',
    name: 'Oscuro',
    description: 'Interfaz nocturna de alto contraste',
    theme: darkTheme,
  },
  {
    id: 'sunrise',
    name: 'Personalizado A',
    description: 'Tonos calidos para operaciones diurnas',
    theme: sunriseTheme,
  },
  {
    id: 'forest',
    name: 'Personalizado B',
    description: 'Verdes corporativos orientados a legibilidad',
    theme: forestTheme,
  },
];

export const DEFAULT_THEME = lightTheme;

export function getPresetTheme(presetId: string): ThemePayload | null {
  const preset = THEME_PRESETS.find((item) => item.id === presetId);
  return preset ? preset.theme : null;
}
