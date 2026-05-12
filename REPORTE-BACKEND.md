# Informe de Auditoría de la Aplicación

> Revisión completa: normalización HTTP, cobertura de AuditLog, persistencia temporal y zonas horarias.

---

## 1. Solicitudes HTTP — Normalización

### ✅ Patrón estándar (mayoritariamente correcto)

El backend tiene un sistema uniforme y bien diseñado:
- **`sendSuccess / sendError / sendPaginated`** en `utils/response.ts` — usado en la mayoría de módulos
- **Zod `safeParse()`** para validación de entrada, devolviendo `400` con detalles
- Patrón **`isAppError(error)`** en todos los catch blocks de los controllers maduros

### ⚠️ Problemas encontrados

#### `shift-presets.controller.ts` — Usa `.parse()` en lugar de `.safeParse()`

```typescript
// ❌ Actual: lanza excepción Zod cruda (no formateada como AppError)
const parsed = createShiftPresetSchema.parse(req.body);

// ✅ Correcto
const parsed = createShiftPresetSchema.safeParse(req.body);
if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
```

Afecta a: `createShiftPresetController`, `updateShiftPresetController`.
Además, el controlador **no usa `isAppError`** en el catch — captura errores genéricos con `error instanceof Error`.

---

#### `roles.controller.ts` — Sin validación Zod ni patrón `isAppError`

```typescript
// ❌ Actual: body sin validar, status hardcodeado siempre a 400
export async function createRoleController(req: Request, res: Response) {
  try {
    const role = await service.createRole(req.body); // sin validación
    sendSuccess(res, role, undefined, 201);
  } catch (err: any) {
    sendError(res, err.message, 400); // ignora AppError, status siempre 400
  }
}
```

No hay ningún schema Zod en este módulo. Cualquier dato malformado llega al servicio sin validar.

---

#### `users.controller.ts` — `listUsersController` sin try/catch

```typescript
// ❌ Si el servicio lanza un AppError, llega sin procesar al handler global de Express
export async function listUsersController(req: AuthRequest, res: Response) {
  const parsedQuery = listUsersQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) return sendError(...);

  const { users, total } = await getUsersList(...); // sin try/catch
  return sendPaginated(res, users, total, ...);
}
```

Todos los demás controllers del mismo archivo sí tienen try/catch. Es una inconsistencia aislada.

---

#### `departments.controller.ts` — Mensajes sin acentos

```typescript
// ❌ Inconsistente con el resto de la app
return sendError(res, 'Parametros invalidos', 400, ...);
return sendError(res, 'Datos invalidos', 400, ...);

// ✅ El resto de módulos usa
return sendError(res, 'Parámetros inválidos', 400, ...);
```

---

#### `settings.router.ts` — Sin separación Controller/Service

Todo el módulo mezcla en el router: validación Zod inline, llamadas Prisma directas, lógica de archivos (`multer`, `fs`), y auditoría. No sigue el patrón del resto de módulos.

---

## 2. Cobertura de AuditLog por Entidad

| Entidad | CREATE | UPDATE | DELETE | Transaccional |
|---|---|---|---|---|
| `Schedule` | ✅ | ✅ | ✅ | ✅ `logAuditOrThrow` en tx |
| `User` | ✅ | ✅ | ✅ + STATUS + ROLE + PASSWORD | ✅ |
| `Branch` | ✅ | ✅ | ✅ (soft+hard) | ✅ |
| `BranchHoliday` | ✅ | ✅ | ✅ (single+bulk) | ✅ |
| `Department` | ✅ | ✅ | ✅ (soft+hard) | ✅ |
| `VacationRequest` | ✅ | ✅ (approve/reject/cancel) | — | ✅ |
| `ShiftPreset` | ✅ | ✅ | ✅ | ✅ |
| `Role` | ✅ | ✅ | ✅ | ✅ |
| `ScheduleType` | ✅ | ✅ | ✅ | ✅ |
| `WebhookConfig` | ✅ | ✅ | ✅ | ✅ |
| `ThemeSettings` | ✅ | ✅ | — | ⚠️ fire-and-forget |
| `ThemePreset` | ✅ | ✅ | ✅ | ⚠️ fire-and-forget |
| `SiteSettings` | — | ✅ | — | ⚠️ fire-and-forget |

### ⚠️ Settings usa `logAudit` (fire-and-forget) fuera de transacción

En `settings.router.ts` todos los `logAudit(...)` pueden fallar silenciosamente sin revertir la operación. Para operaciones críticas de configuración se recomienda usar transacciones con `logAuditOrThrow`.

### ⚠️ Rollback no cubre todas las entidades auditadas

`audit.service.ts → rollbackAudit()` solo implementa rollback para:
- `Schedule`, `User`, `WebhookConfig`, `BranchHoliday`, `Department`

Entidades **auditadas pero sin rollback**:
- `VacationRequest` (APPROVE_VACATION, REJECT_VACATION, CANCEL_VACATION)
- `ShiftPreset`, `ScheduleType`, `Role`
- `ThemeSettings`, `ThemePreset`, `SiteSettings`

Intentar hacer rollback de estas entidades desde la pantalla de Auditoría lanzará:
```
AppError 400: "Rollback no implementado para la entidad: VacationRequest"
```

---

## 3. Persistencia de Datos Temporales

### Frontend — ✅ Correcto

| Mecanismo | Uso |
|---|---|
| **Zustand `authStore`** | Token JWT, refreshToken, user profile |
| **Zustand `uiStore`** | Sidebar, tema, drafts de tema |
| **React Query** | Caché de datos servidor (schedules, users, etc.) |
| **Estado local React** | Filtros, modales, selección activa |

### Backend — ✅ Correcto (con un detalle)

| Mecanismo | Uso | Estado |
|---|---|---|
| **Prisma/PostgreSQL** | Toda la persistencia permanente | ✅ |
| **Transacciones** | `executeInTransaction` en operaciones críticas | ✅ |
| **Disco (`public/uploads`)** | Favicons subidos | ⚠️ Sin limpieza |

### ⚠️ Favicons sin limpieza de archivos antiguos

Cada subida genera un archivo nuevo con nombre único. El archivo anterior nunca se elimina:

```typescript
// Genera: favicon-1715098234-123456789.ico
// El favicon anterior queda huérfano en disco indefinidamente
cb(null, `favicon-${uniqueSuffix}${ext}`);
```

**Solución**: al guardar la URL del nuevo favicon en BD, eliminar el archivo anterior del disco con `fs.unlink`.

---

## 4. Manejo de Zonas Horarias

### Estrategia general — ✅ Correcta

- **Backend**: almacena todo en UTC (Prisma + PostgreSQL `timestamptz`)
- **Frontend**: convierte UTC → TZ de sucursal para mostrar; TZ → UTC para enviar

### ✅ Utilidades correctas (`frontend/src/lib/timezone.ts`)

Implementadas con `Intl.DateTimeFormat`:
- `formatInTimezone` — fecha y hora en TZ de sucursal
- `formatTimeInTimezone` — solo hora
- `formatDateInTimezone` — solo fecha
- `utcToTimezoneDate` — UTC → Date local para inputs de formulario

---

### ⚠️ `timezoneToUtc` — Código muerto con bug lógico

La función existe en `timezone.ts` pero **no hay ningún import de ella en toda la aplicación**. Es código muerto. Además tiene un bug:

```typescript
export function timezoneToUtc(year, month, day, hour, minute, timezone) {
  const localStr = `${year}-${month}-${day}T${hour}:${minute}:00`;

  // ❌ Bug: ambas variables usan el mismo valor (localStr + 'Z')
  // El offset que se calcula es siempre 0ms → conversión inútil
  const utcDate = new Date(localStr + 'Z');
  const tzDate  = new Date(localStr + 'Z'); // idéntico a utcDate
  // ...
  const offsetMs = tzLocal.getTime() - utcDate.getTime(); // siempre 0
  return new Date(utcDate.getTime() - offsetMs); // devuelve utcDate sin modificar
}
```

**Solución**: eliminar o reescribir usando `Temporal` API o `date-fns-tz`.

---

### 🔴 Backend genera notificaciones con `toLocaleDateString()` sin zona horaria

En `schedules.service.ts` y `vacations.service.ts`, los mensajes de notificación in-app usan fechas sin TZ:

```typescript
// ❌ Usa la TZ del servidor (UTC en Docker), no la TZ de la sucursal
message: `...el ${result.schedule.startDatetime.toLocaleDateString()} de
  ${result.schedule.startDatetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}...`

// ❌ Vacaciones también afectadas
message: `Has solicitado vacaciones del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}.`
```

**Impacto en producción (Docker TZ=UTC)**: un turno a las 08:00 en `Europe/Madrid` (UTC+2) aparecerá en el mensaje como las **06:00**.

**Solución**: pasar la `branchTimezone` al servicio de notificaciones y usar:
```typescript
startDatetime.toLocaleDateString('es-ES', { timeZone: branchTimezone })
startDatetime.toLocaleTimeString('es-ES', { timeZone: branchTimezone, hour: '2-digit', minute: '2-digit' })
```

---

## Resumen Priorizado

| # | Problema | Módulo | Impacto | Prioridad |
|---|---|---|---|---|
| 1 | `toLocaleDateString()` sin TZ en notificaciones | `schedules.service`, `vacations.service` | Fechas incorrectas en notificaciones | 🔴 Alta |
| 2 | `shift-presets.controller` usa `.parse()` sin `safeParse` | `shift-presets.controller` | Error 500 con ZodError sin formatear | 🟠 Media |
| 3 | `roles.controller` sin validación Zod ni `isAppError` | `roles.controller` | Entrada sin validar | 🟠 Media |
| 4 | `listUsersController` sin try/catch | `users.controller` | Error 500 sin procesar | 🟠 Media |
| 5 | Rollback no implementado para VacationRequest, ShiftPreset, etc. | `audit.service` | UI de Auditoría rota al intentar rollback | 🟠 Media |
| 6 | `timezoneToUtc` muerta y con bug | `timezone.ts` | Deuda técnica | 🟡 Baja |
| 7 | Favicons sin limpieza de archivos viejos | `settings.router` | Acumulación en disco a largo plazo | 🟡 Baja |
| 8 | `settings` sin separación Controller/Service | `settings.router` | Mantenibilidad | 🟡 Baja |
| 9 | Mensajes sin acento en departments | `departments.controller` | Consistencia de UI | 🟡 Baja |
