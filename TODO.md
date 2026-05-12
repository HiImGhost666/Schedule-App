# TODO

> **Última actualización:** 12 mayo 2026
> Estado revisado contra la implementación actual. Los puntos cerrados fueron movidos a `DONE.md`.

---

## 🟡 Prioridad Baja — Hardening Pendiente

### VUL-5 — Validación de ownership en webhooks
- [ ] **Pendiente condicionado**: reforzar validaciones de ownership/scope para operaciones sobre webhooks si el producto se endurece para multi-tenant estricto.
  - **Contexto**: Hoy el sistema ya usa permisos por endpoint y scopes de webhook por sucursal/departamento. Esta tarea queda como hardening adicional.
  - **Criterio**: ningún rol puede leer, actualizar, eliminar o enviar a un webhook fuera de su alcance operativo.
  - **Tests sugeridos**: casos de GM/DM intentando operar webhooks de otra sucursal/departamento.

### VUL-10 — Límite de sesiones concurrentes
- [ ] **Pendiente condicionado**: limitar o auditar sesiones concurrentes por usuario.
  - **Contexto**: `VUL-9` ya cubre `tokenVersion`, logout e invalidación de sesiones antiguas tras cambios críticos. Esta tarea queda como política adicional de concurrencia.
  - **Criterio**: definir si se permite multi-dispositivo o si debe existir límite por usuario/rol.
  - **Tests sugeridos**: emisión de múltiples tokens, invalidación selectiva y logout remoto.

---

## 🧪 Validación Final Recomendable

- [ ] Ejecutar suite completa backend antes del siguiente commit estable.
- [ ] Ejecutar suite completa frontend antes del siguiente commit estable.
- [ ] Hacer una validación manual mínima de:
  - calendario de schedules por rol,
  - vacaciones por rol,
  - envíos manuales de notificaciones por scope,
  - auditoría y rollback,
  - settings/theme/site favicon.

---

## 📝 Notas

- `DESIGN.md` ya no existe. El criterio frontend vigente es: páginas padre como contenedores de estado/datos/mutaciones y `DataTable` configurable por columnas/acciones cuando el layout es tabular. No crear wrappers por cada tabla salvo que reduzcan complejidad real.
- La regla de calendario para `employee` fue actualizada: el empleado ve el calendario completo de su branch como los managers, pero no puede salir de su sucursal.
