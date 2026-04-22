import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeManagerPage } from '@/pages/admin/ThemeManagerPage';
import { DEFAULT_THEME } from '@/config/theme';
import type { ThemeConfig } from '@/types';

const getMock = vi.fn();
const patchMock = vi.fn();
const putMock = vi.fn();
const postMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('@/config/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock('@/assets/Logo_Claro.png', () => ({ default: 'logo-claro.png' }));
vi.mock('@/assets/Logo_Oscuro.png', () => ({ default: 'logo-oscuro.png' }));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const defaultTheme: ThemeConfig = structuredClone(DEFAULT_THEME);

const uiStoreState = {
  themeConfig: defaultTheme,
  themeDraft: null as ThemeConfig | null,
  setThemeConfig: vi.fn(),
  setThemeDraft: vi.fn(),
  resetDraft: vi.fn(),
};

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => uiStoreState,
}));

function makePreset(id: string, name: string): { id: string; name: string; description: string; theme: ThemeConfig } {
  return {
    id,
    name,
    description: `${name} desc`,
    theme: { ...defaultTheme, preset: id as ThemeConfig['preset'] },
  };
}

function setupApiMocks() {
  getMock.mockImplementation((url: string) => {
    if (url === 'settings/site') {
      return Promise.resolve({ data: { data: { title: 'Schedule App', faviconUrl: '/favicon.ico' } } });
    }
    if (url === 'settings/theme/presets') {
      return Promise.resolve({
        data: {
          data: [
            makePreset('light', 'Light'),
            makePreset('corporate', 'Corporate'),
            makePreset('dark', 'Dark'),
            makePreset('custom_1', 'Custom One'),
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: {} } });
  });

  patchMock.mockResolvedValue({ data: { data: { id: 'custom_1', name: 'Custom One', theme: { ...defaultTheme, preset: 'custom_1' } } } });
  putMock.mockResolvedValue({ data: { data: { ...defaultTheme, preset: uiStoreState.themeConfig.preset } } });
  postMock.mockResolvedValue({ data: { data: {} } });
  deleteMock.mockResolvedValue({ data: { data: {} } });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeManagerPage />
    </QueryClientProvider>,
  );
}

describe('ThemeManagerPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    patchMock.mockReset();
    putMock.mockReset();
    postMock.mockReset();
    deleteMock.mockReset();
    uiStoreState.themeConfig = { ...defaultTheme, preset: 'light' };
    uiStoreState.themeDraft = { ...defaultTheme, preset: 'light' };
    uiStoreState.setThemeConfig.mockReset();
    uiStoreState.setThemeDraft.mockReset();
    uiStoreState.resetDraft.mockReset();

    setupApiMocks();
  });

  it('no muestra boton Renombrar para preset base', async () => {
    renderPage();

    await screen.findByText('Apariencia');

    expect(screen.queryByRole('button', { name: 'Renombrar' })).toBeNull();
  });

  it('publica preset base sin llamar PATCH de preset', async () => {
    renderPage();

    const saveButton = await screen.findByRole('button', { name: 'Guardar' });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith('settings/theme', expect.any(Object));
    });
    expect(patchMock).not.toHaveBeenCalled();
  });

  it('para preset custom persistido hace PATCH antes de publicar', async () => {
    uiStoreState.themeConfig = { ...defaultTheme, preset: 'custom_1' };
    uiStoreState.themeDraft = { ...defaultTheme, preset: 'custom_1' };

    renderPage();

    expect(await screen.findByRole('button', { name: 'Renombrar' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(
        'settings/theme/presets/custom_1',
        expect.objectContaining({
          tokens: expect.any(Object),
          overrides: expect.any(Object),
        }),
      );
    });

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith('settings/theme', expect.any(Object));
    });
  });
});
