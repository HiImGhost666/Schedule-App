<div align="center">

<picture>
  <source 
    media="(prefers-color-scheme: dark)" 
    srcset="frontend/src/assets/Logo_Claro.webp"
  >
  <source 
    media="(prefers-color-scheme: light)" 
    srcset="frontend/src/assets/Logo_Oscuro.webp"
  >
  <img 
    src="frontend/src/assets/Logo_Claro.webp" 
    alt="Logo" 
    width="300"
  >
</picture>

# Sistema de Guardias Corporativas

### Full Stack Enterprise Scheduling Platform

Plataforma integral para la gestión, visualización y auditoría de turnos de guardia corporativos, diseñada para ser segura, escalable y totalmente sincronizada en tiempo real.

<br>

<img src="https://skillicons.dev/icons?i=nodejs,react,ts,docker,mysql,tailwind,vite"/>

<br>

![Status](https://img.shields.io/badge/status-active-success?style=for-the-badge)
![Frontend](https://img.shields.io/badge/frontend-react%20%2B%20vite-61DAFB?style=for-the-badge&logo=react)
![Backend](https://img.shields.io/badge/backend-nodejs%20%2B%20express-339933?style=for-the-badge&logo=node.js)
![Realtime](https://img.shields.io/badge/realtime-socket.io-010101?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

</div>

---

## ¿Qué puedes hacer con esta página?

- Gestionar usuarios y sus roles (administrador, responsable, usuario)
- Asignar y visualizar turnos de guardia y vacaciones
- Consultar y revertir cambios gracias al sistema de auditoría
- Recibir notificaciones inteligentes y sincronización en tiempo real
- Importar/exportar usuarios vía CSV
- Integrar con Microsoft Teams para alertas y resúmenes

---

## Funcionalidades principales

- **Gestión de usuarios**: Alta, edición, baja, importación/exportación CSV, control de roles y departamentos.
- **Gestión de turnos**: Asignación de guardias, vacaciones, visualización en calendario, gestión de solapamientos y turnos multi-día.
- **Gestión de vacaciones**: Solicitud, aprobación/rechazo, calendario de vacaciones y filtros avanzados.
- **Resumen semanal de horas**: Cálculo automático de horas totales, base y extra con desglose diario.
- **Dashboard interactivo**: Vista semanal de turnos, actividad reciente y métricas del equipo.
- **Auditoría y rollback**: Registro de acciones críticas con posibilidad de revertir cambios.
- **Notificaciones inteligentes**: Alertas automáticas e integración con Microsoft Teams.
- **Sincronización en tiempo real**: Actualización instantánea en todos los dispositivos conectados.
- **Gestión multi-sucursal**: Soporte para sedes, departamentos y festivos regionales.
- **Webhooks configurables**: Integraciones segmentadas por departamento o sucursal.
- **Tipos de evento personalizados**: Configuración de colores y categorías de turnos.
- **Temas corporativos**: Personalización visual con logos, favicon y colores.

---

## Tecnologías utilizadas

- **Backend**: Node.js (Express), Prisma ORM, MySQL
- **Frontend**: React (Vite), TailwindCSS, TanStack Query
- **Comunicación**: WebSockets (Socket.io)
- **Infraestructura**: Docker & Docker Compose
- **Calidad**: Vitest (Frontend), Jest (Backend), ESLint & Prettier
---

## Estructura del proyecto

```text
schedule-app/
├── backend/            # API REST & lógica de negocio
│   ├── src/modules/    # Módulos de dominio
│   ├── prisma/         # Esquema y migraciones de base de datos
│   └── test/           # Tests de integración y unidad (Jest)
├── frontend/           # Aplicación React
│   ├── src/realtime/   # Cliente WebSocket
│   └── test/           # Tests frontend (Vitest)
├── schedule-app-doc/   # Documentación y guías
└── docker-compose.yml  # Orquestación de servicios
```

---

## Cómo empezar (instalación y uso)

### Opción recomendada: Docker Compose

1. Instala **Docker Desktop** y ejecútalo.
2. En la raíz del proyecto, ejecuta:
	```bash
	docker compose up --build
	```
3. Accede a la app en [http://localhost:5173](http://localhost:5173)

#### Acceso desde otros dispositivos en la red local
1. Obtén la IP local del servidor (ej: `192.168.1.50`).
2. Desde otro PC/móvil en la misma red, entra en: `http://192.168.1.50:5173`

### Opción manual (sin Docker)

1. Asegúrate de tener **MySQL 8+** y crea una base de datos `schedule_db`.
2. Backend:
	```bash
	cd backend && npm install && npm run dev
	```
3. Frontend:
	```bash
	cd frontend && npm install && npm run dev
	```
4. Configura las variables de entorno en los archivos `.env` de cada carpeta (usa los `.env.example` como base).

---

## Usuarios de ejemplo (seed)

Al iniciar el sistema, se crean automáticamente usuarios de prueba para facilitar el acceso y las pruebas:

| Email                  | Contraseña      | Rol           | Departamento     | Sede (branch)           |
|------------------------|-----------------|---------------|------------------|-------------------------|
| admin@company.com      | AdminPass123!   | Administrador | Administración   | Schedule-App Tenerife (TFN)  |
| manager@company.com    | Manager123!     | Responsable   | Operaciones      | Schedule-App Tenerife (TFN)  |
| carlos@company.com     | User123!        | Usuario       | Seguridad        | Schedule-App Tenerife (TFN)  |
| ana@company.com        | User123!        | Usuario       | Seguridad        | Schedule-App Tenerife (TFN)  |
| pedro@company.com      | User123!        | Responsable   | Mantenimiento    | Schedule-App Las Palmas (GC) |
| laura@company.com      | User123!        | Usuario       | Seguridad        | Schedule-App Las Palmas (GC) |

> **Nota:** El usuario `carlos@company.com` debe cambiar la contraseña al primer inicio de sesión.

---

## ✨ Funcionalidades destacadas

- 🔄 **Sincronización en tiempo real**: Cambios en calendario, usuarios y auditoría se reflejan al instante en todos los clientes conectados.
- 🛡️ **Auditoría y rollback**: Todas las acciones críticas quedan registradas y pueden revertirse fácilmente.
- 📢 **Notificaciones inteligentes**: Integración con Teams para alertas y resúmenes automáticos.
- 📄 **Importación/exportación CSV**: Gestiona usuarios de forma masiva con archivos CSV.

---

## 📄 Importar y exportar usuarios por CSV

La gestión de usuarios permite importar y exportar datos usando la misma estructura CSV:

**Cabecera oficial:**

```csv
name,email,role,status,department,branchId,companyPhone,auxiliaryPhone
```

**Reglas principales:**

1. `name` y `email` son obligatorios.
2. `role`: `admin`, `manager`, `viewer`.
3. `status`: `active`, `disabled`, `locked`.
4. `department`: `Seguridad`, `Mantenimiento`, `Operaciones`, `Administración`.
5. `branchId` es opcional, pero si se informa debe existir en base de datos.
6. El identificador para importar es el `email`.
7. Las altas por CSV usan contraseña temporal y fuerzan cambio al primer inicio.

---

## 📝 Consejos y detalles útiles

- Consulta los archivos `CONSTANTS_GUIDE.md` en backend y frontend para ver todos los roles, departamentos y constantes del sistema.
- Los logs de auditoría filtran automáticamente datos sensibles (contraseñas, tokens).
- El sistema soporta múltiples sedes y festivos locales, regionales y nacionales.
- Puedes revertir acciones críticas desde el panel de auditoría.
- El sistema está preparado para entornos multiusuario y alta concurrencia.

---

## 📚 Documentación adicional

Para más detalles técnicos y guías avanzadas, consulta:
- `/INICIO.md` — Guía rápida de inicio y despliegue
- `/backend/CONSTANTS_GUIDE.md` y `/frontend/CONSTANTS_GUIDE.md` — Constantes y configuraciones clave
- `/schedule-app-doc/` — Arquitectura, agentes, concurrencia y más

---

¡Bienvenido/a al futuro de la gestión de guardias! 🚀

---

## 📄 CSV de Usuarios (Importar / Exportar)

La gestión de usuarios soporta importación y exportación con **la misma estructura CSV**.

### Cabecera oficial

```csv
name,email,role,status,department,branchId,companyPhone,auxiliaryPhone
```

### Reglas

1. `name` y `email` son obligatorios.
2. `role` permite: `admin`, `manager`, `viewer`.
3. `status` permite: `active`, `disabled`, `locked`.
4. `department` permite: `Seguridad`, `Mantenimiento`, `Operaciones`, `Administración`.
5. `branchId` es opcional, pero si se informa debe existir en base de datos.
6. `islandCalendar` no forma parte del CSV.
7. El identificador para importar es el `email`.

### Comportamiento al importar

1. Si el `email` no existe, se crea el usuario mediante el endpoint de creación existente.
2. Si el `email` existe, se actualiza solo si hay cambios (sin modificar la contraseña).
3. Las altas por CSV usan contraseña temporal del backend (`IMPORT_DEFAULT_PASSWORD`) y fuerzan cambio al primer inicio de sesión.
4. El proceso es parcial: las filas inválidas no bloquean el resto y se devuelven en un CSV de rechazados con motivo (`reason`).

---

## 🚀 Despliegue Rápido

### Con Docker (Recomendado)
```bash
docker compose up --build
```

### Sin Docker (Desarrollo)
Consulte el archivo [INICIO.md](file:///c:/Users/rodri/Desktop/schedule-app/INICIO.md) para instrucciones detalladas paso a paso.

---

## 📚 Documentación Adicional

Para más detalles sobre el funcionamiento interno, consulte la carpeta `/schedule-app-doc`:
- [Arquitectura de Agentes](file:///c:/Users/rodri/Desktop/schedule-app/schedule-app-doc/AGENTS.md)
- [Estudio de Concurrencia](file:///c:/Users/rodri/Desktop/schedule-app/schedule-app-doc/schedule-app-development/concurrency-study.md)
- [Guía de Usuarios](file:///c:/Users/rodri/Desktop/schedule-app/schedule-app-doc/schedule-app-development/usuarios.md)

---

---

## 📋 Acciones por página y rol

A continuación se detallan todas las acciones disponibles en cada página de la aplicación, organizadas por rol de usuario.

### 🔐 Panel de Login (`/login`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Iniciar sesión con email/username y contraseña | ✅ | ✅ | ✅ |
| Cambiar contraseña obligatoria al primer inicio | ✅ | ✅ | ✅ |

### 📊 Dashboard (`/dashboard`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver calendario semanal con turnos | ✅ | ✅ | ✅ |
| Ver leyenda de tipos de turno (colores) | ✅ | ✅ | ✅ |
| Ver resumen de turnos de la semana | ✅ | ✅ | ✅ |
| Ver resumen semanal de horas (propias) | ✅ | ✅ | ✅ |
| Ver resumen semanal del equipo | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| Ver actividad de auditoría reciente | ✅ | ❌ | ❌ |
| Navegar entre semanas (anterior/siguiente) | ✅ | ✅ | ✅ |
| Ir a la semana actual | ✅ | ✅ | ✅ |
| Filtrar turnos por sucursal | ✅ | ❌ | ❌ |
| Filtrar turnos por departamento | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) |
| Filtrar turnos por empleado | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) |
| Filtrar por tipo de turno | ✅ | ✅ | ✅ |
| Filtrar solo mis turnos | ✅ | ✅ | ✅ |
| Filtrar solo urgentes | ✅ | ✅ | ✅ |
| Los turnos se filtran automáticamente según el rol | ✅ (ve todo) | ✅ (ve su branch) | ✅ (ve su depto) |

### 📅 Calendario de Turnos (`/schedules`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver calendario mensual con todos los turnos | ✅ | ✅ | ✅ |
| Ver detalle de un turno al hacer clic (popover) | ✅ | ✅ | ✅ |
| Crear nuevo turno (guardia, ausencia, vacaciones, etc.) | ✅ | ✅ | ❌ |
| Editar turno existente | ✅ | ✅ | ❌ |
| Eliminar turno | ✅ | ✅ | ❌ |
| Asignar personal al turno desde listado filtrable | ✅ | ✅ | ❌ |
| Ver previsualización de horas totales del turno | ✅ | ✅ | ❌ |
| Confirmar creación en día festivo (modal de advertencia) | ✅ | ✅ | ❌ |
| Filtrar por sucursal | ✅ | ✅ | ✅ |
| Filtrar por departamento | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) |
| Ver festivos del mes en el calendario | ✅ | ✅ | ✅ |

**Tipos de turno disponibles:** Guardia, Ausencia, Vacaciones, Formación, Otro, Excepción

### 👥 Gestión de Usuarios (`/admin/users`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver listado completo de usuarios | ✅ | ✅ | ❌ |
| Buscar usuarios por nombre o email | ✅ | ✅ | ❌ |
| Filtrar por rol, estado, departamento, sucursal | ✅ | ✅ | ❌ |
| Ordenar por cualquier columna (nombre, depto., sucursal, rol, etc.) | ✅ | ✅ | ❌ |
| Ver detalle de perfil de usuario | ✅ | ✅ | ❌ |
| Crear nuevo usuario | ✅ | ❌ | ❌ |
| Editar usuario (nombre, email, departamento, sucursal) | ✅ | ❌ | ❌ |
| Cambiar rol de usuario | ✅ | ❌ | ❌ |
| Cambiar estado (activar/desactivar/bloquear) | ✅ | ❌ | ❌ |
| Forzar cambio de contraseña | ✅ | ❌ | ❌ |
| Resetear contraseña | ✅ | ❌ | ❌ |
| Eliminar usuario (soft-delete) | ✅ | ❌ | ❌ |
| Importar usuarios desde CSV | ✅ | ❌ | ❌ |
| Exportar usuarios a CSV | ✅ | ❌ | ❌ |
| Descargar plantilla CSV | ✅ | ❌ | ❌ |

### 🏢 Gestión de Sucursales (`/admin/branches`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver listado de sucursales | ✅ | ✅ | ✅ |
| Ordenar sucursales por nombre, código o estado | ✅ | ✅ | ✅ |
| Crear nueva sucursal | ✅ | ❌ | ❌ |
| Editar sucursal (nombre, código, dirección, etc.) | ✅ | ❌ | ❌ |
| Activar/desactivar sucursal | ✅ | ❌ | ❌ |
| Eliminar sucursal definitivamente (si no tiene turnos) | ✅ | ❌ | ❌ |

### 🎉 Gestión de Festivos (`/admin/holidays`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver calendario de festivos por sucursal | ✅ | ✅ | ✅ |
| Ver vista global "Todas las sucursales" con festivos agrupados | ✅ | ✅ | ✅ |
| Filtrar por año y tipo de festivo | ✅ | ✅ | ✅ |
| Ordenar por fecha, nombre o tipo | ✅ | ✅ | ✅ |
| Ver detalle de sucursales en festivos compartidos | ✅ | ✅ | ✅ |
| Crear nuevo festivo (con advertencia si hay turnos en esa fecha) | ✅ | ❌ | ❌ |
| Editar festivo existente | ✅ | ❌ | ❌ |
| Eliminar festivo (individual o agrupado) | ✅ | ❌ | ❌ |

**Tipos de festivo:** Nacional, Autonómica, Regional, Local, Mejora, Empresa

### 📋 Auditoría (`/admin/audit`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver historial completo de auditoría | ✅ | ❌ | ❌ |
| Filtrar por acción, entidad, usuario, departamento, sucursal | ✅ | ❌ | ❌ |
| Filtrar por rango de fechas | ✅ | ❌ | ❌ |
| Ver pestaña "Reversibles" / "Irreversibles" | ✅ | ❌ | ❌ |
| Ver detalle de un registro (snapshots before/after) | ✅ | ❌ | ❌ |
| **Revertir (rollback) una acción** | ✅ | ❌ | ❌ |

**Acciones revertibles:** CREATE_SCHEDULE, UPDATE_SCHEDULE, DELETE_SCHEDULE, CREATE_USER, UPDATE_USER, DELETE_USER, USER_STATUS_CHANGE, USER_ROLE_CHANGE, CREATE_BRANCH_HOLIDAY, UPDATE_BRANCH_HOLIDAY, DELETE_BRANCH_HOLIDAY, CREATE_WEBHOOK, UPDATE_WEBHOOK, DELETE_WEBHOOK

### 🏖️ Gestión de Vacaciones (`/vacaciones`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver calendario de vacaciones | ✅ | ✅ | ✅ |
| Ver listado de solicitudes de vacaciones | ✅ | ✅ | ✅ |
| Solicitar vacaciones | ✅ | ✅ | ✅ |
| Aprobar/rechazar solicitudes | ✅ | ✅ (scope: su branch) | ✅ (scope: su depto) | ❌ |
| Cancelar solicitudes propias | ✅ | ✅ | ✅ |
| Eliminar solicitudes permanentemente | ✅ | ❌ | ❌ |
| Filtrar por sucursal y departamento | ✅ | ✅ | ✅ |

### 🔔 Notificaciones (`/admin/notifications`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver historial de notificaciones enviadas | ✅ | ✅ | ❌ |
| Ver detalles de cada notificación | ✅ | ✅ | ❌ |

### 📅 Gestión de Tipos de Evento (`/admin/event-types`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver listado de tipos de evento | ✅ | ✅ | ✅ |
| Crear y editar tipos de evento (nombre, color) | ✅ | ✅ | ❌ |

### ⚙️ Webhooks (`/admin/webhooks`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver listado de webhooks configurados | ✅ | ❌ | ❌ |
| Crear nuevo webhook (URL, eventos, filtros) | ✅ | ❌ | ❌ |
| Editar webhook existente | ✅ | ❌ | ❌ |
| Probar webhook (enviar payload de prueba) | ✅ | ❌ | ❌ |
| Eliminar webhook | ✅ | ❌ | ❌ |

### 👤 Perfil de Usuario (`/profile`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver datos de perfil | ✅ | ✅ | ✅ |
| Cambiar contraseña | ✅ | ✅ | ✅ |
| Ver aviso de cambio de contraseña próximo (warning) | ✅ | ✅ | ✅ |

### 🎨 Temas y Personalización (`/admin/settings`)

| Acción | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| Ver temas disponibles | ✅ | ❌ | ❌ |
| Crear nuevo tema (colores, logo, favicon) | ✅ | ❌ | ❌ |
| Editar tema existente | ✅ | ❌ | ❌ |
| Duplicar tema | ✅ | ❌ | ❌ |
| Eliminar tema (excepto presets base) | ✅ | ❌ | ❌ |
| Subir logo y favicon | ✅ | ❌ | ❌ |

---

¡Bienvenido al futuro de la gestión de guardias! 🚀
