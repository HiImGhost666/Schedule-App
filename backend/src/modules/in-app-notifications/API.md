# In-App Notifications API — Contrato Backend para Frontend

> **Última actualización:** 9 mayo 2026

## Base URL

```
/api/in-app-notifications
```

---

## 1. Contar notificaciones no leídas

**`GET /api/in-app-notifications/unread-count`**

- **Autenticación:** Requerida (cualquier rol)
- **Permiso:** Ninguno (accesible para todos los usuarios autenticados)

### Response (200)

```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## 2. Obtener notificaciones no leídas

**`GET /api/in-app-notifications/unread`**

- **Autenticación:** Requerida (cualquier rol)
- **Permiso:** Ninguno

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "userId": "user-uuid",
      "type": "vacation_approved",
      "title": "Vacaciones aprobadas",
      "message": "Tus vacaciones del 01/06 al 10/06 han sido aprobadas",
      "link": "/vacations",
      "metadata": "{\"vacationId\":\"vac-uuid\"}",
      "readAt": null,
      "createdAt": "2026-05-09T12:00:00.000Z"
    }
  ]
}
```

### Tipos de notificación (`type`)

| Tipo | Descripción |
|------|-------------|
| `vacation_approved` | Solicitud de vacaciones aprobada |
| `vacation_rejected` | Solicitud de vacaciones rechazada |
| `vacation_cancelled` | Solicitud de vacaciones cancelada |
| `vacation_requested` | Nueva solicitud de vacaciones (para revisores) |
| `schedule_assigned` | Turno asignado |
| `schedule_modified` | Turno modificado |
| `schedule_deleted` | Turno eliminado |
| `schedule_removed` | Usuario removido de un turno |
| `profile_updated` | Perfil actualizado |
| `password_changed` | Contraseña cambiada |
| `system` | Notificación del sistema |

---

## 3. Obtener todas las notificaciones (paginadas)

**`GET /api/in-app-notifications`**

- **Autenticación:** Requerida (cualquier rol)
- **Permiso:** Ninguno

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | 1 | Número de página |
| `pageSize` | number | 20 | Elementos por página (máx. 50) |

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "userId": "user-uuid",
      "type": "system",
      "title": "Bienvenido",
      "message": "Bienvenido al sistema",
      "link": null,
      "metadata": null,
      "readAt": "2026-05-09T12:30:00.000Z",
      "createdAt": "2026-05-09T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pageSize": 20,
    "totalPages": 2
  }
}
```

---

## 4. Marcar notificación como leída

**`PATCH /api/in-app-notifications/:id/read`**

- **Autenticación:** Requerida (cualquier rol)
- **Permiso:** Ninguno (solo el dueño de la notificación puede marcarla)

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Notificación marcada como leída"
}
```

### Response (400) — ID inválido

```json
{
  "success": false,
  "error": "ID de notificación inválido"
}
```

---

## 5. Marcar todas como leídas

**`POST /api/in-app-notifications/read-all`**

- **Autenticación:** Requerida (cualquier rol)
- **Permiso:** Ninguno

### Response (200)

```json
{
  "success": true,
  "data": {
    "count": 5
  },
  "message": "Todas las notificaciones marcadas como leídas"
}
```
