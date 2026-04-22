# Backend Constants Guide

Objetivo: mapa rapido de donde estan las constantes y variables de configuracion en backend.

Alcance:
- Incluye constantes globales, de modulo, tipos de dominio y variables de entorno validadas.
- No lista variables locales temporales dentro de funciones.

## 1) Configuracion Global

- src/config/env.ts
  - Variables de entorno validadas con zod (DATABASE_URL, JWT_*, PORT, CORS_ORIGIN, IMPORT_DEFAULT_PASSWORD, SEED_*).
  - Fuente de verdad para runtime env.
- src/config/constants.ts
  - ROLES
  - USER_STATUS
  - NOTIFICATION_TYPES
  - NOTIFICATION_STATUS
  - MAX_FAILED_ATTEMPTS
  - LOCKOUT_MINUTES
- src/config/database.ts
  - Instancia prisma singleton y politica de logging por NODE_ENV

## 2) Constantes por Modulo

- src/modules/users/users.constants.ts
  - USER_DEPARTMENTS
  - USER_ROLES
  - USER_STATUSES
  - CSV_IMPORT_DEFAULT_PASSWORD
  - CSV_IMPORT_MAX_FILE_SIZE_BYTES
- src/modules/branches/branches.constants.ts
  - HOLIDAY_TYPES
  - HOLIDAY_SCOPES
  - BRANCH_CODES
- src/modules/schedules/schedules.constants.ts
  - SCHEDULE_TYPES
- src/modules/settings/theme.presets.ts
  - BASE_PRESET_IDS
  - BUILT_IN_THEME_PRESETS
  - DEFAULT_THEME
  - THEME_PRESETS (alias legacy)

## 3) Tipos/Selectores Estructurales Relevantes

- src/modules/users/users.selects.ts
  - USER_RESPONSE_SELECT
  - USER_SAFE_SELECT
- src/modules/branches/domain/branches.types.ts
  - BranchHolidayType
  - BranchHolidayScope

Estos archivos no son "constantes de negocio" puras, pero actuan como contrato estable.

## 4) Sincronizacion Backend <-> Frontend

Mantener estos pares alineados:
- Roles/Estados:
  - backend/src/config/constants.ts
  - backend/src/modules/users/users.constants.ts
  - frontend/src/types/index.ts
- Seguridad login:
  - backend/src/config/constants.ts (MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES)
  - frontend/src/types/index.ts
- Tipos de schedule:
  - backend/src/modules/schedules/schedules.constants.ts
  - frontend/src/types/index.ts
- Departamentos:
  - backend/src/modules/users/users.constants.ts (minusculas)
  - frontend/src/pages/admin/UsersPage.tsx y UserFormModal.tsx (normalizacion visual)
- Codigos de sucursal:
  - backend/src/modules/branches/branches.constants.ts
  - frontend/src/pages/admin/UsersPage.tsx

## 5) Regla de Oro para CSV de Usuarios

- Backend valida departamentos en minusculas canonicas.
- Frontend puede recibir/escribir valores con mayuscula inicial para UX.
- Siempre normalizar antes de validar o exportar para evitar falsos errores.

## 6) Checklist Rapido al Agregar una Constante

1. Ubicarla en el modulo correcto (config global o modulo especifico).
2. Exportarla desde archivo de constantes del modulo.
3. Si impacta API/UX, actualizar frontend en el archivo espejo.
4. Si impacta seed/import, revisar prisma/seed.ts y users.service.ts.
5. Actualizar tests del modulo afectado en backend/test y frontend/test si aplica.

## 7) Busqueda Rapida

- Buscar constantes exportadas en backend:
  - rg "export const|as const" backend/src
- Buscar uso de una constante concreta:
  - rg "NOMBRE_CONSTANTE" backend/src backend/test
