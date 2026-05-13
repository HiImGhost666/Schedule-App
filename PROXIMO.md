# PROXIMO — Roadmap de Evolución

> Última actualización: 13 mayo 2026  
> Horizonte: corto (1-2 sprints), medio (3-5 sprints), largo (6+ sprints)

---

## 1) Plan ordenado de ejecución

### Fase A — Cierre de riesgos críticos (bloqueante)
1. Endurecer autorización/scope en:
   - `GET /api/users/:id`
   - `GET /api/users/:id/schedules`
   - `GET /api/schedules/week/:year/:week`
2. Corregir cancelación de vacaciones para employee (`cancel-own`).
3. Añadir tests de seguridad y regresión por rol.

### Fase B — Paridad funcional mínima con `schedule-app`
1. Notificaciones:
   - delete en bandeja (si se mantiene esa UX),
   - realtime en contador/lista,
   - aplicar preferencias de notificación en eventos planning/support.
2. Vacaciones:
   - búsqueda avanzada,
   - confirmar alcance de `visibleBranchIds`,
   - tratamiento uniforme de `colindante`.
3. Navegación:
   - revisar exposición de Planning según rol de negocio.

### Fase C — Arquitectura y escalabilidad
1. Refactor de `planning.manager.ts` por submódulos de dominio.
2. Optimizar consultas de matrix/equidad/timeline (menos postprocesado en memoria).
3. Añadir métricas de rendimiento por endpoint crítico.

### Fase D — Ausencias unificadas (evolución de producto)
1. Introducir módulo **Ausencias** (unificado).
2. Migrar gradualmente desde vacaciones:
   - mantener compatibilidad de API durante transición,
   - migración de datos idempotente.
3. Habilitar reportes globales de absentismo por equipo/sede/departamento.

---

## 2) Diseño recomendado — Módulo unificado de ausencias

### Tipos solicitables por empleado
- `vacaciones` (descontable, aprobación)
- `asuntos_propios` (descontable, aprobación)
- `formacion` (no descontable, aprobación)
- `permiso_retribuido` (no descontable, aprobación)
- `cumpleanos` (no descontable, aprobación, ventana ±7 días)

### Tipos gestionados por admin/manager/RRHH
- `baja_medica`
- `maternidad`
- `paternidad`
- `compensatorio`

### Tipos automáticos
- `festivo`

---

## 3) Feature propuesta: cumpleaños (solicitable)

### Reglas de negocio
- 1 solicitud por año.
- Fecha dentro de ventana `[-7, +7]` días respecto a cumpleaños real.
- Si queda fuera de rango: excepción de negocio con mensaje claro.
- Solo 1 día completo (no fraccionable).
- Requiere aprobación.
- No descuenta saldo de vacaciones.

### UX / Frontend
- Indicador visual de cumpleaños en calendario (`🎂` + color dedicado).
- Confetti en pantalla el día de cumpleaños del usuario autenticado.
- Mensajes explícitos de ventana permitida y motivo de rechazo.

### Integración en ausencias
- Tipo `cumpleanos` tratado como ausencia solicitada por employee.
- Gestionado en la misma bandeja de solicitudes.

---

## 4) Mejoras funcionales candidatas

- Centro de notificaciones unificado (in-app + webhook history + acciones rápidas).
- Dashboard de cobertura con alertas predictivas.
- Reglas configurables por empresa:
  - antelación mínima,
  - máximo consecutivo,
  - límite de ausencias simultáneas por equipo.
- Reportes:
  - absentismo mensual,
  - uso de vacaciones por departamento,
  - heatmap de conflictos.
- Gestión de adjuntos para ausencias administrativas (p. ej. parte médico).

---

## 5) Criterio para eliminar `schedule-app` (repo antiguo)

**No eliminar aún** hasta cumplir TODOS:

1. Paridad funcional P0/P1 cerrada en `restaurar_schedule`.
2. Validación completa verde:
   - backend/frontend (`typecheck`, `lint`, `test`, `build`).
3. QA manual de flujos críticos:
   - users, schedules, vacations, planning, notifications.
4. Documentación sincronizada:
   - `TODO.md`, `DONE.md`, `PERMISOS.md`, `BusinessLogic.md`, `API.md`, OpenAPI.
5. Una release estable en producción/staging sin regresiones críticas.

Cuando estos 5 puntos estén cerrados, se puede archivar o eliminar `schedule-app` con bajo riesgo.
