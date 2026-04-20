export type BranchHolidayType =
  | 'nacional'
  | 'autonomica'
  | 'local'
  | 'mejora'
  | 'regional'
  | 'company';

export type BranchHolidayScope = 'national' | 'regional' | 'local' | 'company';

export type BranchActor = {
  id: string;
  ipAddress?: string;
};

export type BranchInput = {
  name: string;
  code: string;
  address?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  timezone?: string;
};

export type BranchHolidayInput = {
  date: Date;
  name: string;
  type: BranchHolidayType;
  scope?: BranchHolidayScope;
};

export type ListBranchesParams = {
  includeInactive: boolean;
};

export type ListBranchHolidaysParams = {
  year?: number;
  from?: string;
  to?: string;
  includeInactive: boolean;
};
