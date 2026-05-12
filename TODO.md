# TODO

> **Última actualización:** 12 mayo 2026
> Consolidado de: DONE.md, REPORTE-BACKEND.md, BusinessLogic.md, PERMISOS.md, DESIGN.md

---

## 🔴 Prioridad Alta — Bugs y Vulnerabilidades

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

---

## 🟡 Prioridad Baja — Funcionalidades Pendientes

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
- [ ] Verificar que todas las páginas usen `<DataTable>` (DESIGN.md sección 11)
- [ ] Verificar que todos los componentes sigan el árbol de decisión de DESIGN.md

---

## 📝 Notas

- **VUL-5**: ❌ Pendiente (validación ownership webhooks — baja prioridad, solo si multi-tenant)
- **VUL-7**: ❌ Pendiente (verificación de rol en servicio de vacaciones)
- **VUL-9**: ❌ Pendiente (tokenVersion + logout)
- **VUL-10**: ❌ Pendiente (límite de sesiones concurrentes — baja prioridad)
