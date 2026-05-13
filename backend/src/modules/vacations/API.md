# Vacations API — Contrato Backend para Frontend

> **Última actualización:** 13 mayo 2026

## Base URL

```
/api/vacations
```

Todas las rutas requieren autenticación (`authMiddleware`). Algunas requieren permisos específicos.

---

## 1. Crear solicitud de vacaciones

**`POST /api/vacations`**

- **Permiso:** `vacations:create`
- **Roles:** employee, department_manager, general_manager, admin

### Request Body

```json
{
  "startDate": "2026-06-15T00:00:00.000Z",
  "endDate": "2026-06-19T00:00:00.000Z",
  "note": "Vacaciones familiares (opcional, máx 500 caracteres)"
}
```

- `startDate` y `endDate` deben ser días laborables (lunes a viernes).
- `endDate` debe ser >= `startDate`.
- `startDate` no puede ser anterior a hoy.
- El `branchId` y `departmentId` se asignan automáticamente desde el usuario autenticado.

### Response (201) — Sin solapamiento

```json
{
  "success": true,
  "data": {
    "id": "cm7...",
    "employeeId": "user_abc123",
    "status": "pending",
    "startDate": "2026-06-15T00:00:00.000Z",
    "endDate": "2026-06-19T00:00:00.000Z",
    "note": "Vacaciones familiares",
    "branchId": "branch_xyz",
    "departmentId": "dept_123",
    "createdAt": "2026-05-07T08:00:00.000Z",
    "updatedAt": "2026-05-07T08:00:00.000Z",
    "hasOverlap": false,
    "overlappingEmployees": [],
    "employee": {
      "id": "user_abc123",
      "name": "Juan Pérez",
      "email": "juan@empresa.com",
      "avatarUrl": null,
      "employeeId": "EMP-001",
      "department": { "id": "dept_123", "name": "Ventas" },
      "branch": { "id": "branch_xyz", "name": "Sucursal Centro" }
    },
    "reviewer": null,
    "branch": { "id": "branch_xyz", "name": "Sucursal Centro", "code": "CENTRO" },
    "department": { "id": "dept_123", "name": "Ventas", "code": "VENTAS" }
  },
  "message": "Solicitud de vacaciones creada"
}
```

### Response (201) — Con solapamiento (colindante)

Cuando las fechas solicitadas coinciden con vacaciones de compañeros del mismo departamento,
la solicitud se crea con estado `colindante` y se devuelve información de los afectados:

```json
{
  "success": true,
  "data": {
    "id": "cm7...",
    "employeeId": "user_abc123",
    "status": "colindante",
    "startDate": "2026-06-15T00:00:00.000Z",
    "endDate": "2026-06-19T00:00:00.000Z",
    "note": "Vacaciones familiares",
    "branchId": "branch_xyz",
    "departmentId": "dept_123",
    "createdAt": "2026-05-07T08:00:00.000Z",
    "updatedAt": "2026-05-07T08:00:00.000Z",
    "hasOverlap": true,
    "overlappingEmployees": [
      {
        "id": "user_def456",
        "name": "María García",
        "email": "maria@empresa.com"
      },
      {
        "id": "user_ghi789",
        "name": "Pedro Sánchez",
        "email": "pedro@empresa.com"
      }
    ],
    "employee": { ... },
    "reviewer": null,
    "branch": { ... },
    "department": { ... }
  },
  "message": "Solicitud de vacaciones creada con advertencia: coincide con las vacaciones de compañeros del departamento"
}
```

> **Flujo frontend recomendado:**
> 1. Si `hasOverlap` es `true`, mostrar un modal/alerta con los nombres de los compañeros afectados.
> 2. Preguntar: "Tu solicitud coincide con las vacaciones de [compañeros]. ¿Aún así deseas continuar?"
> 3. Si el usuario confirma → la solicitud queda creada con estado `colindante` (ya está creada).
> 4. Si el usuario cancela → llamar a `DELETE /api/vacations/:id` para cancelar la solicitud recién creada.

---

## 2. Listar solicitudes de vacaciones (CRUD Table)

**`GET /api/vacations`**

- **Permiso:** `vacations:read` (ve las propias) + `vacations:read-all` (ve las del scope)
- **Roles:** todos

### Query Parameters

| Parámetro      | Tipo   | Obligatorio | Default     | Descripción |
|----------------|--------|-------------|-------------|-------------|
| `status`       | string | No          | —           | Filtrar por estado: `pending`, `approved`, `rejected`, `cancelled` |
| `employeeId`   | string | No          | —           | Filtrar por empleado específico (solo con `read-all`) |
| `branchId`     | string | No          | —           | Filtrar por sucursal (solo con `read-all`) |
| `departmentId` | string | No          | —           | Filtrar por departamento (solo con `read-all`) |
| `from`         | string | No          | —           | Fecha inicio del rango (ISO 8601) |
| `to`           | string | No          | —           | Fecha fin del rango (ISO 8601) |
| `sortBy`       | enum   | No          | `createdAt` | Campo de ordenación: `createdAt`, `startDate`, `endDate`, `status` |
| `sortOrder`    | enum   | No          | `desc`      | Dirección: `asc` o `desc` |
| `page`         | number | No          | `1`         | Número de página (min 1) |
| `pageSize`     | number | No          | `20`        | Elementos por página (min 1, max 100) |

### Filtros por permiso/rol (automáticos)

| Rol | Tiene `read-all` | Scope de visibilidad |
|---|---|---|
| `admin` | ✅ | Todas las sucursales y departamentos |
| `general_manager` | ✅ | Su branch (puede filtrar por depto dentro de su branch) |
| `department_manager` | ✅ | Su department (puede filtrar por branch dentro de su depto) |
| `employee` | ❌ | Solo sus propias solicitudes |

### Response (200) — Paginado

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cm7...",
        "employeeId": "user_abc123",
        "status": "pending",
        "startDate": "2026-06-15T00:00:00.000Z",
        "endDate": "2026-06-19T00:00:00.000Z",
        "note": "Vacaciones familiares",
        "reviewedBy": null,
        "reviewedAt": null,
        "rejectionReason": null,
        "branchId": "branch_xyz",
        "departmentId": "dept_123",
        "createdAt": "2026-05-07T08:00:00.000Z",
        "updatedAt": "2026-05-07T08:00:00.000Z",
        "employee": {
          "id": "user_abc123",
          "name": "Juan Pérez",
          "email": "juan@empresa.com",
          "avatarUrl": null,
          "employeeId": "EMP-001",
          "department": { "id": "dept_123", "name": "Ventas" },
          "branch": { "id": "branch_xyz", "name": "Sucursal Centro" }
        },
        "reviewer": null,
        "branch": { "id": "branch_xyz", "name": "Sucursal Centro", "code": "CENTRO" },
        "department": { "id": "dept_123", "name": "Ventas", "code": "VENTAS" }
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

---

## 3. Obtener solicitud por ID

**`GET /api/vacations/:id`**

- **Permiso:** `vacations:read` (propias) + `vacations:read-all` (cualquiera del scope)
- **Roles:** todos

### Response (200)

```json
{
  "success": true,
  "data": {
    "id": "cm7...",
    "employeeId": "user_abc123",
    "status": "pending",
    "startDate": "2026-06-15T00:00:00.000Z",
    "endDate": "2026-06-19T00:00:00.000Z",
    "note": "Vacaciones familiares",
    "reviewedBy": null,
    "reviewedAt": null,
    "rejectionReason": null,
    "branchId": "branch_xyz",
    "departmentId": "dept_123",
    "createdAt": "2026-05-07T08:00:00.000Z",
    "updatedAt": "2026-05-07T08:00:00.000Z",
    "employee": { ... },
    "reviewer": null,
    "branch": { "id": "branch_xyz", "name": "Sucursal Centro", "code": "CENTRO" },
    "department": { "id": "dept_123", "name": "Ventas", "code": "VENTAS" }
  }
}
```

---

## 4. Aprobar solicitud de vacaciones

**`PATCH /api/vacations/:id/approve`**

- **Permiso:** `vacations:approve`
- **Roles:** department_manager (solo de su depto), general_manager (solo de su branch), admin

### Request Body

```json
{
  "note": "Aprobado, disfruta tus vacaciones (opcional, máx 500 caracteres)"
}
```

### Response (200)

```json
{
  "success": true,
  "data": {
    "id": "cm7...",
    "status": "approved",
    "reviewedBy": "manager_abc",
    "reviewedAt": "2026-05-07T09:00:00.000Z",
    "reviewer": {
      "id": "manager_abc",
      "name": "Carlos López",
      "email": "carlos@empresa.com"
    },
    ...
  },
  "message": "Vacaciones aprobadas"
}
```

---

## 5. Rechazar solicitud de vacaciones

**`PATCH /api/vacations/:id/reject`**

- **Permiso:** `vacations:approve`
- **Roles:** department_manager (solo de su depto), general_manager (solo de su branch), admin

### Request Body

```json
{
  "rejectionReason": "No hay cobertura suficiente esa semana (obligatorio, máx 500 caracteres)"
}
```

### Response (200)

```json
{
  "success": true,
  "data": {
    "id": "cm7...",
    "status": "rejected",
    "rejectionReason": "No hay cobertura suficiente esa semana",
    "reviewedBy": "manager_abc",
    "reviewedAt": "2026-05-07T09:00:00.000Z",
    "reviewer": {
      "id": "manager_abc",
      "name": "Carlos López",
      "email": "carlos@empresa.com"
    },
    ...
  },
  "message": "Vacaciones rechazadas"
}
```

---

## 6. Cancelar solicitud de vacaciones

**`DELETE /api/vacations/:id`**

- **Permiso:** `vacations:cancel`
- **Roles:**
  - **employee**: solo puede cancelar sus propias solicitudes pendientes
  - **department_manager**: puede cancelar cualquier solicitud de su departamento
  - **general_manager**: puede cancelar cualquier solicitud de su sucursal
  - **admin**: puede cancelar cualquier solicitud

### Response (200)

```json
{
  "success": true,
  "data": {
    "id": "cm7...",
    "status": "cancelled",
    ...
  },
  "message": "Solicitud de vacaciones cancelada"
}
```

---

## 7. Calendario de vacaciones aprobadas

**`GET /api/vacations/calendar`**

- **Permiso:** `vacations:read`
- **Roles:** todos

### Query Parameters

| Parámetro      | Tipo   | Obligatorio | Descripción |
|----------------|--------|-------------|-------------|
| `year`         | number | Sí          | Año (2000-2100) |
| `week`         | number | Sí          | Número de semana ISO (1-53) |
| `branchId`     | string | No          | Filtrar por sucursal (solo admin) |
| `departmentId` | string | No          | Filtrar por departamento (multi-sede: muestra vacaciones del depto en todas sus sedes) |
| `employeeId`   | string | No          | Filtrar por empleado específico |

### Filtros por permiso/rol (automáticos)

| Rol | Tiene `read-all` | Scope del calendario |
|---|---|---|
| `admin` | ✅ | **Todas** las vacaciones aprobadas (puede filtrar por `branchId`, `departmentId`, `employeeId`) |
| `general_manager` | ✅ | Vacaciones de **su sede** (puede filtrar por `departmentId` y `employeeId`) |
| `department_manager` | ✅ | Vacaciones de **su sede** (puede filtrar por `departmentId` y `employeeId`) |
| `employee` | ❌ | Vacaciones de **su sede** (puede filtrar por `departmentId` y `employeeId`) |

> **Nota importante:** A diferencia de la CRUD table (endpoint 2), el **calendario** tiene un scope más amplio:
> - `employee` ve **todas** las vacaciones aprobadas de su sede, no solo las suyas.
> - `department_manager` y `general_manager` también ven todas las de su sede.
> - Solo `admin` puede filtrar por `branchId` para ver sedes distintas a la suya.

### Lógica de departamentos multi-sede

Cuando se filtra por `departmentId`, el sistema:
1. Consulta la tabla `DepartmentBranch` para obtener todas las sedes donde existe ese departamento.
2. Muestra las vacaciones de ese departamento en **todas** sus sedes.
3. Si el usuario ya tiene un filtro de sede (scope base), se intersecta: solo muestra resultados si el departamento existe en esa sede.

### Response (200)

```json
{
  "success": true,
  "data": {
    "year": 2026,
    "week": 25,
    "weekStart": "2026-06-15T00:00:00.000Z",
    "weekEnd": "2026-06-21T23:59:59.999Z",
    "total": 2,
    "items": [
      {
        "id": "cm7...",
        "employeeId": "user_abc123",
        "employeeName": "Juan Pérez",
        "employeeEmail": "juan@empresa.com",
        "employeeAvatarUrl": null,
        "employeeDepartment": { "id": "dept_123", "name": "Ventas" },
        "employeeBranch": { "id": "branch_xyz", "name": "Sucursal Centro" },
        "startDate": "2026-06-15T00:00:00.000Z",
        "endDate": "2026-06-19T00:00:00.000Z",
        "note": "Vacaciones familiares",
        "branchId": "branch_xyz",
        "departmentId": "dept_123"
      }
    ]
  }
}
```

> **Nota:** Esta ruta debe declararse **antes** de `GET /api/vacations/:id` en el router para evitar conflictos.

---

## Estados de una solicitud

| Estado        | Descripción |
|---------------|-------------|
| `pending`     | Pendiente de revisión |
| `colindante`  | Pendiente de revisión, pero las fechas coinciden con vacaciones de compañeros del departamento |
| `approved`    | Aprobada por un manager |
| `rejected`    | Rechazada por un manager (requiere `rejectionReason`) |
| `cancelled`   | Cancelada por el empleado (solo si estaba `pending` o `colindante`) |

## Diagrama de flujo

```
[Employee] ──POST──> pending ─── (sin solapamiento)
[Employee] ──POST──> colindante ─ (con solapamiento de depto)
                        │
              ┌─────────┼─────────┐
              │         │         │
         [approve]  [reject]  [cancel]
              │         │         │
              ▼         ▼         ▼
          approved   rejected   cancelled
```

> **Nota:** El estado `colindante` se comporta igual que `pending` para efectos de aprobación/rechazo.
> La única diferencia es que el empleado fue advertido de que sus fechas coinciden con las de compañeros.

## Permisos CRUD

| Permiso              | Descripción |
|----------------------|-------------|
| `vacations:create`   | Crear solicitudes de vacaciones |
| `vacations:read`     | Ver solicitudes propias y calendario filtrado |
| `vacations:read-all` | Ver solicitudes de otros (scope: branch/depto/global según rol) |
| `vacations:approve`  | Aprobar/rechazar solicitudes (scope: branch/depto según rol) |
| `vacations:cancel`   | Cancelar solicitudes (propias o del scope según rol) |
| `vacations:delete`   | Eliminar registros de vacaciones (solo admin) |

## Matriz de permisos por rol

| Permiso | admin | general_manager | department_manager | employee |
|---|---|---|---|---|
| `vacations:create` | ✅ | ✅ | ✅ | ✅ |
| `vacations:read` | ✅ | ✅ | ✅ | ✅ |
| `vacations:read-all` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `vacations:approve` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| `vacations:cancel` | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ✅ (solo propias) |
| `vacations:delete` | ✅ | ❌ | ❌ | ❌ |

## Notas importantes

1. **Fechas laborables**: Solo se permiten días laborables (lunes a viernes) para `startDate` y `endDate`.
2. **Sin solapamiento automático**: Las vacaciones aprobadas **no** crean automáticamente entradas en el módulo de `schedules`. Son entidades completamente separadas.
3. **Auditoría**: Cada operación (crear, aprobar, rechazar, cancelar) genera un registro de auditoría con atomicidad transaccional.
4. **Webhooks**: Los cambios en vacaciones disparan eventos `vacation_requested`, `vacation_approved`, `vacation_rejected`, `vacation_cancelled` a los webhooks configurados.
5. **Branch/Department**: Se asignan automáticamente desde el perfil del usuario al crear la solicitud.
6. **Scope de visibilidad (CRUD table)**: El permiso `read-all` no es global — está limitado por el rol del usuario (branch para GM, departamento para DM, global solo para admin).
7. **Scope del calendario**: Es más amplio que la CRUD table. Todos los roles (incluido employee) ven las vacaciones aprobadas de **su sede**. Solo admin puede cambiar de sede.
8. **Departamentos multi-sede**: Al filtrar el calendario por `departmentId`, se muestran vacaciones de ese departamento en todas las sedes donde exista (vía `DepartmentBranch`).
9. **Paginación en listado**: El endpoint `GET /api/vacations` devuelve respuesta paginada con `items`, `total`, `page`, `pageSize`, `totalPages`.
