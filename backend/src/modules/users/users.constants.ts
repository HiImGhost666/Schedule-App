export const USER_ROLES = ['admin', 'manager', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'disabled', 'locked'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Contraseña temporal asignada en importación masiva — always bcrypt-hashed inside createUser. */
export const CSV_IMPORT_DEFAULT_PASSWORD = 'User123!';

/** Límite máximo de tamaño de archivo CSV para importación (5 MB). */
export const CSV_IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

