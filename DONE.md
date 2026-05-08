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

## [Filtros] Filtros por departamento/sucursal/empleado en WeekSchedulesWidget

**Archivos**: `frontend/src/components/schedule/WeekSchedulesWidget.tsx`
**Estado**: ✅ Completado — el widget de turnos semanales ahora incluye filtros interactivos:
- **admin**: filtros de sucursal, departamento y empleado
- **general_manager**: filtros de departamento (de su sucursal) y empleado
- **department_manager**: filtro de empleado (de su departamento)
- **employee**: filtro de departamento (de su sucursal)
- Filtros adicionales: tipo de turno, solo mis turnos, solo urgentes
- Paginación inline (5 items por página)
- Botón "Limpiar" cuando hay filtros activos

---

## [Filtros] Filtro por departamento en SchedulePage

**Archivos**: `frontend/src/pages/SchedulePage.tsx`
**Estado**: ✅ Completado — la página de calendario ahora incluye un selector de departamento que:
- Filtra los turnos visibles en el calendario por `departmentId`
- Incluye `selectedDeptId` en la `queryKey` para refetch automático
- Disponible para todos los roles (cada uno ve los departamentos según su scope)

---

## [Filtros] Filtro automático por rol en DashboardPage

**Archivos**: `frontend/src/pages/DashboardPage.tsx`
**Estado**: ✅ Completado — el Dashboard ahora filtra automáticamente los turnos de la semana según el rol:
- **department_manager**: solo ve turnos de su departamento
- **general_manager**: solo ve turnos de su sucursal
- **admin**: ve todos los turnos (sin filtro)

---

## [Backend] Filtro `userId` en listWeekSchedules

**Archivos**: 
- `backend/src/modules/schedules/schedules.http.schemas.ts`
- `backend/src/modules/schedules/schedules.controller.ts`
- `backend/src/modules/schedules/schedules.service.ts`
**Estado**: ✅ Completado — el endpoint `GET /schedules/week/:year/:week` ahora acepta `userId` como query param opcional para filtrar turnos por empleado específico.

---

## [Webhooks] Corrección schema PATCH

**Archivo**: `backend/src/modules/webhooks/webhooks.router.ts`
**Estado**: ✅ Corregido — el schema de validación para PATCH ahora usa `webhookPartialSchema` con `superRefine` en lugar de `webhookSchema.partial()`, lo que permite validar correctamente las relaciones condicionales entre `scope`, `departmentId` y `branchId` incluso en actualizaciones parciales.

---

## [Departamentos] Corrección tipos de retorno en service

**Archivos**: 
- `backend/src/modules/departments/departments.service.ts`
- `backend/src/modules/departments/departments.repository.ts`
**Estado**: ✅ Corregido — `assignDepartmentManager` y `removeDepartmentManager` ahora devuelven el departamento actualizado mediante `findUnique` (con `managers` incluido) en lugar de `updateDepartmentManager`, que solo devolvía `id` y `managerId`. Se actualizaron los tests correspondientes.

---

## [Lint] Correcciones de lint

**Archivos**: 
- `frontend/src/components/schedule/MyWeeklySummaryCard.tsx`
- `frontend/src/components/schedule/WeekSchedulesWidget.tsx`
- `frontend/src/pages/DashboardPage.tsx`
**Estado**: ✅ Corregido — se eliminaron imports/variables no usados y se corrigieron dependencias de `useMemo` para compatibilidad con React Compiler.
