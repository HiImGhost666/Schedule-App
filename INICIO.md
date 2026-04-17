# Sistema de Guardias Corporativas - Guía de Inicio

Esta guía te ayudará a levantar el entorno de desarrollo utilizando la infraestructura optimizada y contenedorizada.

## 🚀 Inicio Rápido (Docker)

La forma recomendada de arrancar el proyecto es mediante **Docker Compose**, lo que garantiza que la base de datos MySQL y todas las dependencias estén correctamente configuradas.

### 1. Prerequisitos
- **Docker Desktop** instalado y en ejecución.

### 2. Arrancar el Ecosistema
Ejecuta el siguiente comando en la raíz del proyecto:

```bash
docker compose up --build
```

Esto levantará:
- **MySQL**: Base de datos persistente (Puerto 3306).
- **Backend**: API Node.js con auto-recarga (Puerto 3001).
- **Frontend**: Aplicación React/Vite (Puerto 5173).

### 3. Acceder a la App
- **Localmente**: [http://localhost:5173](http://localhost:5173)

### 🌍 Acceso desde la Red Local (LAN)
Este sistema está diseñado para que un PC actúe como **Servidor** y el resto como **Clientes**. Para entrar desde otro equipo de la empresa:
1. Obtén la IP local del servidor (ej. `192.168.1.50`).
2. Desde cualquier otro PC o móvil en la misma red, entra en: `http://192.168.1.50:5173`.

> [!NOTE]
> Gracias a los **WebSockets**, todos los clientes conectados verán las actualizaciones al mismo tiempo. Si alguien cambia un turno en una oficina, el resto lo verá en sus pantallas al instante.

---

## 🔐 Credenciales por Defecto

| Email | Contraseña | Rol |
| :--- | :--- | :--- |
| **admin@company.com** | `AdminPass123!` | Administrador |
| **manager@company.com** | `Manager123!` | Responsable |
| **carlos@company.com** | `User123!` | Usuario |

---

## ✨ Funcionalidades Destacadas

### 🔄 Sincronización en Tiempo Real
La aplicación utiliza WebSockets para actualizar instantáneamente:
- El **Calendario** de guardias.
- La **Lista de Usuarios** en el panel de control.
- El **Feed de Auditoría** y actividad reciente.

### 🛡️ Auditoría y Rollback
Cualquier cambio crítico en el sistema queda registrado. Los administradores pueden consultar el historial completo y **revertir cambios** (Rollback) con un solo click en casos de error o borrado accidental.

### 📢 Notificaciones Inteligentes
Integración con **Microsoft Teams** vía Webhooks. Configura resúmenes automáticos cada viernes o alertas de "Último Minuto" para cambios con menos de 24h de antelación.

---

## 📁 Documentación Técnica Avanzada

Para profundizar en la arquitectura, puedes consultar la base de conocimientos interna:
- [Manual de Desarrollo](file:///c:/Users/rodri/Desktop/schedule-app/schedule-app-doc/AGENTS.md)
- [Estudio de Concurrencia y Eventos](file:///c:/Users/rodri/Desktop/schedule-app/schedule-app-doc/schedule-app-development/concurrency-study.md)

---

## 🛠️ Desarrollo Manual (Sin Docker)

Si prefieres trabajar fuera de contenedores:

1. **MySQL**: Asegúrate de tener un servidor MySQL 8+ activo con una BD llamada `schedule_db`.
2. **Backend**: 
   ```bash
   cd backend && npm install && npm run dev
   ```
3. **Frontend**:
   ```bash
   cd frontend && npm install && npm run dev
   ```

> [!WARNING]
> Recuerda configurar las variables de entorno en los archivos `.env` de cada carpeta basándote en los archivos `.env.example`.
