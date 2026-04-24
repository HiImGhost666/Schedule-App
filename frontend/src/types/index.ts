export interface User {
  id: string;
  employeeId?: string | null;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'active' | 'disabled' | 'locked';
  avatarUrl?: string;
  department?: string;
  createdAt: string;
  passwordChangedAt?: string;
  lastLoginAt?: string;
  failedAttempts?: number;
  forcePasswordChange?: boolean;
  passwordChangePolicy?: 'none' | 'warning' | 'required';
  passwordChangeState?: 'none' | 'warning' | 'required';
  passwordChangeWarnedAt?: string | null;
  passwordChangeDeadlineAt?: string | null;
  companyPhone?: string;
  auxiliaryPhone?: string;
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  } | null;
}

export interface Schedule {
  id: string;
  title: string;
  description?: string;
  startDatetime: string;
  endDatetime: string;
  type: string;
  color: string;
  location?: string;
  notes?: string;
  isLastMinute: boolean;
  hoursPerDay?: number;
  branchId?: string;
  branch?: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  };
  createdById: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  assignments: ScheduleAssignment[];
}

export interface ScheduleAssignment {
  scheduleId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    department?: string;
    companyPhone?: string;
    auxiliaryPhone?: string;
  };
  assignedAt: string;
}

export interface WeekScheduleAssignee {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  department?: string | null;
  companyPhone?: string | null;
  auxiliaryPhone?: string | null;
}

export interface WeekScheduleItem {
  id: string;
  title: string;
  startDatetime: string;
  endDatetime: string;
  type: string;
  color: string;
  location?: string | null;
  notes?: string | null;
  isLastMinute: boolean;
  hoursPerDay?: number;
  branchId?: string | null;
  assignees: WeekScheduleAssignee[];
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  countryCode: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchHoliday {
  id: string;
  branchId: string;
  date: string;
  originalDate?: string | null;
  name: string;
  type: 'nacional' | 'autonomica' | 'local' | 'mejora' | 'regional' | 'company';
  scope: 'national' | 'regional' | 'local' | 'company';
  isPartial: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface GroupedBranchHoliday {
  id: string;
  branchId: 'all';
  date: string;
  originalDate?: string | null;
  name: string;
  type: BranchHoliday['type'];
  scope: BranchHoliday['scope'];
  isPartial: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch: null;
  holidayIds: string[];
  branches: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  sharedCount: number;
}

export type CalendarBranchHoliday = BranchHoliday | GroupedBranchHoliday;

export interface WeekSchedulesResponse {
  year: number;
  week: number;
  weekStart: string;
  weekEnd: string;
  total: number;
  items: WeekScheduleItem[];
}

export interface WebhookConfig {
  id: string;
  name: string;
  webhookUrl: string;
  enabled: boolean;
  notifyModifications: boolean;
  notifyLastMinute: boolean;
  fridayReminderEnabled: boolean;
  mondayVacationReminderEnabled: boolean;
  fridayReminderTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  type: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
  errorMessage?: string;
  scheduleId?: string;
  webhookConfig?: { id: string; name: string } | null;
  sentBy?: { id: string; name: string } | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  detailsJson?: unknown;
  ipAddress?: string;
  createdAt: string;
  rolledBackAt?: string | null;
  rolledBackBy?: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string } | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error?: string;
  code?: string;
  errors?: unknown;
}

export type ThemePresetId = 'corporate' | 'light' | 'dark' | 'sunrise' | 'forest';
export type ThemeLogoVariant = 'logo_claro' | 'logo_oscuro';

export interface ThemeTokens {
  brandPrimary: string;
  brandPrimaryHover: string;
  brandSecondary: string;
  pageBackground: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textMuted: string;
  borderColor: string;
  success: string;
  warning: string;
  danger: string;
}

export interface ThemeOverrides {
  sidebar: {
    background: string;
    text: string;
    activeBackground: string;
    activeText: string;
    logoVariant: ThemeLogoVariant;
  };
  topbar: {
    background: string;
    text: string;
  };
  buttons: {
    primaryBackground: string;
    primaryText: string;
    secondaryBackground: string;
    secondaryText: string;
    dangerBackground: string;
    dangerText: string;
  };
  badges: {
    adminBackground: string;
    adminText: string;
    managerBackground: string;
    managerText: string;
    viewerBackground: string;
    viewerText: string;
    activeBackground: string;
    activeText: string;
    disabledBackground: string;
    disabledText: string;
    lockedBackground: string;
    lockedText: string;
  };
  calendar: {
    todayBackground: string;
    activeButtonBackground: string;
    nowIndicator: string;
  };
  toasts: {
    background: string;
    text: string;
    successPrimary: string;
    successSecondary: string;
    errorBackground: string;
    errorText: string;
  };
}

export interface ThemeConfig {
  preset: ThemePresetId;
  tokens: ThemeTokens;
  overrides: ThemeOverrides;
  updatedAt?: string;
  updatedByUserId?: string;
}

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  theme: ThemeConfig;
}

export const SCHEDULE_TYPES = [
  { value: 'guardia', label: 'Guardia', color: '#2563eb' }, // blue
  { value: 'ausencia', label: 'Ausencia', color: '#64748b' }, // slate
  // Tonos ligeramente más oscuros: texto blanco 12px cumple contrast ratio 4.5:1
  { value: 'vacaciones', label: 'Vacaciones', color: '#3f6212' }, // lime-800
  { value: 'formacion', label: 'Formación', color: '#0e7490' }, // cyan-700
  { value: 'otro', label: 'Otro', color: '#4b5563' }, // gray
  { value: 'excepcion', label: 'Excepción', color: '#dc2626' }, // red
];

export type ScheduleType = 'guardia' | 'ausencia' | 'vacaciones' | 'formacion' | 'otro' | 'excepcion';

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Responsable',
  viewer: 'Usuario',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  disabled: 'Deshabilitado',
  locked: 'Bloqueado',
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  schedule_created: 'Guardia Creada',
  schedule_modified: 'Guardia Modificada',
  schedule_deleted: 'Guardia Eliminada',
  schedule_lastminute: 'Último Momento',
  friday_reminder: 'Resumen Viernes',
  manual_announcement: 'Anuncio Manual',
  monday_vacation_summary: 'Vacaciones Semana',
  test: 'Prueba',
};

// Security login lockout (sync with backend/src/config/constants.ts)
export const LOGIN_LOCKOUT_FIRST_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_FIRST_MINUTES = 5;
export const LOGIN_LOCKOUT_SECOND_ATTEMPTS = 10;
export const LOGIN_LOCKOUT_SECOND_MINUTES = 30;
export const LOGIN_LOCKOUT_DISABLE_ATTEMPTS = 15;