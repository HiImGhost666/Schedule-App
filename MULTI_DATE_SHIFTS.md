# Planificación de turnos por múltiples fechas

## Resumen
Este cambio reemplaza los campos antiguos de Inicio/Fin en el modal de turnos por un mini calendario que permite seleccionar varios días. Cada día usa un preset base de turno y se puede sobrescribir el preset por día. Luego el sistema crea uno o varios turnos en el backend para que el calendario principal muestre el resultado correcto.

El objetivo es:
- Seleccionar días no consecutivos (por ejemplo: lunes, martes y jueves).
- Mantener un preset base de turno (temporal) y permitir cambios por día.
- Unir días consecutivos con el mismo preset en un turno continuo para que el calendario muestre un solo bloque.
- Crear turnos separados si los días no son consecutivos o usan presets distintos.

## Flujo en frontend (ShiftModal)
Ubicación: `frontend/src/components/schedule/ShiftModal.tsx`

1) **Selección de fechas**
- Un botón abre un mini calendario (multi-select) para elegir varios días.
- Los días elegidos se muestran como lista con controles por día.
- Si se quita un día, su override de turno se elimina automáticamente.

2) **Presets de turno**
- Se elige un preset base una sola vez (lista temporal: Turno mañana, Turno tarde, Turno noche).
- Para cada día se puede sobrescribir el preset (o mantener el base).
- Cada preset define `startTime` y `endTime`, usados para calcular los datetimes finales.

3) **Agrupación y unión**
- Los días seleccionados se agrupan en bloques consecutivos si comparten el mismo preset.
- Cada bloque se convierte en un solo turno con rango continuo.
- Presets distintos o días no consecutivos generan turnos separados.

4) **Envío**
- Si no hay días seleccionados, el modal bloquea el envío.
- Si se edita un turno existente, solo se permite un bloque continuo.
- Al crear turnos nuevos, el modal envía una petición bulk.

## Lógica auxiliar
Ubicación: `frontend/src/components/schedule/shiftScheduling.ts`

Helpers principales:
- `normalizeDate`: limpia la hora a medianoche UTC para comparar fechas.
- `buildScheduleChunks`: agrupa días consecutivos por preset.
- `buildChunkRange`: genera start/end Date para un bloque y un preset.
- `getPresetDurationHours`: calcula horas para el resumen y `hoursPerDay`.

### ⚠️ Importante: Manejo de zona horaria
Todas las funciones en `shiftScheduling.ts` trabajan con fechas **UTC midnight** (normalizadas con `normalizeDate`). Es crítico usar **setters/getters UTC** (`setUTCDate`, `getUTCDate`, `setUTCHours`) en lugar de los locales (`setDate`, `getDate`) para evitar desviaciones por zona horaria.

**Problema conocido**: `cursor.setDate(cursor.getDate() + 1)` sobre una fecha UTC en zona horaria UTC+1 provoca que el cursor se desplace a las 23:00 UTC del día anterior en lugar de 00:00 UTC del día siguiente. Esto causa:
- Duplicación del primer día en rangos
- Omisión del último día del rango

**Fix**: Usar `cursor.setUTCDate(cursor.getUTCDate() + 1)` en su lugar.

### FullCalendar: Fecha fin exclusiva
FullCalendar proporciona `DateSelectArg.end` como fecha **exclusiva** (el día después de la selección). Al recibir este valor en `SchedulePage.tsx`, se debe restar un día antes de pasarlo al modal:

```typescript
const adjustedEnd = new Date(info.end);
adjustedEnd.setDate(adjustedEnd.getDate() - 1);
setDefaultEnd(adjustedEnd);
```

Esto mantiene la lógica de la vista pequeña y fácil de testear.


## Flujo en backend (creación bulk)
Ubicaciones:
- `backend/src/modules/schedules/schedules.router.ts`
- `backend/src/modules/schedules/schedules.controller.ts`
- `backend/src/modules/schedules/schedules.service.ts`
- `backend/src/modules/schedules/schedules.http.schemas.ts`

Nuevo endpoint:
- `POST /schedules/bulk`
- Body: `{ items: [ scheduleInput, scheduleInput, ... ] }`

Comportamiento:
- Cada item se valida con las mismas reglas del alta individual.
- Se rechazan overlaps dentro del mismo lote antes de insertar.
- Cada item valida overlaps contra turnos existentes.
- Todas las inserciones se ejecutan en una sola transacción.
- Se generan notificaciones realtime y logs de auditoría por turno.

## Visualización en calendario
Ubicación: `frontend/src/pages/SchedulePage.tsx`

No se necesitaron cambios de vista porque el calendario ya espera:
- `startDatetime` y `endDatetime` por turno
- varios turnos se renderizan como varios eventos
- un bloque unido se renderiza como un evento de rango largo

### Filtros por departamento en SchedulePage
La SchedulePage ahora incluye un selector de departamento que permite filtrar los turnos visibles en el calendario. Cuando se selecciona un departamento, se pasa `departmentId` en la query de schedules y se incluye en la `queryKey` para refetch automático.

**Comportamiento por rol:**
- **admin**: puede seleccionar cualquier departamento
- **general_manager**: puede seleccionar departamentos de su sucursal
- **department_manager**: puede seleccionar departamentos (filtro adicional a su depto base)
- **employee**: puede seleccionar departamentos de su sucursal

## Festivos y conflictos
- El modal verifica los días seleccionados contra festivos de la sucursal.
- Si hay festivos, se muestra un diálogo de confirmación.
- Al confirmar se envía `confirmed: true` para permitir la creación.

## Tests
- `frontend/test/shiftScheduling.test.ts` valida agrupación y rangos.
- `backend/test/schedules.test.ts` incluye alta bulk y overlaps.

## Cómo probarlo
1) Abre la página de turnos y crea un nuevo turno.
2) Selecciona varios días en el mini calendario.
3) Elige un preset base y sobrescribe algunos días.
4) Envía y confirma que:
   - días consecutivos con el mismo preset aparecen como un solo evento
   - días no consecutivos o presets distintos aparecen como eventos separados

## Limitaciones conocidas y siguientes pasos
- La lista de presets es temporal y está hardcodeada en el modal.
- Todavía no hay horas personalizadas por día (solo presets por día).
- La edición solo soporta rango continuo para evitar partir un solo turno.

Si quieres, el siguiente paso puede ser reemplazar los presets hardcodeados por datos del backend (Schedule Types o una entidad de Shift Preset).

