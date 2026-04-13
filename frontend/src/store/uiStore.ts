import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyThemeToDocument, DEFAULT_THEME } from '@/config/theme';
import type { ThemeConfig } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  themeConfig: ThemeConfig;
  themeDraft: ThemeConfig | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setThemeConfig: (theme: ThemeConfig) => void;
  setThemeDraft: (theme: ThemeConfig | null) => void;
  resetDraft: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      themeConfig: DEFAULT_THEME,
      themeDraft: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setThemeConfig: (theme) => {
        applyThemeToDocument(theme);
        set({ themeConfig: theme, themeDraft: null });
      },
      setThemeDraft: (theme) => {
        if (theme) {
          applyThemeToDocument(theme);
        } else {
          applyThemeToDocument(get().themeConfig);
        }
        set({ themeDraft: theme });
      },
      resetDraft: () => {
        applyThemeToDocument(get().themeConfig);
        set({ themeDraft: null });
      },
    }),
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
    }
  )
);
