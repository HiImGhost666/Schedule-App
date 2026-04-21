export const USER_DEPARTMENTS = ['Seguridad', 'Mantenimiento', 'Operaciones', 'Administración'] as const;

export type UserDepartment = (typeof USER_DEPARTMENTS)[number];
