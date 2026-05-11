# TODO — Pendientes

> **Última actualización:** 11 mayo 2026
> Basado en `BusinessLogic.md`, `PERMISOS.md` y análisis de renderizado frontend.

---

## 🔴 PRIORIDAD 1 — Crítico / Seguridad

### Backend
- [x] **VUL-3**: Endpoint `GET /schedules` (sin actor) usa `listSchedules` sin restricción de rol — migrar a `listSchedulesForActor`
- [x] **VUL-6**: Validar assigneeIds antes de crear schedule (verificar que existan en BD)
- [x] **VUL-8**: Sanitización de HTML en campos de texto (name, notes, etc.) — backend debe sanitizar al guardar

### Frontend
- [x] **DashboardPage** — Verificar que oculte widgets según rol (employee solo ve su resumen semanal)
- [x] **ProfilePage** — Verificar que employee no pueda cambiar su rol/estado

---

## 🟡 PRIORIDAD 2 — Tests

- [x] Test de integración: schedules con roles (admin, GM, DM, employee)
- [x] Test de scope: GM no puede ver schedules de otra branch
- [x] Test de vacaciones: DM no puede aprobar vacaciones de otro departamento

### Backend — Tests faltantes
- [x] **users.router.test.ts** — Test de integración del router de usuarios (CRUD, permisos)
- [x] **auth.router.test.ts** — Test de integración del router de auth (login, refresh, me)
- [x] **middleware.test.ts** — Tests unitarios para auth.middleware, permission.middleware, errorHandler.middleware
- [x] **schedules.http.schemas.test.ts** — Tests de validación de schemas de schedules
- [x] **vacations.http.schemas.test.ts** — Tests de validación de schemas de vacaciones
- [x] **users.http.schemas.test.ts** — Tests de validación de schemas de usuarios
- [x] **branches.http.schemas.test.ts** — Tests de validación de schemas de sucursales
- [x] **departments.http.schemas.test.ts** — Tests de validación de schemas de departamentos
- [x] **app-error.test.ts** — Tests de common/errors/app-error.ts
- [x] **realtime/socket.test.ts** — Tests de WebSocket / eventos en tiempo real

### Frontend — Tests faltantes
- [x] **ProfilePage.test.tsx** — Test de página de perfil
- [x] **EventTypesPage.test.tsx** — Verificar test existente o completar
- [x] **hooks/useFieldValidation.test.tsx** — Test del hook de validación
- [x] **hooks/useInAppNotifications.test.tsx** — Test del hook de notificaciones
- [x] **hooks/useMyWeeklySummary.test.tsx** — Test del hook de resumen semanal
- [x] **hooks/useScheduleTypes.test.tsx** — Test del hook de tipos de turno
- [x] **hooks/useTeamWeeklySummaries.test.tsx** — Test del hook de resúmenes de equipo
- [x] **hooks/useVacations.test.tsx** — Test del hook de vacaciones
- [x] **lib/api-client.test.ts** — Test del cliente API
- [x] **components/common/DataTable.test.tsx** — Test del componente DataTable
- [x] **components/common/FilterTable.test.tsx** — Test del componente FilterTable
- [x] **components/common/LoadingSpinner.test.tsx** — Test del componente LoadingSpinner
- [x] **components/common/Skeleton.test.tsx** — Test de componentes Skeleton
- [x] **components/common/ForbiddenPage.test.tsx** — Test del componente ForbiddenPage (error 403)
- [x] **components/common/NotificationPanel.test.tsx** — Test del panel de notificaciones
- [x] **components/layout/MobileNav.test.tsx** — Test de navegación móvil
- [x] **components/layout/TopBar.test.tsx** — Test de barra superior

---

## 🟢 PRIORIDAD 3 — Refactor / Migraciones

### Migrar a DataTable (3 páginas con tablas manuales)
- [ ] **HolidaysPage** — Migrar tabla manual a `<DataTable>`
- [ ] **UsersPage** — Migrar tabla manual a `<DataTable>`
- [ ] **NotificationsPage** — Migrar tabla manual a `<DataTable>`

### Refactor de Componentes (DESIGN.md)
- [ ] **TypeLegend.tsx** — Pasar `scheduleTypes` como prop en vez de usar hook internamente
- [ ] **VacationTable.tsx** — Separar en smart (datos) + dumb (tabla)
- [ ] **BranchList.tsx + DepartmentList.tsx** — Unificar en `SidebarList.tsx` genérico (~90% idénticos)
- [ ] **UsersTable.tsx + AuditTable.tsx** — Extraer hook `useSortable` (patrón de ordenación similar)

---

## 🔵 PRIORIDAD 4 — Mejoras UX

- [ ] Mensaje claro cuando employee no tiene sucursal asignada (SchedulePage vacía)
- [ ] Notificaciones push para eventos de vacaciones (aprobación/rechazo)
- [ ] Indicador de carga en todas las páginas (skeleton loaders)
- [ ] Manejo de error 403 con mensaje descriptivo (no solo "No autorizado")
- [ ] Confirmación antes de crear schedule en día festivo (verificar frontend)

---

## ⚪ PRIORIDAD 5 — Futuro / Features

- [ ] **Filtro "Mis turnos" en SchedulePage**: Añadir toggle/checkbox para que employee pueda filtrar el calendario y ver solo sus propios turnos (pasa `userId` a `/schedules/week/...` y `/schedules`)
- [ ] **Filtro por usuario en SchedulePage**: Permitir a admin/GM/DM filtrar el calendario por un usuario específico
- [ ] **VUL-9**: Invalidar tokens JWT al cambiar contraseña (tokenVersion en BD)
- [ ] **VUL-10**: Límite de sesiones concurrentes por usuario
- [ ] Logout endpoint (invalidar token JWT)
- [ ] Notificar al empleado cuando se aprueba/rechaza su solicitud de vacaciones
- [ ] Endpoint de health check para monitoreo
- [ ] Documentación OpenAPI/Swagger de la API REST
