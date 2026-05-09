# TODO — Próximos Pasos

> **Última actualización:** 9 mayo 2026
> **Fuente:** `BusinessLogic.md` (sección 4 - Vulnerabilidades)
> 
> **Nota:** Todos los errores de linter del frontend han sido corregidos (0 errores, 0 warnings).

---

## 🔴 Vulnerabilidades Críticas

| ID | Descripción | Impacto | Módulo | Estado |
|----|-------------|---------|--------|--------|
| **VUL-2** | `listWeekSchedulesForActor` para employee pasa `actor.branchId` como `userId` en vez de `actor.id` | **Alto** — bug que filtra por branchId incorrecto | Schedules | ✅ **CORREGIDO** |

## 🟡 Vulnerabilidades Medias

| ID | Descripción | Impacto | Módulo | Estado |
|----|-------------|---------|--------|--------|
| **VUL-1** | Employee puede ver schedules de otros empleados de su branch si pasa `userId` en query params | Medio — employee puede ver turnos ajenos | Schedules | ✅ **CORREGIDO** |
| **VUL-3** | Endpoint `GET /schedules` (sin actor) usa `listSchedules` sin restricción de rol | Medio — cualquiera con token puede listar schedules | Schedules | ✅ **CORREGIDO** (controller ya usa `listSchedulesForActor`) |
| **VUL-6** | No se valida que assigneeIds existan al crear schedule | Bajo — si se pasa ID inexistente, Prisma lanza error | Schedules | ✅ **CORREGIDO** |
| **VUL-8** | No hay sanitización de HTML en campos de texto (name, notes, etc.) | Bajo — riesgo de XSS si se renderiza sin escape | Global | ✅ **CORREGIDO** |

## 🟢 Vulnerabilidades Bajas

| ID | Descripción | Impacto | Módulo | Estado |
|----|-------------|---------|--------|--------|
| **VUL-5** | No hay validación de ownership en webhooks | Bajo — solo admin gestiona webhooks, no hay tenant isolation | Webhooks | ✅ **CORREGIDO** (nuevos permisos `webhooks:view`/`webhooks:manage`) |
| **VUL-7** | `cancelVacationEntry` usa `vacations:approve` en vez de `vacations:cancel` para determinar si puede cancelar solicitudes ajenas | Bajo — permiso semánticamente incorrecto | Vacaciones | ✅ **CORREGIDO** |
| **VUL-9** | Los tokens JWT no se invalidan al cambiar contraseña | Bajo — el token sigue siendo válido hasta que expire | Auth | ✅ **CORREGIDO** (ya incrementa `tokenVersion` en `changePassword`) |
| **VUL-10** | No hay límite de sesiones concurrentes por usuario | Bajo — un usuario puede tener múltiples sesiones activas | Auth | ❌ Pendiente |

---

## 📋 Pendientes por Módulo

### Módulo: Auth / Seguridad
- [x] **VUL-9**: Invalidar tokens JWT al cambiar contraseña (tokenVersion) — ✅ Ya implementado
- [ ] **VUL-10**: Limitar sesiones concurrentes por usuario
- [ ] Crear endpoint de logout (invalidar token) — ✅ Ya existe `logoutController`

### Módulo: Schedules
- [x] **VUL-1**: Forzar `userId = actor.id` en `listSchedulesForActor` para employee
- [x] **VUL-2**: Corregir `listWeekSchedulesForActor` línea 350 (`actor.branchId` → `actor.id`)
- [x] **VUL-3**: Migrar `GET /schedules` a usar `listSchedulesForActor` (ya lo usaba)
- [x] **VUL-6**: Validar existencia de assigneeIds antes de crear schedule
- [x] **SCH-1**: Notificar in-app a empleados al crear/modificar/eliminar turnos

### Módulo: Vacaciones
- [x] **VUL-7**: Corregir `cancelVacationEntry` para usar `VACATION_PERMISSIONS.CANCEL` en vez de `APPROVE`
- [x] **VAC-2**: Notificar al empleado cuando se aprueba/rechaza su solicitud (nuevo sistema de notificaciones in-app)
- [ ] Recalcular resumen semanal al aprobar vacaciones (restar horas disponibles)

### Módulo: Webhooks / Notificaciones
- [x] **VUL-5**: Separar permisos de webhooks (`webhooks:view`, `webhooks:manage`) de `settings:*`
- [x] Migrar endpoints de webhooks de `settings:update` → `webhooks:manage`
- [x] Migrar endpoints de notificaciones (logs, resend, summaries, announce) a `webhooks:view`/`webhooks:manage`
- [x] Migrar endpoints de settings (theme, presets, favicon, site) de `settings:update` → `settings:manage`
- [x] Migrar endpoints de roles (CRUD) de `settings:update` → `settings:manage`
- [x] Añadir `webhooks:view` a `general_manager` en `DEFAULT_ROLE_PERMISSIONS`
- [x] Crear modelo `InAppNotification` en Prisma + migración
- [x] Crear servicio `in-app-notifications/in-app.service.ts` (CRUD de notificaciones internas)
- [x] Crear router `in-app-notifications/in-app.router.ts` (endpoints para frontend)
- [x] Integrar router in-app en `app.ts` (ruta `/api/in-app-notifications`)
- [x] Eliminar archivos duplicados `notifications/in-app.service.ts` e `in-app.router.ts`
- [x] Actualizar import en `vacations.service.ts` para apuntar al nuevo módulo

### Módulo: Audit Log (mejoras)
- [x] **AUD-1**: Añadir `before`/`after` con `sanitizeSnapshot` en `updateBranch` (branches.service.ts)
- [x] **AUD-2**: Añadir `before`/`after` con `sanitizeSnapshot` en `createShiftPreset`/`updateShiftPreset`/`deleteShiftPreset`
- [x] **AUD-3**: Añadir audit log completo en `roles.service.ts` (create/update/delete)
- [x] **AUD-4**: Añadir audit log completo en `schedule-types.service.ts` (create/update/delete)
- [x] **AUD-5**: Añadir audit log en `changePassword` (auth.service.ts)

### Módulo: Frontend
- [x] **VUL-8**: Sanitizar HTML en campos de texto (name, notes, etc.)
- [ ] **FNT-1**: Mostrar mensaje claro cuando employee no tiene sucursal asignada
- [x] **FNT-2**: Añadir badge de notificaciones no leídas en el header (consumir `GET /api/in-app-notifications/unread-count`)
- [x] **FNT-3**: Añadir panel de notificaciones in-app (consumir `GET /api/in-app-notifications`)
- [ ] Añadir skeleton loaders en todas las páginas
- [ ] Manejar error 403 con mensaje descriptivo

### Módulo: Tests
- [x] Test de seguridad: employee no puede ver schedules de otros empleados (`security-schedules.test.ts`)
- [x] Test de integración: schedules con roles (admin, GM, DM, employee) (`security-schedules.test.ts`)
- [x] Test de scope: GM no puede ver schedules de otra branch (`security-schedules.test.ts`)
- [x] Test de vacaciones: DM no puede aprobar vacaciones de otro departamento (`security-vacations.test.ts`)
- [x] Test de permisos: webhooks endpoints requieren `webhooks:view`/`webhooks:manage` (`security-vacations.test.ts`)
- [x] Test de permisos: settings endpoints requieren `settings:manage` (no `settings:update`) (`security-vacations.test.ts`)
- [x] Test de notificaciones in-app: se crean al aprobar/rechazar vacaciones (`security-vacations.test.ts`)
- [x] Test de notificaciones in-app: se crean al asignar/modificar/eliminar turnos (`security-schedules.test.ts`)
- [x] Test de auth: lockouts, cuentas deshabilitadas, rotación de tokens (`auth.test.ts`)
- [x] Test de holiday overlap: validación de solapamiento de vacaciones (`holiday-overlap.test.ts`)

---

## 🚀 Mejoras Planificadas

- [ ] Endpoint de health check para monitoreo
- [ ] Confirmación en frontend antes de crear schedule en día festivo
