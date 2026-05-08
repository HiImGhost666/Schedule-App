# TODO - Issues Pendientes por Resolver

> Organizado por dominio/módulo. Cada tarea especifica archivo, problema y solución propuesta.
> **Actualizado tras revisión de código fuente (8 mayo 2026).**

---

> **📋 Matriz de permisos completa en [`PERMISOS.md`](./PERMISOS.md)**
> **✅ Cambios ya realizados en [`DONE.md`](./DONE.md)**
> **🔐 `assertUserScope(actorId, targetScope)` — función genérica de validación por rol (admin, general_manager, department_manager, employee). Ver `DONE.md` para detalles.**

---

## 🔴 Alta Prioridad

### [AL-1] Tarde descubierta / Turno solitario — Alertas visuales automáticas
- **Problema**: No hay alertas visuales cuando un turno no tiene personal asignado o solo hay un técnico trabajando.
- **Severidad**: 🔴 Alta
- **Solución**: Sistema de detección de turnos sin personal o con personal único. Alertas visuales en Dashboard/Calendario. Backend endpoint que analice schedules próximos y devuelva alertas. Frontend widget/badge que muestre las alertas.

### [AL-2] Notificaciones de vacaciones rotas — sendMondayVacationSummary busca en tabla Schedule
- **Archivo**: `backend/src/modules/notifications/notifications.scheduler.ts` (líneas 87-101)
- **Problema**: `sendMondayVacationSummary` busca schedules con `scheduleType.value === 'vacaciones'`, pero ahora las vacaciones son entidad `VacationRequest`, no `Schedule`.
- **Severidad**: 🔴 Alta
- **Solución**: Cambiar la query para que busque en `VacationRequest` con `status === 'approved'` en vez de en `Schedule`.

### [AL-3] Dashboard → Evento específico no abre popup en el calendario
- **Archivo**: `frontend/src/pages/DashboardPage.tsx`, `frontend/src/pages/SchedulePage.tsx`
- **Problema**: Al hacer clic en un evento desde Dashboard, navega a `/schedule` con `state: { initialView, initialDate }` pero NO abre el popup de detalle automáticamente. Falta pasar el `scheduleId`.
- **Severidad**: 🔴 Alta
- **Solución**: Pasar `scheduleId` en el state de navegación desde Dashboard. En SchedulePage, detectar el `scheduleId` y abrir el popup automáticamente.

---

## 📦 Módulo: Schedule Types (Tipos de Turno)

### [ST-2] 🟡 BACKEND: Schedule-types router no delega en un controller
- **Archivo**: `backend/src/modules/schedule-types/schedule-types.router.ts`
- **Problema**: La lógica de los handlers está inline en el router, no hay un archivo `schedule-types.controller.ts`.
- **Severidad**: 🟡 Media — inconsistencia arquitectónica con el resto de módulos.
- **Solución**: Extraer la lógica de cada handler a un controller separado.

---

## 📦 Módulo: Branches (Sucursales)

### [BR-3] 🟡 BACKEND: Branch holidays CRUD requiere `branches:manage` — solo admin
- **Archivo**: `backend/src/modules/branches/branches.router.ts` (líneas 29-33)
- **Problema**: Los festivos de sucursal requieren `branches:manage` (solo admin). Un `general_manager` debería poder gestionar los festivos de SU sucursal.
- **Severidad**: 🟡 Media
- **Solución**: Crear permiso `branches:holidays:manage` y asignarlo a `general_manager`, o modificar la lógica del servicio para que un GM solo pueda gestionar festivos de su branch.

---

## 📦 Módulo: Users (Usuarios)

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

## 📦 Módulo: Settings / Theme / Webhooks / Notifications

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

## 📦 Módulo: Shift Presets (Turnos Preconfigurados)

### [SP-1] 🟡 Convertir presets hardcodeados en entidad ShiftPreset
- **Archivo**: `frontend/src/components/schedule/ShiftModal.tsx` (líneas 51-55)
- **Problema**: `SHIFT_PRESETS` están hardcodeados en el frontend (morning, evening, night). No son configurables por el usuario.
- **Severidad**: 🟡 Media
- **Solución**: Crear entidad `ShiftPreset` en Prisma, CRUD en backend, página de gestión en admin, reemplazar hardcode por llamada API.

---

## 📦 Módulo: Calendario de Turnos

### [CA-1] 🟡 Eliminar tipo "Vacaciones" del Calendario Turnos
- **Problema**: Las vacaciones ya no se crean como `Schedule` con type='vacaciones' (son `VacationRequest`), pero puede haber schedules antiguos con ese type en BD. El calendario de turnos podría mostrarlos.
- **Severidad**: 🟡 Media
- **Solución**: Asegurar que el calendario de turnos (`SchedulePage`) filtre schedules con type='vacaciones'. Opcionalmente migrar datos antiguos.

---

## 📋 Resumen por Prioridad

### 🔴 Alta
1. **[AL-1]** Tarde descubierta / Turno solitario — Alertas visuales
2. **[AL-2]** Notificaciones de vacaciones rotas (scheduler busca en tabla equivocada)
3. **[AL-3]** Dashboard → Evento específico no abre popup en calendario

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
15. **[SP-1]** Turnos preconfigurados como plantillas (entidad ShiftPreset)
16. **[CA-1]** Eliminar tipo "Vacaciones" del Calendario Turnos

### 🟢 Baja
17. **[US-4]** UserDetailsModal sin fallback departments array
18. **[EV-2]** EventTypesPage usa confirm() nativo
19. **[EV-3]** EventTypesPage usa default export
