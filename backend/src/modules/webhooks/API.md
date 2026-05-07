# Webhooks API — Contrato Backend para Frontend

## Base URL

```
/api/webhooks
```

---

## 1. Listar webhooks

**`GET /api/webhooks`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "wh_123",
      "name": "Slack General",
      "webhookUrl": "https://hooks.slack.com/services/...",
      "enabled": true,
      "notifyModifications": true,
      "notifyLastMinute": true,
      "fridayReminderEnabled": true,
      "mondayVacationReminderEnabled": true,
      "fridayReminderTime": "12:00",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 2. Crear webhook

**`POST /api/webhooks`**

- **Permiso:** `settings:manage`

### Request Body

```json
{
  "name": "Teams RRHH",
  "webhookUrl": "https://outlook.office.com/webhook/...",
  "enabled": true,
  "notifyModifications": true,
  "notifyLastMinute": true,
  "fridayReminderEnabled": true,
  "mondayVacationReminderEnabled": true,
  "fridayReminderTime": "12:00"
}
```

### Response (201)

```json
{
  "success": true,
  "data": { ... },
  "message": "Webhook creado"
}
```

---

## 3. Actualizar webhook

**`PATCH /api/webhooks/:id`**

- **Permiso:** `settings:manage`

### Request Body (todos opcionales)

```json
{
  "name": "Teams RRHH Actualizado",
  "enabled": false
}
```

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Webhook actualizado"
}
```

---

## 4. Eliminar webhook

**`DELETE /api/webhooks/:id`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Webhook eliminado"
}
```

---

## 5. Probar webhook

**`POST /api/webhooks/:id/test`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Mensaje de prueba enviado correctamente"
}
```

### Response (500)

```json
{
  "success": false,
  "error": "Error al enviar: Connection refused"
}
```
