# Branches API — Contrato Backend para Frontend

## Base URL

```
/api/branches
```

---

## 1. Listar sucursales

**`GET /api/branches`**

- **Permiso:** Autenticación sola

### Query Parameters

| Parámetro        | Tipo    | Obligatorio | Descripción |
|------------------|---------|-------------|-------------|
| `includeInactive`| boolean | No          | Incluir sucursales inactivas (default: false) |

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "branch_xyz",
      "name": "Sucursal Centro",
      "code": "CENTRO",
      "address": "Calle Mayor 1",
      "city": "Santa Cruz",
      "region": "Tenerife",
      "countryCode": "ES",
      "timezone": "Atlantic/Canary",
      "isActive": true,
      "managerId": "user_manager",
      "manager": { "id": "user_manager", "name": "Carlos López" },
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 2. Crear sucursal

**`POST /api/branches`**

- **Permiso:** `branches:manage`

### Request Body

```json
{
  "name": "Sucursal Norte",
  "code": "NORTE",
  "address": "Av. Principal 100",
  "city": "La Laguna",
  "region": "Tenerife",
  "countryCode": "ES",
  "timezone": "Atlantic/Canary"
}
```

### Response (201)

```json
{
  "success": true,
  "data": { ... },
  "message": "Sucursal creada"
}
```

---

## 3. Actualizar sucursal

**`PATCH /api/branches/:branchId`**

- **Permiso:** `branches:manage`

### Request Body (todos opcionales)

```json
{
  "name": "Sucursal Norte Renovada",
  "isActive": true
}
```

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Sucursal actualizada"
}
```

---

## 4. Desactivar sucursal (soft-delete)

**`DELETE /api/branches/:branchId`**

- **Permiso:** `branches:manage`

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Sucursal desactivada"
}
```

---

## 5. Eliminar sucursal permanentemente

**`DELETE /api/branches/:branchId/permanent`**

- **Permiso:** `branches:manage`

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Sucursal eliminada definitivamente"
}
```

---

## 6. Asignar manager a sucursal

**`PATCH /api/branches/:branchId/manager`**

- **Permiso:** `branches:manage`

### Request Body

```json
{
  "userId": "user_manager_id"
}
```

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Manager asignado a la sucursal"
}
```

---

## 7. Remover manager de sucursal

**`DELETE /api/branches/:branchId/manager`**

- **Permiso:** `branches:manage`

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Manager removido de la sucursal"
}
```

---

## 8. Listar festivos de una sucursal

**`GET /api/branches/:branchId/holidays`**

- **Permiso:** Autenticación sola

### Query Parameters

| Parámetro        | Tipo    | Obligatorio | Descripción |
|------------------|---------|-------------|-------------|
| `year`           | number  | No          | Filtrar por año |
| `from`           | string  | No          | Fecha inicio (ISO) |
| `to`             | string  | No          | Fecha fin (ISO) |
| `includeInactive`| boolean | No          | Incluir inactivos (default: false) |
| `groupShared`    | boolean | No          | Agrupar festivos compartidos (default: false) |

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "holiday_123",
      "date": "2026-01-01T00:00:00.000Z",
      "originalDate": null,
      "name": "Año Nuevo",
      "type": "nacional",
      "scope": "national",
      "isPartial": false,
      "isActive": true,
      "branchId": "branch_xyz"
    }
  ]
}
```

---

## 9. Crear festivo

**`POST /api/branches/:branchId/holidays`**

- **Permiso:** `branches:manage`

### Request Body

```json
{
  "date": "2026-12-25T00:00:00.000Z",
  "name": "Navidad",
  "type": "nacional",
  "scope": "national",
  "isPartial": false
}
```

Tipos: `nacional`, `autonomica`, `local`, `mejora`, `regional`, `company`
Scopes: `national`, `regional`, `local`, `company`

### Response (201)

```json
{
  "success": true,
  "data": { ... },
  "message": "Festivo creado"
}
```

---

## 10. Actualizar festivo

**`PATCH /api/branches/:branchId/holidays/:holidayId`**

- **Permiso:** `branches:manage`

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Festivo actualizado"
}
```

---

## 11. Eliminar festivo

**`DELETE /api/branches/:branchId/holidays/:holidayId`**

- **Permiso:** `branches:manage`

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Festivo eliminado"
}
```

---

## 12. Actualización masiva de festivos compartidos

**`PATCH /api/branches/all/holidays/bulk`**

- **Permiso:** `branches:manage`

### Request Body

```json
{
  "holidayIds": ["holiday_1", "holiday_2"],
  "name": "Nuevo nombre",
  "date": "2026-06-15T00:00:00.000Z",
  "type": "nacional",
  "scope": "national",
  "isPartial": false
}
```

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Festivos compartidos actualizados"
}
```

---

## 13. Eliminación masiva de festivos compartidos

**`DELETE /api/branches/all/holidays/bulk`**

- **Permiso:** `branches:manage`

### Request Body

```json
{
  "holidayIds": ["holiday_1", "holiday_2"]
}
```

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Festivos compartidos eliminados"
}
```
