import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyThemeToDocument, DEFAULT_THEME } from '@/config/theme';
import type { ThemeConfig } from '@/types';

/** Tema mostrado en el documento: hover de presets > borrador Apariencia > tema publicado. */
export function getEffectiveDisplayTheme(
  s: Pick<UIState, 'themePresetHoverPreview' | 'themeDraft' | 'themeConfig'>,
): ThemeConfig {
  return s.themePresetHoverPreview ?? s.themeDraft ?? s.themeConfig;
}

interface UIState {
  sidebarCollapsed: boolean;
  themeConfig: ThemeConfig;
  /** Borrador mientras se edita en Apariencia; no se persiste hasta "Guardar". */
  themeDraft: ThemeConfig | null;
  /** Sólo mientras se elige un preset: hover en la lista. Tiene prioridad visual sobre el borrador. */
  themePresetHoverPreview: ThemeConfig | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setThemeConfig: (theme: ThemeConfig) => void;
  setThemeDraft: (theme: ThemeConfig | null) => void;
  setThemePresetHoverPreview: (theme: ThemeConfig | null) => void;
  resetDraft: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => {
      const reapplyDocumentTheme = () => {
        const t = getEffectiveDisplayTheme(get());
        applyThemeToDocument(t);
      };

      return {
      sidebarCollapsed: false,
      themeConfig: DEFAULT_THEME,
      themeDraft: null,
      themePresetHoverPreview: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setThemeConfig: (theme) => {
        set({ themeConfig: theme, themeDraft: null, themePresetHoverPreview: null });
        applyThemeToDocument(theme);
      },
      setThemeDraft: (theme) => {
        set({ themeDraft: theme });
        reapplyDocumentTheme();
      },
      setThemePresetHoverPreview: (theme) => {
        set({ themePresetHoverPreview: theme });
        reapplyDocumentTheme();
      },
      resetDraft: () => {
        set({ themeDraft: null, themePresetHoverPreview: null });
        applyThemeToDocument(get().themeConfig);
      },
    };
    },
    {
      name: 'schedule-app-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        themeConfig: state.themeConfig,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.themeConfig) {
          applyThemeToDocument(state.themeConfig);
        }
      },
    },
  )
);
