/**
 * @file useVacations.test.ts
 * Tests del hook de vacaciones.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useVacationsList,
  useVacationCalendar,
  useVacationById,
  useCreateVacation,
  useApproveVacation,
  useRejectVacation,
  useCancelVacation,
} from '@/hooks/useVacations';
import type { ReactNode } from 'react';

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('@/config/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

const mockVacations = {
  items: [
    { id: 'v1', employeeId: 'u1', startDate: '2026-06-01', endDate: '2026-06-10', status: 'pending' },
    { id: 'v2', employeeId: 'u2', startDate: '2026-07-01', endDate: '2026-07-05', status: 'approved' },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useVacationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene lista paginada de vacaciones', async () => {
    getMock.mockResolvedValue({ data: { data: mockVacations } });

    const { result } = renderHook(() => useVacationsList({ page: 1, pageSize: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith('/vacations', { params: { page: 1, pageSize: 20 } });
    expect(result.current.data?.items).toHaveLength(2);
  });

  it('filtra por estado', async () => {
    getMock.mockResolvedValue({ data: { data: mockVacations } });

    const { result } = renderHook(() => useVacationsList({ status: 'pending' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith('/vacations', { params: { status: 'pending' } });
  });
});

describe('useVacationCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene calendario de vacaciones', async () => {
    getMock.mockResolvedValue({ data: { data: { items: [] } } });

    const { result } = renderHook(() => useVacationCalendar(2026, 19, {}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith('/vacations/calendar', { params: { year: 2026, week: 19 } });
  });

  it('no ejecuta query cuando disabled', () => {
    renderHook(() => useVacationCalendar(2026, 19, {}, false), {
      wrapper: createWrapper(),
    });

    expect(getMock).not.toHaveBeenCalled();
  });
});

describe('useVacationById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene detalle de vacación por ID', async () => {
    getMock.mockResolvedValue({ data: { data: { id: 'v1', status: 'pending' } } });

    const { result } = renderHook(() => useVacationById('v1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith('/vacations/v1');
  });

  it('no ejecuta query cuando id es undefined', () => {
    renderHook(() => useVacationById(undefined), {
      wrapper: createWrapper(),
    });

    expect(getMock).not.toHaveBeenCalled();
  });
});

describe('useCreateVacation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea una solicitud de vacaciones', async () => {
    postMock.mockResolvedValue({ data: { data: { id: 'v3', hasOverlap: false, overlappingEmployees: [] } } });

    const { result } = renderHook(() => useCreateVacation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ startDate: '2026-08-01', endDate: '2026-08-10' });

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock).toHaveBeenCalledWith('/vacations', { startDate: '2026-08-01', endDate: '2026-08-10' });
  });
});

describe('useApproveVacation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aprueba una solicitud de vacaciones', async () => {
    patchMock.mockResolvedValue({ data: { data: { id: 'v1', status: 'approved' } } });

    const { result } = renderHook(() => useApproveVacation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'v1' });

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock).toHaveBeenCalledWith('/vacations/v1/approve', { note: undefined });
  });
});

describe('useRejectVacation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza una solicitud de vacaciones', async () => {
    patchMock.mockResolvedValue({ data: { data: { id: 'v1', status: 'rejected' } } });

    const { result } = renderHook(() => useRejectVacation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'v1', rejectionReason: 'No disponible' });

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock).toHaveBeenCalledWith('/vacations/v1/reject', { rejectionReason: 'No disponible' });
  });
});

describe('useCancelVacation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancela una solicitud de vacaciones', async () => {
    deleteMock.mockResolvedValue({ data: { data: { id: 'v1', status: 'cancelled' } } });

    const { result } = renderHook(() => useCancelVacation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('v1');

    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    expect(deleteMock).toHaveBeenCalledWith('/vacations/v1');
  });
});
