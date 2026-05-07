# Vacations API — Contrato Backend para Frontend

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

### Response (201)

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

---

## 2. Listar solicitudes de vacaciones

**`GET /api/vacations`**

- **Permiso:** `vacations:read` (ve las propias) + `vacations:read-all` (ve las del scope)
- **Roles:** todos

### Query Parameters

| Parámetro      | Tipo   | Obligatorio | Descripción |
|----------------|--------|-------------|-------------|
| `status`       | string | No          | Filtrar por estado: `pending`, `approved`, `rejected`, `cancelled` |
| `employeeId`   | string | No          | Filtrar por empleado específico (solo con `read-all`) |
| `branchId`     | string | No          | Filtrar por sucursal (solo con `read-all`) |
| `departmentId` | string | No          | Filtrar por departamento (solo con `read-all`) |
| `from`         | string | No          | Fecha inicio del rango (ISO 8601) |
| `to`           | string | No          | Fecha fin del rango (ISO 8601) |

### Filtros por permiso/rol (automáticos)

| Rol | Tiene `read-all` | Scope de visibilidad |
|---|---|---|
| `admin` | ✅ | Todas las sucursales y departamentos |
| `general_manager` | ✅ | Su branch (puede filtrar por depto dentro de su branch) |
| `department_manager` | ✅ | Su department (puede filtrar por branch dentro de su depto) |
| `employee` | ❌ | Solo sus propias solicitudes |

### Response (200)

```json
{
  "success": true,
  "data": [
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
  ]
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
| `branchId`     | string | No          | Filtrar por sucursal |
| `departmentId` | string | No          | Filtrar por departamento |

### Filtros por permiso/rol (automáticos)

| Rol | Tiene `read-all` | Scope del calendario |
|---|---|---|
| `admin` | ✅ | Todas las vacaciones aprobadas |
| `general_manager` | ✅ | Vacaciones de su branch (puede filtrar por depto) |
| `department_manager` | ✅ | Vacaciones de su department (puede filtrar por branch) |
| `employee` | ❌ | Solo sus propias vacaciones aprobadas |

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

| Estado      | Descripción |
|-------------|-------------|
| `pending`   | Pendiente de revisión |
| `approved`  | Aprobada por un manager |
| `rejected`  | Rechazada por un manager (requiere `rejectionReason`) |
| `cancelled` | Cancelada por el empleado (solo si estaba `pending`) |

## Diagrama de flujo

```
[Employee] ──POST──> pending
                        │
              ┌─────────┼─────────┐
              │         │         │
         [approve]  [reject]  [cancel]
              │         │         │
              ▼         ▼         ▼
          approved   rejected   cancelled
```

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
3. **Auditoría**: Cada operación (crear, aprobar, rechazar, cancelar) genera un registro de auditoría.
4. **Webhooks**: Los cambios en vacaciones disparan eventos `vacation_requested`, `vacation_approved`, `vacation_rejected`, `vacation_cancelled` a los webhooks configurados.
5. **Branch/Department**: Se asignan automáticamente desde el perfil del usuario al crear la solicitud.
6. **Scope de visibilidad**: El permiso `read-all` no es global — está limitado por el rol del usuario (branch para GM, departamento para DM, global solo para admin).
