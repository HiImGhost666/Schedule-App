# Matriz de Permisos — Schedule App

> **Última actualización:** 8 mayo 2026
> **Fuente:** `backend/src/modules/roles/roles.constants.ts`

---

## Permisos Disponibles

| Permiso | Descripción |
|---|---|
| `users:view` | Ver listado de usuarios |
| `users:create` | Crear usuarios |
| `users:update` | Editar usuarios, cambiar estado/rol, resetear password |
| `users:delete` | Eliminar usuarios (soft delete) |
| `schedules:view` | Ver turnos/guardias |
| `schedules:create` | Crear turnos/guardias |
| `schedules:update` | Editar turnos/guardias |
| `schedules:delete` | Eliminar turnos/guardias |
| `schedule_types:read` | Ver tipos de turno |
| `schedule_types:create` | Crear tipos de turno |
| `schedule_types:update` | Editar tipos de turno |
| `schedule_types:delete` | Eliminar tipos de turno |
| `branches:view` | Ver sucursales |
| `branches:create` | Crear sucursales |
| `branches:update` | Editar sucursales |
| `branches:delete` | Eliminar sucursales |
| `branches:holidays:manage` | Gestionar festivos de sucursales (crear, editar, eliminar) |
| `departments:view` | Ver departamentos |
| `departments:create` | Crear departamentos |
| `departments:update` | Editar departamentos |
| `departments:delete` | Eliminar departamentos |
| `settings:view` | Ver configuración global (roles, temas) |
| `settings:update` | Modificar configuración global |
| `audit:view` | Ver registros de auditoría |
| `vacations:create` | Solicitar vacaciones |
| `vacations:read` | Ver solicitudes propias y calendario |
| `vacations:read-all` | Ver solicitudes de otros (scope según rol) |
| `vacations:approve` | Aprobar/rechazar solicitudes (scope según rol) |
| `vacations:cancel` | Cancelar solicitudes (propias o del scope) |
| `vacations:delete` | Eliminar registros de vacaciones permanentemente |
| `webhooks:view` | Ver webhooks configurados |
| `webhooks:create` | Crear webhooks |
| `webhooks:update` | Editar webhooks |
| `webhooks:delete` | Eliminar webhooks |
| `notifications:view` | Ver historial de notificaciones |
| `weekly_summary:view` | Ver resumen semanal de horas (propias) |
| `weekly_summary:view-all` | Ver resumen semanal de todo el equipo |

---

## Matriz por Rol

| Permiso | admin | general_manager | department_manager | employee |
|---|---|---|---|---|
| `users:view` | ✅ | ✅ | ✅ | ❌ |
| `users:create` | ✅ | ✅ (scope: su branch) | ❌ | ❌ |
| `users:update` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `users:delete` | ✅ | ✅ (scope: su branch) | ❌ | ❌ |
| `schedules:view` | ✅ | ✅ | ✅ | ✅ |
| `schedules:create` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `schedules:update` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `schedules:delete` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `schedule_types:read` | ✅ | ✅ | ✅ | ✅ |
| `schedule_types:create` | ✅ | ❌ | ❌ | ❌ |
| `schedule_types:update` | ✅ | ❌ | ❌ | ❌ |
| `schedule_types:delete` | ✅ | ❌ | ❌ | ❌ |
| `branches:view` | ✅ | ✅ | ✅ | ✅ |
| `branches:create` | ✅ | ❌ | ❌ | ❌ |
| `branches:update` | ✅ | ❌ | ❌ | ❌ |
| `branches:delete` | ✅ | ❌ | ❌ | ❌ |
| `branches:holidays:manage` | ✅ | ✅ (scope: su branch) | ❌ | ❌ |
| `departments:view` | ✅ | ✅ | ✅ | ❌ |
| `departments:create` | ✅ | ❌ | ❌ | ❌ |
| `departments:update` | ✅ | ❌ | ❌ | ❌ |
| `departments:delete` | ✅ | ❌ | ❌ | ❌ |
| `settings:view` | ✅ | ✅ | ❌ | ❌ |
| `settings:update` | ✅ | ❌ | ❌ | ❌ |
| `audit:view` | ✅ | ❌ | ❌ | ❌ |
| `vacations:create` | ✅ | ✅ | ✅ | ✅ |
| `vacations:read` | ✅ | ✅ | ✅ | ✅ |
| `vacations:read-all` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `vacations:approve` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `vacations:cancel` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ✅ (solo propias) |
| `vacations:delete` | ✅ | ❌ | ❌ | ❌ |
| `webhooks:view` | ✅ | ❌ | ❌ | ❌ |
| `webhooks:create` | ✅ | ❌ | ❌ | ❌ |
| `webhooks:update` | ✅ | ❌ | ❌ | ❌ |
| `webhooks:delete` | ✅ | ❌ | ❌ | ❌ |
| `notifications:view` | ✅ | ✅ | ❌ | ❌ |
| `weekly_summary:view` | ✅ | ✅ | ✅ | ✅ |
| `weekly_summary:view-all` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |

---

## Lógica de Scopes

### `general_manager`
- Gestiona **su sucursal**: usuarios de su branch, turnos de su branch.
- Schedule Types solo lectura (solo admin crea/edita/borra para evitar errores).
- **Festivos**: puede gestionar los festivos de su sucursal (`branches:holidays:manage`).
- NO gestiona departments, branches (CRUD), ni settings.
- Vacaciones: ve y gestiona las de su branch.
- Webhooks: solo admin gestiona webhooks.
- Resumen semanal: ve el de su equipo.

### `department_manager`
- Gestiona **su departamento**: turnos de su depto, usuarios de su depto (solo editar nombre/email/teléfono, no puede cambiar branch ni rol).
- Schedule Types solo lectura.
- NO gestiona branches ni settings.
- Vacaciones: ve y gestiona las de su departamento.
- Resumen semanal: ve el de su equipo.

### `employee`
- Solo ve turnos, tipos de turno y sucursales.
- Vacaciones: puede crear solicitudes, ver las suyas propias, cancelar las suyas propias (solo si están en estado `pending`).
- Resumen semanal: solo el suyo propio.

### `admin`
- Control total sobre todos los recursos.

---

## Notas Técnicas

- Los permisos se almacenan en la tabla `permissions` de la BD y se asignan a roles mediante la tabla intermedia `_PermissionToRole`.
- El middleware `requirePermission()` verifica que el usuario autenticado tenga **todos** los permisos requeridos en su rol.
- La validación de **scope** (branch/departamento) se realiza en la **capa de servicio**, no en el middleware. El middleware solo verifica que el usuario tenga el permiso; el servicio aplica las restricciones de alcance.
- Para regenerar los permisos en BD (por ejemplo, después de añadir nuevos permisos), ejecutar:
  ```bash
  npx tsx prisma/seed.ts
  ```
  El seed sincroniza automáticamente los permisos nuevos incluso si la BD ya tiene datos.
