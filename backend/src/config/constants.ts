export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  LOCKED: 'locked',
} as const;

export const NOTIFICATION_TYPES = {
  SCHEDULE_CREATED: 'schedule_created',
  SCHEDULE_MODIFIED: 'schedule_modified',
  SCHEDULE_DELETED: 'schedule_deleted',
  SCHEDULE_LASTMINUTE: 'schedule_lastminute',
  FRIDAY_REMINDER: 'friday_reminder',
  MANUAL_ANNOUNCEMENT: 'manual_announcement',
  TEST: 'test',
} as const;

export const NOTIFICATION_STATUS = {
  SENT: 'sent',
  FAILED: 'failed',
  PENDING: 'pending',
} as const;

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;
