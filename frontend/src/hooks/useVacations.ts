import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/config/api';
import type {
  VacationRequest,
  PaginatedVacations,
  VacationCalendarResponse,
  VacationStatus,
} from '@/types';

/* ─── Query keys ─────────────────────────────────────────────── */

export const vacationKeys = {
  all: ['vacations'] as const,
  list: (filters: Record<string, unknown>) => ['vacations', 'list', filters] as const,
  calendar: (year: number, week: number, filters: Record<string, unknown>) =>
    ['vacations', 'calendar', year, week, filters] as const,
  detail: (id: string) => ['vacations', 'detail', id] as const,
};

/* ─── Types ──────────────────────────────────────────────────── */

export interface VacationListFilters {
  status?: VacationStatus;
  employeeId?: string;
  branchId?: string;
  departmentId?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface VacationCalendarFilters {
  branchId?: string;
  departmentId?: string;
  employeeId?: string;
}

/* ─── Queries ────────────────────────────────────────────────── */

export function useVacationsList(filters: VacationListFilters) {
  return useQuery<PaginatedVacations>({
    queryKey: vacationKeys.list(filters as unknown as Record<string, unknown>),
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (filters.status) params.status = filters.status;
      if (filters.employeeId) params.employeeId = filters.employeeId;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;
      if (filters.page) params.page = filters.page;
      if (filters.pageSize) params.pageSize = filters.pageSize;
      if (filters.search) params.employeeId = filters.search;

      const res = await api.get<{ data: PaginatedVacations }>('/vacations', { params });
      return res.data.data;
    },
  });
}

export function useVacationCalendar(
  year: number,
  week: number,
  filters: VacationCalendarFilters,
  enabled = true,
) {
  return useQuery<VacationCalendarResponse>({
    queryKey: vacationKeys.calendar(year, week, filters as unknown as Record<string, unknown>),
    queryFn: async () => {
      const params: Record<string, unknown> = { year, week };
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.employeeId) params.employeeId = filters.employeeId;

      const res = await api.get<{ data: VacationCalendarResponse }>('/vacations/calendar', { params });
      return res.data.data;
    },
    enabled,
  });
}

/**
 * Obtiene vacaciones aprobadas en un rango de fechas (from/to).
 * Usa el endpoint /vacations/calendar con from/to para cargar todo el rango visible.
 */
export function useVacationCalendarRange(
  from: Date,
  to: Date,
  filters: VacationCalendarFilters,
  enabled = true,
) {
  return useQuery<VacationCalendarResponse>({
    queryKey: ['vacations', 'calendar-range', from.toISOString(), to.toISOString(), filters],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        from: from.toISOString(),
        to: to.toISOString(),
      };
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.employeeId) params.employeeId = filters.employeeId;

      const res = await api.get<{ data: VacationCalendarResponse }>('/vacations/calendar', { params });
      return res.data.data;
    },
    enabled,
  });
}

export function useVacationById(id: string | undefined) {
  return useQuery<VacationRequest>({
    queryKey: vacationKeys.detail(id!),
    queryFn: async () => {
      const res = await api.get<{ data: VacationRequest }>(`/vacations/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

/* ─── Mutations ──────────────────────────────────────────────── */

export function useCreateVacation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { startDate: string; endDate: string; note?: string }) => {
      const res = await api.post<{ data: VacationRequest & { hasOverlap: boolean; overlappingEmployees: Array<{ id: string; name: string; email: string }> } }>('/vacations', data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vacationKeys.all });
    },
  });
}

export function useApproveVacation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await api.patch<{ data: VacationRequest }>(`/vacations/${id}/approve`, { note });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vacationKeys.all });
    },
  });
}

export function useRejectVacation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: string; rejectionReason: string }) => {
      const res = await api.patch<{ data: VacationRequest }>(`/vacations/${id}/reject`, { rejectionReason });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vacationKeys.all });
    },
  });
}

export function useCancelVacation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ data: VacationRequest }>(`/vacations/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vacationKeys.all });
    },
  });
}
