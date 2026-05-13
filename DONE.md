# DONE — Cambios Realizados

> Registro de cambios aplicados durante el desarrollo.
> **Última actualización:** 13 mayo 2026

---

## ✅ COMPLETADO — TODO 6.2: `UserFormModal` + alcance GM/DM (13 mayo 2026)

### Frontend — Usuarios
- [x] `UserFormModal`: helpers para sucursales visibles extra (sin duplicar sucursal base); copy admin vs GM; multiselect deshabilitado hasta elegir sucursal base; opciones extra filtradas por alcance del GM (`branchId` + `visibleBranches` del actor); DM solo lectura con listado desde el usuario; `PATCH` sin `visibleBranchIds` para DM.
- [x] `UsersPage`: modal de usuario para GM; botón **Nuevo Usuario** para admin y GM (CSV solo admin).
- [x] `UserActionMenu`: **Editar** también para `general_manager`.

### Tests
- [x] `test/pages/admin/UserFormModal.test.tsx`: DM guarda sin enviar `visibleBranchIds` y muestra sucursales extra en solo lectura.

---

## ✅ COMPLETADO — TODO 6 / 6.1: visibleBranchIds, scope tests y colindante UX (13 mayo 2026)

### Documentación
- [x] `PERMISOS.md`: sección `visibleBranchIds` (visibilidad vs mutación), excepción admin/GM, y política de creación de vacaciones solo para el actor autenticado. Ajuste texto de cancelación employee (`pending` / `colindante`).

### Tests backend
- [x] `vacations.service.scope.test.ts`: GM sin `visibleBranchIds` extra, DM con branch fuera de alcance, employee sin `read-all` solo `employeeId`.

### Frontend
- [x] `VacationStatusBadge`: `title` en estado `colindante`.
- [x] `VacationsPage`: etiqueta de filtro alineada con el significado de negocio.
- [x] `VacationRequestModal`: textos y toasts alineados con la definición de `colindante`.

---

## ✅ COMPLETADO — Tests integración notificaciones + verificación Planning en Sidebar (13 mayo 2026)

### Frontend
- [x] `useInAppNotifications`: lectura de lista alineada con `sendPaginated` (`data` + `pagination`), corrige bandeja vacía frente al backend real.

### Tests
- [x] Backend: `test/in-app-notifications.router.test.ts` — rutas GET/PATCH/POST/DELETE con auth mock.
- [x] Frontend: `TopBar.test.tsx` — mock completo del hook + click en **Actualizar** llama `refreshNotifications`.

### Planning (documentación en TODO)
- [x] Comportamiento actual del menú verificado en código: GM/DM ven Planificación en bloque administración (subconjunto); admin ve todos los ítems.

---

## ✅ COMPLETADO — Notificaciones in-app: delete + realtime (13 mayo 2026)

### Backend — In-App Notifications
- [x] Añadido endpoint `DELETE /api/in-app-notifications/:id` para eliminar notificaciones propias.
- [x] Añadida función `deleteNotification()` en servicio con borrado scopeado por `userId`.
- [x] Publicación de evento realtime `notification.changed` en create/read/delete de notificaciones in-app.
- [x] Extendido contrato realtime (`events.ts`) para soportar entidad `notification`.

### Frontend — Bandeja de notificaciones
- [x] Añadido botón de eliminar por notificación en `NotificationPanel`.
- [x] Añadidos controles de paridad UX (como referencia `schedule-app`): `Borrar todo` + `Actualizar`.
- [x] `useInAppNotifications` ahora soporta `deleteNotification()`.
- [x] `useInAppNotifications` ahora soporta `deleteAllNotifications()` y `refreshNotifications()`.
- [x] `useInAppNotifications` escucha `notification.changed` y refresca contador/lista en tiempo real para el usuario afectado.
- [x] `TopBar` cableado para exponer acción de delete desde la UI.

### Preferencias Planning/Support
- [x] Las notificaciones de solicitudes de apoyo (crear/revisar) ahora respetan `scheduleChanges` y `criticalAlertsOnly`.
- [x] Las notificaciones in-app de cambios en turnos (create/update/delete) ahora respetan preferencias del usuario (`scheduleChanges`, `criticalAlertsOnly`).

### Tests
- [x] Backend: actualizado `in-app-notifications.service.test.ts` para cubrir eliminación.
- [x] Backend: actualizado `realtime/socket.test.ts` para validar `notification.changed`.
- [x] Frontend: actualizado `useInAppNotifications.test.tsx` para cubrir `deleteNotification`.

---

## ✅ COMPLETADO — Vacations scope + búsqueda + cancelación employee (13 mayo 2026)

### Backend — Vacaciones
- [x] Corregida cancelación de employee para permitir estados `pending` y `colindante`.
- [x] Mantenida separación de permisos:
  - sin `vacations:approve`: solo cancelar propias;
  - con `vacations:approve`: cancelar en su scope de gestión.
- [x] Añadido soporte de `visibleBranchIds` en consultas de vacaciones:
  - `listVacations` (scope de lectura por sucursales visibles),
  - `getVacationCalendar` (scope por sucursal visible e invalidación de branch fuera de scope).
- [x] Añadido filtro `search` en backend para listado de vacaciones (`name`, `email`, `employeeId`).

### Frontend — Vacaciones
- [x] Corregido `useVacationsList` para enviar `search` correctamente (antes se enviaba como `employeeId`).

### Tests
- [x] Añadidos/ajustados tests:
  - `vacations.service.cancel.test.ts` (incluye caso `colindante`),
  - `vacations.service.scope.test.ts` (scope visible + branch fuera de scope + search),
  - `vacations.http.schemas.test.ts` (acepta `search`).

---

## ✅ COMPLETADO — Scope multi-branch + permisos + validación integral (13 mayo 2026)

### Backend — Scope y permisos
- [x] Alineado scope de schedules con `visibleBranchIds` para lectura en:
  - `listSchedulesForActor`,
  - `listWeekSchedulesForActor`,
  - `getScheduleByIdForActor`.
- [x] Aplicada regla de calendario no-admin por sucursal activa única (sin mezcla por defecto).
- [x] Alineados permisos de usuarios/schedules con política intranet (`users:view`, `schedules:view`) y tests de router/seguridad.
- [x] Eliminada función muerta en schedules (`listWeekSchedulesByBranches`) para dejar lint limpio.

### Frontend — Calendario por sucursal en no-admin
- [x] `SchedulePage` actualizado para trabajar con sucursales visibles (`branchId + visibleBranches`) sin vista global en no-admin.
- [x] `ScheduleSidebar` y `BranchSelector` adaptados para:
  - selector por sucursal visible en no-admin multi-branch,
  - una sola sucursal activa en no-admin single-branch,
  - opción global solo para admin.
- [x] Añadidos/actualizados tests de `SchedulePage` para branch-switching no-admin.
- [x] Corregido lint React (`set-state-in-effect`) removiendo `setState` síncrono dentro de `useEffect`.

### Validación
- [x] Backend: suites en verde (51/51).
- [x] Frontend: typecheck/lint/tests/build alineados tras fix de `SchedulePage`.

---

## ✅ COMPLETADO — Auditoría integral post-merge (13 mayo 2026)

### Verificación de estado real (rama + documentación)
- [x] Revisado estado de rama `feature/rodrigo-core-migration` tras resolución de conflictos.
- [x] Consolidado backlog técnico en `restaurar_schedule/TODO.md` con prioridades P0-P3.
- [x] Incluidos hallazgos de seguridad, permisos, arquitectura y paridad con `schedule-app`.

### Hallazgos incorporados como trabajo pendiente
- [x] Detectadas y documentadas rutas con hardening pendiente (`users/:id`, `users/:id/schedules`, `schedules/week`).
- [x] Detectada y documentada inconsistencia de cancelación de vacaciones para employee.
- [x] Detectados y documentados gaps de paridad funcional (notifications/vacations/planning/navegación).

### Documentación técnica sincronizada
- [x] `PERMISOS.md` actualizado a permisos canónicos actuales (incluyendo `webhooks:manage`, `skills:*`, `shift_presets:*`).
- [x] `BusinessLogic.md` actualizado para reflejar estado real (vulnerabilidades cerradas vs pendientes).
- [x] Actualizados contratos `API.md` relevantes (`roles`, `users`, `schedules`, `webhooks`, `notifications`).
- [x] OpenAPI estático actualizado en `backend/src/docs/openapi.ts` con cobertura de módulos activos y endpoints clave de planning/skills/users.

### Roadmap siguiente fase
- [x] Creado `restaurar_schedule/PROXIMO.md` con plan ordenado por fases para:
  - cierre de paridad con `schedule-app`,
  - evolución a módulo de ausencias unificado,
  - feature de cumpleaños (solicitable con ventana ±7 días, confetti y reglas de negocio).

### Decisión de retiro del repo legado
- [x] Definidos criterios de salida para poder eliminar `schedule-app` con seguridad (paridad funcional, validación end-to-end y docs sincronizadas).

---

## ✅ COMPLETADO — Cierre Skills + Planning (13 mayo 2026)

### Estado de rama y base previa
- [x] Confirmada rama limpia y adelantada con 4 commits base del vertical:
  - `Add skills and planning data models`
  - `Add skills backend module`
  - `Expand planning backend endpoints`
  - `Connect planning dashboard UI`
- [x] Confirmado estado de Planning y Skills en `restaurar_schedule` antes del cierre.

### Skills — Frontend y navegación
- [x] Creada página admin `SkillsPage` en `restaurar_schedule/frontend/src/pages/admin/SkillsPage.tsx`.
- [x] Integrada ruta `/admin/skills` en `App.tsx`.
- [x] Añadidos accesos en navegación lateral y móvil.
- [x] Añadida metadata de página en `frontend/src/config/pageMeta.ts`.

### Users — Integración skills + sucursales visibles
- [x] Extendidos schemas/servicio de usuarios para `skillIds` y `visibleBranchIds`.
- [x] Extendidos selects para devolver `skills` y `visibleBranches`.
- [x] Actualizados tipos frontend para reflejar nuevos campos de usuario.
- [x] Actualizado `UserFormModal` para asignar skills y sucursales visibles.

### Planning — Paridad de endpoints y side effects
- [x] Añadidos endpoints auxiliares:
  - `GET /planning/vacation-impact`
  - `GET /planning/comments`
  - `POST /planning/comments`
- [x] Reutilizado `EntityComment` existente en Prisma (sin cambios de modelo).
- [x] Añadido audit log en:
  - `createSupportRequest`
  - `reviewSupportRequest`
  - `updateNotificationPreferences`
- [x] Añadidas notificaciones in-app para soporte y revisiones.
- [x] Normalizados mensajes de error con acentos (`Parámetros inválidos`, `Datos inválidos`).

### Tests y validación
- [x] Ampliados tests backend para planning y users relacionados con el cierre.
- [x] Añadidos smoke tests frontend para `PlanningPage`, `SkillsPage` y `UserFormModal`.
- [x] Validaciones ejecutadas:
  - Backend: `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`
  - Frontend: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`

### Ajuste final post-validación (13 mayo 2026)
- [x] Corregidos tests backend que fallaban tras el cierre de Skills + Planning:
  - `planning.availability.test.ts`
  - `planning.availability-matrix.test.ts`
  - `planning.router.test.ts`
  - `users.test.ts`
  - `users.import.test.ts`
- [x] Ajustados mocks transaccionales de tests para incluir `userVisibleBranch` y `userSkill`.
- [x] Re-ejecutada validación completa backend con resultado verde:
  - `npm run test` → **41/41 suites passing**
  - `npm run lint` → OK
  - `npm run build` → OK

### Pendientes reales
- [ ] Push y creación de PR (no ejecutado en esta sesión).

---

## ✅ COMPLETADO — Limpieza TODO y cierre de roadmap técnico (12 mayo 2026)

### Backend — Controllers y errores normalizados
- [x] `schedule-types.controller.ts` ya distingue `AppError` de errores inesperados y responde 500 para fallos no operacionales.
- [x] `shift-presets.controller.ts` usa `safeParse()` en create/update y maneja `isAppError`.
- [x] `roles.controller.ts` valida create/update con Zod (`safeParse`) y maneja `isAppError`.
- [x] `users.controller.ts` envuelve `listUsersController` con try/catch y devuelve `AppError` con status real.
- [x] `departments.controller.ts` usa mensajes con acentos: "Parámetros inválidos" y "Datos inválidos".

### Backend — Settings, auditoría y rollback
- [x] `settings.router.ts` queda separado en router + controller + service.
- [x] Settings usa `logAuditOrThrow` dentro del flujo transaccional de auditoría.
- [x] Subidas de favicon limpian el archivo anterior con borrado seguro cuando cambia la URL.
- [x] `rollbackAudit()` soporta entidades adicionales: `VacationRequest`, `ShiftPreset`, `ScheduleType`, `Role`, `ThemeSettings`, `ThemePreset` y `SiteSettings`.

### Backend — Features y documentación
- [x] El resumen semanal descuenta vacaciones aprobadas y recalcula al aprobar/cancelar.
- [x] Al crear schedules se notifica al empleado asignado mediante notificación in-app, además del webhook.
- [x] Añadido endpoint público `GET /health` y alias `GET /api/health`.
- [x] Añadido endpoint `GET /api/docs/openapi.json` con especificación OpenAPI estática.
- [x] Los envíos manuales de notificaciones aceptan `webhookConfigIds`, incluido `[]` como "no enviar a ningún webhook".

### Frontend — Notificaciones y DataTable
- [x] `NotificationsPage.tsx` permite filtrar envíos manuales por todos, sucursal, departamento o webhook específico.
- [x] Los selects dependientes se limpian al cambiar scope/sucursal/departamento.
- [x] El selector de departamentos se filtra por sucursal y el selector de webhook específico respeta sucursal/departamento.
- [x] Verificado el uso de `DataTable` en vistas tabulares.
- [x] Criterio actualizado: `DataTable` se configura desde páginas padre con columnas/datos/acciones; no se mantienen wrappers por cada tabla.
- [x] Eliminados wrappers tabulares muertos o innecesarios (`AuditTable`, `VacationTable`, `UsersTable`, `VacationFilters`).

### Tests y validación
- [x] Tests añadidos/actualizados para weekly summary con vacaciones.
- [x] Tests añadidos/actualizados para health check y OpenAPI.
- [x] Tests añadidos/actualizados para filtros de webhooks en notificaciones.
- [x] Tests añadidos/actualizados para rollback de entidades adicionales.
- [x] Tests de seguridad actualizados para la regla vigente de schedules: employee ve calendario completo de su branch.
- [x] Validación frontend completa ejecutada tras el refactor de `DataTable`: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.

---

## ✅ COMPLETADO — Bugs #6 y #7: Fechas incorrectas en ShiftModal (12 mayo 2026)

### Bug #6: Rango de fechas incorrecto en shift+clic
- [x] **Causa raíz**: `buildDateRange` usaba `cursor.setDate(cursor.getDate() + 1)` sobre fechas UTC. `setDate()` opera en zona horaria local (Atlantic/Canary = UTC+1), provocando que el cursor se desplazara a las 23:00 UTC del día anterior en lugar de 00:00 UTC del día siguiente. Esto causaba duplicación del primer día y omisión del último.
- [x] **Fix**: Cambiados a `setUTCDate`/`getUTCDate` en `buildDateRange`, `isNextDay` y `buildChunkRange` en `shiftScheduling.ts` para mantener consistencia UTC.

### Bug #7: Fecha fin incorrecta al crear turno desde el calendario
- [x] **Causa raíz**: FullCalendar proporciona `DateSelectArg.end` como fecha **exclusiva** (el día después de la selección). Al seleccionar un solo día (ej. 20 de mayo), `info.end = 21 de mayo`. Este valor se pasaba directamente a `buildDateRange`, que incluía ambos extremos, resultando en 2 días en lugar de 1.
- [x] **Fix**: En `SchedulePage.tsx`, tanto en `handleDateSelect` como en `handleConfirmHolidaySchedule`, se resta un día a `info.end` antes de pasarlo como `defaultEnd` al modal.

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

## ✅ COMPLETADO — Pie informativo timezone en SchedulePage (12 mayo 2026)

- [x] **SchedulePage.tsx** — `timeZone` de FullCalendar cambia de `undefined` a `'UTC'` cuando admin ve "Todas las sucursales"
- [x] **Pie informativo** — Nuevo párrafo visible solo para admin en vista global: "Los turnos se muestran en UTC. Cada sucursal tiene su propia franja horaria: Madrid (Europe/Madrid), Santa Cruz (Atlantic/Canary). Al seleccionar una sucursal en el panel lateral, el calendario se ajusta a su zona horaria."

---

## ✅ COMPLETADO — FASE 0: Timezone end-to-end turnos/calendario (12 mayo 2026)

### Backend — Notificaciones con timezone de sucursal
- [x] `notifications.templates.ts` — `formatScheduleChange`/`formatVacationChange` aceptan `branchTimezone` opcional y formatean con `Intl.DateTimeFormat('es-ES', { timeZone: branchTimezone, ... })`
- [x] `notifications.service.ts` — `ScheduleChangeParams`/`VacationChangeParams` incluyen `branchTimezone?: string`
- [x] `schedules.service.ts` — pasa `branchTimezone` a `notifyScheduleChange` y formatea notifs in-app con `toLocaleDateString('es-ES', { timeZone: branchTimezone })`
- [x] `vacations.service.ts` — pasa `branchTimezone` a `notifyVacationChange` y formatea notifs in-app con `toLocaleDateString('es-ES', { timeZone: branchTimezone })`

### Frontend — Timezone helpers corregidos
- [x] `timezone.ts` — corregido `timezoneToUtc` (bug: offset siempre 0ms porque ambas variables usaban `localStr + 'Z'`). Reescalado con `Intl.DateTimeFormat` para calcular offset real.
- [x] `shiftScheduling.ts` — `buildDateTime`/`buildChunkRange` aceptan `branchTimezone` opcional. Si se proporciona, convierten hora local de sucursal a UTC correctamente.
- [x] `ShiftModal.tsx` — crea `branchTimezoneById` desde `branches` query, lo pasa a `buildDateTime`/`buildChunkRange`, y envía fechas en UTC desde timezone de sucursal.

### Frontend — Calendario con timezone
- [x] `SchedulePage.tsx` — `timeZone={effectiveActiveBranchId ? branchTimezoneById[effectiveActiveBranchId] : undefined}` en FullCalendar
- [x] `CalendarEventContent.tsx` — ya usa `branchTimezone` de `extendedProps` (verificado)

### Frontend — BranchForm con timezone select
- [x] `BranchForm.tsx` — timezone como `<select>` con opciones `Europe/Madrid` y `Atlantic/Canary`
- [x] `BranchesPage.test.tsx` — test añadido: verifica que el select existe, contiene ambas opciones, valor por defecto y cambio

### Validación
- [x] `npm run typecheck` — backend + frontend sin errores
- [x] `npm run test` backend — 32/37 pass (5 fallos preexistentes por falta de `.env` en tests que cargan `jwt.ts`/`socket.ts`)
- [x] `npm run test` frontend — 37/37 pass, 488 tests

## ✅ COMPLETADO — NotificationsPage: ScopeSelector con flex-col (12 mayo 2026)

- [x] Las 3 cards del grid ahora usan `flex flex-col` para mantener alturas consistentes
- [x] El ScopeSelector con botones + selects condicionales ya no desalinea las cards

---

## ✅ COMPLETADO — Checklist de Permisos vs Implementación verificado (12 mayo 2026)

### General Manager
- [x] GM puede gestionar festivos de su branch (`branches:holidays:manage`)
- [x] GM NO puede crear/editar/eliminar schedule types (solo lectura)
- [x] GM NO puede gestionar webhooks
- [x] GM ve notificaciones (`notifications:view`)

### Department Manager
- [x] DM solo edita usuarios de su depto (nombre, email, teléfono)
- [x] DM NO puede cambiar branchId ni role (`validateDmUpdateRestrictions`)
- [x] DM NO puede crear/eliminar usuarios
- [x] DM NO puede gestionar branches, settings, webhooks
- [x] DM NO ve notificaciones (`notifications:view` = ❌)

### Employee
- [x] Employee solo ve turnos donde está asignado (VUL-1, VUL-2 corregidos)
- [x] Employee solo cancela vacaciones propias en estado `pending`
- [x] Employee no tiene acceso a webhooks, settings, audit

---

## ✅ COMPLETADO — VUL-4: Rate limiting en login (12 mayo 2026)

- [x] **VUL-4**: Añadido rate limiting a POST /api/auth/login
  - Creado `auth.rate-limit.ts` con keyGenerator por identifier/email (normalizado a minúsculas)
  - Fallback IPv6 usando `ipKeyGenerator` de express-rate-limit
  - `skipSuccessfulRequests: true` (logins exitosos no descuentan cuota)
  - Ventana de 15 min, máximo 10 intentos por identidad
  - Respuesta 429 con código `TOO_MANY_REQUESTS`
  - Conectado en `auth.router.ts` antes de `loginController`
  - Refactor `response.ts`: `sendError` acepta `code` opcional, `sendSuccess` acepta `statusCode`
- [x] **Tests**: 6 tests (límite, bloqueo, aislamiento por identifier, email fallback, case-insensitive, no afecta otros endpoints) — 6/6 pasando

## ✅ COMPLETADO — Prioridad 1 (Crítico / Seguridad)

- [x] **VUL-3**: Endpoint `GET /schedules` migrado a `listSchedulesForActor`
- [x] **VUL-4**: Rate limiting en login (ver sección arriba)
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
