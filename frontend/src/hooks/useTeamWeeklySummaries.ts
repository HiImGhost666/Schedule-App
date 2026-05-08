import { useQuery } from '@tanstack/react-query';
import api from '@/config/api';

export interface TeamWeeklySummaryItem {
  userId: string;
  userName: string;
  totalHours: number;
  baseHours: number;
  overtimeHours: number;
  dailyBreakdown: Record<string, number>;
}

interface TeamWeeklySummaryFilters {
  branchId?: string;
  departmentId?: string;
}

/**
 * Hook para obtener los resúmenes semanales de todo un equipo.
 * Solo disponible para admin, general_manager y department_manager.
 */
export function useTeamWeeklySummaries(
  year: number,
  week: number,
  filters?: TeamWeeklySummaryFilters,
) {
  return useQuery({
    queryKey: ['team-weekly-summary', year, week, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.branchId) params.set('branchId', filters.branchId);
      if (filters?.departmentId) params.set('departmentId', filters.departmentId);

      const queryString = params.toString();
      const url = `/schedules/team-weekly-summary/${year}/${week}${queryString ? `?${queryString}` : ''}`;

      const response = await api.get<{ data: TeamWeeklySummaryItem[] }>(url);
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}
