/**
 * @file VacationsPage.test.tsx
 * Tests de la página de Vacaciones: renderizado condicional, selección de sucursal, datos vacíos.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const getMock = vi.fn();

const authState: {
  user: { id: string; role: { name: 'admin' | 'general_manager' | 'department_manager' | 'employee' }; branchId?: string; departmentId?: string } | null;
} = {
  user: { id: 'admin-1', role: { name: 'admin' }, branchId: 'b-1', departmentId: 'd-1' },
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

vi.mock('@/components/vacations/VacationRequestModal', () => ({
  VacationRequestModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="request-modal">Solicitar Vacaciones</div> : null,
}));

vi.mock('@/components/vacations/VacationCreateModal', () => ({
  VacationCreateModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-modal">Crear Vacaciones</div> : null,
}));

vi.mock('@/components/vacations/VacationTable', () => ({
  VacationTable: () => <div data-testid="vacation-table">Tabla de solicitudes</div>,
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
    // Reset authState to default admin
    authState.user = { id: 'admin-1', role: { name: 'admin' }, branchId: 'b-1', departmentId: 'd-1' };
  });

  it('muestra loading mientras carga', () => {
    // Never resolve the mock so loading stays
    getMock.mockReturnValue(new Promise(() => {}));

    renderPage();

    // The LoadingSpinner renders an animate-spin div without data-testid
    const spinnerContainer = document.querySelector('.animate-spin');
    expect(spinnerContainer).toBeInTheDocument();
  });

  it('muestra el calendario cuando hay sucursales activas', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') {
        return Promise.resolve({
          data: {
            data: [
              { id: 'b-1', name: 'Sucursal A', code: 'SUC-A', isActive: true },
            ],
          },
        });
      }
      if (url === '/departments') {
        return Promise.resolve({ data: { data: [] } });
      }
      // Vacation calendar query
      if (url === '/vacations/calendar') {
        return Promise.resolve({ data: { data: { items: [] } } });
      }
      // Vacation list query
      if (url === '/vacations') {
        return Promise.resolve({ data: { data: { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
    });
  });

  it('muestra el título de la página', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    });
  });

  it('muestra botón Solicitar para todos los roles', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Solicitar')).toBeInTheDocument();
    });
  });

  it('muestra botón Crear solo para admin/manager', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Crear')).toBeInTheDocument();
    });
  });

  it('no muestra botón Crear para rol employee', async () => {
    authState.user = { id: 'emp-1', role: { name: 'employee' }, branchId: 'b-1', departmentId: 'd-1' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText('Crear')).not.toBeInTheDocument();
    });
  });

  it('muestra la tabla de solicitudes', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('vacation-table')).toBeInTheDocument();
    });
  });

  it('llama a /branches y /departments al cargar', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      const branchesCall = getMock.mock.calls.find((call: unknown[]) => call[0] === '/branches');
      const departmentsCall = getMock.mock.calls.find((call: unknown[]) => call[0] === '/departments');
      expect(branchesCall).toBeDefined();
      expect(departmentsCall).toBeDefined();
    });
  });

  /* ─── Edge cases ─────────────────────────────────────────────── */

  it('muestra botón Crear para general_manager', async () => {
    authState.user = { id: 'gm-1', role: { name: 'general_manager' }, branchId: 'b-1', departmentId: 'd-1' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Crear')).toBeInTheDocument();
    });
  });

  it('muestra botón Crear para department_manager', async () => {
    authState.user = { id: 'dm-1', role: { name: 'department_manager' }, branchId: 'b-1', departmentId: 'd-1' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Crear')).toBeInTheDocument();
    });
  });

  it('abre modal de Solicitar al hacer click en el botón', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Solicitar')).toBeInTheDocument();
    });

    // Modal should not be visible initially
    expect(screen.queryByTestId('request-modal')).not.toBeInTheDocument();

    // Click Solicitar button
    fireEvent.click(screen.getByText('Solicitar'));

    // Modal should now be visible
    expect(screen.getByTestId('request-modal')).toBeInTheDocument();
  });

  it('abre modal de Crear al hacer click en el botón', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Crear')).toBeInTheDocument();
    });

    // Modal should not be visible initially
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();

    // Click Crear button
    fireEvent.click(screen.getByText('Crear'));

    // Modal should now be visible
    expect(screen.getByTestId('create-modal')).toBeInTheDocument();
  });

  it('muestra descripción correcta según rol admin', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Gestiona las vacaciones de todas las sucursales/)).toBeInTheDocument();
    });
  });

  it('muestra descripción correcta para rol employee', async () => {
    authState.user = { id: 'emp-1', role: { name: 'employee' }, branchId: 'b-1', departmentId: 'd-1' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') return Promise.resolve({ data: { data: [] } });
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Solicita y consulta tus vacaciones/)).toBeInTheDocument();
    });
  });

  it('maneja error de API sin romper', async () => {
    getMock.mockRejectedValue(new Error('Network error'));

    renderPage();

    // Should not crash - should show loading then eventually error state
    await waitFor(() => {
      // The page should still render without throwing
      expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    });
  });
});
