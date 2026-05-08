export const VACATION_PERMISSIONS = {
  CREATE: 'vacations:create',
  READ: 'vacations:read',
  READ_ALL: 'vacations:read-all',
  APPROVE: 'vacations:approve',
  CANCEL: 'vacations:cancel',
  DELETE: 'vacations:delete',
} as const;

export const VACATION_STATUS = {
  PENDING: 'pending',
  COLINDANTE: 'colindante',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type VacationStatus = (typeof VACATION_STATUS)[keyof typeof VACATION_STATUS];
