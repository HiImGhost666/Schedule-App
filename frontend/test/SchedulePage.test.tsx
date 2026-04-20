import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SchedulePage } from '@/pages/SchedulePage';

const getMock = vi.fn();

const authState: {
  user: { id: string; role: 'admin' | 'manager' | 'viewer'; branchId?: string } | null;
} = {
  user: { id: 'admin-1', role: 'admin' },
};

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('@/store/uiStore', () => ({
  useUIStore: (selector: (state: { sidebarCollapsed: boolean }) => unknown) =>
    selector({ sidebarCollapsed: false }),
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
  default: () => <div data-testid="mock-calendar" />,
}));

vi.mock('@/components/schedule/ShiftModal', () => ({
  ShiftModal: () => null,
}));

vi.mock('@/components/schedule/CalendarDetailPopover', () => ({
  CalendarDetailPopover: () => null,
}));

vi.mock('@/components/schedule/HolidayEditModal', () => ({
  HolidayEditModal: () => null,
}));

vi.mock('@/components/common/UserProfileModal', () => ({
  UserProfileModal: () => null,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={['/schedule']}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/schedule" element={<SchedulePage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function getScheduleCall() {
  return getMock.mock.calls.find((call) => call[0] === '/schedules');
}

describe('SchedulePage smoke', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('admin carga calendario sin branchId forzado cuando no hay sucursal activa', async () => {
    authState.user = { id: 'admin-1', role: 'admin' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: 'b-1',
                name: 'Madrid',
                code: 'MAD01',
                countryCode: 'ES',
                timezone: 'Europe/Madrid',
                isActive: true,
                createdAt: '',
                updatedAt: '',
              },
            ],
          },
        });
      }

      if (url === '/schedules') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }

      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderPage();

    await waitFor(() => {
      const scheduleCall = getScheduleCall();
      expect(scheduleCall).toBeTruthy();
      expect(scheduleCall?.[1]).toEqual(
        expect.objectContaining({ params: expect.not.objectContaining({ branchId: expect.anything() }) }),
      );
    });
  });

  it('viewer con sucursal asignada usa branchId efectivo en schedules y festivos', async () => {
    authState.user = { id: 'viewer-1', role: 'viewer', branchId: 'b-1' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: 'b-1',
                name: 'Madrid',
                code: 'MAD01',
                countryCode: 'ES',
                timezone: 'Europe/Madrid',
                isActive: true,
                createdAt: '',
                updatedAt: '',
              },
            ],
          },
        });
      }

      if (url === '/schedules') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }

      if (url === '/branches/b-1/holidays') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }

      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderPage();

    await waitFor(() => {
      const scheduleCall = getScheduleCall();
      expect(scheduleCall).toBeTruthy();
      expect(scheduleCall?.[1]).toEqual(
        expect.objectContaining({ params: expect.objectContaining({ branchId: 'b-1' }) }),
      );
    });

    expect(getMock).toHaveBeenCalledWith(
      '/branches/b-1/holidays',
      expect.objectContaining({ params: expect.any(Object) }),
    );
  });

  it('viewer sin sucursal asignada y sin sucursales no dispara schedules y muestra aviso', async () => {
    authState.user = { id: 'viewer-2', role: 'viewer' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
          },
        });
      }

      if (url === '/schedules') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }

      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderPage();

    expect(await screen.findByText('No tienes una sucursal asignada. Contacta con un administrador.')).toBeInTheDocument();

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/branches', { params: { includeInactive: true } });
    });

    expect(getMock.mock.calls.some((call) => call[0] === '/schedules')).toBe(false);
    expect(getMock.mock.calls.some((call) => String(call[0]).includes('/holidays'))).toBe(false);
  });
});
