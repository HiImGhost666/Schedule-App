# TODO — Próximos Pasos

> **Última actualización:** 9 mayo 2026
> **Fuente:** `BusinessLogic.md` (sección 4 - Vulnerabilidades)

---

## 🔴 Vulnerabilidades Críticas

| ID | Descripción | Impacto | Módulo | Estado |
|----|-------------|---------|--------|--------|
| **VUL-2** | `listWeekSchedulesForActor` para employee pasa `actor.branchId` como `userId` en vez de `actor.id` | **Alto** — bug que filtra por branchId incorrecto | Schedules | ✅ **CORREGIDO** |
| **VUL-4** | No hay rate limiting en login | **Alto** — ataque de fuerza bruta | Auth | ⏸️ **ON HOLD** (pendiente de decisión) |

## 🟡 Vulnerabilidades Medias

| ID | Descripción | Impacto | Módulo | Estado |
|----|-------------|---------|--------|--------|
| **VUL-1** | Employee puede ver schedules de otros empleados de su branch si pasa `userId` en query params | Medio — employee puede ver turnos ajenos | Schedules | ✅ **CORREGIDO** |
| **VUL-3** | Endpoint `GET /schedules` (sin actor) usa `listSchedules` sin restricción de rol | Medio — cualquiera con token puede listar schedules | Schedules | ✅ **CORREGIDO** (controller ya usa `listSchedulesForActor`) |
| **VUL-6** | No se valida que assigneeIds existan al crear schedule | Bajo — si se pasa ID inexistente, Prisma lanza error | Schedules | ✅ **CORREGIDO** |
| **VUL-7** | Employee puede cancelar vacaciones de otros si obtiene permiso `vacations:approve` | Bajo — employee no tiene ese permiso por defecto | Vacations | ❌ No corregido (bajo riesgo, employee no tiene ese permiso) |
| **VUL-8** | No hay sanitización de HTML en campos de texto (name, notes, etc.) | Bajo — riesgo de XSS si se renderiza sin escape | Global | ❌ Pendiente |

## 🟢 Vulnerabilidades Bajas

| ID | Descripción | Impacto | Módulo | Estado |
|----|-------------|---------|--------|--------|
| **VUL-5** | No hay validación de ownership en webhooks | Bajo — solo admin gestiona webhooks, no hay tenant isolation | Webhooks | ❌ Pendiente |
| **VUL-9** | Los tokens JWT no se invalidan al cambiar contraseña | Bajo — el token sigue siendo válido hasta que expire | Auth | ❌ Pendiente |
| **VUL-10** | No hay límite de sesiones concurrentes por usuario | Bajo — un usuario puede tener múltiples sesiones activas | Auth | ❌ Pendiente |

---

## 📋 Pendientes por Módulo

### Módulo: Auth / Seguridad
- [ ] ⏸️ **VUL-4**: Añadir rate limiting al login (`express-rate-limit`) — **ON HOLD**
- [ ] **VUL-9**: Invalidar tokens JWT al cambiar contraseña (tokenVersion)
- [ ] **VUL-10**: Limitar sesiones concurrentes por usuario
- [ ] Crear endpoint de logout (invalidar token)

### Módulo: Schedules
- [x] **VUL-1**: Forzar `userId = actor.id` en `listSchedulesForActor` para employee
- [x] **VUL-2**: Corregir `listWeekSchedulesForActor` línea 350 (`actor.branchId` → `actor.id`)
- [x] **VUL-3**: Migrar `GET /schedules` a usar `listSchedulesForActor` (ya lo usaba)
- [x] **VUL-6**: Validar existencia de assigneeIds antes de crear schedule

### Módulo: Vacaciones
- [ ] **VUL-7**: Añadir verificación de rol en `cancelVacationEntry` además de permisos
- [ ] **VAC-2**: Notificar al empleado cuando se aprueba/rechaza su solicitud
- [ ] Recalcular resumen semanal al aprobar vacaciones (restar horas disponibles)

### Módulo: Webhooks
- [ ] **VUL-5**: Añadir validación de ownership/tenant en webhooks

### Módulo: Frontend
- [ ] **VUL-8**: Sanitizar HTML en campos de texto (name, notes, etc.)
- [ ] **FNT-1**: Mostrar mensaje claro cuando employee no tiene sucursal asignada
- [ ] Añadir notificaciones push para eventos de vacaciones
- [ ] Añadir skeleton loaders en todas las páginas
- [ ] Manejar error 403 con mensaje descriptivo

### Módulo: Tests
- [ ] Test de seguridad: employee no puede ver schedules de otros empleados
- [ ] Test de integración: schedules con roles (admin, GM, DM, employee)
- [ ] Test de scope: GM no puede ver schedules de otra branch
- [ ] Test de vacaciones: DM no puede aprobar vacaciones de otro departamento

---

## 🚀 Mejoras Planificadas

- [ ] Endpoint de health check para monitoreo
- [ ] Documentación OpenAPI/Swagger de la API REST
- [ ] Confirmación en frontend antes de crear schedule en día festivo
