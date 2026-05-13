# Matriz de Permisos — Schedule App

> **Última actualización:** 13 mayo 2026
> **Fuente:** `backend/src/modules/roles/roles.constants.ts`

---

## Permisos Disponibles (canónicos)

| Permiso | Descripción |
|---|---|
| `users:view` | Ver usuarios |
| `users:create` | Crear usuarios |
| `users:update` | Editar usuarios, estado, rol y password ops |
| `users:delete` | Eliminar usuarios (soft delete) |
| `schedules:view` | Ver turnos, weekly summary y planning de lectura |
| `schedules:create` | Crear turnos y support requests de planning |
| `schedules:update` | Editar turnos y revisar support requests |
| `schedules:delete` | Eliminar turnos |
| `schedule_types:read` | Ver tipos de turno |
| `schedule_types:create` | Crear tipos de turno |
| `schedule_types:update` | Editar tipos de turno |
| `schedule_types:delete` | Eliminar tipos de turno |
| `shift_presets:read` | Ver presets de turno |
| `shift_presets:create` | Crear presets de turno |
| `shift_presets:update` | Editar presets de turno |
| `shift_presets:delete` | Eliminar presets de turno |
| `skills:view` | Ver skills |
| `skills:create` | Crear skills |
| `skills:update` | Editar skills |
| `skills:delete` | Eliminar skills |
| `skills:assign` | Asignar skills a usuarios |
| `branches:view` | Ver sucursales |
| `branches:create` | Crear sucursales |
| `branches:update` | Editar sucursales |
| `branches:delete` | Eliminar sucursales |
| `branches:holidays:manage` | Gestionar festivos de sucursales |
| `departments:view` | Ver departamentos |
| `departments:create` | Crear departamentos |
| `departments:update` | Editar departamentos |
| `departments:delete` | Eliminar departamentos |
| `settings:view` | Ver configuración global |
| `settings:update` | Actualizar settings legacy específicos |
| `settings:manage` | Gestionar configuración global |
| `audit:view` | Ver auditoría |
| `vacations:create` | Crear solicitudes de vacaciones |
| `vacations:read` | Ver vacaciones propias y calendario |
| `vacations:read-all` | Ver vacaciones de alcance (según rol) |
| `vacations:approve` | Aprobar/rechazar vacaciones de alcance |
| `vacations:cancel` | Cancelar vacaciones (propias o de alcance) |
| `vacations:delete` | Eliminación administrativa de vacaciones |
| `webhooks:view` | Ver webhooks y logs de notificaciones |
| `webhooks:manage` | Gestionar webhooks y envíos manuales |
| `notifications:view` | Ver módulo in-app de notificaciones (frontend) |

---

## Matriz por Rol

| Permiso | admin | general_manager | department_manager | employee |
|---|---|---|---|---|
| `users:view` | ✅ | ✅ | ✅ | ✅ |
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
| `settings:manage` | ✅ | ❌ | ❌ | ❌ |
| `audit:view` | ✅ | ❌ | ❌ | ❌ |
| `vacations:create` | ✅ | ✅ | ✅ | ✅ |
| `vacations:read` | ✅ | ✅ | ✅ | ✅ |
| `vacations:read-all` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `vacations:approve` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `vacations:cancel` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ✅ (solo propias) |
| `vacations:delete` | ✅ | ❌ | ❌ | ❌ |
| `webhooks:view` | ✅ | ✅ | ❌ | ❌ |
| `webhooks:manage` | ✅ | ❌ | ❌ | ❌ |
| `notifications:view` | ✅ | ✅ | ❌ | ❌ |
| `shift_presets:read` | ✅ | ✅ | ✅ | ❌ |
| `shift_presets:create` | ✅ | ❌ | ❌ | ❌ |
| `shift_presets:update` | ✅ | ❌ | ❌ | ❌ |
| `shift_presets:delete` | ✅ | ❌ | ❌ | ❌ |
| `skills:view` | ✅ | ✅ | ✅ | ❌ |
| `skills:create` | ✅ | ❌ | ❌ | ❌ |
| `skills:update` | ✅ | ❌ | ❌ | ❌ |
| `skills:delete` | ✅ | ❌ | ❌ | ❌ |
| `skills:assign` | ✅ | ✅ | ❌ | ❌ |

---

## Lógica de Scopes

### `general_manager`
- Gestiona **su sucursal**: usuarios de su branch, turnos de su branch.
- Schedule Types solo lectura (solo admin crea/edita/borra para evitar errores).
- **Festivos**: puede gestionar los festivos de su sucursal (`branches:holidays:manage`).
- NO gestiona departments, branches (CRUD), ni settings.
- Vacaciones: ve y gestiona las de su branch.
- Webhooks: puede visualizar (`webhooks:view`) pero no gestionar envíos/configuración (`webhooks:manage` solo admin).
- Resumen semanal: usa endpoints de schedules con `schedules:view` (equipo en su scope).

### `department_manager`
- Gestiona **su departamento**: turnos de su depto, usuarios de su depto (solo editar nombre/email/teléfono, no puede cambiar branch ni rol).
- Schedule Types solo lectura.
- NO gestiona branches ni settings.
- Vacaciones: ve y gestiona las de su departamento.
- Resumen semanal: usa endpoints de schedules con `schedules:view` (equipo en su scope).

### `employee`
- Puede ver perfiles de usuarios (`users:view`) en intranet interna (sin datos sensibles).
- Solo ve turnos, tipos de turno y sucursales.
- Vacaciones: puede crear solicitudes, ver las suyas propias, cancelar las suyas propias (solo si están en estado `pending`).
- Resumen semanal: usa endpoints de schedules con `schedules:view` limitado por scope.

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
