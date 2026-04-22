# Frontend Constants Guide

Objetivo: mapa rapido de donde estan las constantes y variables de configuracion en frontend.

Alcance:
- Incluye fuentes de verdad de dominio, configuracion y validacion.
- No lista variables locales temporales de cada componente.

## 1) Configuracion Base

- src/config/api.ts
  - VITE_API_URL
  - Configuracion de axios (baseURL, withCredentials)
  - Interceptores de auth y refresh token
- src/config/queryClient.ts
  - Politica global de React Query (staleTime, retry, refetchOnWindowFocus)
- src/config/theme.ts
  - DEFAULT_THEME
  - applyThemeToDocument (mapeo de tokens a CSS variables)

## 2) Tipos y Etiquetas de Dominio

- src/types/index.ts
  - SCHEDULE_TYPES (tipos + color)
  - ROLE_LABELS
  - STATUS_LABELS
  - NOTIFICATION_TYPE_LABELS
  - MAX_FAILED_ATTEMPTS y LOCKOUT_MINUTES (deben ir sincronizadas con backend/src/config/constants.ts)

## 3) Reglas de Sucursal

- src/lib/branchSelection.ts
  - getEffectiveBranchId
  - Estrategias de fallback: none, first, active-or-first

## 4) Usuarios: CSV y Formularios

- src/pages/admin/UsersPage.tsx
  - CSV_HEADERS
  - ALLOWED_ROLES
  - ALLOWED_STATUS
  - ALLOWED_BRANCH_CODES
  - DEPARTMENT_VALUES
  - ALLOWED_DEPARTMENTS
  - DEPARTMENT_LOOKUP
  - normalizeDepartment (capitalizacion: primera letra mayuscula)
- src/pages/admin/UserFormModal.tsx
  - DEPARTMENT_VALUES
  - DEPARTMENT_OPTIONS
  - DEPARTMENT_LOOKUP
  - normalizeDepartment

Nota importante de departamentos:
- En backend se guarda en minusculas (seguridad, mantenimiento, operaciones, administracion).
- En frontend se muestra y exporta con inicial mayuscula (Seguridad, Mantenimiento, Operaciones, Administracion).
- Siempre usar normalizeDepartment en UI/CSV para evitar inconsistencias.

## 5) Otras Constantes por Pantalla

- src/pages/admin/HolidaysPage.tsx
  - HOLIDAY_TYPE_LABELS
  - HOLIDAY_TYPE_COLORS
  - HOLIDAY_TYPE_FILTERS
  - emptyHolidayForm
- src/pages/admin/AuditLogPage.tsx
  - ACTION_COLORS
  - IRREVERSIBLE_ACTIONS
- src/pages/admin/webhooks.schema.ts
  - webhookFormSchema (defaults y validaciones)

## 6) Sincronizacion Frontend <-> Backend

Mantener estos pares alineados:
- Roles y estados:
  - frontend/src/types/index.ts
  - backend/src/config/constants.ts
  - backend/src/modules/users/users.constants.ts
- Tipos de schedule:
  - frontend/src/types/index.ts
  - backend/src/modules/schedules/schedules.constants.ts
- Departamentos:
  - frontend/src/pages/admin/UsersPage.tsx
  - frontend/src/pages/admin/UserFormModal.tsx
  - backend/src/modules/users/users.constants.ts
- Codigos de sucursal:
  - frontend/src/pages/admin/UsersPage.tsx
  - backend/src/modules/branches/branches.constants.ts

## 7) Checklist Rapido al Agregar una Constante

1. Definir primero la fuente de verdad (types, config o modulo).
2. Si impacta backend, actualizar tambien el par correspondiente.
3. Si afecta UI, añadir etiquetas legibles en src/types/index.ts.
4. Si afecta import/export CSV, validar en UsersPage y normalizar formato.
5. Añadir o actualizar test asociado en frontend/test.

## 8) Busqueda Rapida

- Buscar constantes exportadas en frontend:
  - rg "export const|as const" frontend/src
- Buscar uso de una constante concreta:
  - rg "NOMBRE_CONSTANTE" frontend/src frontend/test
