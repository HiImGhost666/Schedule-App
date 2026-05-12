# TODO

> **Última actualización:** 12 mayo 2026
> Consolidado de: DONE.md, REPORTE-BACKEND.md, BusinessLogic.md, PERMISOS.md, DESIGN.md

---

## 🔴 Prioridad Alta — Bugs y Vulnerabilidades

### Backend — Notificaciones con zona horaria incorrecta
- [ ] **Bug**: `toLocaleDateString()` sin TZ en notificaciones de `schedules.service.ts` y `vacations.service.ts`
  - **Impacto**: En Docker (TZ=UTC), un turno a las 08:00 Europe/Madrid aparece como 06:00 en la notificación
  - **Fix**: Pasar `branchTimezone` al servicio de notificaciones y usar `toLocaleDateString('es-ES', { timeZone: branchTimezone })`
  - **Fuente**: REPORTE-BACKEND.md (#1, Prioridad 🔴 Alta)

### Backend + Frontend — Timezone consistente por sucursal (turnos y calendario)
- [ ] **Estado actual (confirmado)**
  - En BD ya existe `Branch.timezone` con default `Europe/Madrid` en `backend/prisma/schema.prisma`.
  - Los turnos se guardan como `DateTime` en `Schedule.startDatetime` y `Schedule.endDatetime` en `backend/prisma/schema.prisma`.
  - En frontend existen helpers para zonas horarias en `frontend/src/lib/timezone.ts`.
  - En calendario se carga `branch.timezone` y se pasa como `branchTimezone` en `frontend/src/pages/SchedulePage.tsx`.
  - El texto del evento se pinta con `formatTimeInTimezone` en `frontend/src/components/schedule/CalendarEventContent.tsx`.
- [ ] **Problema**
  - FullCalendar posiciona bloques en zona del navegador cuando recibe ISO directo, mientras el texto puede estar en zona de sucursal.
  - Se genera incoherencia visual: el bloque cae en una franja y el texto interno muestra otra hora.
  - La creación de turnos no interpreta fecha/hora en zona de sucursal: `buildDateTime` usa `setUTCHours` en `frontend/src/components/schedule/shiftScheduling.ts`.
  - `ShiftModal` envía `toISOString()` y convierte "08:00" como UTC, no como hora local de Tenerife o Madrid en `frontend/src/components/schedule/ShiftModal.tsx`.
- [ ] **Cómo debe quedar (regla funcional)**
  - Cada sucursal usa zona IANA (`Europe/Madrid` península, `Atlantic/Canary` canarias).
  - Persistencia siempre en UTC en BD (instante absoluto).
  - Crear/editar turno: interpretar fecha+hora de entrada en la zona de la sucursal del turno.
  - Mostrar turnos: formatear y posicionar según zona efectiva de sucursal.
  - Vistas personales de empleado: usar `user.branch.timezone` como zona efectiva.
- [ ] **Cambios recomendados**
  - Sustituir `setUTCHours + toISOString()` por conversión "hora local de sucursal -> UTC" en `ShiftModal` y `shiftScheduling`.
  - Reutilizar `timezoneToUtc` (o reescribirlo correctamente) para que realmente se use en creación/edición.
  - Revisar pantallas fuera del calendario que siguen usando `formatDateTime`, `formatDate`, etc. con zona del navegador.
  - Usar `formatDateTimeInTz(date, user.branch.timezone)` o `schedule.branch.timezone` en perfil, detalle de usuario y widgets semanales.
  - Definir estrategia FullCalendar:
    - Vista filtrada por sucursal: renderizar/posicionar en timezone de esa sucursal.
    - Vista "todas las sucursales": no mezclar posiciones horarias como si fueran misma zona; mostrar zona explícita por turno.
  - Añadir tests E2E y unitarios para Madrid/Canarias y cambios de DST.
  - Criterio de aceptación: no puede existir diferencia entre hora del bloque y hora del texto en un mismo evento.

### Backend — Rate limiting en login (VUL-4)
- [ ] **VUL-4**: No hay rate limiting en login
  - **Impacto**: **Alto** — ataque de fuerza bruta
  - **Fix**: Añadir `express-rate-limit` al endpoint de login
  - **Fuente**: BusinessLogic.md (4.1 Críticas)

### Backend — Logout endpoint (invalidar token JWT)
- [ ] **VUL-9**: Los tokens JWT no se invalidan al cambiar contraseña ni al cerrar sesión
  - **Impacto**: Medio — el token sigue siendo válido hasta que expire
  - **Fix**: Añadir `tokenVersion` en BD y verificar en auth middleware. Crear endpoint de logout.
  - **Fuente**: BusinessLogic.md (4.3 Bajas, 6.1 Backend)

### Backend — schedule-types controller oculta errores reales detrás de 400
- [ ] **Bug**: `createScheduleTypeHandler`, `updateScheduleTypeHandler` y `deleteScheduleTypeHandler` capturan cualquier error y lo devuelven como 400, sin distinguir `AppError` de errores inesperados.
  - **Impacto**: Se pierden status reales (403/404/500) y se dificulta diagnosticar fallos del flujo de tipos de turno.
  - **Fix**: Manejar `AppError` explícitamente con su status y dejar los errores inesperados en 500 o en el handler global.
  - **Fuente**: Revisión reciente de `backend/src/modules/schedule-types/schedule-types.controller.ts` y `schedule-types.service.ts`

---

## 🟠 Prioridad Media — Errores de Código y Deuda Técnica

### Backend — shift-presets.controller usa `.parse()` en vez de `.safeParse()`
- [ ] **Bug**: `createShiftPresetController` y `updateShiftPresetController` usan `.parse()` que lanza ZodError crudo (error 500 sin formatear)
  - **Fix**: Cambiar a `.safeParse()` y devolver `sendError` con 400
  - **Además**: No usa `isAppError` en el catch
  - **Fuente**: REPORTE-BACKEND.md (#2, Prioridad 🟠 Media)

### Backend — roles.controller sin validación Zod ni `isAppError`
- [ ] **Bug**: `createRoleController` recibe `req.body` sin validar. Status hardcodeado a 400 siempre.
  - **Fix**: Añadir schema Zod, usar `safeParse()`, implementar `isAppError` en catch
  - **Fuente**: REPORTE-BACKEND.md (#3, Prioridad 🟠 Media)

### Backend — listUsersController sin try/catch
- [ ] **Bug**: `listUsersController` en `users.controller.ts` no tiene try/catch. Si el servicio lanza AppError, llega sin procesar al handler global.
  - **Fix**: Envolver en try/catch como el resto de controllers del mismo archivo
  - **Fuente**: REPORTE-BACKEND.md (#4, Prioridad 🟠 Media)

### Backend — Rollback no implementado para varias entidades
- [ ] **Bug**: `rollbackAudit()` en `audit.service.ts` no soporta: `VacationRequest`, `ShiftPreset`, `ScheduleType`, `Role`, `ThemeSettings`, `ThemePreset`, `SiteSettings`
  - **Impacto**: UI de Auditoría lanza error "Rollback no implementado para la entidad: X"
  - **Fix**: Implementar rollback para estas entidades
  - **Fuente**: REPORTE-BACKEND.md (#5, Prioridad 🟠 Media)

### Backend — settings.router sin separación Controller/Service
- [ ] **Refactor**: Todo el módulo `settings` mezcla en el router: validación Zod inline, llamadas Prisma directas, lógica de archivos (multer, fs), y auditoría
  - **Fix**: Separar en controller + service como el resto de módulos
  - **Además**: `logAudit()` es fire-and-forget fuera de transacción — debería ser `logAuditOrThrow` en transacción
  - **Fuente**: REPORTE-BACKEND.md (#8, Prioridad 🟡 Baja + sección 2)

### Backend — departments.controller mensajes sin acentos
- [ ] **Bug**: Mensajes "Parametros invalidos" y "Datos invalidos" sin acentos
  - **Fix**: Cambiar a "Parámetros inválidos" y "Datos inválidos" para consistencia
  - **Fuente**: REPORTE-BACKEND.md (#9, Prioridad 🟡 Baja)

### Backend — Favicons sin limpieza de archivos antiguos
- [ ] **Bug**: Cada subida de favicon genera un archivo nuevo. El anterior nunca se elimina.
  - **Fix**: Al guardar la URL del nuevo favicon en BD, eliminar el archivo anterior con `fs.unlink`
  - **Fuente**: REPORTE-BACKEND.md (#7, Prioridad 🟡 Baja)

### Frontend — timezoneToUtc: código muerto con bug lógico
- [ ] **Bug**: `timezoneToUtc` en `frontend/src/lib/timezone.ts` no se importa en ningún lado. Además tiene bug: ambas variables usan `localStr + 'Z'`, el offset siempre es 0ms.
  - **Fix**: Eliminar o reescribir usando `date-fns-tz`
  - **Fuente**: REPORTE-BACKEND.md (#6, Prioridad 🟡 Baja)

---

## 🟡 Prioridad Baja — Funcionalidades Pendientes

### Timezone seleccionable (Península / Canarias)
- [ ] **Feature**: Timezone es string, debe poder seleccionarse entre península y canarias.
  - **Nota**: Actualmente es un string libre. Debe ser un selector con opciones: `Europe/Madrid`, `Atlantic/Canary`
  - **Fuente**: TODO.md original

### Backend — Notificar al empleado al aprobar/rechazar vacaciones
- [ ] **Feature**: Actualmente solo hay webhook, no hay notificación in-app/push al empleado cuando se aprueba/rechaza su solicitud
  - **Prioridad**: Media (BusinessLogic.md 3.3)
  - **Verificado**: `notifyVacationChange` ya se llama, pero verificar que la notificación in-app llegue al empleado

### Backend — Recalcular resumen semanal al aprobar vacaciones
- [ ] **Feature**: Las vacaciones aprobadas deberían restar horas disponibles en el resumen semanal
  - **Prioridad**: Baja (BusinessLogic.md 3.3)

### Backend — Notificar al empleado al crear schedule
- [ ] **Feature**: Actualmente solo webhook, no hay notificación al empleado cuando se le asigna un turno
  - **Prioridad**: Baja (BusinessLogic.md 3.3)

### Backend — Endpoint de health check
- [ ] **Feature**: Añadir endpoint `GET /health` para monitoreo
  - **Fuente**: BusinessLogic.md (6.1 Backend)

### Backend — Documentación OpenAPI/Swagger
- [ ] **Feature**: Documentación de la API REST con OpenAPI/Swagger
  - **Fuente**: BusinessLogic.md (6.1 Backend)

### Frontend — Confirmación antes de crear schedule en día festivo
- [ ] **Verificar**: Ya implementado en backend, verificar que el frontend muestre confirmación
  - **Nota**: DONE.md dice "verificado: ya funciona con el diálogo de conflictos"
  - **Acción**: Confirmar que el flujo completo funciona

---

## 📋 Checklist de Permisos vs Implementación

Basado en PERMISOS.md y BusinessLogic.md, verificar que estos puntos están correctamente implementados:

### General Manager
- [ ] GM puede gestionar festivos de su branch (`branches:holidays:manage`) — VERIFICADO en DONE.md
- [ ] GM NO puede crear/editar/eliminar schedule types (solo lectura) — VERIFICADO
- [ ] GM NO puede gestionar webhooks — VERIFICADO
- [ ] GM ve notificaciones (`notifications:view`) — VERIFICADO en DONE.md (Sidebar, rutas)

### Department Manager
- [ ] DM solo edita usuarios de su depto (nombre, email, teléfono) — VERIFICADO
- [ ] DM NO puede cambiar branchId ni role — VERIFICADO (validateDmUpdateRestrictions)
- [ ] DM NO puede crear/eliminar usuarios — VERIFICADO
- [ ] DM NO puede gestionar branches, settings, webhooks — VERIFICADO
- [ ] DM NO ve notificaciones (`notifications:view` = ❌) — VERIFICADO

### Employee
- [ ] Employee solo ve turnos donde está asignado — VERIFICADO (VUL-1, VUL-2 corregidos)
- [ ] Employee solo cancela vacaciones propias en estado `pending` — VERIFICADO
- [ ] Employee no tiene acceso a webhooks, settings, audit — VERIFICADO

---

## 🧪 Tests Pendientes

### Tests de seguridad
- [ ] Employee no puede ver schedules de otros empleados (incluso pasando userId)
- [ ] GM no puede ver schedules de otra branch
- [ ] DM no puede aprobar vacaciones de otro departamento

### Tests de integración
- [ ] Schedules con roles (admin, GM, DM, employee)
- [ ] Scope GM en schedules
- [ ] Vacaciones DM scope

### Tests de backend (reportados en REPORTE-BACKEND.md)
- [ ] Tests para shift-presets controller (safeParse, isAppError)
- [ ] Tests para roles controller (validación Zod)
- [ ] Tests para listUsersController (try/catch)
- [ ] Tests para rollback de VacationRequest, ShiftPreset, ScheduleType, Role

---

## 🔧 Refactor Pendientes

### Backend
- [ ] Refactor `settings.router.ts` → separar en controller + service
- [ ] Migrar `logAudit` fire-and-forget a `logAuditOrThrow` en transacciones para settings
- [ ] Implementar rollback para entidades faltantes en `audit.service.ts`

### Frontend
- [ ] Eliminar o reescribir `timezoneToUtc` en `frontend/src/lib/timezone.ts`
- [ ] Verificar que todas las páginas usen `<DataTable>` (DESIGN.md sección 11)
- [ ] Verificar que todos los componentes sigan el árbol de decisión de DESIGN.md

---

## 📝 Notas

- **VUL-1, VUL-2, VUL-3, VUL-6, VUL-8**: ✅ Corregidos (según DONE.md)
- **VUL-4**: ❌ Pendiente (rate limiting en login)
- **VUL-5**: ❌ Pendiente (validación ownership webhooks — baja prioridad, solo si multi-tenant)
- **VUL-7**: ❌ Pendiente (verificación de rol en servicio de vacaciones)
- **VUL-9**: ❌ Pendiente (tokenVersion + logout)
- **VUL-10**: ❌ Pendiente (límite de sesiones concurrentes — baja prioridad)
- **Items #5, #9, #12-20**: ✅ Completados (según DONE.md)
- **Bug #1, #2, #3, #6, #7, #8**: ✅ Corregidos (según DONE.md)
