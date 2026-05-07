# Audit API — Contrato Backend para Frontend

## Base URL

```
/api/audit
```

---

## 1. Listar registros de auditoría

**`GET /api/audit`**

- **Permiso:** `audit:view`

### Query Parameters

| Parámetro       | Tipo   | Obligatorio | Descripción |
|-----------------|--------|-------------|-------------|
| `page`          | number | No          | Página (default: 1) |
| `limit`         | number | No          | Items por página (default: 20, max: 100) |
| `userId`        | string | No          | Filtrar por ID de usuario |
| `userName`      | string | No          | Filtrar por nombre de usuario |
| `action`        | string | No          | Filtrar por acción (CREATE_SCHEDULE, LOGIN, etc.) |
| `entityType`    | string | No          | Filtrar por tipo de entidad (Schedule, User, etc.) |
| `from`          | string | No          | Fecha inicio (ISO datetime) |
| `to`            | string | No          | Fecha fin (ISO datetime) |
| `reversible`    | string | No          | `"true"` = solo reversibles, `"false"` = solo irreversibles |
| `userDepartment`| string | No          | Filtrar por departamento del usuario |
| `branchId`      | string | No          | Filtrar por sucursal |
| `sortBy`        | string | No          | Campo de ordenación (default: `createdAt`) |
| `sortOrder`     | string | No          | `asc` o `desc` (default: `desc`) |

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "audit_123",
      "userId": "user_abc",
      "userName": "Juan Pérez",
      "userDepartment": "Ventas",
      "action": "CREATE_SCHEDULE",
      "entityType": "Schedule",
      "entityId": "sched_123",
      "detailsJson": {
        "before": null,
        "after": { "title": "Guardia mañana", "assigneeIds": ["user_abc"] },
        "reason": "Nueva guardia programada"
      },
      "ipAddress": "192.168.1.10",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-05-07T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 2. Obtener registro de auditoría por ID

**`GET /api/audit/:id`**

- **Permiso:** `audit:view`

### Response (200)

```json
{
  "success": true,
  "data": {
    "id": "audit_123",
    "userId": "user_abc",
    "userName": "Juan Pérez",
    "userDepartment": "Ventas",
    "action": "CREATE_SCHEDULE",
    "entityType": "Schedule",
    "entityId": "sched_123",
    "detailsJson": { ... },
    "ipAddress": "192.168.1.10",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2026-05-07T08:00:00.000Z"
  }
}
```

---

## 3. Rollback de auditoría

**`POST /api/audit/:id/rollback`**

- **Permiso:** `audit:view`

> Revierte una operación auditada (si es reversible). Por ejemplo, restaura el estado anterior de un Schedule.

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Rollback realizado con éxito"
}
```
