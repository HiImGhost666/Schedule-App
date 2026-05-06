# TODO - Issues Pendientes por Resolver

> Organizado por dominio/módulo. Cada tarea especifica archivo, problema y solución propuesta.

---

## 🧠 Modelo de Negocio: ¿Qué hace cada rol?

Los **Schedule Types** son un catálogo **global** (no asociados a una sucursal concreta). Para evitar errores, **solo `admin`** puede crear/editar/borrar tipos de turno. Los managers solo los consultan.

| Permiso | admin | general_manager | department_manager | employee |
|---|---|---|---|---|
| `users:view` | ✅ | ✅ | ✅ | ❌ |
| `users:manage` | ✅ | ✅ (solo su branch) | ❌ | ❌ |
| `schedules:view` | ✅ | ✅ | ✅ | ✅ |
| `schedules:manage` | ✅ | ✅ (solo su branch) | ✅ (solo su depto) | ❌ |
| `schedule_types:read` | ✅ | ✅ | ✅ | ✅ |
| `schedule_types:create` | ✅ | ❌ | ❌ | ❌ |
| `schedule_types:update` | ✅ | ❌ | ❌ | ❌ |
| `schedule_types:delete` | ✅ | ❌ | ❌ | ❌ |
| `branches:view` | ✅ | ✅ | ✅ | ✅ |
| `branches:manage` | ✅ | ❌ | ❌ | ❌ |
| `settings:view` | ✅ | ✅ | ❌ | ❌ |
| `settings:manage` | ✅ | ❌ | ❌ | ❌ |
| `audit:view` | ✅ | ❌ | ❌ | ❌ |

### Lógica detrás de cada decisión:

- **`general_manager`** → Gestiona **su sucursal**: usuarios de su branch, turnos de su branch. Schedule Types solo lectura (solo admin crea/edita/borra para evitar errores). NO gestiona departments, branches, ni settings.
- **`department_manager`** → Gestiona **su departamento**: turnos de su depto. Schedule Types solo lectura. NO gestiona usuarios (solo ve la lista), ni branches, ni settings.
- **`employee`** → Solo ve turnos, tipos de turno y sucursales. No gestiona nada.
- **`admin`** → Control total.

---

## 📦 Módulo: Schedule Types (Tipos de Turno)

### [ST-1] BACKEND: Schedule-types service crea su propio PrismaClient
- **Archivo**: `backend/src/modules/schedule-types/schedule-types.service.ts` (línea 5)
- **Problema**: Crea `const prisma = new PrismaClient()` en vez de importar la instancia compartida.
- **Severidad**: 🔴 Alta — puede causar agotamiento del pool de conexiones.
- **Solución**: Importar `prisma` desde `../../config/database`.

### [ST-2] BACKEND: Schedule-types router no delega en un controller
- **Archivo**: `backend/src/modules/schedule-types/schedule-types.router.ts`
- **Problema**: La lógica de los handlers está inline en el router, no hay un archivo `schedule-types.controller.ts`.
- **Severidad**: 🟡 Media — inconsistencia arquitectónica con el resto de módulos.
- **Solución**: Extraer la lógica de cada handler a un controller separado.

---

## 📦 Módulo: Branches (Sucursales)

### [BR-1] BACKEND: `general_manager` tiene permiso `branches:manage` — no debería
- **Archivo**: `backend/src/modules/roles/roles.constants.ts`
- **Problema**: `general_manager` NO tiene `branches:manage` (solo `branches:view`). ✅ Correcto.
- **Estado**: ✅ Correcto — no requiere cambios.

### [BR-2] BACKEND: Branch CRUD requiere `branches:manage` — solo admin
- **Archivo**: `backend/src/modules/branches/branches.router.ts`
- **Problema**: Todas las rutas de creación/edición/borrado de sucursales usan `requirePermission('branches:manage')`. Solo `admin` tiene ese permiso.
- **Estado**: ✅ Correcto — no requiere cambios.

### [BR-3] BACKEND: Branch holidays CRUD requiere `branches:manage` — solo admin
- **Archivo**: `backend/src/modules/branches/branches.router.ts` (líneas 29-33)
- **Problema**: Los festivos de sucursal requieren `branches:manage` (solo admin). Un `general_manager` debería poder gestionar los festivos de SU sucursal.
- **Severidad**: 🟡 Media
- **Solución**: Crear permiso `branches:holidays:manage` y asignarlo a `general_manager`, o modificar la lógica del servicio para que un GM solo pueda gestionar festivos de su branch.

---

## 📦 Módulo: Departments (Departamentos)

### [DP-1] BACKEND: Department CRUD requiere `settings:manage` — solo admin
- **Archivo**: `backend/src/modules/departments/departments.router.ts` (líneas 17-24)
- **Problema**: Todas las rutas de departamentos requieren `settings:manage`. Solo `admin` tiene ese permiso.
- **Estado**: ✅ Correcto — un departamento puede estar en múltiples sucursales, por lo que un GM no debería modificarlos.

### [DP-2] BACKEND: Un departamento puede estar en múltiples sucursales
- **Archivo**: `backend/src/modules/departments/departments.service.ts`
- **Problema**: Como un departamento puede estar asociado a varias sucursales, un `general_manager` (que solo gestiona una sucursal) no debería poder crear/editar/borrar departamentos porque afectaría a otras sucursales.
- **Estado**: ✅ Correcto — ya está implementado así con `settings:manage`.

---

## 📦 Módulo: Users (Usuarios)

### [US-1] BACKEND: `general_manager` tiene `users:manage` — falta validación de sucursal
- **Archivo**: `backend/src/modules/users/users.service.ts`
- **Problema**: `general_manager` tiene `users:manage`, lo que le permite crear/editar/borrar **cualquier** usuario. La nota en `roles.constants.ts` dice que "la lógica de negocio en el servicio restringe sus acciones CRUD a su propia sucursal", pero **esa validación no existe** en `users.service.ts`.
- **Severidad**: 🔴 Alta — un GM podría gestionar usuarios de otras sucursales.
- **Solución**: Añadir validación en `createUser()`, `updateUser()`, `deleteUser()`, `changeUserStatus()`, `changeUserRole()` que, si el actor es `general_manager`, solo permita operar sobre usuarios de su misma `branchId`.

### [US-2] FRONTEND: UsersPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/UsersPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `bg-navy-50`, `border-navy-100`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [US-3] FRONTEND: UserDetailsModal usa colores navy hardcodeados
- **Archivo**: `frontend/src/components/common/UserDetailsModal.tsx`
- **Problema**: Usa `border-navy-100`, `bg-navy-50`, `text-navy-800`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [US-4] FRONTEND: UserDetailsModal sin fallback para `departments` array
- **Archivo**: `frontend/src/components/common/UserDetailsModal.tsx` (línea 130)
- **Problema**: Solo usa `user.department?.name`, no tiene fallback a `user.departments?.[0]?.department.name`.
- **Severidad**: 🟢 Baja
- **Solución**: Añadir fallback.

---

## 📦 Módulo: Schedules (Turnos)

### [SC-1] BACKEND: `general_manager` tiene `schedules:manage` — validación de sucursal YA EXISTE ✅
- **Archivo**: `backend/src/modules/schedules/schedules.service.ts`
- **Problema**: Se pensó que faltaba validación, pero **ya está implementada**:
  - `createScheduleEntry()` (líneas 285-293): Si no es admin, verifica `actor.branchId` y que `targetBranchId === actor.branchId`.
  - `updateScheduleEntry()` (líneas 363-376): Verifica que `existing.branchId === actor.branchId`.
  - `deleteScheduleEntry()` (líneas 468-475): Verifica que `schedule.branchId === actor.branchId`.
  - `listWeekSchedulesForActor()` (líneas 164-177): Filtra por `actor.branchId` si no es admin.
  - `getScheduleByIdForActor()` (líneas 251-262): Verifica que `schedule.branchId === actor.branchId`.
- **Estado**: ✅ **Ya está correcto** — no requiere cambios.

---

## 📦 Módulo: Settings / Theme / Webhooks / Notifications

### [SE-1] BACKEND: Settings, Webhooks y Notifications requieren `settings:manage` — solo admin
- **Archivo**: `backend/src/modules/settings/settings.router.ts`, `backend/src/modules/webhooks/webhooks.router.ts`, `backend/src/modules/notifications/notifications.router.ts`
- **Estado**: ✅ Correcto — la configuración global debe ser solo para admin.

### [SE-2] FRONTEND: WebhooksPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/WebhooksPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `bg-navy-50`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [SE-3] FRONTEND: NotificationsPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/NotificationsPage.tsx`
- **Problema**: Usa `border-navy-100`, `bg-navy-50`, `text-navy-400`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Event Types (Tipos de Evento)

### [EV-1] FRONTEND: EventTypesPage usa estilos legacy (no theme-aware)
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx`
- **Problema**: Usa `bg-indigo-600`, `text-gray-800`, `bg-white`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [EV-2] FRONTEND: EventTypesPage usa `confirm()` nativo para borrar
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx` (línea 71)
- **Problema**: Usa `confirm('¿Borrar?')` en vez del componente `ConfirmDialog`.
- **Severidad**: 🟢 Baja
- **Solución**: Reemplazar con `ConfirmDialog`.

### [EV-3] FRONTEND: EventTypesPage usa `default export`
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx`
- **Problema**: Usa `export default function` mientras que todas las demás páginas admin usan `export function`.
- **Severidad**: 🟢 Baja
- **Solución**: Cambiar a named export y actualizar el lazy import en `App.tsx`.

---

## 📦 Módulo: Holidays (Festivos)

### [HL-1] FRONTEND: HolidaysPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/HolidaysPage.tsx`
- **Problema**: Usa `text-navy-600`, `bg-navy-50`, `bg-navy-100`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Audit (Auditoría)

### [AU-1] FRONTEND: AuditLogPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/AuditLogPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `text-navy-300`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Roles y Permisos

### [RP-1] BACKEND: Revisar matriz de permisos completa
- **Archivo**: `backend/src/modules/roles/roles.constants.ts`
- **Estado**: ✅ **Correcta** — la matriz actual coincide con la deseada. No requiere cambios.

### [RP-2] BACKEND: Falta validación de sucursal en `users.service.ts` para `general_manager`
- **Archivo**: `backend/src/modules/users/users.service.ts`
- **Problema**: Aunque el permiso `users:manage` está asignado a `general_manager`, no hay lógica que restrinja sus operaciones a su propia sucursal. La nota en `roles.constants.ts` dice que "la lógica de negocio en el servicio restringe sus acciones", pero esa lógica **no existe** en `users.service.ts`.
- **Severidad**: 🔴 Alta — breach de seguridad potencial.
- **Solución**: Añadir validación en:
  - `createUser()`: Si actor es GM, forzar `branchId` a la del actor.
  - `updateUser()`: Si actor es GM, verificar que el usuario pertenece a su branch.
  - `deleteUser()`: Si actor es GM, verificar que el usuario pertenece a su branch.
  - `changeUserStatus()`: Si actor es GM, verificar que el usuario pertenece a su branch.
  - `changeUserRole()`: Si actor es GM, verificar que el usuario pertenece a su branch.
  - `getUsersList()`: Si actor es GM, filtrar automáticamente por su `branchId`.

---

## 📦 Módulo: Frontend Types / Data Model

### [TY-1] FRONTEND: Tipo `User` no incluye campo `departments` array
- **Archivo**: `frontend/src/types/index.ts`
- **Problema**: El tipo `User` solo tiene `department` (singular), pero varios componentes referencian `user.departments?.[0]?.department.name`.
- **Severidad**: 🟡 Media
- **Solución**: Añadir `departments?: Array<{ department: Department }>` al tipo `User`.

### [TY-2] BACKEND: Prisma schema no tiene relación many-to-many User-Department
- **Archivo**: `backend/prisma/schema.prisma`
- **Problema**: El schema tiene `User.departmentId` (FK a Department), pero el frontend asume que puede venir un array `departments`.
- **Severidad**: 🟡 Media
- **Solución**: Verificar qué devuelve realmente la API `/users` y alinear el tipo frontend con la respuesta real.

---

## 📋 Resumen por Prioridad

### 🔴 Alta (debe resolverse antes de producción)
1. **[US-1]** Restringir `users:manage` de GM a su sucursal — falta lógica en `users.service.ts`
2. **[RP-2]** Falta validación de sucursal en `users.service.ts` para GM
3. **[ST-1]** Schedule-types service crea su propio PrismaClient

### 🟡 Media
4. **[ST-2]** Schedule-types router sin controller
5. **[BR-3]** GM no puede gestionar festivos de su sucursal
6. **[US-2]** UsersPage colores navy hardcodeados
7. **[US-3]** UserDetailsModal colores navy hardcodeados
8. **[SE-2]** WebhooksPage colores navy hardcodeados
9. **[SE-3]** NotificationsPage colores navy hardcodeados
10. **[EV-1]** EventTypesPage estilos legacy
11. **[HL-1]** HolidaysPage colores navy hardcodeados
12. **[AU-1]** AuditLogPage colores navy hardcodeados
13. **[TY-1]** Tipo User sin campo departments array
14. **[TY-2]** Desalineación modelo datos User-Department

### 🟢 Baja
15. **[US-4]** UserDetailsModal sin fallback departments array
16. **[EV-2]** EventTypesPage usa confirm() nativo
17. **[EV-3]** EventTypesPage usa default export

### ✅ Ya verificados como correctos
- **[SC-1]** Schedules service ya valida branchId para GM ✅
- **[BR-1]** GM no tiene `branches:manage` ✅
- **[BR-2]** Branch CRUD solo para admin ✅
- **[DP-1]** Department CRUD solo para admin ✅
- **[DP-2]** Departamentos multi-sucursal — GM no debe modificarlos ✅
- **[SE-1]** Settings/Webhooks solo para admin ✅
- **[RP-1]** Matriz de permisos correcta (GM tiene CRUD en schedule_types) ✅
