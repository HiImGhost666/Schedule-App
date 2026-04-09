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

export const SCHEDULE_TYPES = [
  { value: 'guardia', label: 'Guardia', color: '#1e3a5f' },
  { value: 'formacion', label: 'Formación', color: '#0d7377' },
  { value: 'reunion', label: 'Reunión', color: '#6b4fbb' },
  { value: 'guardia_extra', label: 'Guardia Extra', color: '#c0392b' },
  { value: 'disponible', label: 'Disponible', color: '#27ae60' },
  { value: 'vacaciones', label: 'Vacaciones', color: '#f39c12' },
] as const;
