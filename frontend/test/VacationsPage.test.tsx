/**
 * @file VacationsPage.test.tsx
 * Tests de la página de Vacaciones: renderizado condicional, selección de sucursal, datos vacíos.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const getMock = vi.fn();

const authState: {
  user: { id: string; role: { name: 'admin' | 'general_manager' | 'department_manager' | 'employee' }; branchId?: string } | null;
} = {
  user: { id: 'admin-1', role: { name: 'admin' } },
};

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('@/store/uiStore', () => ({
  useUIStore: (selector: (state: { sidebarCollapsed: boolean; themeConfig: { preset: string }; themeDraft: null }) => unknown) =>
    selector({
      sidebarCollapsed: false,
      themeConfig: { preset: 'light' },
      themeDraft: null,
    }),
}));

vi.mock('@/config/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@fullcalendar/react', () => ({
  default: (props: { events?: unknown[] }) => (
    <div data-testid="mock-calendar" data-events={JSON.stringify(props.events ?? [])} />
  ),
}));

import { VacationsPage } from '@/pages/VacationsPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <VacationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('VacationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra EmptyState cuando no hay sucursales', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sin sucursales')).toBeInTheDocument();
    });
  });

  it('muestra el calendario cuando hay sucursales activas', async () => {
    getMock.mockResolvedValue({
      data: {
        data: [
          { id: 'b-1', name: 'Sucursal A', code: 'SUC-A', isActive: true },
        ],
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
    });
  });

  it('llama a la API con type=vacaciones', async () => {
    getMock.mockResolvedValue({
      data: {
        data: [
          { id: 'b-1', name: 'Sucursal A', code: 'SUC-A', isActive: true },
        ],
      },
    });

    renderPage();

    await waitFor(() => {
      // First call: branches, second call: schedules with type=vacaciones
      const schedulesCall = getMock.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('/schedules'),
      );
      expect(schedulesCall).toBeDefined();
      if (schedulesCall) {
        expect(schedulesCall[1]?.params?.type).toBe('vacaciones');
      }
    });
  });

  it('muestra el selector de sucursal con sucursales inactivas', async () => {
    getMock.mockResolvedValue({
      data: {
        data: [
          { id: 'b-1', name: 'Sucursal A', code: 'SUC-A', isActive: true },
          { id: 'b-2', name: 'Sucursal B', code: 'SUC-B', isActive: false },
        ],
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Sucursal A/)).toBeInTheDocument();
    });
  });

  it('muestra el titulo de la pagina', () => {
    getMock.mockResolvedValue({ data: { data: [] } });

    renderPage();

    expect(screen.getByText('Vacaciones')).toBeInTheDocument();
  });
});
