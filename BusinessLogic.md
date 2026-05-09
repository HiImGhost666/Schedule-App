# Business Logic — Schedule App

> **Última actualización:** 9 mayo 2026
> **Propósito:** Documentar todas las decisiones de negocio sobre permisos, enjaulamiento de usuarios, mutaciones, vulnerabilidades identificadas y acciones faltantes.

---

## 1. Modelo de Permisos

### 1.1 Arquitectura
- **RBAC (Role-Based Access Control)** con 4 roles: `admin`, `general_manager`, `department_manager`, `employee`
- Los permisos se almacenan en BD (tabla `permissions`) y se asignan a roles (tabla `_PermissionToRole`)
- El middleware `requirePermission()` verifica que el usuario tenga **todos** los permisos requeridos en la ruta
- La validación de **scope** (branch/departamento) se realiza en la **capa de servicio**, no en el middleware

### 1.2 Matriz de Permisos (resumen)
| Área | admin | general_manager | department_manager | employee |
|------|-------|-----------------|-------------------|----------|
| Usuarios CRUD | ✅ Total | ✅ Scope branch | ✅ Scope depto (solo update) | ❌ |
| Schedules CRUD | ✅ Total | ✅ Scope branch | ✅ Scope depto | ❌ (solo view) |
| Schedule Types CRUD | ✅ Total | ❌ (solo read) | ❌ (solo read) | ❌ (solo read) |
| Branches CRUD | ✅ Total | ❌ (solo view) | ❌ (solo view) | ❌ (solo view) |
| Holidays manage | ✅ Total | ✅ Scope branch | ❌ | ❌ |
| Departments CRUD | ✅ Total | ❌ (solo view) | ❌ (solo view) | ❌ |
| Settings | ✅ Total | ❌ (solo view) | ❌ | ❌ |
| Audit | ✅ Total | ❌ | ❌ | ❌ |
| Vacaciones | ✅ Total | ✅ Scope branch | ✅ Scope depto | ✅ (solo propias) |
| Webhooks | ✅ Total | ❌ | ❌ | ❌ |
| Notifications | ✅ Total | ✅ (solo view) | ❌ | ❌ |
| Weekly Summary | ✅ Total | ✅ Scope branch | ✅ Scope depto | ✅ (solo propias) |

> **Ver matriz completa en `PERMISOS.md`**

---

## 2. Enjaulamiento de Usuarios por Scope

### 2.1 General Manager
- **Branch asignada**: El GM tiene un `branchId` en su perfil. Todas las operaciones CRUD están limitadas a esa sucursal.
- **Usuarios**: Solo ve/crea/edita/elimina usuarios de su branch. `assertUserScope()` verifica que `targetScope.branchId === actor.branchId`.
- **Schedules**: Solo ve/crea/edita/elimina schedules de su branch. `listSchedulesForActor()` fuerza `where.branchId = actor.branchId`.
- **Vacaciones**: Solo ve y gestiona solicitudes de su branch. `buildVacationScope()` fuerza `where.branchId = actor.branchId`.
- **Festivos**: Puede gestionar festivos de su branch (`branches:holidays:manage`).
- **Resumen semanal**: Ve el de su equipo (scope branch).

### 2.2 Department Manager
- **Departamento asignado**: El DM tiene un `departmentId` en su perfil. Las operaciones están limitadas a su departamento.
- **Usuarios**: Solo puede **editar** usuarios de su departamento (nombre, email, teléfono). NO puede cambiar `branchId` ni `role`. `validateDmUpdateRestrictions()` lo impide.
- **Schedules**: Solo ve/crea/edita/elimina schedules de su departamento. `ensureDepartmentManagerAssignees()` verifica que todos los asignados pertenezcan a su depto.
- **Vacaciones**: Solo ve y gestiona solicitudes de su departamento.
- **NO puede**: Crear/eliminar usuarios, gestionar branches, settings, webhooks, schedule types (solo lectura).

### 2.3 Employee
- **Branch asignada**: El employee tiene un `branchId`. Solo ve datos de su sucursal.
- **Schedules**: Solo ve schedules de su branch donde está asignado. `listSchedulesForActor()` fuerza `where.branchId = actor.branchId` y `where.assignments.some.userId = actor.id`.
- **Vacaciones**: Solo puede crear solicitudes, ver las suyas y cancelar las suyas (solo si están en `pending`).
- **NO puede**: Crear/editar/eliminar schedules, gestionar usuarios, branches, departments, settings, webhooks.

---

## 3. Mutaciones y Transacciones

### 3.1 Patrón de Mutación
Todas las mutaciones críticas siguen este flujo:
1. **Validación de input** (Zod schema)
2. **Validación de permisos** (middleware `requirePermission`)
3. **Validación de scope** (servicio: `assertUserScope`, `ensureBranchScope`, etc.)
4. **Ejecución en transacción** (`executeInTransaction`)
5. **Log de auditoría** (`logAuditOrThrow`)
6. **Evento en tiempo real** (`publishRealtimeEvent`)
7. **Notificación** (webhook) — no bloqueante
8. **Recálculo de resúmenes** — no bloqueante

### 3.2 Mutaciones Implementadas

| Acción | Módulo | Transacción | Audit Log | Realtime | Notificación |
|--------|--------|-------------|-----------|----------|--------------|
| Crear usuario | Users | ✅ | ✅ | ✅ | ❌ |
| Actualizar usuario | Users | ✅ | ✅ | ✅ | ❌ |
| Cambiar estado usuario | Users | ✅ | ✅ | ✅ | ❌ |
| Cambiar rol usuario | Users | ✅ | ✅ | ✅ | ❌ |
| Resetear password | Users | ✅ | ✅ | ❌ | ❌ |
| Forzar cambio password | Users | ✅ | ✅ | ❌ | ❌ |
| Eliminar usuario | Users | ✅ | ✅ | ✅ | ❌ |
| Crear schedule | Schedules | ✅ | ✅ | ✅ | ✅ |
| Actualizar schedule | Schedules | ✅ | ✅ | ✅ | ✅ |
| Eliminar schedule | Schedules | ✅ | ✅ | ✅ | ✅ |
| Crear branch | Branches | ✅ | ✅ | ❌ | ❌ |
| Actualizar branch | Branches | ✅ | ✅ | ❌ | ❌ |
| Eliminar branch | Branches | ✅ | ✅ | ❌ | ❌ |
| Asignar branch manager | Branches | ✅ | ✅ | ❌ | ❌ |
| Remover branch manager | Branches | ✅ | ✅ | ❌ | ❌ |
| Crear festivo | Branches | ✅ | ✅ | ❌ | ❌ |
| Actualizar festivo | Branches | ✅ | ✅ | ❌ | ❌ |
| Eliminar festivo | Branches | ✅ | ✅ | ❌ | ❌ |
| Bulk update festivos | Branches | ✅ | ✅ | ❌ | ❌ |
| Bulk delete festivos | Branches | ✅ | ✅ | ❌ | ❌ |
| Solicitar vacaciones | Vacations | ✅ | ✅ | ❌ | ✅ |
| Aprobar vacaciones | Vacations | ✅ | ✅ | ❌ | ✅ |
| Rechazar vacaciones | Vacations | ✅ | ✅ | ❌ | ✅ |
| Cancelar vacaciones | Vacations | ✅ | ✅ | ❌ | ✅ |

### 3.3 Mutaciones Faltantes

| Acción | Módulo | Prioridad | Notas |
|--------|--------|-----------|-------|
| Notificar al empleado al aprobar/rechazar vacaciones | Vacations | Media | Actualmente solo webhook, no hay notificación push/email |
| Recalcular resumen semanal al aprobar vacaciones | Vacations | Baja | Las vacaciones aprobadas deberían restar horas disponibles |
| Notificar al empleado al crear schedule | Schedules | Baja | Actualmente solo webhook |
| Rate limiting en login | Auth | **Alta** | Vulnerabilidad de fuerza bruta |
| Logout (invalidar token) | Auth | Media | Los tokens JWT no se invalidan al cerrar sesión |

---

## 4. Vulnerabilidades Identificadas

### 4.1 Críticas

| ID | Descripción | Impacto | Fix |
|----|-------------|---------|-----|
| **VUL-1** | Employee puede ver schedules de otros empleados de su branch si pasa `userId` en query params | Medio — employee puede ver turnos ajenos | Forzar `userId = actor.id` en `listSchedulesForActor` para employee |
| **VUL-2** | `listWeekSchedulesForActor` para employee pasa `actor.branchId` como `userId` en vez de `actor.id` | **Alto** — bug que filtra por branchId incorrecto | Cambiar `userId \|\| actor.branchId` → `userId \|\| actor.id` |
| **VUL-3** | Endpoint `GET /schedules` (sin actor) usa `listSchedules` sin restricción de rol | Medio — cualquiera con token puede listar schedules | Migrar a `listSchedulesForActor` |
| **VUL-4** | No hay rate limiting en login | **Alto** — ataque de fuerza bruta | Añadir `express-rate-limit` al endpoint de login |
| **VUL-5** | No hay validación de ownership en webhooks | Bajo — solo admin puede gestionar webhooks, pero no hay tenant isolation | Añadir verificación de organización si se implementa multi-tenant |

### 4.2 Medias

| ID | Descripción | Impacto | Fix |
|----|-------------|---------|-----|
| **VUL-6** | No se valida que assigneeIds existan al crear schedule | Bajo — si se pasa un ID inexistente, Prisma lanza error | Validar existencia antes de crear |
| **VUL-7** | Employee puede cancelar vacaciones de otros si obtiene permiso `vacations:approve` | Bajo — employee no tiene ese permiso por defecto | Añadir verificación de rol en servicio además de permisos |
| **VUL-8** | No hay sanitización de HTML en campos de texto (name, notes, etc.) | Bajo — riesgo de XSS si se renderiza sin escape | Añadir sanitización al renderizar en frontend |

### 4.3 Bajas

| ID | Descripción | Impacto | Fix |
|----|-------------|---------|-----|
| **VUL-9** | Los tokens JWT no se invalidan al cambiar contraseña | Bajo — el token sigue siendo válido hasta que expire | Añadir `tokenVersion` en BD y verificar en auth middleware |
| **VUL-10** | No hay límite de sesiones concurrentes por usuario | Bajo — un usuario puede tener múltiples sesiones activas | Implementar límite de sesiones si es necesario |

---

## 5. Decisiones de Negocio Clave

### 5.1 Schedule Types solo lectura para no-admin
- **Decisión**: Solo admin puede crear/editar/eliminar tipos de turno. GM y DM solo lectura.
- **Motivación**: Los tipos de turno son configuración global del sistema. Permitir que GM/DM los modifique podría causar inconsistencias entre sucursales.

### 5.2 Department Manager no puede cambiar branchId ni role de usuarios
- **Decisión**: DM puede editar usuarios de su departamento pero no cambiar su sucursal ni su rol.
- **Motivación**: El DM gestiona personas de su equipo, no la estructura organizativa. Cambiar branch/rol es responsabilidad del GM o admin.

### 5.3 Vacaciones con estado "colindante"
- **Decisión**: Si un empleado solicita vacaciones que se solapan con las de un compañero del mismo departamento, la solicitud se crea con estado `colindante` en lugar de `pending`.
- **Motivación**: El sistema alerta al manager sobre el solapamiento para que tome una decisión informada. No bloquea automáticamente.

### 5.4 Soft-delete de usuarios
- **Decisión**: Al eliminar un usuario, se modifica su email a `deleted_{timestamp}_{email}` y se desactiva.
- **Motivación**: Preservar la integridad referencial de schedules, vacaciones y auditoría histórica.

### 5.5 Notificaciones no bloqueantes
- **Decisión**: Las notificaciones (webhooks, recálculo de resúmenes) se ejecutan con `.catch(() => {})` fuera de la transacción.
- **Motivación**: Un fallo en la notificación no debe causar rollback de la operación principal.

### 5.6 Festivos agrupados en vista global
- **Decisión**: Cuando se consultan festivos de "todas las sucursales" con `groupShared=true`, los festivos con misma fecha, nombre y tipo se agrupan en un solo registro.
- **Motivación**: Evitar duplicados en el calendario cuando un festivo nacional/regional aplica a múltiples sucursales.

### 5.7 Branch obligatoria para employees
- **Decisión**: Todo employee debe tener un `branchId` asignado. Sin branch, no puede ver schedules ni solicitar vacaciones.
- **Motivación**: El sistema está diseñado para entornos multi-sucursal. Un employee sin sucursal no tiene contexto operativo.

---

## 6. Acciones que Podrían Faltar

### 6.1 Backend
- [ ] **Rate limiting en login** — `express-rate-limit` para evitar fuerza bruta
- [ ] **Logout endpoint** — invalidar token JWT (añadir `tokenVersion` en BD)
- [ ] **Notificar al empleado** cuando se aprueba/rechaza su solicitud de vacaciones
- [ ] **Validar assigneeIds** antes de crear schedule (verificar que existan en BD)
- [ ] **Recalcular resumen semanal** al aprobar vacaciones (restar horas disponibles)
- [ ] **Endpoint de health check** para monitoreo
- [ ] **Documentación OpenAPI/Swagger** de la API REST

### 6.2 Frontend
- [ ] **Mensaje claro** cuando employee no tiene sucursal asignada (SchedulePage vacía)
- [ ] **Notificaciones push** para eventos de vacaciones (aprobación/rechazo)
- [ ] **Indicador de carga** en todas las páginas (skeleton loaders)
- [ ] **Manejo de error 403** con mensaje descriptivo (no solo "No autorizado")
- [ ] **Confirmación** antes de crear schedule en día festivo (ya implementado en backend, verificar frontend)

### 6.3 Tests
- [ ] **Test de seguridad**: employee no puede ver schedules de otros empleados
- [ ] **Test de integración**: schedules con roles (admin, GM, DM, employee)
- [ ] **Test de scope**: GM no puede ver schedules de otra branch
- [ ] **Test de vacaciones**: DM no puede aprobar vacaciones de otro departamento

---

## 7. Reglas de Negocio por Módulo

### 7.1 Schedules
- No se pueden crear turnos en días festivos (excepto tipos `vacaciones`, `ausencia`, `otro`, `excepcion`)
- Si `confirmed=true`, se salta la validación de festivos (permite horas extra en festivos)
- No se permiten solapamientos de horarios para un mismo empleado
- Los turnos de última hora (`isLastMinute`) se detectan automáticamente si se crean con menos de 24h de antelación
- GM solo puede crear/editar/eliminar turnos de su branch
- DM solo puede crear/editar/eliminar turnos de su departamento
- Employee no puede crear/editar/eliminar turnos

### 7.2 Vacaciones
- La fecha de inicio no puede ser pasada
- La fecha de inicio debe ser anterior o igual a la fecha de fin
- No se pueden crear solicitudes con fechas solapadas a una solicitud pendiente propia
- Si hay solapamiento con compañeros del mismo departamento, la solicitud se marca como `colindante`
- Solo se pueden aprobar/rechazar solicitudes en estado `pending` o `colindante`
- Employee solo puede cancelar sus propias solicitudes en estado `pending`
- Manager/admin puede cancelar cualquier solicitud de su scope (en cualquier estado)

### 7.3 Usuarios
- El email debe ser único (soft-delete modifica el email para liberarlo)
- El `employeeId` se asigna automáticamente y no puede modificarse manualmente
- DM no puede cambiar `branchId` ni `role` de un usuario
- No se puede eliminar la propia cuenta
- No se puede cambiar el propio estado
- No se puede forzar cambio de contraseña sobre la propia cuenta
- Al resetear password, se fuerza cambio de contraseña en el próximo login

### 7.4 Branches
- Debe existir al menos una sucursal activa
- No se puede eliminar una sucursal con departamentos asociados
- No se puede eliminar definitivamente una sucursal con turnos asociados
- El código de sucursal debe ser único
- Al asignar un branch manager, si el usuario no tiene rol `general_manager`, se le otorga automáticamente
- Al remover un branch manager, si no es manager de otras sucursales, se le asigna rol `employee`
