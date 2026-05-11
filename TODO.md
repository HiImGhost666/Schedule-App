# TODO — Pendientes

> **Última actualización:** 11 mayo 2026
> Basado en `BusinessLogic.md`, `PERMISOS.md`, `DESIGN.md`, análisis de código fuente y lista de features pendientes.

---

## 🔴 PRIORIDAD 1 — Bugs / Errores

### Backend

#### ~~1. No se puede editar departamentos~~ ✅
- **Fix**: Modificado `updateDepartmentMutation` en `DepartmentsPage.tsx` para solo enviar campos con valor, evitando enviar `branchIds` vacío o `code` vacío que causaban errores de validación.

#### ~~2. No se actualizan usuarios al mover empleados~~ ✅
- **Fix**: Añadido `exact: false` en `invalidateQueries` de `updateDepartmentMemberMutation` para que invalide todas las queries que empiecen con `['users']`, `['departments']` y `['departments-users']`.

#### 3. ✅ Notificaciones de vacaciones y resumen semanal no funcionan (ARREGLADO)
- **Qué se hizo**:
  1. Se añadió filtrado por scope (branchId/departmentId) en `notifyVacationChange` para que solo notifique a webhooks que coincidan con la sucursal/departamento de la solicitud
  2. Se añadieron logs en `notifyVacationChange` para depurar si encuentra webhooks
  3. Se corrigió el tipo `VacationChangeParams` para que `branchId` y `departmentId` sean strings requeridos (no opcionales)
  4. Se mejoró `NotificationsPage.tsx` con selector de alcance (`ScopeSelector`) que permite filtrar por: Todos, Sucursal, Departamento o Webhook específico
  5. Se actualizaron los endpoints del backend para aceptar `webhookConfigIds` (array) en lugar de `webhookConfigId` (string)
  6. Se actualizaron tests

#### 4. Remover lógica 'desde'-'hasta' en schedules
- **Causa probable**: La lógica actual usa `startDatetime` y `endDatetime` pero puede haber transformaciones de rango que causen problemas. Revisar schemas y service.
- **Archivos**: `schedules.http.schemas.ts`, `schedules.service.ts`
- **Cómo arreglar**:
  1. Revisar schemas de creación de schedules
  2. Simplificar a fechas directas sin transformaciones de rango
  3. Actualizar frontend si es necesario

### Frontend

#### 5. Evento desde Dashboard no abre popup en SchedulePage
- **Causa probable**: `DashboardPage.tsx` navega a `/schedule?scheduleId=xxx` pero `SchedulePage.tsx` no lee el query param para abrir el popup automáticamente.
- **Archivos**: `DashboardPage.tsx` (manejador onClick), `SchedulePage.tsx` (useEffect para leer query params)
- **Cómo arreglar**:
  1. En `DashboardPage`, pasar `scheduleId` como query param en la navegación
  2. En `SchedulePage`, añadir `useEffect` que lea `scheduleId` de `useSearchParams` y abra el popup de detalle
  3. Asegurar que el popup se abre después de que el calendario esté renderizado

#### 6. Rango de fechas incorrecto en EventModal (shift+clic)
- **Causa probable**: El cálculo de fechas al hacer shift+clic tiene un off-by-one error. Al seleccionar rango 20-23, selecciona 19-22.
- **Archivos**: `EventModal.tsx` o el componente de calendario interno
- **Cómo arreglar**:
  1. Revisar la función que maneja shift+clic
  2. Verificar el cálculo de fechas inicio/fin
  3. Posible causa: zona horaria (UTC vs local) o índice de array

#### 7. Fecha fin incorrecta en EventModal
- **Causa probable**: Similar al anterior, al seleccionar fecha fin se resta un día.
- **Archivos**: `EventModal.tsx`
- **Cómo arreglar**:
  1. Revisar el manejador de cambio de fecha fin
  2. Verificar que no haya transformación de zona horaria

#### 8. Pills de vacaciones aprobadas no se muestran en calendario ✅
- **Causa**: El `VacationCalendar` usaba `useVacationCalendar` que solo cargaba UNA semana (la de `dateRange.from`), pero el calendario muestra un mes entero. Al cambiar de mes, solo se cargaba la primera semana del nuevo rango.
- **Solución**: 
  1. Se añadió `from`/`to` opcionales al schema `vacationCalendarQuerySchema` y al service `getVacationCalendar`
  2. Se creó `useVacationCalendarRange` hook que usa `from`/`to` en lugar de `year`/`week`
  3. Se actualizó `VacationCalendar.tsx` para usar `useVacationCalendarRange` con el rango completo del mes visible (`dateRange.from` a `dateRange.to`)
  4. Se actualizaron tests del schema

---

## 🟡 PRIORIDAD 2 — Mejoras UX / Features parcialmente implementadas

#### 9. Selección de días específicos al crear turnos
- **Descripción**: Permitir seleccionar días específicos (ej. lunes, miércoles, viernes) sin crear múltiples turnos manualmente.
- **Cómo hacerlo**:
  1. Añadir componente de checkboxes (L M X J V S D) en el modal de creación
  2. Al seleccionar varios días, crear un schedule por cada día con misma hora inicio/fin
  3. Usar `createScheduleBatch` del backend si existe, o llamar `createSchedule` por cada día

#### 10-11. Calendario tipo "reserva de vuelos" en EventModal y Vacaciones
- **Descripción**: Reemplazar inputs de fecha por un mini calendario donde se puedan seleccionar días manualmente.
- **Cómo hacerlo**:
  1. Crear componente `DateRangeCalendar.tsx` reutilizable
  2. Usar `react-day-picker` o similar con selección de rango y días individuales
  3. Reemplazar en `EventModal.tsx` y `VacationRequestModal.tsx`
  4. Soportar: clic simple (seleccionar día), clic+arrastre (rango), clic en día seleccionado (deseleccionar)

#### 12. Mensaje cuando employee no tiene sucursal asignada
- **Descripción**: SchedulePage vacía sin mensaje informativo para employee sin branchId.
- **Cómo hacerlo**:
  1. En `SchedulePage.tsx`, detectar si `user.branchId` es null/undefined
  2. Mostrar `<EmptyState>` con mensaje "No tienes una sucursal asignada. Contacta con tu administrador."

#### 13. Skeleton loaders consistentes
- **Descripción**: Algunas páginas pueden no tener skeleton loaders.
- **Cómo hacerlo**:
  1. Revisar todas las páginas que cargan datos asíncronos
  2. Añadir `<Skeleton>` o `<DashboardSkeleton>` / `<TableSkeleton>` según corresponda
  3. Usar los componentes ya existentes en `components/common/Skeleton.tsx`

#### 14. Error 403 con mensaje descriptivo
- **Descripción**: El componente `ForbiddenPage` debe mostrar contexto según la acción denegada.
- **Cómo hacerlo**:
  1. Modificar `ForbiddenPage.tsx` para aceptar prop `context?: string`
  2. Pasar contexto desde los guards de las páginas
  3. Ej: "No tienes permiso para crear turnos en otra sucursal"

#### 15. Confirmación antes de crear schedule en día festivo
- **Descripción**: El backend ya detecta solapamiento con festivos (`ensureNoHolidayOverlap`), pero el frontend debe mostrar confirmación.
- **Cómo hacerlo**:
  1. Verificar si el backend ya devuelve información de festivos en la respuesta
  2. Si no, añadir flag en la respuesta de creación
  3. En frontend, mostrar `<ConfirmDialog>` antes de crear si hay festivo

#### 16. Notificaciones push para vacaciones
- **Descripción**: Al aprobar/rechazar vacaciones, notificar al empleado (in-app + webhook).
- **Cómo hacerlo**:
  1. Verificar que `notifyVacationChange` se llama en `approveVacationEntry` y `rejectVacationEntry`
  2. Añadir notificación in-app al empleado cuando su solicitud cambia de estado
  3. Usar `createInAppNotification` para notificar al empleado

---

## 🔵 PRIORIDAD 3 — Features nuevas

#### 17. Filtro "Mis turnos" en SchedulePage
- **Cómo hacerlo**:
  1. Añadir toggle/checkbox "Mostrar solo mis turnos" en SchedulePage
  2. Cuando está activo, pasar `userId` a `/schedules/week/...` y `/schedules`
  3. Solo visible para employee (admin/GM/DM ya ven todo)

#### 18. Filtro por usuario en SchedulePage
- **Cómo hacerlo**:
  1. Añadir selector de usuario (solo para admin/GM/DM)
  2. Pasar `userId` seleccionado a las queries de schedules
  3. Cargar lista de usuarios del scope correspondiente

#### 19. Perfil desde header (TopBar)
- **Cómo hacerlo**:
  1. En `TopBar.tsx`, envolver el nombre de usuario con `<Link to="/profile">`
  2. Mantener el menú desplegable si existe

#### 20. Días en español en calendario EventModal
- **Cómo hacerlo**:
  1. Localizar el calendario interno del EventModal
  2. Usar `date-fns/locale/es` para los nombres de días
  3. Cambiar initiales: mo→lu, tu→ma, we→mi, th→ju, fr→vi, sa→sá, su→do

---

## ⚪ PRIORIDAD 4 — Seguridad / Futuro

- [ ] **VUL-9**: Invalidar tokens JWT al cambiar contraseña (tokenVersion en BD)
  - Añadir campo `tokenVersion` al modelo User en Prisma
  - Incrementar al cambiar password
  - Verificar en middleware JWT
- [ ] **VUL-10**: Límite de sesiones concurrentes por usuario
  - Añadir tabla `user_sessions`
  - Límite configurable por rol
- [ ] Logout endpoint (invalidar token JWT)
- [ ] Endpoint de health check para monitoreo (`GET /health`)
- [ ] Documentación OpenAPI/Swagger de la API REST
