# TODO

> **Última actualización:** 13 mayo 2026
> Backlog consolidado tras auditoría completa de `restaurar_schedule` + comparación de paridad con `schedule-app`.

---

## 🔴 Prioridad Crítica (P0) — Seguridad / Bloqueantes de migración

### 1) Definir política de visibilidad en intranet (perfiles vs horarios)
- [x] **Perfiles (`GET /api/users/:id`)**: mantener visibles para todos los usuarios autenticados (intranet interna), sin exponer datos sensibles.
- [x] **Horarios (`GET /api/users/:id/schedules`)**: aplicar regla acordada de scope:
  - `admin`: ve todas las sucursales,
  - `GM`/`DM`/`employee`: ven `branchId` propio + sucursales adicionales en `visibleBranchIds` (si existen),
  - mantener separación de sucursales por defecto (sin `visibleBranchIds` no hay acceso cross-branch).
- [x] Añadir tests de autorización según la política final acordada.

### 2) Corregir bug en cancelación de vacaciones para employee
- [x] Ajustar `cancelVacationEntry()` para distinguir correctamente `cancel-own` vs `cancel-all-in-scope`.
- [x] Mantener regla: employee solo cancela solicitudes propias en `pending`/`colindante`.
- [x] Añadir tests de regresión.
- **Estado:** corregido con tests de regresión para `pending` y `colindante`.

### 3) Cerrar merge/validación de rama y evitar regresiones
- [ ] Ejecutar validación completa antes de próximo push estable:
  - backend: `npm run typecheck && npm run lint && npm run test && npm run build`
  - frontend: `npm run typecheck && npm run lint && npm run test && npm run build`

---

## 🟠 Prioridad Alta (P1) — Paridad funcional y permisos

### 4) Alinear permisos de rutas users/schedules
- [x] Añadir `requirePermission('users:view')` en `GET /api/users/:id`.
- [x] Añadir `requirePermission('schedules:view')` en `GET /api/schedules/week/:year/:week`.
- [x] Confirmar y documentar permisos de rutas `alerts`, `:id`, `weekly-summary/me`.

### 5) Notificaciones: recuperar paridad UX con `schedule-app`
- [x] Evaluar e implementar (si aplica al producto final):
  - [x] delete de notificación en bandeja,
  - [x] realtime para contador/lista,
  - [x] respeto de preferencias de notificación para eventos de planning/support.
- [x] Añadir pruebas de integración frontend/backend para estos flujos:
  - Backend: `test/in-app-notifications.router.test.ts` (HTTP sobre todas las rutas).
  - Frontend: `useInAppNotifications.test.tsx`, `NotificationPanel.test.tsx`, `TopBar.test.tsx` (refresh + wiring con hook).

### 6) Vacations: completar gaps de alcance y UX
- [x] Revisar soporte completo de `visibleBranchIds` en vistas/consultas para employee.
- [x] Añadir búsqueda (`search`) en listado de vacaciones.
- [x] Política actual documentada en `PERMISOS.md`: la API solo crea solicitudes para el usuario autenticado (sin `employeeId` en body); no hay creación en nombre de terceros salvo evolución futura con contrato dedicado.
- [x] Estandarizar tratamiento de estado `colindante` en UI: badge con `title` explicativo, filtro en `VacationsPage` y copia en `VacationRequestModal`.

#### 6.1) `visibleBranchIds` — lógica objetivo (scope multi-sucursal)
- [x] Definir regla base: `visibleBranchIds` amplía visibilidad de datos, no permisos de acción (documentado en `PERMISOS.md`).
- [x] Implementar helper backend único (`getActorVisibleBranchIds`) y reutilizarlo en:
  - schedules (`listSchedulesForActor`, `listWeekSchedulesForActor`, `getScheduleByIdForActor`),
  - vacations (`buildVacationScope`, calendario),
  - users (filtros de listado cuando aplique intranet + scope operativo).
- [x] Mantener excepción explícita: `admin` ve todo; otros roles ven `branchId` propio + `visibleBranchIds`.
- [x] Asegurar coherencia con la política de schedules/vacations/planning: mismo cálculo de scope para lectura en todos los módulos.
- [x] Validar en mutaciones: no permitir operar sobre branches fuera de ese conjunto visible.
- [x] Añadir tests de regresión:
  - GM/DM/employee con `visibleBranchIds` múltiples,
  - actor sin `visibleBranchIds`,
  - intento de acceso fuera de scope visible.

#### 6.2) Edición frontend de `visibleBranchIds`
- [x] Confirmar UX actual de `UserFormModal` (multiselect de sucursales visibles) para create/update.
- [x] Añadir feedback visual de alcance efectivo:
  - “Sucursal base” vs “Sucursales visibles adicionales”.
- [x] Restringir edición según rol (ejemplo recomendado):
  - admin: puede editar libremente,
  - GM: solo branches dentro de su alcance,
  - DM/employee: sin edición de `visibleBranchIds`.
- [x] Añadir tests frontend (smoke/form submit) cubriendo payload con `visibleBranchIds`.

### 7) Navegación y accesibilidad de Planning
- [x] Verificar rutas/menús: en `Sidebar.tsx`, **Planificación** (`/admin/planning`) aparece en administración para `admin` (ítems completos) y para **GM/DM** junto con usuarios, skills, tipos de turno, festivos y notificaciones (subconjunto); **employee** no ve bloque admin.
- [ ] Confirmar decisión de producto si GM/DM deben seguir viendo Planning en admin o moverlo / restringirlo de otro modo.

---

## 🟡 Prioridad Media (P2) — Arquitectura y escalabilidad

### 8) Refactor por responsabilidades en módulo Planning
- [ ] Dividir `planning.manager.ts` por capacidades:
  - availability/matrix,
  - equity/timeline/crisis,
  - support requests,
  - comments,
  - notification preferences.
- [ ] Mantener patrón Router → Controller → Service → Manager/Repository → Validation.

### 9) Optimización de consultas de Planning para escala
- [ ] Reducir filtrado masivo en memoria (agregaciones por `userId`, queries más específicas, pre-índices).
- [ ] Medir tiempos en endpoints de matrix/equity/timeline con dataset grande.

### 10) Drift de documentación vs implementación
- [ ] Sincronizar `PERMISOS.md`, `BusinessLogic.md`, `API.md` por módulo y OpenAPI estático cada vez que cambie RBAC o rutas.
- [ ] Añadir checklist en PR para evitar desalineación.

---

## 🟢 Prioridad Estratégica (P3) — Evolución funcional

### 11) Migrar de “Vacaciones” a “Ausencias” unificadas (arquitectura recomendada)
- [ ] Diseñar modelo unificado de ausencias:
  - solicitables por empleado: `vacaciones`, `asuntos_propios`, `formacion`, `permiso_retribuido`, `cumpleanos`;
  - gestionadas por admin/rrhh: `baja_medica`, `maternidad`, `paternidad`, `compensatorio`;
  - automáticas: `festivo`.
- [ ] Definir políticas configurables (antelación mínima, máximos, límites por equipo, periodos de bloqueo).
- [ ] Diseñar migración de datos y compatibilidad retroactiva.

### 12) Feature cumpleaños (solicitable)
- [ ] Añadir fecha de nacimiento a usuario (si no existe) y saldo anual de “día de cumpleaños”.
- [ ] Regla: solicitud movible solo en ventana `-7/+7` días del cumpleaños (con validación y excepción clara fuera de rango).
- [ ] Integrar visualmente en calendario y notificaciones (incluyendo confetti en UI el día del cumpleaños).
- [ ] Añadir pruebas de edge-cases (29 febrero, fin de semana/festivo, ya usado en año vigente).

---

## 🧪 Validación manual mínima (al cierre de sprint)

- [ ] Calendario de schedules por rol (admin/GM/DM/employee).
- [ ] Vacaciones y comentarios/support en planning.
- [ ] Scope de notificaciones/webhooks por branch/departamento.
- [ ] Auditoría y rollback de operaciones críticas.
- [ ] Navegación y protección de rutas en frontend.

---

## 📝 Notas

- `schedule-app` se mantiene temporalmente como referencia funcional; no eliminar hasta cumplir criterios de retiro definidos en `PROXIMO.md`.
- Criterio frontend vigente: páginas padre como contenedores de estado/datos/mutaciones + componentes presentacionales reutilizables.
