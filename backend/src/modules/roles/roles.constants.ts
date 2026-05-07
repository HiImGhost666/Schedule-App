export const ROLE_NAMES = ['admin', 'general_manager', 'department_manager', 'employee'] as const;
export type RoleName = typeof ROLE_NAMES[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: 'Administrador',
  general_manager: 'Gerente General',
  department_manager: 'Responsable de Departamento',
  employee: 'Empleado',
};

export const PERMISSIONS = [
  'users:view',
  'users:create',
  'users:update',
  'users:delete',
  'schedules:view',
  'schedules:create',
  'schedules:update',
  'schedules:delete',
  'schedules:manage',
  'schedule_types:read',
  'schedule_types:create',
  'schedule_types:update',
  'schedule_types:delete',
  'branches:view',
  'branches:create',
  'branches:update',
  'branches:delete',
  'settings:view',
  'settings:update',
  'settings:manage',
  'audit:view',
] as const;
export type PermissionName = typeof PERMISSIONS[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  admin: [
    'users:view',
    'users:create',
    'users:update',
    'users:delete',
    'schedules:view',
    'schedules:create',
    'schedules:update',
    'schedules:delete',
    'schedules:manage',
    'schedule_types:read',
    'schedule_types:create',
    'schedule_types:update',
    'schedule_types:delete',
    'branches:view',
    'branches:create',
    'branches:update',
    'branches:delete',
    'settings:view',
    'settings:update',
    'settings:manage',
    'audit:view',
  ],
  general_manager: [
    // Nota: Aunque tiene permisos de gestión, la lógica de negocio en el servicio
    // restringe sus acciones CRUD (Crear, Actualizar, Borrar) a su propia sucursal.
    // Schedule Types: solo lectura — solo admin puede crear/editar/borrar.
    'users:view',
    'users:create',
    'users:update',
    'users:delete',
    'schedules:view',
    'schedules:create',
    'schedules:update',
    'schedules:delete',
    'schedules:manage',
    'schedule_types:read',
    'branches:view',
    'settings:view',
  ],
  department_manager: [
    'users:view',
    'schedules:view',
    'schedules:create',
    'schedules:update',
    'schedules:delete',
    'schedules:manage',
    'schedule_types:read',
    'branches:view',
  ],
  employee: [
    'schedules:view',
    'schedule_types:read',
    'branches:view',
  ],
};
