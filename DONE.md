# DONE - Cambios Realizados

> Registro de cambios aplicados durante la revisión del código.
> **Última actualización:** 7 mayo 2026

---

## [ST-3] Schedule Types: solo admin puede crear/editar/borrar

**Archivo modificado**: `backend/src/modules/roles/roles.constants.ts`

**Decisión final**: Para evitar errores, **solo `admin`** puede crear/editar/borrar tipos de turno. `general_manager` y `department_manager` solo pueden consultarlos (`schedule_types:read`).

**Cambio**:
```diff
  general_manager: [
    'users:view',
    'users:manage',
    'schedules:view',
    'schedules:manage',
    'schedule_types:read',
-   'schedule_types:create',
-   'schedule_types:update',
-   'schedule_types:delete',
    'branches:view',
    'settings:view',
  ],
  department_manager: [
    'users:view',
    'schedules:view',
    'schedules:manage',
    'schedule_types:read',
-   'schedule_types:create',
-   'schedule_types:update',
-   'schedule_types:delete',
    'branches:view',
  ],
```

**Impacto**: Solo `admin` tiene CRUD completo sobre Schedule Types. Ambos managers solo pueden ver la lista.

---

## [VC-1] listVacations ahora filtra por employeeId

**Archivo**: `backend/src/modules/vacations/vacations.http.schemas.ts`
**Estado**: ✅ Corregido — se añadió `employeeId: z.string().optional()` al schema y se aplica en el where del servicio.

---

## [VC-2] getVacationCalendar ahora tiene validación de permisos por rol

**Archivo**: `backend/src/modules/vacations/vacations.service.ts`
**Estado**: ✅ Corregido — ahora recibe `actor` opcional y filtra según el rol:
- `employee`: solo ve sus propias vacaciones aprobadas
- `department_manager`: solo ve vacaciones de su departamento
- `general_manager`: solo ve vacaciones de su sucursal
- `admin`: ve todo

---

## [VC-3] createVacationEntry ahora usa transacción atómica

**Archivo**: `backend/src/modules/vacations/vacations.service.ts`
**Estado**: ✅ Corregido — creación + audit log envueltos en `executeInTransaction` con `logAuditOrThrow` (rollback si falla audit).

---

## [VC-4] approveVacationEntry y rejectVacationEntry ahora usan transacción atómica

**Archivo**: `backend/src/modules/vacations/vacations.service.ts`
**Estado**: ✅ Corregido — actualización + audit log envueltos en `executeInTransaction` con `logAuditOrThrow`.

---

## [VC-5] cancelVacationEntry ahora usa transacción atómica

**Archivo**: `backend/src/modules/vacations/vacations.service.ts`
**Estado**: ✅ Corregido — actualización + audit log envueltos en `executeInTransaction` con `logAuditOrThrow`.

---

## [VC-6] Repository ahora soporta TransactionClient opcional

**Archivo**: `backend/src/modules/vacations/vacations.repository.ts`
**Estado**: ✅ Corregido — todas las funciones aceptan `tx?: TransactionClient` y usan `getDb(tx)` para elegir entre la tx o prisma global.

---

## [VC-7] Controller refactorizado con buildActor() para evitar duplicación

**Archivo**: `backend/src/modules/vacations/vacations.controller.ts`

---

## [SC-1] Schedules service ya valida branchId para GM

**Archivo**: `backend/src/modules/schedules/schedules.service.ts`
**Estado**: ✅ Verificado — las validaciones de branchId para `general_manager` ya existen en `createScheduleEntry()`, `updateScheduleEntry()` y `deleteScheduleEntry()`.

---

## [BR-1] general_manager NO tiene branches:manage

**Archivo**: `backend/src/modules/roles/roles.constants.ts`
**Estado**: ✅ Verificado — `general_manager` solo tiene `branches:view`.

---

## [BR-2] Branch CRUD solo para admin

**Archivo**: `backend/src/modules/branches/branches.router.ts`
**Estado**: ✅ Verificado — todas las rutas de creación/edición/borrado usan `requirePermission('branches:manage')`.

---

## [DP-1] Department CRUD solo para admin

**Archivo**: `backend/src/modules/departments/departments.router.ts`
**Estado**: ✅ Verificado — usa `settings:update` (solo admin).

---

## [DP-2] Departamentos multi-sucursal — GM no debe modificarlos

**Archivo**: `backend/src/modules/departments/departments.service.ts`
**Estado**: ✅ Verificado — ya implementado con `settings:update`.

---

## [SE-1] Settings/Webhooks solo para admin

**Estado**: ✅ Verificado — la configuración global requiere `settings:update`.

---

## [RP-1] Matriz de permisos correcta

**Archivo**: `backend/src/modules/roles/roles.constants.ts`
**Estado**: ✅ Verificado — la matriz actual coincide con la deseada.

---

## [Roles Router] settings:manage → settings:update

**Archivo**: `backend/src/modules/roles/roles.router.ts`
**Estado**: ✅ Corregido — POST/PATCH/DELETE ahora usan `settings:update` en vez del antiguo `settings:manage`.

---

## [Audit Router] Rollback con permiso correcto

**Archivo**: `backend/src/modules/audit/audit.router.ts`
**Estado**: ✅ Corregido — `POST /:id/rollback` ahora usa `settings:update` (solo admin) en vez de `audit:view`.

---

## [PERMISOS.md] Matriz de permisos centralizada

**Archivo creado**: `PERMISOS.md`
**Estado**: ✅ Creado — matriz completa con tabla por rol, descripción de cada permiso, lógica de scopes y notas técnicas.

---

## [TODO.md] Limpieza de tabla de permisos duplicada

**Archivo**: `TODO.md`
**Estado**: ✅ Limpiado — se removió la tabla de permisos y se agregó referencia a `PERMISOS.md`.

---

## [Seed] Sincronización automática de permisos nuevos

**Archivo**: `backend/prisma/seed.ts`
**Estado**: ✅ Corregido — ahora sincroniza permisos incluso si la BD ya tiene datos (upsert + connect a roles existentes).

---

## [Roles API.md] Lista de permisos actualizada

**Archivo**: `backend/src/modules/roles/API.md`
**Estado**: ✅ Corregido — permisos antiguos `vacations:request`/`vacations:approve` reemplazados por los 6 nuevos permisos CRUD.
