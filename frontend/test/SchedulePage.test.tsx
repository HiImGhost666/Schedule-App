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
  default: (props: any) => (
    <div data-testid="mock-calendar" data-events={JSON.stringify(props.events)} />
  ),
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

      if (url === '/branches/all/holidays' || url === '/branches/b-1/holidays') {
        return Promise.resolve({ 
          data: { 
            success: true, 
            data: [
              { 
                id: 'h-1', 
                name: 'Festivo Test', 
                date: '2026-04-20T00:00:00Z', 
                type: 'local',
                isPartial: false,
                branch: { id: 'b-1', name: 'Madrid', code: 'MAD01' }
              } 
            ] 
          } 
        });
      }

      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith(
        '/branches/all/holidays',
        expect.objectContaining({ params: expect.any(Object) }),
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
  
  it('combina turnos y festivos en el calendario', async () => {
    authState.user = { id: 'viewer-1', role: 'viewer', branchId: 'b-1' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: 'b-1', name: 'Madrid', code: 'MAD01', isActive: true }],
          },
        });
      }
      if (url === '/schedules') {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: 's-1', title: 'Turno Test', type: 'guardia', startDatetime: '2026-04-20T08:00:00Z', endDatetime: '2026-04-20T16:00:00Z' }],
          },
        });
      }
      if (url === '/branches/b-1/holidays' || url === '/branches/all/holidays') {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ 
              id: 'h-1', 
              name: 'Festivo Test', 
              date: '2026-04-20T00:00:00Z', 
              type: 'local',
              isPartial: false,
              branch: { id: 'b-1', name: 'Madrid', code: 'MAD01' }
            }],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderPage();

    await waitFor(() => {
      const calendar = screen.getByTestId('mock-calendar');
      const events = JSON.parse(calendar.getAttribute('data-events') || '[]');
      
      // Debe haber 3 eventos: 1 turno + 1 festivo interactivo + 1 festivo background
      expect(events).toHaveLength(3);
      
      const holiday = events.find((e: any) => e.extendedProps?.isHoliday);
      expect(holiday.title).toBeDefined();
      
      const schedule = events.find((e: any) => e.extendedProps?.schedule);
      expect(schedule.title).toBe('Turno Test');
    });
  });

  it('no añade sufijo de branch a festivos compartidos en vista general', async () => {
    authState.user = { id: 'admin-1', role: 'admin' };

    getMock.mockImplementation((url: string) => {
      if (url === '/branches') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/branches/all/holidays') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { 
                id: 'h-1', name: 'Año Nuevo', date: '2026-01-01T00:00:00Z', type: 'nacional', isPartial: false,
                branch: { id: 'b-1', name: 'Madrid', code: 'MAD01' }
              },
              { 
                id: 'h-2', name: 'Año Nuevo', date: '2026-01-01T00:00:00Z', type: 'nacional', isPartial: false,
                branch: { id: 'b-2', name: 'Barcelona', code: 'BCN02' }
              }
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderPage();

    await waitFor(() => {
      const calendar = screen.getByTestId('mock-calendar');
      const events = JSON.parse(calendar.getAttribute('data-events') || '[]');
      
      const holiday1 = events.find((e: any) => e.id === 'holiday-h-1');
      const holiday2 = events.find((e: any) => e.id === 'holiday-h-2');
      
      expect(holiday1.title).toBe('Año Nuevo');
      expect(holiday2.title).toBe('Año Nuevo');
    });
  });
});
