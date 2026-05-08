# Notifications API — Contrato Backend para Frontend

## Base URL

```
/api/notifications
```

---

## 1. Listar logs de notificaciones

**`GET /api/notifications/logs`**

- **Permiso:** `settings:manage`

### Query Parameters

| Parámetro | Tipo   | Obligatorio | Descripción |
|-----------|--------|-------------|-------------|
| `page`    | number | No          | Página (default: 1) |
| `limit`   | number | No          | Items por página (default: 20, max: 100) |
| `type`    | string | No          | Filtrar por tipo (schedule_created, vacation_approved, etc.) |
| `status`  | string | No          | Filtrar por estado (sent, failed) |

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "log_123",
      "webhookConfigId": "wh_123",
      "webhookConfig": { "id": "wh_123", "name": "Slack General" },
      "type": "schedule_created",
      "status": "sent",
      "message": "Nueva guardia: Guardia mañana",
      "sentByUserId": "user_admin",
      "sentBy": { "id": "user_admin", "name": "Admin" },
      "sentAt": "2026-05-07T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## 2. Reenviar notificación

**`POST /api/notifications/resend/:logId`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": { "status": "sent", "sentAt": "2026-05-07T09:00:00.000Z" },
  "message": "Notificación reenviada"
}
```

---

## 3. Enviar resumen semanal (viernes)

**`POST /api/notifications/friday-summary`**

- **Permiso:** `settings:manage`

> Envía un resumen de los turnos de la próxima semana a todos los webhooks habilitados.

### Response (200)

```json
{
  "success": true,
  "data": { "sent": 3 },
  "message": "Resumen enviado a 3 webhook(s)"
}
```

---

## 4. Enviar resumen de vacaciones (lunes)

**`POST /api/notifications/vacation-summary`**

- **Permiso:** `settings:manage`

> Envía un resumen de las vacaciones aprobadas de la semana actual a todos los webhooks habilitados.

### Response (200)

```json
{
  "success": true,
  "data": { "sent": 3 },
  "message": "Resumen de vacaciones enviado a 3 webhook(s)"
}
```

---

## 5. Enviar anuncio manual

**`POST /api/notifications/announce`**

- **Permiso:** `settings:manage`

### Request Body

```json
{
  "message": "Recordatorio: reunión de equipo mañana a las 10:00",
  "webhookConfigId": "wh_123"
}
```

> Si no se especifica `webhookConfigId`, se envía a todos los webhooks habilitados.

### Response (200)

```json
{
  "success": true,
  "data": { "sent": 1 },
  "message": "Anuncio enviado"
}
```
