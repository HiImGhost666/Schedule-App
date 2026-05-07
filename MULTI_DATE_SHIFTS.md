# Planificacion de turnos por multiples fechas

## Resumen
Este cambio reemplaza los campos antiguos de Inicio/Fin en el modal de turnos por un mini calendario que permite seleccionar varios dias. Cada dia usa un preset base de turno y se puede sobrescribir el preset por dia. Luego el sistema crea uno o varios turnos en el backend para que el calendario principal muestre el resultado correcto.

El objetivo es:
- Seleccionar dias no consecutivos (por ejemplo: lunes, martes y jueves).
- Mantener un preset base de turno (temporal) y permitir cambios por dia.
- Unir dias consecutivos con el mismo preset en un turno continuo para que el calendario muestre un solo bloque.
- Crear turnos separados si los dias no son consecutivos o usan presets distintos.

## Flujo en frontend (ShiftModal)
Ubicacion: frontend/src/components/schedule/ShiftModal.tsx

1) Seleccion de fechas
- Un boton abre un mini calendario (multi-select) para elegir varios dias.
- Los dias elegidos se muestran como lista con controles por dia.
- Si se quita un dia, su override de turno se elimina automaticamente.

2) Presets de turno
- Se elige un preset base una sola vez (lista temporal: Turno manana, Turno tarde, Turno noche).
- Para cada dia se puede sobrescribir el preset (o mantener el base).
- Cada preset define startTime y endTime, usados para calcular los datetimes finales.

3) Agrupacion y union
- Los dias seleccionados se agrupan en bloques consecutivos si comparten el mismo preset.
- Cada bloque se convierte en un solo turno con rango continuo.
- Presets distintos o dias no consecutivos generan turnos separados.

4) Envio
- Si no hay dias seleccionados, el modal bloquea el envio.
- Si se edita un turno existente, solo se permite un bloque continuo.
- Al crear turnos nuevos, el modal envia una peticion bulk.

## Logica auxiliar
Ubicacion: frontend/src/components/schedule/shiftScheduling.ts

Helpers principales:
- normalizeDate: limpia la hora a medianoche para comparar fechas.
- buildScheduleChunks: agrupa dias consecutivos por preset.
- buildChunkRange: genera start/end Date para un bloque y un preset.
- getPresetDurationHours: calcula horas para el resumen y hoursPerDay.

Esto mantiene la logica de la vista pequena y facil de testear.

## Flujo en backend (creacion bulk)
Ubicaciones:
- backend/src/modules/schedules/schedules.router.ts
- backend/src/modules/schedules/schedules.controller.ts
- backend/src/modules/schedules/schedules.service.ts
- backend/src/modules/schedules/schedules.http.schemas.ts

Nuevo endpoint:
- POST /schedules/bulk
- Body: { items: [ scheduleInput, scheduleInput, ... ] }

Comportamiento:
- Cada item se valida con las mismas reglas del alta individual.
- Se rechazan overlaps dentro del mismo lote antes de insertar.
- Cada item valida overlaps contra turnos existentes.
- Todas las inserciones se ejecutan en una sola transaccion.
- Se generan notificaciones realtime y logs de auditoria por turno.

## Visualizacion en calendario
Ubicacion: frontend/src/pages/SchedulePage.tsx

No se necesitaron cambios de vista porque el calendario ya espera:
- startDatetime y endDatetime por turno
- varios turnos se renderizan como varios eventos
- un bloque unido se renderiza como un evento de rango largo

## Festivos y conflictos
- El modal verifica los dias seleccionados contra festivos de la sucursal.
- Si hay festivos, se muestra un dialogo de confirmacion.
- Al confirmar se envia confirmed: true para permitir la creacion.

## Tests
- frontend/test/shiftScheduling.test.ts valida agrupacion y rangos.
- backend/test/schedules.test.ts incluye alta bulk y overlaps.

## Como probarlo
1) Abre la pagina de turnos y crea un nuevo turno.
2) Selecciona varios dias en el mini calendario.
3) Elige un preset base y sobrescribe algunos dias.
4) Envia y confirma que:
   - dias consecutivos con el mismo preset aparecen como un solo evento
   - dias no consecutivos o presets distintos aparecen como eventos separados

## Limitaciones conocidas y siguientes pasos
- La lista de presets es temporal y esta hardcoded en el modal.
- Todavia no hay horas personalizadas por dia (solo presets por dia).
- La edicion solo soporta rango continuo para evitar partir un solo turno.

Si quieres, el siguiente paso puede ser reemplazar los presets hardcoded por datos del backend (Schedule Types o una entidad de Shift Preset).
