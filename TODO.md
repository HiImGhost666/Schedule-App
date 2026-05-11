# TODO — Pendientes

> **Última actualización:** 11 mayo 2026
> Basado en `BusinessLogic.md`, `PERMISOS.md` y análisis de renderizado frontend.

---

## 🔴 PRIORIDAD 1 — Crítico / Seguridad

### Backend
- [x] **VUL-3**: Endpoint `GET /schedules` (sin actor) usa `listSchedules` sin restricción de rol — migrar a `listSchedulesForActor`
- [ ] **VUL-6**: Validar assigneeIds antes de crear schedule (verificar que existan en BD)
- [ ] **VUL-8**: Sanitización de HTML en campos de texto (name, notes, etc.) — backend debe sanitizar al guardar

### Frontend
- [ ] **DashboardPage** — Verificar que oculte widgets según rol (employee solo ve su resumen semanal)
- [ ] **ProfilePage** — Verificar que employee no pueda cambiar su rol/estado

---

## 🟡 PRIORIDAD 2 — Tests

- [ ] Test de integración: schedules con roles (admin, GM, DM, employee)
- [ ] Test de scope: GM no puede ver schedules de otra branch
- [ ] Test de vacaciones: DM no puede aprobar vacaciones de otro departamento

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
