# Schedule Types API — Contrato Backend para Frontend

## Base URL

```
/api/schedule-types
```

---

## 1. Listar tipos de turno

**`GET /api/schedule-types`**

- **Permiso:** Autenticación sola

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "st_123",
      "value": "guardia",
      "label": "Guardia",
      "color": "#FF5733",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 2. Obtener tipo de turno por ID

**`GET /api/schedule-types/:id`**

- **Permiso:** Autenticación sola

### Response (200)

```json
{
  "success": true,
  "data": {
    "id": "st_123",
    "value": "guardia",
    "label": "Guardia",
    "color": "#FF5733",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## 3. Crear tipo de turno

**`POST /api/schedule-types`**

- **Permiso:** `schedule_types:create`

### Request Body

```json
{
  "value": "formacion",
  "label": "Formación",
  "color": "#33FF57"
}
```

### Response (201)

```json
{
  "success": true,
  "data": { ... },
  "message": "Schedule type created"
}
```

---

## 4. Actualizar tipo de turno

**`PUT /api/schedule-types/:id`**

- **Permiso:** `schedule_types:update`

### Request Body (todos opcionales)

```json
{
  "label": "Formación continua",
  "color": "#3357FF",
  "isActive": true
}
```

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Schedule type updated"
}
```

---

## 5. Eliminar tipo de turno (soft-delete)

**`DELETE /api/schedule-types/:id`**

- **Permiso:** `schedule_types:delete`

> No se puede eliminar si está siendo usado por turnos existentes.

### Response (200)

```json
{
  "success": true,
  "data": { "message": "Schedule type deleted successfully" }
}
```
