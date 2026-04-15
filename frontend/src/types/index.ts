export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'active' | 'disabled' | 'locked';
  avatarUrl?: string;
  department?: string;
  createdAt: string;
  lastLoginAt?: string;
  failedAttempts?: number;
  forcePasswordChange?: boolean;
  islandCalendar?: string;
  companyPhone?: string;
  auxiliaryPhone?: string;
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
  calendarType?: string;
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
  avatarUrl?: string | null;
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
  calendarType?: string;
  assignees: WeekScheduleAssignee[];
}

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
  { value: 'turno_manana', label: 'Turno Mañana', color: '#d97706' }, // amber
  { value: 'turno_tarde', label: 'Turno Tarde', color: '#7c3aed' }, // violet
  { value: 'turno_noche', label: 'Turno Noche', color: '#1e293b' }, // slate-dark
  { value: 'guardia_fin_semana', label: 'Guardia Fin de Semana', color: '#dc2626' }, // red
  { value: 'guardia_festivo', label: 'Guardia Festivo', color: '#ea580c' }, // orange
  { value: 'guardia_extra', label: 'Guardia Extra', color: '#db2777' }, // pink
  { value: 'disponible', label: 'Disponible / Localizable', color: '#16a34a' }, // green
  { value: 'formacion', label: 'Formación', color: '#0891b2' }, // cyan
  { value: 'vacaciones', label: 'Vacaciones', color: '#65a30d' }, // lime
  { value: 'baja', label: 'Baja / Ausencia', color: '#64748b' }, // slate
];

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
