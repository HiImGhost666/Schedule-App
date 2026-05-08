# Settings API — Contrato Backend para Frontend

## Base URL

```
/api/settings
```

---

## 1. Obtener tema activo

**`GET /api/settings/theme`**

- **Permiso:** Autenticación sola

### Response (200)

```json
{
  "success": true,
  "data": {
    "key": "theme_active",
    "preset": "claro",
    "tokens": {
      "brandPrimary": "#1a73e8",
      "brandPrimaryHover": "#1557b0",
      "brandSecondary": "#34a853",
      "pageBackground": "#ffffff",
      "surface": "#f8f9fa",
      "surfaceMuted": "#e8eaed",
      "textPrimary": "#202124",
      "textMuted": "#5f6368",
      "borderColor": "#dadce0",
      "success": "#34a853",
      "warning": "#fbbc04",
      "danger": "#ea4335"
    },
    "overrides": {
      "sidebar": { "background": "#1a73e8", "text": "#ffffff", ... },
      "topbar": { ... },
      "buttons": { ... },
      "badges": { ... },
      "calendar": { ... },
      "toasts": { ... }
    },
    "updatedByUserId": "user_admin",
    "updatedAt": "2026-05-07T08:00:00.000Z"
  }
}
```

---

## 2. Publicar tema

**`PUT /api/settings/theme`**

- **Permiso:** `settings:manage`

### Request Body

```json
{
  "preset": "oscuro",
  "tokens": {
    "brandPrimary": "#8ab4f8",
    "brandPrimaryHover": "#669df6",
    "brandSecondary": "#81c995",
    "pageBackground": "#1a1a2e",
    "surface": "#16213e",
    "surfaceMuted": "#0f3460",
    "textPrimary": "#e8eaed",
    "textMuted": "#9aa0a6",
    "borderColor": "#3c4043",
    "success": "#81c995",
    "warning": "#fdd663",
    "danger": "#f28b82"
  },
  "overrides": {
    "sidebar": { "background": "#0f3460", "text": "#e8eaed", "logoVariant": "logo_oscuro", ... },
    "topbar": { ... },
    "buttons": { ... },
    "badges": { ... },
    "calendar": { ... },
    "toasts": { ... }
  }
}
```

> El tema debe cumplir con una relación de contraste mínima de 3.5:1.

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Apariencia publicada"
}
```

---

## 3. Listar presets de tema

**`GET /api/settings/theme/presets`**

- **Permiso:** Autenticación sola

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "claro",
      "name": "Claro",
      "description": "Tema claro por defecto",
      "isBase": true,
      "tokens": { ... },
      "overrides": { ... }
    },
    {
      "id": "preset_custom_123",
      "name": "Mi Tema Personalizado",
      "description": "Tema creado por el admin",
      "isBase": false,
      "tokens": { ... },
      "overrides": { ... }
    }
  ]
}
```

---

## 4. Crear preset personalizado

**`POST /api/settings/theme/presets`**

- **Permiso:** `settings:manage`

### Request Body

```json
{
  "name": "Tema Corporativo",
  "description": "Colores de la empresa",
  "tokens": { ... },
  "overrides": { ... }
}
```

### Response (201)

```json
{
  "success": true,
  "data": { ... },
  "message": "Preset creado"
}
```

---

## 5. Actualizar preset personalizado

**`PATCH /api/settings/theme/presets/:id`**

- **Permiso:** `settings:manage`

### Response (200)

```json
{
  "success": true,
  "data": { ... },
  "message": "Preset actualizado"
}
```

---

## 6. Eliminar preset personalizado

**`DELETE /api/settings/theme/presets/:id`**

- **Permiso:** `settings:manage`

> No se pueden eliminar presets base del sistema.

### Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "Preset eliminado"
}
```

---

## 7. Subir favicon

**`POST /api/settings/upload-favicon`**

- **Permiso:** `settings:manage`
- **Content-Type:** `multipart/form-data`

| Campo     | Tipo | Descripción |
|-----------|------|-------------|
| `favicon` | File | Archivo de imagen (ICO, PNG, SVG, JPG, WEBP). Máx 2 MB. |

### Response (200)

```json
{
  "success": true,
  "data": { "faviconUrl": "/uploads/favicon-123456.ico" },
  "message": "Favicon subido correctamente"
}
```

---

## 8. Obtener configuración del sitio

**`GET /api/settings/site`**

- **Permiso:** Autenticación sola

### Response (200)

```json
{
  "success": true,
  "data": {
    "title": "Gestión de Turnos",
    "faviconUrl": "/uploads/favicon.ico"
  }
}
```

---

## 9. Actualizar configuración del sitio

**`PUT /api/settings/site`**

- **Permiso:** `settings:manage`

### Request Body (todos opcionales)

```json
{
  "title": "Mi App de Turnos",
  "faviconUrl": "/uploads/favicon-123456.ico"
}
```

### Response (200)

```json
{
  "success": true,
  "data": { "title": "Mi App de Turnos", "faviconUrl": "/uploads/favicon-123456.ico" },
  "message": "Configuración del sitio actualizada"
}
```
