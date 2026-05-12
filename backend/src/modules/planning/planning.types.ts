import type { PermissionName, RoleName } from '../roles/roles.constants';

export type PlanningActor = {
  id: string;
  roleName: RoleName | string;
  branchId: string | null;
  departmentId: string | null;
  permissions: PermissionName[] | string[];
  visibleBranchIds?: string[];
};

export type PlanningRangeFilters = {
  from: Date;
  to: Date;
  branchId?: string;
  departmentId?: string;
};

export type ScopedPlanningRangeFilters = PlanningRangeFilters & {
  branchIds?: string[];
};

export type CoverageRiskSeverity = 'high' | 'medium' | 'low';

export type CoverageRiskItem = {
  severity: CoverageRiskSeverity;
  reasons: string[];
  schedule: {
    id: string;
    title: string;
    startDatetime: string;
    endDatetime: string;
    branch: { id: string; name: string } | null;
  };
};

export type AvailabilityStatus = 'available' | 'busy' | 'vacation';

export type AvailabilityItem = {
  id: string;
  name: string;
  email: string;
  status: AvailabilityStatus;
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
};

export type AvailabilityMatrix = {
  days: string[];
  rows: Array<{
    id: string;
    name: string;
    branch: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
    days: Array<{
      date: string;
      status: AvailabilityStatus;
      schedules: Array<{ id: string; title: string }>;
    }>;
  }>;
};
