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

| Email | Contraseña | Rol | Notas |
| :--- | :--- | :--- | :--- |
| **admin@company.com** | `AdminPass123!` | Administrador | Acceso total al sistema |
| **manager@company.com** | `Manager123!` | Responsable | Departamento: operaciones |
| **carlos@company.com** | `User123!` | Visualizador | Departamento: seguridad. **Debe cambiar la contraseña al iniciar sesión** |
| **ana@company.com** | `User123!` | Visualizador | Departamento: seguridad |
| **pedro@company.com** | `User123!` | Responsable | Departamento: mantenimiento (Sucursal Las Palmas) |
| **laura@company.com** | `User123!` | Visualizador | Departamento: seguridad (Sucursal Las Palmas) |

> [!TIP]
> El usuario `carlos@company.com` tiene marcado el cambio obligatorio de contraseña (`forcePasswordChange`), ideal para probar el flujo de restablecimiento tras el seed.

---

## 🏢 Sucursales Predefinidas

| Código | Nombre | Ciudad |
| :--- | :--- | :--- |
| **TFN** | Lãberit Tenerife | Santa Cruz de Tenerife |
| **GC** | Lãberit Las Palmas | Las Palmas de Gran Canaria |

---

## ✨ Funcionalidades Destacadas

### 🔄 Sincronización en Tiempo Real
La aplicación utiliza WebSockets para actualizar instantáneamente:
- El **Calendario** de guardias.
- La **Lista de Usuarios** en el panel de control.
- El **Feed de Auditoría** y actividad reciente.
- Las **Vacaciones** y su estado.

### 🛡️ Auditoría y Rollback
Cualquier cambio crítico en el sistema queda registrado. Los administradores pueden consultar el historial completo y **revertir cambios** (Rollback) con un solo click en casos de error o borrado accidental.

### 📢 Notificaciones Inteligentes
Integración con **Microsoft Teams** vía Webhooks. Configura resúmenes automáticos cada viernes o alertas de "Último Minuto" para cambios con menos de 24h de antelación. Los webhooks pueden filtrarse por departamento y/o sucursal.

### 🏖️ Gestión de Vacaciones
Solicitud, aprobación/rechazo y calendario de vacaciones con detección de solapamientos (estado `colindante`). Los managers pueden gestionar las vacaciones de su equipo según su scope.

### 📊 Dashboard con Widgets
Vista semanal de turnos, resumen personal de horas, resumen del equipo y actividad reciente, todo en una sola página.

### 📈 Resumen Semanal de Horas
Cálculo automático de horas totales, base y extra por semana con desglose diario. Visible para cada usuario y para managers de su equipo.

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
