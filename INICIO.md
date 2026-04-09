# Sistema de Guardias Corporativas

## Inicio Rápido

### Prerequisitos
- Node.js 20+ instalado

### 1. Arrancar el Backend

```bash
cd schedule-app/backend
npm install          # solo la primera vez
npm run dev          # servidor en http://localhost:3001
```

### 2. Arrancar el Frontend (nueva terminal)

```bash
cd schedule-app/frontend
npm install          # solo la primera vez
npm run dev          # app en http://localhost:5173
```

### 3. Abrir el navegador

Ir a: **http://localhost:5173**

---

## Credenciales por defecto

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@company.com | AdminPass123! | Administrador |
| manager@company.com | Manager123! | Responsable |
| carlos@company.com | User123! | Usuario |

---

## Funcionalidades

- **Dashboard** — resumen de la semana, guardias propias, actividad reciente
- **Calendario de Guardias** — vista mensual/semanal/diaria/lista con FullCalendar
  - Click en fecha vacía → crear nueva guardia
  - Click en guardia → ver/editar
  - Una persona puede tener múltiples guardias simultáneas
- **Panel de Administración** (solo admin/manager)
  - Gestión de usuarios (crear, editar, bloquear, resetear contraseña, eliminar)
  - Webhooks de Microsoft Teams (configurar, probar, activar/desactivar)
  - Notificaciones (historial, reenvío, resumen semanal manual, anuncios)
  - Auditoría (log completo de todas las acciones)
- **Perfil** — cambio de contraseña propio

---

## Notificaciones Teams

1. Ve a **Admin → Webhooks**
2. Crea un nuevo webhook con la URL de tu canal de Teams
3. Configura qué notificaciones recibir:
   - Modificaciones de guardias
   - Cambios de último momento (<24h)
   - Resumen automático cada viernes a las 12:00
4. Prueba con el botón "Probar"

---

## Base de Datos

La base de datos SQLite está en: `C:/Users/aguillen/schedule-app.db`

Para cambiar la ubicación, edita `DATABASE_URL` en `backend/.env`

---

## Responsive Design

- **Móvil**: navegación inferior, vistas adaptadas
- **Escritorio**: sidebar colapsable, tablas completas
- **TV**: fuentes grandes, calendario expandido
