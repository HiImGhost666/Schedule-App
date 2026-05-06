# DONE - Cambios Realizados

> Registro de cambios aplicados durante la revisión del merge.

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

## [TODO.md] Revisión completa y actualización del inventario de issues

**Archivo modificado**: `TODO.md`

**Cambios realizados**:
1. **Nueva sección "🧠 Modelo de Negocio"** al inicio con la matriz de permisos deseada y la lógica detrás de cada decisión.
2. **SC-1 corregido**: Se verificó que la validación de branchId para `general_manager` **YA EXISTE** en `schedules.service.ts`. Se movió a "✅ Ya verificados como correctos".
3. **US-1/RP-2 documentado**: Sigue siendo 🔴 Alta — la validación de branchId para GM **NO EXISTE** en `users.service.ts`. Es el único breach de seguridad real pendiente.
4. **Sección "✅ Ya verificados como correctos"** al final.
5. **Matriz de permisos final**: Schedule Types solo admin CRUD, managers solo lectura.
6. **RP-1 marcado como correcto**: La matriz de permisos actual coincide con la deseada.
