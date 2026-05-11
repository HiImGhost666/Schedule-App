# TODO — Pendientes

> **Última actualización:** 11 mayo 2026
> Basado en `BusinessLogic.md`, `PERMISOS.md`, `DESIGN.md`, análisis de código fuente y lista de features pendientes.

---

## 🔴 PRIORIDAD 1 — Bugs / Errores

### Backend

#### 1. No se puede editar departamentos
- **Causa probable**: El schema `updateDepartmentBodySchema` extiende `createDepartmentBodySchema.partial()` pero el campo `code` tiene transformaciones (`.trim().toUpperCase()`) que pueden fallar si no se envía. Además, el `.extend()` redefine `branchIds` como `z.array(z.string().min(1)).min(1).optional()` — el `.min(1)` en el array podría estar causando conflicto con `.optional()`.
- **Archivos**: `departments.http.schemas.ts`, `departments.service.ts`, `departments.controller.ts`
- **Cómo arreglar**:
  1. Simplificar `updateDepartmentBodySchema` para que no extienda del create schema
  2. Definir campos independientes con sus propias validaciones
  3. Asegurar que `code` opcional no ejecute transform si es undefined
  4. Verificar que `branchIds` opcional no exija mínimo si no se envía

#### 2. No se actualizan usuarios al mover empleados
- **Causa probable**: Al actualizar `departmentId` de un usuario, el frontend no refresca la lista o la query de usuarios no se invalida correctamente. También puede ser que el backend no devuelva los datos actualizados.
- **Archivos**: `users.service.ts` (función `updateUser`), `users.repository.ts` (`updateUserRecord`), frontend `UsersPage.tsx` (invalidación de query)
- **Cómo arreglar**:
  1. Verificar que `updateUserRecord` actualiza correctamente `departmentId` en BD
  2. Verificar que el endpoint devuelve el usuario con la relación `department` poblada
  3. En frontend, asegurar que la mutación invalida `['users']` queryKey
  4. Añadir test que verifique el cambio de departamento

#### 3. Notificaciones de vacaciones y resumen semanal no funcionan
- **Causa probable**: `notifyVacationChange` busca webhooks con `notifyModifications: true`, pero puede que no haya webhooks configurados. `sendMondayVacationSummary` (FIX-3) ya se corrigió para buscar en `prisma.vacationRequest` en vez de `prisma.schedule`, pero puede haber otro error.
- **Archivos**: `notifications.service.ts`, `notifications.templates.ts`
- **Cómo arreglar**:
  1. Verificar que existan webhooks configurados con `enabled: true`
  2. Añadir logs en `notifyVacationChange` para ver si encuentra webhooks
  3. Verificar `buildVacationCard` genera payload correcto
  4. Añadir test de integración para notificaciones

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

#### 8. Pills de vacaciones aprobadas no se muestran en calendario
- **Causa probable**: El endpoint `GET /vacations/calendar` puede no estar devolviendo las solicitudes aprobadas, o el `VacationCalendar` no las procesa correctamente.
- **Archivos**: `VacationCalendar.tsx`, `vacations.service.ts` (`getVacationCalendar`)
- **Cómo arreglar**:
  1. Verificar que `getVacationCalendar` incluye solicitudes con status `approved`
  2. Verificar que el frontend parsea correctamente los eventos
  3. Añadir logs para depurar

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

---

## 📋 PLAN DE ACCIÓN — Primer bug a arreglar

### Bug #1: No se puede editar departamentos

**Análisis del código:**
- `updateDepartmentBodySchema` (departments.http.schemas.ts:22-25):
  ```ts
  export const updateDepartmentBodySchema = createDepartmentBodySchema.partial().extend({
    isActive: z.boolean().optional(),
    branchIds: z.array(z.string().min(1)).min(1).optional(),
  });
  ```
- `createDepartmentBodySchema` tiene `code` con `.trim().toUpperCase()` — al hacer `.partial()`, si no se envía `code`, el transform no debería ejecutarse, pero Zod puede tener comportamientos inconsistentes.
- `branchIds` se redefine con `.min(1).optional()` — esto es correcto sintácticamente pero `.min(1)` en array vacío vs undefined puede causar issues.

**Plan de acción:**
1. ✅ Simplificar `updateDepartmentBodySchema` para que sea independiente (no extienda del create)
2. ✅ Definir campos con validaciones claras: `name`, `code`, `description`, `isActive`, `branchIds` todos opcionales
3. ✅ Asegurar que `code` opcional no ejecute transform si es undefined (usar `.transform()` condicional)
4. ✅ Verificar que `branchIds` opcional acepte tanto undefined como array no vacío
5. ✅ Ejecutar tests existentes para verificar que no se rompen
6. ✅ Crear test específico para update de departamento
