# TODO — Pendientes

> **Última actualización:** 12 mayo 2026
> Basado en `BusinessLogic.md`, `PERMISOS.md`, `DESIGN.md`, análisis de código fuente y lista de features pendientes.

---

## 🔴 PRIORIDAD 1 — Bugs / Errores

### Backend

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

---

## 🟡 PRIORIDAD 2 — Mejoras UX / Features parcialmente implementadas

#### 10-11. Calendario tipo "reserva de vuelos" en EventModal y Vacaciones
- **Descripción**: Reemplazar inputs de fecha por un mini calendario donde se puedan seleccionar días manualmente.
- **Cómo hacerlo**:
  1. Crear componente `DateRangeCalendar.tsx` reutilizable
  2. Usar `react-day-picker` o similar con selección de rango y días individuales
  3. Reemplazar en `EventModal.tsx` y `VacationRequestModal.tsx`
  4. Soportar: clic simple (seleccionar día), clic+arrastre (rango), clic en día seleccionado (deseleccionar)

---

## 🔵 PRIORIDAD 3 — Features nuevas

*(Completadas: Items #9, #12-16, #17-20)*

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
