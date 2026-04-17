/**
 * @file uiStore.test.ts
 * Tests del store de UI (Zustand): sidebar, drafts de tema, reseteo.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { useUIStore } from '@/store/uiStore';

// Mockear applyThemeToDocument para evitar manipulación del DOM real
vi.mock('@/config/theme', () => ({
  DEFAULT_THEME: { primary: '#1e3a5f', mode: 'dark' },
  applyThemeToDocument: vi.fn(),
}));

const mockTheme = { primary: '#ff0000', mode: 'light' } as any;

beforeEach(() => {
  useUIStore.setState({
    sidebarCollapsed: false,
    themeDraft: null,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('uiStore - Sidebar', () => {
  it('toggleSidebar alterna el estado collapsed', () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('setSidebarCollapsed fija el valor directamente (sin toggle)', () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().setSidebarCollapsed(false);
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('uiStore - Theme Draft', () => {
  it('setThemeDraft guarda el draft sin confirmar (previsualización)', () => {
    useUIStore.getState().setThemeDraft(mockTheme);
    expect(useUIStore.getState().themeDraft).toEqual(mockTheme);
    // themeConfig no debe haber cambiado
    expect(useUIStore.getState().themeConfig).not.toEqual(mockTheme);
  });

  it('setThemeDraft(null) limpia el draft sin cambiar el tema activo', () => {
    useUIStore.setState({ themeDraft: mockTheme });
    useUIStore.getState().setThemeDraft(null);
    expect(useUIStore.getState().themeDraft).toBeNull();
  });

  it('resetDraft limpia el draft y restaura el tema activo', () => {
    useUIStore.setState({ themeDraft: mockTheme });
    useUIStore.getState().resetDraft();
    expect(useUIStore.getState().themeDraft).toBeNull();
  });

  it('setThemeConfig confirma el draft y lo limpia', () => {
    useUIStore.setState({ themeDraft: mockTheme });
    useUIStore.getState().setThemeConfig(mockTheme);
    expect(useUIStore.getState().themeConfig).toEqual(mockTheme);
    expect(useUIStore.getState().themeDraft).toBeNull();
  });
});
