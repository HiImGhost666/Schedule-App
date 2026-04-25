# 🗓️ Sistema de Guardias Corporativas

Bienvenido/a a la plataforma integral para la gestión, visualización y auditoría de turnos de guardia corporativos. Este sistema está diseñado para ser **fácil de usar**, seguro y totalmente trazable, permitiendo la gestión eficiente de usuarios, horarios, auditoría y notificaciones en tiempo real.

---

## 🚀 ¿Qué puedes hacer con esta página?

- Gestionar usuarios y sus roles (administrador, responsable, usuario)
- Asignar y visualizar turnos de guardia y vacaciones
- Consultar y revertir cambios gracias al sistema de auditoría
- Recibir notificaciones inteligentes y sincronización en tiempo real
- Importar/exportar usuarios vía CSV
- Integrar con Microsoft Teams para alertas y resúmenes

---

## 🧩 Funcionalidades principales

- **Gestión de usuarios**: Alta, edición, baja, importación/exportación CSV, control de roles y departamentos.
- **Gestión de turnos**: Asignación de guardias, vacaciones, visualización en calendario, gestión de solapamientos.
- **Auditoría y rollback**: Registro de todas las acciones críticas, con posibilidad de revertir cambios.
- **Notificaciones**: Alertas automáticas por cambios de última hora y resúmenes semanales vía Teams.
- **Sincronización en tiempo real**: Cambios reflejados instantáneamente en todos los dispositivos conectados.
- **Gestión de sedes y festivos**: Soporte multi-sucursal, calendario de festivos nacional, regional y local.

---

## 🛠️ Tecnologías utilizadas

- **Backend**: Node.js (Express), Prisma ORM, MySQL
- **Frontend**: React (Vite), TailwindCSS, TanStack Query
- **Comunicación**: WebSockets (Socket.io)
- **Infraestructura**: Docker & Docker Compose
- **Calidad**: Vitest (Frontend), Jest (Backend), ESLint & Prettier

---

## 🏗️ Estructura del proyecto

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

## 🏁 Cómo empezar (instalación y uso)

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

## 👤 Usuarios de ejemplo (seed)

Al iniciar el sistema, se crean automáticamente usuarios de prueba para facilitar el acceso y las pruebas:

| Email                  | Contraseña      | Rol           | Departamento     | Sede (branch)           |
|------------------------|-----------------|---------------|------------------|-------------------------|
| admin@company.com      | AdminPass123!   | Administrador | Administración   | Lãberit Tenerife (TFN)  |
| manager@company.com    | Manager123!     | Responsable   | Operaciones      | Lãberit Tenerife (TFN)  |
| carlos@company.com     | User123!        | Usuario       | Seguridad        | Lãberit Tenerife (TFN)  |
| ana@company.com        | User123!        | Usuario       | Seguridad        | Lãberit Tenerife (TFN)  |
| pedro@company.com      | User123!        | Responsable   | Mantenimiento    | Lãberit Las Palmas (GC) |
| laura@company.com      | User123!        | Usuario       | Seguridad        | Lãberit Las Palmas (GC) |

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

¡Bienvenido al futuro de la gestión de guardias! 🚀
