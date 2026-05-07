# TODO - Issues Pendientes por Resolver

> Organizado por dominio/módulo. Cada tarea especifica archivo, problema y solución propuesta.
> **Actualizado tras revisión de código fuente (7 mayo 2026).**

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
| `vacations:create` | ✅ | ✅ | ✅ | ✅ |
| `vacations:read` | ✅ | ✅ | ✅ | ✅ |
| `vacations:read-all` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `vacations:approve` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `vacations:cancel` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ✅ (solo propias) |
| `vacations:delete` | ✅ | ❌ | ❌ | ❌ |

### Lógica detrás de cada decisión:

- **`general_manager`** → Gestiona **su sucursal**: usuarios de su branch, turnos de su branch. Schedule Types solo lectura (solo admin crea/edita/borra para evitar errores). NO gestiona departments, branches, ni settings.
- **`department_manager`** → Gestiona **su departamento**: turnos de su depto. Schedule Types solo lectura. NO gestiona usuarios (solo ve la lista), ni branches, ni settings.
- **`employee`** → Solo ve turnos, tipos de turno y sucursales. No gestiona nada.
- **`admin`** → Control total.

---

## 📦 Módulo: Schedule Types (Tipos de Turno)

### [ST-1] 🔴 BACKEND: Schedule-types service crea su propio PrismaClient
- **Archivo**: `backend/src/modules/schedule-types/schedule-types.service.ts` (línea 5)
- **Problema**: Crea `const prisma = new PrismaClient()` en vez de importar la instancia compartida.
- **Severidad**: 🔴 Alta — puede causar agotamiento del pool de conexiones.
- **Solución**: Importar `prisma` desde `../../config/database`.

### [ST-2] 🟡 BACKEND: Schedule-types router no delega en un controller
- **Archivo**: `backend/src/modules/schedule-types/schedule-types.router.ts`
- **Problema**: La lógica de los handlers está inline en el router, no hay un archivo `schedule-types.controller.ts`.
- **Severidad**: 🟡 Media — inconsistencia arquitectónica con el resto de módulos.
- **Solución**: Extraer la lógica de cada handler a un controller separado.

---

## 📦 Módulo: Branches (Sucursales)

### [BR-1] ✅ BACKEND: `general_manager` tiene permiso `branches:manage` — no debería
- **Archivo**: `backend/src/modules/roles/roles.constants.ts`
- **Estado**: ✅ **Correcto** — `general_manager` NO tiene `branches:manage` (solo `branches:view`).

### [BR-2] ✅ BACKEND: Branch CRUD requiere `branches:manage` — solo admin
- **Archivo**: `backend/src/modules/branches/branches.router.ts`
- **Estado**: ✅ **Correcto** — todas las rutas de creación/edición/borrado de sucursales usan `requirePermission('branches:manage')`. Solo `admin` tiene ese permiso.

### [BR-3] 🟡 BACKEND: Branch holidays CRUD requiere `branches:manage` — solo admin
- **Archivo**: `backend/src/modules/branches/branches.router.ts` (líneas 29-33)
- **Problema**: Los festivos de sucursal requieren `branches:manage` (solo admin). Un `general_manager` debería poder gestionar los festivos de SU sucursal.
- **Severidad**: 🟡 Media
- **Solución**: Crear permiso `branches:holidays:manage` y asignarlo a `general_manager`, o modificar la lógica del servicio para que un GM solo pueda gestionar festivos de su branch.

---

## 📦 Módulo: Departments (Departamentos)

### [DP-1] ✅ BACKEND: Department CRUD requiere `settings:manage` — solo admin
- **Archivo**: `backend/src/modules/departments/departments.router.ts`
- **Estado**: ✅ **Correcto** — un departamento puede estar en múltiples sucursales, por lo que un GM no debería modificarlos.

### [DP-2] ✅ BACKEND: Un departamento puede estar en múltiples sucursales
- **Archivo**: `backend/src/modules/departments/departments.service.ts`
- **Estado**: ✅ **Correcto** — ya está implementado así con `settings:manage`.

---

## 📦 Módulo: Users (Usuarios)

### [US-1] 🔴 BACKEND: `general_manager` tiene `users:manage` — falta validación de sucursal
- **Archivo**: `backend/src/modules/users/users.service.ts`
- **Problema**: `general_manager` tiene `users:manage`, lo que le permite crear/editar/borrar **cualquier** usuario. La nota en `roles.constants.ts` dice que "la lógica de negocio en el servicio restringe sus acciones CRUD a su propia sucursal", pero **esa validación no existe** en `users.service.ts`.
- **Severidad**: 🔴 Alta — un GM podría gestionar usuarios de otras sucursales.
- **Solución**: Añadir validación en `createUser()`, `updateUser()`, `deleteUser()`, `changeUserStatus()`, `changeUserRole()` que, si el actor es GM, solo permita operar sobre usuarios de su misma `branchId`. También en `getUsersList()` filtrar automáticamente por `actor.branchId` si el actor es GM.

### [US-2] 🟡 FRONTEND: UsersPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/UsersPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `bg-navy-50`, `border-navy-100`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [US-3] 🟡 FRONTEND: UserDetailsModal usa colores navy hardcodeados
- **Archivo**: `frontend/src/components/common/UserDetailsModal.tsx`
- **Problema**: Usa `border-navy-100`, `bg-navy-50`, `text-navy-800`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [US-4] 🟢 FRONTEND: UserDetailsModal sin fallback para `departments` array
- **Archivo**: `frontend/src/components/common/UserDetailsModal.tsx` (línea 130)
- **Problema**: Solo usa `user.department?.name`, no tiene fallback a `user.departments?.[0]?.department.name`.
- **Severidad**: 🟢 Baja
- **Solución**: Añadir fallback.

---

## 📦 Módulo: Schedules (Turnos)

### [SC-1] ✅ BACKEND: `general_manager` tiene `schedules:manage` — validación de sucursal YA EXISTE
- **Archivo**: `backend/src/modules/schedules/schedules.service.ts`
- **Estado**: ✅ **Ya está correcto** — no requiere cambios. Validaciones existentes:
  - `createScheduleEntry()`: Si no es admin, verifica `actor.branchId` y que `targetBranchId === actor.branchId`.
  - `updateScheduleEntry()`: Verifica que `existing.branchId === actor.branchId`.
  - `deleteScheduleEntry()`: Verifica que `schedule.branchId === actor.branchId`.

---

## 📦 Módulo: Settings / Theme / Webhooks / Notifications

### [SE-1] ✅ BACKEND: Settings, Webhooks y Notifications requieren `settings:manage` — solo admin
- **Estado**: ✅ **Correcto** — la configuración global debe ser solo para admin.

### [SE-2] 🟡 FRONTEND: WebhooksPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/WebhooksPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `bg-navy-50`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [SE-3] 🟡 FRONTEND: NotificationsPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/NotificationsPage.tsx`
- **Problema**: Usa `border-navy-100`, `bg-navy-50`, `text-navy-400`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Event Types (Tipos de Evento)

### [EV-1] 🟡 FRONTEND: EventTypesPage usa estilos legacy (no theme-aware)
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx`
- **Problema**: Usa `bg-indigo-600`, `text-gray-800`, `bg-white`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [EV-2] 🟢 FRONTEND: EventTypesPage usa `confirm()` nativo para borrar
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx` (línea 71)
- **Problema**: Usa `confirm('¿Borrar?')` en vez del componente `ConfirmDialog`.
- **Severidad**: 🟢 Baja
- **Solución**: Reemplazar con `ConfirmDialog`.

### [EV-3] 🟢 FRONTEND: EventTypesPage usa `default export`
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx`
- **Problema**: Usa `export default function` mientras que todas las demás páginas admin usan `export function`.
- **Severidad**: 🟢 Baja
- **Solución**: Cambiar a named export y actualizar el lazy import en `App.tsx`.

---

## 📦 Módulo: Holidays (Festivos)

### [HL-1] 🟡 FRONTEND: HolidaysPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/HolidaysPage.tsx`
- **Problema**: Usa `text-navy-600`, `bg-navy-50`, `bg-navy-100`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Audit (Auditoría)

### [AU-1] 🟡 FRONTEND: AuditLogPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/AuditLogPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `text-navy-300`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Roles y Permisos

### [RP-1] ✅ BACKEND: Matriz de permisos correcta
- **Archivo**: `backend/src/modules/roles/roles.constants.ts`
- **Estado**: ✅ **Correcta** — la matriz actual coincide con la deseada. No requiere cambios.

### [RP-2] 🔴 BACKEND: Falta validación de sucursal en `users.service.ts` para `general_manager`
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

## 📦 Módulo: Vacations (Vacaciones)

### [VC-1] ✅ BACKEND: `listVacations` ahora filtra por `employeeId` en query params
- **Archivo**: `backend/src/modules/vacations/vacations.http.schemas.ts`
- **Estado**: ✅ **Corregido** — se añadió `employeeId: z.string().optional()` al schema y se aplica en el where del servicio.

### [VC-2] ✅ BACKEND: `getVacationCalendar` ahora tiene validación de permisos por rol
- **Archivo**: `backend/src/modules/vacations/vacations.service.ts`
- **Estado**: ✅ **Corregido** — ahora recibe `actor` opcional y filtra según el rol:
  - `employee`: solo ve sus propias vacaciones aprobadas
  - `department_manager`: solo ve vacaciones de su departamento
  - `general_manager`: solo ve vacaciones de su sucursal
  - `admin`: ve todo

### [VC-3] ✅ BACKEND: `createVacationEntry` ahora usa transacción atómica
- **Archivo**: `backend/src/modules/vacations/vacations.service.ts`
- **Estado**: ✅ **Corregido** — creación + audit log envueltos en `executeInTransaction` con `logAuditOrThrow` (rollback si falla audit).

### [VC-4] ✅ BACKEND: `approveVacationEntry` y `rejectVacationEntry` ahora usan transacción atómica
- **Archivo**: `backend/src/modules/vacations/vacations.service.ts`
- **Estado**: ✅ **Corregido** — actualización + audit log envueltos en `executeInTransaction` con `logAuditOrThrow`.

### [VC-5] ✅ BACKEND: `cancelVacationEntry` ahora usa transacción atómica
- **Archivo**: `backend/src/modules/vacations/vacations.service.ts`
- **Estado**: ✅ **Corregido** — actualización + audit log envueltos en `executeInTransaction` con `logAuditOrThrow`.

### [VC-6] ✅ BACKEND: Repository ahora soporta `TransactionClient` opcional
- **Archivo**: `backend/src/modules/vacations/vacations.repository.ts`
- **Estado**: ✅ **Corregido** — todas las funciones aceptan `tx?: TransactionClient` y usan `getDb(tx)` para elegir entre la tx o prisma global.

### [VC-7] ✅ BACKEND: Controller refactorizado con `buildActor()` para evitar duplicación
- **Archivo**: `backend/src/modules/vacations/vacations.controller.ts`

---

## 📦 Módulo: Frontend Types / Data Model

### [TY-1] 🟡 FRONTEND: Tipo `User` no incluye campo `departments` array
- **Archivo**: `frontend/src/types/index.ts`
- **Problema**: El tipo `User` solo tiene `department` (singular), pero varios componentes referencian `user.departments?.[0]?.department.name`.
- **Severidad**: 🟡 Media
- **Solución**: Añadir `departments?: Array<{ department: Department }>` al tipo `User`.

### [TY-2] 🟡 BACKEND: Prisma schema no tiene relación many-to-many User-Department
- **Archivo**: `backend/prisma/schema.prisma`
- **Problema**: El schema tiene `User.departmentId` (FK a Department), pero el frontend asume que puede venir un array `departments`.
- **Severidad**: 🟡 Media
- **Solución**: Verificar qué devuelve realmente la API `/users` y alinear el tipo frontend con la respuesta real.

---

## 📋 Resumen por Prioridad

### 🔴 Alta (debe resolverse antes de producción)
1. **[US-1] / [RP-2]** Restringir `users:manage` de GM a su sucursal — falta lógica en `users.service.ts`
2. **[ST-1]** Schedule-types service crea su propio PrismaClient

### 🟡 Media
3. **[ST-2]** Schedule-types router sin controller
4. **[BR-3]** GM no puede gestionar festivos de su sucursal
5. **[US-2]** UsersPage colores navy hardcodeados
6. **[US-3]** UserDetailsModal colores navy hardcodeados
7. **[SE-2]** WebhooksPage colores navy hardcodeados
8. **[SE-3]** NotificationsPage colores navy hardcodeados
9. **[EV-1]** EventTypesPage estilos legacy
10. **[HL-1]** HolidaysPage colores navy hardcodeados
11. **[AU-1]** AuditLogPage colores navy hardcodeados
12. **[TY-1]** Tipo User sin campo departments array
13. **[TY-2]** Desalineación modelo datos User-Department
14. **[VC-1]** listVacations no filtra por employeeId
15. **[VC-2]** getVacationCalendar sin validación de permisos por rol

### 🟢 Baja
16. **[US-4]** UserDetailsModal sin fallback departments array
17. **[EV-2]** EventTypesPage usa confirm() nativo
18. **[EV-3]** EventTypesPage usa default export
19. **[VC-3]** createVacationEntry sin transacción
20. **[VC-4]** approve/rejectVacationEntry sin transacción
21. **[VC-5]** cancelVacationEntry sin transacción

### ✅ Ya verificados como correctos
- **[SC-1]** Schedules service ya valida branchId para GM ✅
- **[BR-1]** GM no tiene `branches:manage` ✅
- **[BR-2]** Branch CRUD solo para admin ✅
- **[DP-1]** Department CRUD solo para admin ✅
- **[DP-2]** Departamentos multi-sucursal — GM no debe modificarlos ✅
- **[SE-1]** Settings/Webhooks solo para admin ✅
- **[RP-1]** Matriz de permisos correcta ✅
