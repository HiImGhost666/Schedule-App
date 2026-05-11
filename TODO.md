# TODO — Pendientes

> **Última actualización:** 11 mayo 2026
> Basado en `BusinessLogic.md`, `PERMISOS.md` y análisis de renderizado frontend.

---

## 🔴 CRÍTICO — Permisos en Rutas (Frontend)

### 1. DashboardPage — ¿Muestra datos según rol?
- **Según PERMISOS.md**: Employee solo ve su resumen semanal, GM/DM ven equipo
- **Pendiente**: Verificar que DashboardPage oculte widgets según rol

### 2. ProfilePage — ¿Muestra opciones según rol?
- **Según BusinessLogic.md**: Employee no puede cambiar su rol/estado
- **Pendiente**: Verificar que ProfilePage respete restricciones

---

## 🟡 Backend — Vulnerabilidades (de BusinessLogic.md)

### Críticas
- [ ] **VUL-4**: Rate limiting en login (`express-rate-limit`)
- [ ] **VUL-2**: `listWeekSchedulesForActor` para employee pasa `actor.branchId` como `userId`

### Medias
- [ ] **VUL-1**: Employee puede ver schedules de otros empleados si pasa `userId` en query params
- [ ] **VUL-3**: Endpoint `GET /schedules` (sin actor) usa `listSchedules` sin restricción de rol
- [ ] **VUL-6**: Validar assigneeIds antes de crear schedule
- [ ] **VUL-8**: Sanitización de HTML en campos de texto

### Bajas
- [ ] **VUL-9**: Invalidar tokens JWT al cambiar contraseña (tokenVersion)
- [ ] **VUL-10**: Límite de sesiones concurrentes

---

## 📋 Migrar a DataTable (3 páginas con tablas manuales)

- [ ] **HolidaysPage** — Migrar tabla manual a `<DataTable>`
- [ ] **UsersPage** — Migrar tabla manual a `<DataTable>`
- [ ] **NotificationsPage** — Migrar tabla manual a `<DataTable>`

---

## 📋 Refactor de Componentes (DESIGN.md)

### Componentes que podrían ser Dumb (recibir datos por props en vez de hooks)

| Componente | Problema | Solución |
|---|---|---|
| `TypeLegend.tsx` | Usa `useScheduleTypes()` internamente | Recibir `scheduleTypes` como prop |
| `VacationTable.tsx` | Mezcla queries, permisos y renderizado | Separar en smart (datos) + dumb (tabla) |
| `BranchList.tsx` | Lógica de filtrado/orden inline | Podría ser dumb puro |
| `DepartmentList.tsx` | Lógica de filtrado/orden inline | Podría ser dumb puro |

### Componentes duplicados que podrían unificarse

| Componentes | Similitud | Propuesta |
|---|---|---|
| `BranchList.tsx` + `DepartmentList.tsx` | ~90% idénticos | Crear `SidebarList.tsx` genérico |
| `UsersTable.tsx` + `AuditTable.tsx` | Patrón de ordenación similar | Extraer hook `useSortable` |
| `BranchForm.tsx` + `DepartmentForm.tsx` | Formularios similares | Mantener separados (diferentes campos) |

### TypeLegend.tsx — Análisis
- **NO está huérfano**: Se usa en `ScheduleSidebar.tsx` línea 38
- **Problema**: Es smart component (usa hook) cuando debería ser dumb
- **Fix**: Pasar `scheduleTypes` como prop desde ScheduleSidebar → SchedulePage

---

## 🧪 Tests Pendientes (de BusinessLogic.md sec 6.3)

- [ ] Test de seguridad: employee no puede ver schedules de otros empleados
- [ ] Test de integración: schedules con roles (admin, GM, DM, employee)
- [ ] Test de scope: GM no puede ver schedules de otra branch
- [ ] Test de vacaciones: DM no puede aprobar vacaciones de otro departamento

---

## 📋 Frontend — Mejoras UX Pendientes

- [ ] Mensaje claro cuando employee no tiene sucursal asignada (SchedulePage vacía)
- [ ] Notificaciones push para eventos de vacaciones (aprobación/rechazo)
- [ ] Indicador de carga en todas las páginas (skeleton loaders)
- [ ] Manejo de error 403 con mensaje descriptivo
- [ ] Confirmación antes de crear schedule en día festivo (verificar frontend)
