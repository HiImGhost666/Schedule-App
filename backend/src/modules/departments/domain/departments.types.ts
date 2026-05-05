export type DepartmentActor = {
  id: string;
  ipAddress?: string;
};

export type DepartmentInput = {
  branchId: string;
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
};

export type ListDepartmentsParams = {
  branchId: string;
  includeInactive: boolean;
};
