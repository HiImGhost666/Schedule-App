# DONE — Cambios Realizados

> Registro de cambios aplicados durante el desarrollo.
> **Última actualización:** 12 mayo 2026

---

## ✅ COMPLETADO — Items #9, #12-16 (12 mayo 2026)

### Item #5: Evento desde Dashboard abre popup en SchedulePage
- [x] Verificado: `WeekSchedulesWidget` navega a `/schedule/${s.id}` (ruta `schedule/:scheduleId`)
- [x] `SchedulePage` usa `useParams` para leer `scheduleId` y carga el detalle con `GET /schedules/:id`
- [x] `useEffect` busca el elemento del calendario y abre el popup automáticamente

### Item #9: Selección de días específicos al crear turnos
- [x] Verificado: ya funciona con el DayPicker multi-select en ShiftModal.tsx

### Item #12: Mensaje cuando employee no tiene sucursal asignada
- [x] Añadido `<EmptyState>` en SchedulePage.tsx con mensaje "No tienes una sucursal asignada. Contacta con tu administrador."

### Item #13: Skeleton loaders consistentes
- [x] Verificadas todas las páginas admin — todas tienen skeletons (DashboardSkeleton, TableSkeleton, etc.)

### Item #14: Error 403 con mensaje descriptivo
- [x] Mejorado `ProtectedRoute.tsx` (RoleGuard) con nombre de sección y roles requeridos en el mensaje
- [x] `ForbiddenPage.tsx` ya acepta contexto descriptivo

### Item #15: Confirmación antes de crear schedule en día festivo
- [x] Verificado: ya funciona con el diálogo de conflictos (holiday overlap detection)

### Item #16: Notificaciones push para vacaciones
- [x] Verificado: `notifyVacationChange` ya se llama en `approveVacationEntry` y `rejectVacationEntry`
- [x] Notificación in-app al empleado cuando su solicitud cambia de estado

### Fix: ShiftModal.tsx — Presets desde API
- [x] ShiftModal ahora consulta `GET /shift-presets` desde la API en lugar de tener presets hardcodeados
- [x] Tipo `ShiftPreset` usa `name` en lugar de `label` para coincidir con la API

### Fix: seed.ts — Añadido bloque SHIFT PRESETS
- [x] Nuevo bloque `BLOQUE 2.1.4: SHIFT PRESETS` que crea los 3 presets base (mañana 08-16, tarde 16-23, noche 00-08)
- [x] Corregido error TS en `ensureVacationRequest` (departmentId requerido)
- [x] Restaurado `adminUser` que se había perdido durante ediciones anteriores

---

## ✅ COMPLETADO — Items #17-20 (11 mayo 2026)

### Item #17: Filtro "Mis turnos" en SchedulePage
- [x] Añadido checkbox "Mostrar solo mis turnos" en ScheduleSidebar
- [x] Solo visible para rol employee
- [x] Al activarlo, pasa `userId` a las queries de schedules (resuelve 'me' → user.id real)

### Item #18: Filtro por usuario en SchedulePage
- [x] Añadido selector de usuarios en ScheduleSidebar (solo admin/GM/DM)
- [x] Carga usuarios del scope (branch/departamento) activo
- [x] Incluye campo de búsqueda si hay más de 10 usuarios
- [x] Pasa `userId` seleccionado a las queries de schedules

### Item #19: Perfil desde header (TopBar)
- [x] Envuelto nombre de usuario con `<Link to="/profile">` en TopBar
- [x] Añadido hover opacity para indicar interactividad

### Item #20: Días en español en calendario EventModal
- [x] Añadido locale `es` de date-fns al DayPicker en ShiftModal
- [x] Localizado formato `EEE` (día de semana) con locale español

---

## ✅ COMPLETADO — Prioridad 1 (Crítico / Seguridad)

- [x] **VUL-3**: Endpoint `GET /schedules` migrado a `listSchedulesForActor`
- [x] **VUL-6**: Validar assigneeIds antes de crear schedule
- [x] **VUL-8**: Sanitización de HTML en campos de texto (backend + frontend)
- [x] **DashboardPage** — Widgets ocultos según rol
- [x] **ProfilePage** — Employee no puede cambiar su rol/estado

## ✅ COMPLETADO — Prioridad 2 (Tests)

- [x] Tests de integración: schedules con roles, scope GM, vacaciones DM
- [x] Backend: users.router, auth.router, middleware, schemas (schedules, vacations, users, branches, departments), app-error, socket
- [x] Frontend: ProfilePage, ScheduleTypesPage, hooks (useFieldValidation, useInAppNotifications, useMyWeeklySummary, useScheduleTypes, useTeamWeeklySummaries, useVacations), api-client, DataTable, FilterTable, LoadingSpinner, Skeleton, ForbiddenPage, NotificationPanel, MobileNav, TopBar

## ✅ COMPLETADO — Bugs críticos resueltos (11 mayo 2026)

### Bug #1: No se podía editar departamentos
- [x] **Causa**: El frontend enviaba `branchIds: []` (array vacío) al editar, que el backend rechazaba con `.min(1)`. También enviaba `code` vacío que fallaba el regex.
- [x] **Fix**: Modificada `updateDepartmentMutation` en `DepartmentsPage.tsx` para solo enviar campos con valor (`name`, `code`, `description`, `branchIds`). Si `branchIds` está vacío, no se envía. Si `code` está vacío, no se envía.
- [x] **Tests**: 50 tests pasando (departments.http.schemas, departments.router, departments.manager, departments.audit)

### Bug #2: No se actualizaban usuarios al mover empleados entre departamentos
- [x] **Causa**: `invalidateQueries({ queryKey: ['users'] })` no invalidaba queries con parámetros adicionales como `['users', page, limit, filters, ...]`.
- [x] **Fix**: Añadido `exact: false` en `invalidateQueries` de `updateDepartmentMemberMutation` para que invalide todas las queries que empiecen con `['users']`, `['departments']` y `['departments-users']`.
- [x] **Tests**: 84 tests pasando (users.router, users.test, users.http.schemas)

### Bug #3: Notificaciones de vacaciones y resumen semanal no funcionan
- [x] **Causa**: `notifyVacationChange` buscaba webhooks sin filtrar por scope (branchId/departmentId), y `sendMondayVacationSummary` ya se había corregido.
- [x] **Fix**: Añadido filtrado por scope en `notifyVacationChange`, logs de depuración, corregido tipo `VacationChangeParams`, mejorado `NotificationsPage.tsx` con `ScopeSelector`.
- [x] **Tests**: Tests de notificaciones actualizados.

### Bug #8: Pills de vacaciones aprobadas no se muestran en calendario
- [x] **Causa**: `VacationCalendar` usaba `useVacationCalendar` que solo cargaba UNA semana (la de `dateRange.from`), pero el calendario muestra un mes entero. Al cambiar de mes, solo se cargaba la primera semana del nuevo rango.
- [x] **Fix**: 
  1. Añadidos `from`/`to` opcionales al schema `vacationCalendarQuerySchema` y al service `getVacationCalendar`
  2. Creado `useVacationCalendarRange` hook que usa `from`/`to` en lugar de `year`/`week`
  3. Actualizado `VacationCalendar.tsx` para usar `useVacationCalendarRange` con el rango completo del mes visible
  4. Actualizados tests del schema
- [x] **Tests**: 42 tests pasando (vacations.http.schemas, vacations.router, security-vacations)

## ✅ COMPLETADO — Prioridad 3 (Refactor / Migraciones)

- [x] **HolidaysPage** — Migrada a `<DataTable>`
- [x] **UsersPage** — Migrada a `<DataTable>`
- [x] **NotificationsPage** — Migrada a `<DataTable>`
- [x] **TypeLegend.tsx** — Ya recibe `scheduleTypes` como prop ✅
- [x] **VacationTable.tsx** — Separado en smart (VacationsPage) + dumb (VacationTable)
- [x] **BranchList.tsx + DepartmentList.tsx** — Unificados en `SidebarList.tsx` ✅
- [x] **UsersTable.tsx + AuditTable.tsx** — Extraído `SortableHeader` + hook `useSortable`
- [x] **EventTypesPage** → Renombrada a `ScheduleTypesPage` (ruta `/admin/schedule-types`)

---

## Funcionalidades implementadas (de la lista de features)

### Tarde descubierta / Turno solitario ✅
- [x] Endpoint `GET /schedules/alerts` que detecta turnos sin personal (unassigned) y solitarios (solo)
- [x] Componente `AlertsModal.tsx` con alertas visuales en Dashboard
- [x] Integrado en DashboardPage con StatCard de alertas

### Turnos preconfigurados ✅
- [x] Modelo `ShiftPreset` en Prisma (name, startTime, endTime, isActive)
- [x] Módulo backend completo: schemas Zod, service con transacciones + audit log, controller, router con permisos CRUD
- [x] Página admin `ShiftPresetsPage.tsx` con tabla + modal CRUD
- [x] Ruta `/admin/shift-presets` y enlace en Sidebar

### Tipos de turno personalizados ✅
- [x] Modelo `ScheduleType` en Prisma (name, value, color, isActive)
- [x] Módulo backend completo con CRUD
- [x] Página admin `ScheduleTypesPage.tsx` (renombrada desde EventTypesPage)
- [x] Ruta `/admin/schedule-types`

### Planificación semanal estructurada ✅
- [x] Vista semanal en SchedulePage con FullCalendar
- [x] Filtros por sucursal, departamento, empleado, tipo de turno
- [x] Widget `WeekSchedulesWidget` en Dashboard

### Gestión de usuarios ✅
- [x] CRUD completo de usuarios con permisos por rol
- [x] Importación CSV
- [x] Scope por sucursal (GM) y departamento (DM)
- [x] Restricciones para DM (no cambiar role/branchId)

### Responsables de departamento ✅
- [x] Tabla intermedia `department_managers` (soporta múltiples managers)
- [x] `assignDepartmentManager` / `removeDepartmentManager`
- [x] DM puede crear/editar turnos de su departamento

### Permisos para Department Manager ✅
- [x] DM puede crear turnos solo para su departamento (`ensureDepartmentManagerAssignees`)
- [x] DM solo modifica turnos de su departamento (`ensureAssignmentsBelongToDepartment`)
- [x] DM ve solo su departamento en Dashboard y listados

### Nuevo rol: Department Manager ✅
- [x] Rol `department_manager` creado en seed
- [x] Permisos específicos: `schedules:create`, `schedules:read`, `vacations:approve` (scope departamento)
- [x] Integrado en `assertUserScope()`

### Refactorizando roles en el backend ✅
- [x] Roles como entidad (modelo `Role` en Prisma) con permisos asociados
- [x] Ya no son strings hardcodeados
- [x] Seed con roles: admin, general_manager, department_manager, employee

### Refactorizando Eventos en el backend ✅
- [x] `ScheduleType` como entidad (modelo en Prisma)
- [x] CRUD completo con permisos
- [x] Renombrado frontend de EventTypesPage → ScheduleTypesPage

### Creando Departamento en el Backend ✅
- [x] Entidad `Department` asociada a Branch y Usuario
- [x] Tabla intermedia `department_branches` para relación N:M
- [x] CRUD completo con managers

### Añadir flujo de solicitud de vacaciones ✅
- [x] Creación de solicitudes con detección de solapamiento (estado `colindante`)
- [x] Aprobación/rechazo por DM/GM/admin
- [x] Cancelación por el empleado
- [x] Página `VacationsPage.tsx` con calendario, tabla, modales

### Añadir aviso en caso de día de vacaciones ocupado ✅
- [x] Detección de solapamiento con compañeros del mismo departamento
- [x] Estado `colindante` con información de compañeros afectados

### Crear página de vacaciones con gestión por branch ✅
- [x] `VacationsPage.tsx` completa con calendario, tabla paginada, filtros
- [x] Aprobación por responsable del departamento
- [x] Scope por rol (employee ve solo sus solicitudes, DM su depto, GM su branch)

### Eliminar tipo "Vacaciones" del Calendario Turnos ✅
- [x] Vacaciones como entidad separada (`VacationRequest`)
- [x] Calendario de vacaciones independiente del de turnos

### Separar "Vacaciones" del ScheduleType ✅
- [x] Modelo `VacationRequest` independiente
- [x] Servicio propio `vacations.service.ts`
- [x] Calendario propio en frontend

### Hacer que el calendario de Vacaciones llame a esa entidad ✅
- [x] `VacationCalendar` component que llama a endpoint de vacaciones
- [x] Muestra eventos del modelo `VacationRequest`

---

## Sesión: Refactor frontend — DataTable, SortableHeader, VacationTable (11 mayo 2026)

### Migrar a DataTable (3 páginas admin)
- [x] **HolidaysPage** — Migrada tabla manual a `<DataTable>`
- [x] **UsersPage** — Migrada tabla manual a `<DataTable>`
- [x] **NotificationsPage** — Migrada tabla manual a `<DataTable>`

### Renombrar EventTypesPage → ScheduleTypesPage
- [x] Renombrada página y ruta de `/admin/event-types` a `/admin/schedule-types`
- [x] Renombrado test `EventTypesPage.test.tsx` → `ScheduleTypesPage.test.tsx`

### Extraer SortableHeader + useSortable
- [x] Creado `common/SortableHeader.tsx` — componente compartido reemplaza `renderSortLabel` duplicado
- [x] Creado `hooks/useSortable.ts` — hook para manejo de estado de ordenación
- [x] Refactorizado `AuditTable.tsx` para usar ambos

### Separar VacationTable en smart + dumb
- [x] Movida toda la lógica de datos (queries, mutaciones, filtros, paginación) a `VacationsPage`
- [x] `VacationTable` ahora es dumb: solo recibe props y renderiza
- [x] Eliminado `VacationTableDumb.tsx` (ya no necesario)

### Tests añadidos
- [x] **ProfilePage.test.tsx** — Test de página de perfil
- [x] **hooks/useFieldValidation.test.tsx** — Test del hook de validación
- [x] **hooks/useInAppNotifications.test.tsx** — Test del hook de notificaciones
- [x] **hooks/useMyWeeklySummary.test.tsx** — Test del hook de resumen semanal
- [x] **hooks/useScheduleTypes.test.tsx** — Test del hook de tipos de turno
- [x] **hooks/useTeamWeeklySummaries.test.tsx** — Test del hook de resúmenes de equipo
- [x] **hooks/useVacations.test.tsx** — Test del hook de vacaciones

### Resultado
- **47 test files, 380 tests pasando** (0 fallos)
- **Linter frontend: 0 errores, 0 warnings**
- **TypeScript: 0 errores**

---

## Sesión: Corrección de errores de linter (9 mayo 2026)

- **SchedulePage.tsx**: Corregido bucle infinito de `useEffect`
- **ShiftPresetsPage.tsx**: Eliminada variable `emptyForm` no usada. Tipados `any` → `unknown`
- **NotificationPanel.tsx**: Eliminado import no usado
- **useFieldValidation.ts**: Eliminado parámetro `_e` no usado
- **useInAppNotifications.ts**: Movida llamada inicial a `fetchUnreadCount()` dentro de `setTimeout`
- **VacationTable.tsx**: Envuelta variable `vacations` en `useMemo`
- **Resultado**: Linter frontend: **0 errores, 0 warnings**.

---

## Sesión: Permisos y Renderizado Frontend vs BusinessLogic (11 mayo 2026)

### Arreglado
- [x] **HolidaysPage** - Guard de rol (admin/GM only, GM scoped)
- [x] **UsersPage** - Scope por rol (GM branch, DM department)
- [x] **UserActionMenu** - Restricciones por rol (DM solo ver/editar)
- [x] **UserFormModal** - Restricciones para DM (no cambiar role/branchId)
- [x] **VacationTable** - Ocultar columna acciones si no aplica
- [x] **SchedulePage** - Eliminar import no usado de LoadingSpinner
- [x] **HolidaysPage.test.tsx** - Mock de useAuthStore
- [x] **App.tsx** - Rutas: holidays y notifications accesibles para GM
- [x] **Sidebar.tsx** - GM ve Festivos y Notificaciones en el menú
- [x] **ShiftPresetsPage** - Migrada a DataTable + test creado (8 tests)
- [x] **BranchesPage** - `canCreate` basado en rol (solo admin)
- [x] **DepartmentsPage** - `canCreate` basado en rol (solo admin)
- [x] **SidebarList** - Prop `canCreate` para controlar botón "+" según rol

### Tests
- **31 test files, 271 tests pasando** (0 fallos)

---

## Sesión: Corrección de errores TypeScript y lint (11 mayo 2026)

### Arreglado
- [x] **schedules.service.ts** — Añadido `findScheduleById` al import
- [x] **schedules.service.ts** — Tipos explícitos en callbacks `.map()`
- [x] **schedules.service.ts** — Eliminado import no usado
- [x] **schedules.service.ts** — Employee ve todos los turnos de su branch (trabajo grupal)
- [x] **schedules.service.ts** — `listWeekSchedulesForActor` respeta `userId`
- [x] **ShiftPresetsPage.tsx** — Eliminado import no usado de `Column`
- [x] **ShiftPresetsPage.test.tsx** — Eliminada variable `mockAuthState` no usada
- [x] **ShiftPresetsPage.test.tsx** — Reemplazados `as any` por `as unknown as Record<string, string>`
- [x] **security-schedules.test.ts** — Tests actualizados

### Vulnerabilidades resueltas
- [x] **VUL-2**: `listWeekSchedulesForActor` corregido
- [x] **VUL-1**: Employee ve todos los turnos de su branch

---

## Sesiones anteriores

### Módulo: Roles y Permisos
- Creado `PERMISOS.md` con matriz de permisos centralizada por rol
- Creado permiso `branches:holidays:manage` para GM
- Creados permisos `shift_presets:read/create/update/delete`
- Restringido `schedule_types:create/update/delete` solo a admin
- Creado `assertUserScope()` genérico
- Añadido `validateDmUpdateRestrictions()`

### Módulo: Departamentos
- Corregido bug FIX-1: `branchIds` como campo directo a Prisma
- Corregido bug FIX-2: `branchId` involuntario al mover empleado
- Corregida relación `managerId` → `DepartmentManager`

### Módulo: Vacaciones
- Filtro `employeeId` opcional en `listVacations`
- `getVacationCalendar` con permisos por rol
- Transacciones atómicas con audit log
- Página `VacationsPage.tsx` completa

### Módulo: Schedules / Turnos
- Endpoint `GET /schedules/alerts`
- Componente `AlertsModal.tsx`
- Filtro `userId` en `listWeekSchedules`
- `WeeklyWorkSummary` con horas totales, base y extra
- Dashboard rediseñado con widgets

### Módulo: ShiftPresets (Nuevo)
- Modelo, backend completo, página admin

### Módulo: Webhooks
- Scope por departamento y sucursal

### Módulo: Frontend — Sanitización (VUL-8)
- Sistema completo de sanitización con 44 tests

### Base de datos
- Modelos: `VacationRequest`, `WeeklyWorkSummary`, `DepartmentManager`, `WebhookConfig`, `ShiftPreset`
- Enums: `HolidayType`, `VacationStatus`

### Frontend — Páginas nuevas
- `VacationsPage.tsx`, `ShiftPresetsPage.tsx`, `AlertsModal.tsx`

### Frontend — Migración a theme-aware
- 7 páginas admin migradas de colores navy a theme-aware

### Documentación
- Creados `DESIGN.md`, `BusinessLogic.md`, `PERMISOS.md`
