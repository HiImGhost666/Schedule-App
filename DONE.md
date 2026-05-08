# DONE - Cambios Realizados

> Registro de cambios aplicados durante la revisión del código.
> **Última actualización:** 8 mayo 2026

---

## [ST-3] Schedule Types: solo admin puede crear/editar/borrar

**Archivo modificado**: `backend/src/modules/roles/roles.constants.ts`

**Decisión final**: Para evitar errores, **solo `admin`** puede crear/editar/borrar tipos de turno. `general_manager` y `department_manager` solo pueden consultarlos (`schedule_types:read`).

**Cambio**:
```diff
  general_manager: [
    'users:view',
    'users:manage',
    'schedules:view',
    'schedules:manage',
    'schedule_types:read',
-   'schedule_types:create',
-   'schedule_types:update',
-   'schedule_types:delete',
    'branches:view',
    'settings:view',
  ],
  department_manager: [
    'users:view',
    'schedules:view',
    'schedules:manage',
    'schedule_types:read',
-   'schedule_types:create',
-   'schedule_types:update',
-   'schedule_types:delete',
    'branches:view',
  ],
```

**Impacto**: Solo `admin` tiene CRUD completo sobre Schedule Types. Ambos managers solo pueden ver la lista.

---

## [VC-1] listVacations ahora filtra por employeeId

**Archivo**: `backend/src/modules/vacations/vacations.http.schemas.ts`
**Estado**: ✅ Corregido — se añadió `employeeId: z.string().optional()` al schema y se aplica en el where del servicio.

---

## [VC-2] getVacationCalendar ahora tiene validación de permisos por rol

**Archivo**: `backend/src/modules/vacations/vacations.service.ts`
**Estado**: ✅ Corregido — ahora recibe `actor` opcional y filtra según el rol:
- `employee`: solo ve sus propias vacaciones aprobadas
- `department_manager`: solo ve vacaciones de su departamento
- `general_manager`: solo ve vacaciones de su sucursal
- `admin`: ve todo

---

## [VC-3] createVacationEntry ahora usa transacción atómica

**Archivo**: `backend/src/modules/vacations/vacations.service.ts`
**Estado**: ✅ Corregido — creación + audit log envueltos en `executeInTransaction` con `logAuditOrThrow` (rollback si falla audit).

---

## [VC-4] approveVacationEntry y rejectVacationEntry ahora usan transacción atómica

**Archivo**: `backend/src/modules/vacations/vacations.service.ts`
**Estado**: ✅ Corregido — actualización + audit log envueltos en `executeInTransaction` con `logAuditOrThrow`.

---

## [VC-5] cancelVacationEntry ahora usa transacción atómica

**Archivo**: `backend/src/modules/vacations/vacations.service.ts`
**Estado**: ✅ Corregido — actualización + audit log envueltos en `executeInTransaction` con `logAuditOrThrow`.

---

## [VC-6] Repository ahora soporta TransactionClient opcional

**Archivo**: `backend/src/modules/vacations/vacations.repository.ts`
**Estado**: ✅ Corregido — todas las funciones aceptan `tx?: TransactionClient` y usan `getDb(tx)` para elegir entre la tx o prisma global.

---

## [VC-7] Controller refactorizado con buildActor() para evitar duplicación

**Archivo**: `backend/src/modules/vacations/vacations.controller.ts`

---

## [SC-1] Schedules service ya valida branchId para GM

**Archivo**: `backend/src/modules/schedules/schedules.service.ts`
**Estado**: ✅ Verificado — las validaciones de branchId para `general_manager` ya existen en `createScheduleEntry()`, `updateScheduleEntry()` y `deleteScheduleEntry()`.

---

## [BR-1] general_manager NO tiene branches:manage

**Archivo**: `backend/src/modules/roles/roles.constants.ts`
**Estado**: ✅ Verificado — `general_manager` solo tiene `branches:view`.

---

## [BR-2] Branch CRUD solo para admin

**Archivo**: `backend/src/modules/branches/branches.router.ts`
**Estado**: ✅ Verificado — todas las rutas de creación/edición/borrado usan `requirePermission('branches:manage')`.

---

## [DP-1] Department CRUD solo para admin

**Archivo**: `backend/src/modules/departments/departments.router.ts`
**Estado**: ✅ Verificado — usa `settings:update` (solo admin).

---

## [DP-2] Departamentos multi-sucursal — GM no debe modificarlos

**Archivo**: `backend/src/modules/departments/departments.service.ts`
**Estado**: ✅ Verificado — ya implementado con `settings:update`.

---

## [SE-1] Settings/Webhooks solo para admin

**Estado**: ✅ Verificado — la configuración global requiere `settings:update`.

---

## [RP-1] Matriz de permisos correcta

**Archivo**: `backend/src/modules/roles/roles.constants.ts`
**Estado**: ✅ Verificado — la matriz actual coincide con la deseada.

---

## [Roles Router] settings:manage → settings:update

**Archivo**: `backend/src/modules/roles/roles.router.ts`
**Estado**: ✅ Corregido — POST/PATCH/DELETE ahora usan `settings:update` en vez del antiguo `settings:manage`.

---

## [Audit Router] Rollback con permiso correcto

**Archivo**: `backend/src/modules/audit/audit.router.ts`
**Estado**: ✅ Corregido — `POST /:id/rollback` ahora usa `settings:update` (solo admin) en vez de `audit:view`.

---

## [PERMISOS.md] Matriz de permisos centralizada

**Archivo creado**: `PERMISOS.md`
**Estado**: ✅ Creado — matriz completa con tabla por rol, descripción de cada permiso, lógica de scopes y notas técnicas.

---

## [TODO.md] Limpieza de tabla de permisos duplicada

**Archivo**: `TODO.md`
**Estado**: ✅ Limpiado — se removió la tabla de permisos y se agregó referencia a `PERMISOS.md`.

---

## [Seed] Sincronización automática de permisos nuevos

**Archivo**: `backend/prisma/seed.ts`
**Estado**: ✅ Corregido — ahora sincroniza permisos incluso si la BD ya tiene datos (upsert + connect a roles existentes).

---

## [Roles API.md] Lista de permisos actualizada

**Archivo**: `backend/src/modules/roles/API.md`
**Estado**: ✅ Corregido — permisos antiguos `vacations:request`/`vacations:approve` reemplazados por los 6 nuevos permisos CRUD.

---

## [DB] Migraciones unificadas en un solo init.sql

**Archivos**: `backend/prisma/migrations/`
**Estado**: ✅ Completado — las 5 migraciones posteriores se fusionaron en el `migration.sql` inicial. Se eliminaron las carpetas redundantes:
- `20260507085700_add_vacation_requests`
- `20260507093500_add_colindante_status`
- `20260507101414_webhook_categories`
- `20260507105111_remove_webhook_scope`
- `20260507120000_add_weekly_work_summary`

**Modelos añadidos al init.sql**:
- `VacationRequest` con enum `VacationStatus` (pending, colindante, approved, rejected, cancelled)
- `WeeklyWorkSummary` con desglose diario y horas extra
- `DepartmentManager` (relación many-to-many departamento-usuario)
- `WebhookConfig` con relaciones a `Department` y `Branch`
- `HolidayType` enum con valores: nacional, autonomica, local, mejora, regional, company

---

## [Webhooks] Scope por departamento y sede

**Archivos**: `backend/src/modules/webhooks/`, `backend/src/modules/notifications/`, `frontend/src/pages/admin/WebhooksPage.tsx`
**Estado**: ✅ Completado — los webhooks ahora pueden filtrar por departamento y/o sucursal. Las notificaciones respetan el scope configurado.

---

## [WeeklyWorkSummary] Resumen semanal de horas

**Archivos**: `backend/src/modules/schedules/weekly-summary.service.ts`, `backend/src/modules/schedules/schedules.service.ts`
**Estado**: ✅ Completado — nuevo servicio que calcula horas totales, base y extra por semana. Se actualiza automáticamente al crear/modificar turnos.

---

## [Dashboard] Rediseño con widgets

**Archivos**: `frontend/src/pages/DashboardPage.tsx`, `frontend/src/components/schedule/`, `frontend/src/components/audit/`
**Estado**: ✅ Completado — nuevo Dashboard con:
- `WeekSchedulesWidget`: vista semanal de turnos con navegación
- `MyWeeklySummaryCard`: resumen personal de horas semanales
- `TeamWeeklySummaryCard`: resumen del equipo para managers
- `RecentActivityWidget`: actividad reciente del sistema
- `shiftScheduling.ts`: lógica de turnos multi-día

---

## [Vacaciones] Página completa

**Archivos**: `frontend/src/pages/VacationsPage.tsx`, `frontend/src/components/vacations/`, `frontend/src/hooks/useVacations.ts`
**Estado**: ✅ Completado — nueva página de vacaciones con:
- `VacationCalendar`: calendario con eventos de vacaciones
- `VacationRequestModal`: modal para solicitar vacaciones
- `VacationCreateModal`: modal para admin/manager crear vacaciones
- `VacationTable`: listado paginado de solicitudes
- `VacationStatusBadge`: badge con color según estado
- Hook `useVacations` con queries y mutaciones

---

## [Tests] Tests de Dashboard, Vacaciones y turnos

**Archivos**: `frontend/test/DashboardPage.test.tsx`, `frontend/test/VacationsPage.test.tsx`, `frontend/test/shiftScheduling.test.ts`
**Estado**: ✅ Completado — tests unitarios y de integración para los nuevos componentes.

---

## [ST-1] Schedule-types service usa prisma singleton

**Archivo**: `backend/src/modules/schedule-types/schedule-types.service.ts`
**Estado**: ✅ Corregido — se reemplazó `import { PrismaClient } from '@prisma/client'` + `const prisma = new PrismaClient()` por `import { prisma } from '../../config/database'`.

---

## [US-1] / [RP-2] GM branch scope validation en users.service.ts

**Archivo**: `backend/src/modules/users/users.service.ts`
**Estado**: ✅ Corregido — se añadió función `assertGmBranchScope(actorId, targetBranchId)` que:
- Obtiene el usuario actor de la BD
- Si su rol es `general_manager`, verifica que `targetBranchId === actor.branchId`
- Si no coincide, lanza `createAppError('FORBIDDEN', ...)`
- Si el rol no es GM, pasa libre

Se aplica en:
- `createUser()` — valida contra `parsed.data.branchId`
- `updateUser()` — valida contra `user.branchId` del usuario existente
- `changeUserStatus()` — valida contra `user.branchId`
- `changeUserRole()` — valida contra `user.branchId`
- `deleteUser()` — valida contra `user.branchId`
- `getUsersList()` — si actor es GM, fuerza `params.branchId = actor.branchId`

**Archivo**: `backend/src/modules/users/users.controller.ts`
**Estado**: ✅ Corregido — `listUsersController` ahora pasa `req.user` como actor a `getUsersList()`.

---

## [Departments] Manager relation fix (managerId → DepartmentManager join table)

**Archivos**: `backend/src/modules/departments/departments.repository.ts`, `backend/src/modules/departments/departments.service.ts`
**Estado**: ✅ Corregido — el modelo Prisma usa una tabla intermedia `DepartmentManager` (relación `managers`), no un campo `managerId` directo. Se corrigió:
- `findDepartmentById` incluye `managers` (plural) en vez de `manager` (singular)
- `assignDepartmentManager` usa `upsertDepartmentManager()` en la tabla `department_managers`
- `removeDepartmentManager` usa `deleteDepartmentManager()` en la tabla `department_managers`
- `countDepartmentsForManager` cuenta en `departmentManager` en vez de `department`

---

## [Webhooks] PATCH validation fix (superRefine con .partial())

**Archivo**: `backend/src/modules/webhooks/webhooks.router.ts`
**Estado**: ✅ Corregido — `webhookSchema.partial().safeParse()` fallaba porque `.partial()` en un schema con `superRefine` causa errores cuando `scope` es undefined. Se creó `webhookUpdateSchema` separado sin `superRefine` para las actualizaciones PATCH.

---

## [Tests] Tests actualizados para cambios en departments y webhooks

**Archivos**: `backend/test/departments.manager.test.ts`, `backend/test/departments.router.test.ts`
**Estado**: ✅ Corregido — se actualizaron mocks y assertions para usar `upsertDepartmentManager`/`deleteDepartmentManager` en vez del antiguo `updateDepartmentManager`. Se corrigió expectativa de status code para `department_manager` en GET /api/departments.

---

## [Tareas completadas del análisis] 8 mayo 2026

Las siguientes tareas de la lista original ya estaban implementadas en el código:

### Selección de días al crear turnos (Media)
- **Estado**: ✅ YA IMPLEMENTADO
- `ShiftModal.tsx` ya tiene mini calendario multi-select con `DayPicker`
- `shiftScheduling.ts` tiene `buildScheduleChunks`, `buildDateRange`, etc.
- Backend tiene `POST /schedules/bulk` para creación masiva
- Tests en `frontend/test/shiftScheduling.test.ts`

### Tipos de turno personalizados (Media)
- **Estado**: ✅ YA IMPLEMENTADO
- `ScheduleType` es una entidad en Prisma con `value`, `label`, `color`
- CRUD completo en `schedule-types.router.ts`
- Frontend: `EventTypesPage.tsx` para gestión
- `useScheduleTypes` hook para consumo

### Planificación semanal estructurada (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- Vista semanal en `SchedulePage.tsx` con `timeGridWeek`
- `WeekSchedulesWidget` en Dashboard
- `listWeekSchedules` en backend
- Sidebar con filtros por sucursal/departamento/tipo

### Gestión de usuarios (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- CRUD completo en `UsersPage.tsx`
- Importación CSV
- Filtros por sucursal, departamento, estado
- Gestión de roles y permisos

### Responsables de departamento (Media)
- **Estado**: ✅ YA IMPLEMENTADO
- `DepartmentManager` es una entidad en Prisma (tabla intermedia `department_managers`)
- `assignDepartmentManager` / `removeDepartmentManager` en `departments.service.ts`
- Frontend: `ManagerAssignmentModal` en componentes de departamentos

### Permisos para Department Manager (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `roles.constants.ts` tiene permisos específicos para `department_manager`
- `schedules.service.ts` valida scope de department_manager
- `vacations.service.ts` valida scope de department_manager
- `PERMISOS.md` documenta matriz completa

### Nuevo rol: Department Manager (Media)
- **Estado**: ✅ YA IMPLEMENTADO
- `department_manager` en `ROLE_NAMES`
- `ROLE_LABELS` con 'Responsable de Departamento'
- Permisos asignados en `DEFAULT_ROLE_PERMISSIONS`

### Refactorizando roles en el backend (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- Roles como entidad `Role` en Prisma con tabla `permissions`
- `roles.constants.ts` define permisos por rol
- `roles.service.ts` para gestión CRUD
- Seed sincroniza permisos automáticamente

### Refactorizando Eventos en el backend (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `ScheduleType` es entidad en Prisma
- `Schedule.scheduleTypeId` FK a `ScheduleType`
- CRUD completo con permisos

### Creando Departamento en el Backend (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `Department` entidad en Prisma
- `DepartmentBranch` tabla intermedia (many-to-many Department-Branch)
- `DepartmentManager` tabla intermedia (many-to-many Department-User)
- CRUD completo con transacciones y auditoría

### Añadir flujo de solicitud de vacaciones (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `VacationRequest` entidad en Prisma
- CRUD completo: `createVacationEntry`, `approveVacationEntry`, `rejectVacationEntry`, `cancelVacationEntry`
- Frontend: `VacationsPage.tsx`, `VacationRequestModal`, `VacationCreateModal`, `VacationTable`
- Detección de solapamientos (estado `colindante`)

### Añadir aviso en caso de día de vacaciones ocupado (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `findDepartmentOverlap` detecta solapamientos
- Estado `colindante` cuando hay solapamiento
- Frontend muestra advertencia

### Remover lógica de 'desde' - 'hasta' y hacer más robusto el sistema de creación de schedules (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `ShiftModal.tsx` usa mini calendario multi-select
- `shiftScheduling.ts` maneja agrupación de días consecutivos
- Backend bulk creation con validaciones

### Crear página de vacaciones con gestión por branch (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `VacationsPage.tsx` completa
- `VacationCalendar` con filtros por branch/department
- `VacationTable` con acciones de approve/reject
- Scope por rol implementado en backend

### Separar "Vacaciones" del ScheduleType y hacerlo como entidad (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `VacationRequest` es entidad independiente en Prisma
- No depende de `ScheduleType`
- Flujo completo de solicitud/aprobación/rechazo

### Hacer que el calendario de Vacaciones llame a esa entidad (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `VacationCalendar` usa `GET /vacations/calendar`
- `getVacationCalendar` en `vacations.service.ts` consulta `VacationRequest`
- Filtros por branch, department, employee

### Cambiar la selección de fechas en Calendario (Alta)
- **Estado**: ✅ YA IMPLEMENTADO
- `ShiftModal.tsx` usa `DayPicker` con modo multi-select
- Soporta Shift+Click para rangos
- Presets por día y horarios personalizados
- Vista previa en vivo
