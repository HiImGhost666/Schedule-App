# DONE — Cambios Realizados

> Registro de cambios aplicados durante el desarrollo.
> **Última actualización:** 9 mayo 2026

---

## Módulo: Roles y Permisos

- Creado `PERMISOS.md` con matriz de permisos centralizada por rol
- Creado permiso `branches:holidays:manage` para que GM pueda gestionar festivos de su sucursal
- Creados permisos `shift_presets:read/create/update/delete` para el nuevo módulo ShiftPresets
- Restringido `schedule_types:create/update/delete` solo a admin (GM y DM solo lectura)
- Eliminado permiso `branches:manage` de general_manager (solo `branches:view`)
- Corregido permiso en router de roles: `settings:manage` → `settings:update`
- Corregido permiso en router de auditoría: `audit:view` → `settings:update` para rollback
- Creado `assertUserScope()` genérico reemplazando `assertGmBranchScope()` — soporta admin, GM, DM y employee
- Añadido `validateDmUpdateRestrictions()` para que DM no pueda cambiar branchId ni role de usuarios
- Seed actualizado para sincronizar permisos nuevos con upsert automático
- Actualizado `API.md` de roles con lista de permisos correcta

## Módulo: Departamentos

- Corregido bug FIX-1: `branchIds` se pasaba como campo directo a Prisma causando error 500 al actualizar departamento
- Corregido bug FIX-2: al mover empleado entre departamentos se enviaba `branchId` involuntariamente cambiando su sucursal
- Corregida relación `managerId` → `DepartmentManager` (tabla intermedia `department_managers`)
- `assignDepartmentManager` y `removeDepartmentManager` ahora devuelven el departamento completo con `managers` incluido
- `countDepartmentsForManager` ahora cuenta en `departmentManager` en vez de `department`
- Tests actualizados para usar `upsertDepartmentManager`/`deleteDepartmentManager`

## Módulo: Vacaciones

- Añadido filtro `employeeId` opcional en `listVacations`
- `getVacationCalendar` ahora valida permisos por rol (employee ve solo sus aprobadas, DM su depto, GM su sucursal, admin todo)
- `createVacationEntry`, `approveVacationEntry`, `rejectVacationEntry`, `cancelVacationEntry` ahora usan transacciones atómicas con audit log
- Repository soporta `TransactionClient` opcional en todas las funciones
- Controller refactorizado con `buildActor()` para evitar duplicación de lógica de actor
- Creada página `VacationsPage.tsx` con calendario, tabla paginada, modales de solicitud/creación y badges de estado
- Creado hook `useVacations` con queries y mutaciones
- Creados tests `VacationsPage.test.tsx`
- Añadida ordenación a `VacationTable` (headers clickeables)

## Módulo: Schedules / Turnos

- Creado endpoint `GET /schedules/alerts` que detecta turnos sin personal (unassigned) y solitarios (solo) para próximos 7 días
- Creado componente `AlertsModal.tsx` con alertas visuales en Dashboard
- Añadido filtro `userId` en `listWeekSchedules` para filtrar por empleado específico
- Creado `WeeklyWorkSummary` — servicio que calcula horas totales, base y extra por semana, se actualiza automáticamente al crear/modificar turnos
- Dashboard rediseñado con widgets: `WeekSchedulesWidget`, `MyWeeklySummaryCard`, `TeamWeeklySummaryCard`, `RecentActivityWidget`
- Añadido filtro por departamento en `SchedulePage` (calendario)
- Filtros interactivos en `WeekSchedulesWidget` por sucursal, departamento, empleado, tipo de turno, urgentes
- Filtro automático por rol en Dashboard (DM ve su depto, GM su sucursal, admin todo)
- Creada lógica `shiftScheduling.ts` para turnos multi-día con agrupación de días consecutivos
- Creados tests `DashboardPage.test.tsx` y `shiftScheduling.test.ts`

## Módulo: ShiftPresets (Nuevo)

- Creado modelo `ShiftPreset` en Prisma (name, startTime, endTime, isActive)
- Creado módulo completo backend: schemas Zod, service con transacciones + audit log, controller, router con permisos CRUD
- Creada página admin `ShiftPresetsPage.tsx` con tabla + modal CRUD
- Añadida ruta `/admin/shift-presets` y enlace en Sidebar

## Módulo: Webhooks

- Añadido scope por departamento y sucursal en webhooks
- Notificaciones respetan el scope configurado
- Corregido schema PATCH: creado `webhookUpdateSchema` separado sin `superRefine` para evitar errores con `.partial()`
- Corregido lint warning (import no usado en `webhooks.service.ts`)

## Módulo: Notifications

- Corregido bug FIX-3: `sendMondayVacationSummary()` buscaba en `prisma.schedule` en vez de `prisma.vacationRequest`

## Módulo: Schedule Types

- Schedule-types service ahora usa prisma singleton en vez de `new PrismaClient()`
- Router ya delega en `schedule-types.controller.ts` (verificado, ya implementado)

## Módulo: Usuarios

- `assertUserScope()` genérico implementado (ver módulo Roles)
- `validateDmUpdateRestrictions()` impide que DM cambie branchId/role
- Tests actualizados con 6 nuevos tests para DM

## Módulo: Branches

- Endpoints de festivos cambiados a `branches:holidays:manage` (GM puede gestionar)
- Branch CRUD verificado: solo admin con `branches:manage`

## Módulo: Auditoría

- Rollback ahora usa `settings:update` (solo admin) en vez de `audit:view`

## Base de datos

- Migraciones unificadas en un solo `init.sql`
- Modelos añadidos: `VacationRequest`, `WeeklyWorkSummary`, `DepartmentManager`, `WebhookConfig`, `ShiftPreset`
- Eliminada columna `type` de tabla `schedules`
- Añadido enum `HolidayType` (nacional, autonomica, local, mejora, regional, company)
- Añadido enum `VacationStatus` (pending, colindante, approved, rejected, cancelled)

## Frontend — Páginas nuevas

- `VacationsPage.tsx` — gestión completa de vacaciones con calendario y tabla
- `ShiftPresetsPage.tsx` — CRUD de turnos predefinidos
- `AlertsModal.tsx` — alertas de turnos sin personal/solitarios

## Frontend — Migración a theme-aware

- Migradas 7 páginas admin de colores navy hardcodeados a theme-aware: UsersPage, WebhooksPage, NotificationsPage, HolidaysPage, AuditLogPage, EventTypesPage, UserDetailsModal
- EventTypesPage reescrita completamente (estilos legacy → theme-aware, `confirm()` → `ConfirmDialog`, default export → named export)

## Documentación

- Creado `DESIGN.md` — Design system, patrones de componentes, convenciones de frontend
- Creado `BusinessLogic.md` — Decisiones de negocio, permisos, enjaulamiento, vulnerabilidades, mutaciones
- Actualizado `TODO.md` — Pendientes críticos por módulo con vulnerabilidades identificadas
- Actualizado `PERMISOS.md` — Matriz actualizada con todos los permisos y scopes

## Tests

- Tests de Dashboard, Vacaciones y turnos multi-día
- Tests actualizados para departments (manager relation fix)
- Tests actualizados para webhooks (schema PATCH)
- Tests actualizados para users (assertUserScope, DM restrictions)
- Tests de SchedulePage corregidos (lógica de branchId actualizada)
- Tests de DashboardPage corregidos (StatCard "Alertas" en vez de "Cambios urgentes")
- Tests de branches.router corregidos (permiso `branches:holidays:manage` añadido a admin)
- Todos los tests pasando (194 tests, 0 fallos)
