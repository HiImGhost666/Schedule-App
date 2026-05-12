import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/config/api';
import type { Branch, Department } from '@/types';

export type PlanningFilters = {
  from: Date;
  to: Date;
  branchId?: string;
  departmentId?: string;
};

export type PlanningSkill = {
  id: string;
  name: string;
  category: string | null;
  color: string;
};

export type PlanningStatus = 'available' | 'busy' | 'vacation';

export type CoverageRiskItem = {
  severity: 'high' | 'medium' | 'low';
  reasons: string[];
  schedule: {
    id: string;
    title: string;
    startDatetime: string;
    endDatetime: string;
    branch: { id: string; name: string } | null;
  };
};

export type AvailabilityItem = {
  userId: string;
  userName: string;
  email?: string;
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  skills?: PlanningSkill[];
  status?: PlanningStatus;
  schedulesCount?: number;
  vacationsCount?: number;
  days: Array<{ date: string; status: PlanningStatus }>;
};

export type AvailabilityMatrix = {
  days: string[];
  rows: Array<{
    id: string;
    name: string;
    branch: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
    skills: PlanningSkill[];
    days: Array<{
      date: string;
      status: PlanningStatus;
      schedules: Array<{ id: string; title: string }>;
      vacationIds?: string[];
    }>;
  }>;
};

export type SubstituteSuggestion = {
  id: string;
  name: string;
  email: string;
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  skills: PlanningSkill[];
  matchedSkills: PlanningSkill[];
  score: number;
  reasons: string[];
};

export type EquityItem = {
  id: string;
  name: string;
  totalHours: number;
  overtimeEstimate: number;
  weekendShifts: number;
  urgentShifts: number;
  approvedVacations: number;
  rejectedVacations: number;
};

export type TimelineItem = {
  type: 'holiday' | 'vacation' | 'schedule';
  at: string;
  title: string;
  severity: 'info' | 'normal' | 'medium' | 'high';
};

export type TemplatePreviewDay = {
  date: string;
  minCoverage: number;
  status: 'covered' | 'partial' | 'uncovered';
  recommended: Array<{ id: string; name: string; matchedSkills: PlanningSkill[]; score: number }>;
  backups: Array<{ id: string; name: string; matchedSkills: PlanningSkill[]; score: number }>;
};

export type SupportRequest = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  startDate: string;
  endDate: string;
  reason?: string | null;
  requester: { id: string; name: string };
  targetUser: { id: string; name: string };
  reviewer?: { id: string; name: string } | null;
  branch: { id: string; name: string };
  department?: { id: string; name: string } | null;
};

export type NotificationPreferences = {
  scheduleChanges: boolean;
  vacationUpdates: boolean;
  departmentVacationRequests: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
  criticalAlertsOnly: boolean;
};

export const planningKeys = {
  all: ['planning'] as const,
  list: (name: string, filters: Record<string, unknown>) => [...planningKeys.all, name, filters] as const,
  preferences: () => [...planningKeys.all, 'notification-preferences'] as const,
  lookups: () => [...planningKeys.all, 'lookups'] as const,
};

function planningParams(filters: PlanningFilters) {
  return {
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    branchId: filters.branchId || undefined,
    departmentId: filters.departmentId || undefined,
  };
}

function usePlanningQuery<T>(name: string, path: string, filters: PlanningFilters, params?: Record<string, unknown>) {
  const baseParams = planningParams(filters);

  return useQuery<T>({
    queryKey: planningKeys.list(name, { ...baseParams, ...params }),
    queryFn: async () => {
      const response = await api.get<{ data: T }>(path, { params: { ...baseParams, ...params } });
      return response.data.data;
    },
  });
}

export function useCoverageRisks(filters: PlanningFilters) {
  return usePlanningQuery<CoverageRiskItem[]>('coverage-risks', '/planning/coverage-risks', filters);
}

export function useAvailability(filters: PlanningFilters) {
  return usePlanningQuery<AvailabilityItem[]>('availability', '/planning/availability', filters);
}

export function useSubstitutes(filters: PlanningFilters, skillIds: string[]) {
  return usePlanningQuery<SubstituteSuggestion[]>('substitutes', '/planning/substitutes', filters, {
    skillIds: skillIds.join(','),
  });
}

export function useAvailabilityMatrix(filters: PlanningFilters) {
  return usePlanningQuery<AvailabilityMatrix>('availability-matrix', '/planning/availability-matrix', filters);
}

export function useEquity(filters: PlanningFilters) {
  return usePlanningQuery<EquityItem[]>('equity', '/planning/equity', filters);
}

export function useTimeline(filters: PlanningFilters) {
  return usePlanningQuery<TimelineItem[]>('timeline', '/planning/timeline', filters);
}

export function useCrisisMode(filters: PlanningFilters) {
  return usePlanningQuery<{ highRisks: CoverageRiskItem[]; mediumRisks: CoverageRiskItem[]; overloaded: EquityItem[] }>(
    'crisis',
    '/planning/crisis',
    filters,
  );
}

export function useTemplatePreview(filters: PlanningFilters, skillIds: string[], minCoverage = 2) {
  return usePlanningQuery<TemplatePreviewDay[]>('template-preview', '/planning/template-preview', filters, {
    skillIds: skillIds.join(','),
    minCoverage,
  });
}

export function useSupportRequests(filters: PlanningFilters) {
  return usePlanningQuery<SupportRequest[]>('support-requests', '/planning/support-requests', filters);
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: planningKeys.preferences(),
    queryFn: async () => {
      const response = await api.get<{ data: NotificationPreferences }>('/planning/notification-preferences');
      return response.data.data;
    },
  });
}

export function usePlanningLookups(branchId?: string) {
  return useQuery<{ branches: Branch[]; departments: Department[]; skills: PlanningSkill[] }>({
    queryKey: [...planningKeys.lookups(), branchId],
    queryFn: async () => {
      const [branches, departments, skills] = await Promise.all([
        api.get<{ data: Branch[] }>('/branches', { params: { includeInactive: true } }),
        api.get<{ data: Department[] }>('/departments', { params: { includeInactive: false, branchId: branchId || undefined } }),
        api.get<{ data: PlanningSkill[] }>('/skills'),
      ]);

      return {
        branches: branches.data.data,
        departments: departments.data.data,
        skills: skills.data.data,
      };
    },
  });
}

export function useCreateSupportRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      targetUserId: string;
      branchId: string;
      departmentId?: string | null;
      startDate: string;
      endDate: string;
      reason?: string;
    }) => {
      const response = await api.post<{ data: SupportRequest }>('/planning/support-requests', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
  });
}

export function useReviewSupportRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SupportRequest['status'] }) => {
      const response = await api.patch<{ data: SupportRequest }>(`/planning/support-requests/${id}`, { status });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const response = await api.patch<{ data: NotificationPreferences }>('/planning/notification-preferences', patch);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.preferences() });
    },
  });
}
