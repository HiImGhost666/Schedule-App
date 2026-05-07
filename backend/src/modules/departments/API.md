# Departments API — Contrato Backend para Frontend

## Base URL

```
/api/departments
```

---

## 1. Listar departamentos

**`GET /api/departments`**

- **Permiso:** `settings:manage`

### Query Parameters

| Parámetro        | Tipo    | Obligatorio | Descripción |
|------------------|---------|-------------|-------------|
| `branchId`       | string  | No          | Filtrar por sucursal |
| `includeInactive`| boolean | No          | Incluir inactivos (default: false) |

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "dept_123",
      "name": "Ventas",
      "code": "VENTAS",
      "description": "Departamento de ventas",
      "isActive": true,
      "managerId": "user_manager",
      "manager": { "id": "user_manager", "name": "Carlos López" },
      "branches": [
        { "id": "branch_xyz", "name": "Sucursal Centro", "code": "CENTRO" }
      ],
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 2. Obtener sucursales de un departamento

**`GET /api/departments/:departmentId/branches`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": [
    { "id": "branch_xyz", "name": "Sucursal Centro", "code": "CENTRO" }
  ]
}
```

---

## 3. Crear departamento

**`POST /api/departments`**

- **Permiso:** `settings:manage`

### Request Body

```json
{
  "name": "Marketing",
  "code": "MARKETING",
  "description": "Departamento de marketing digital",
  "branchIds": ["branch_xyz", "branch_abc"]
}
```

### Response (201)

```json
{
  "success": true,
  "data": { ... },
  "message": "Departamento creado"
}
```

---

## 4. Actualizar departamento

**`PATCH /api/departments/:departmentId`**

- **Permiso:** `settings:manage`

### Request Body (todos opcionales)

```json
{
  "name": "Marketing Digital",
  "isActive": true,
  "branchIds": ["branch_xyz"]
}
```

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Departamento actualizado"
}
```

---

## 5. Desactivar departamento (soft-delete)

**`DELETE /api/departments/:departmentId`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Departamento desactivado"
}
```

---

## 6. Eliminar departamento permanentemente

**`DELETE /api/departments/:departmentId/permanent`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Departamento eliminado definitivamente"
}
```

---

## 7. Asignar manager a departamento

**`PATCH /api/departments/:departmentId/manager`**

- **Permiso:** `settings:manage`

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
  "message": "Manager asignado al departamento"
}
```

---

## 8. Remover manager de departamento

**`DELETE /api/departments/:departmentId/manager`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Manager removido del departamento"
}
```
