export type DepartmentActor = {
  id: string;
  ipAddress?: string;
};

export type DepartmentInput = {
  name: string;
  code: string;
  description?: string;
  branchIds: string[];
  isActive?: boolean;
};

export type ListDepartmentsParams = {
  branchId?: string;
  includeInactive: boolean;
};
