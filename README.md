# Sistema de Guardias Corporativas

Plataforma integral para la gestión, visualización y auditoría de turnos de guardia corporativos, diseñada con un fuerte enfoque en la **resiliencia**, **sincronización en tiempo real** y **trazabilidad total**.

---

## 🛠️ Stack Tecnológico

- **Backend**: Node.js (Express), Prisma ORM, MySQL.
- **Frontend**: React (Vite), TailwindCSS, TanStack Query.
- **Comunicación**: Socket.io (WebSockets) para eventos en tiempo real.
- **Infraestructura**: Docker & Docker Compose.
- **Calidad**: Vitest (Frontend), Jest (Backend), ESLint & Prettier.

---

## 🏗️ Estructura del Proyecto

```text
schedule-app/
├── backend/            # API REST & Logic
│   ├── src/modules/    # Domain-driven modules
│   ├── prisma/         # Database schema & migrations
│   └── tests/          # Integration & Unit tests (Jest)
├── frontend/           # React Application
│   ├── src/realtime/   # WebSocket client & bridge
│   └── tests/          # Frontend tests (Vitest)
├── schedule-app-doc/   # Base de conocimiento (Arquitectura, Guías)
└── docker-compose.yml  # Orquestación de servicios
```

---

## 🛡️ Hardening & Calidad (Actualización 2026-04-17)

El sistema ha sido endurecido con protecciones a nivel de infraestructura:

1. **Tests Obligatorios**: El build de Docker ejecuta automáticamente la suite completa de tests. El despliegue se bloquea si hay fallos.
2. **Persistencia MySQL**: Migración completa de SQLite a MySQL 8 para entornos de alta concurrencia.
3. **Healthchecks**: Los servicios de Docker solo marcan como "Ready" cuando la base de datos y la API responden correctamente.
4. **Validación Zod**: Esquemas de validación estrictos en todos los módulos críticos (Usuarios, Turnos, Auditoría).

---

## 🔄 Infraestructura en Tiempo Real

La aplicación utiliza un patrón de **Invalidación de Queries vía WebSockets**:
- El backend emite eventos (`REALTIME_EVENTS`) tras acciones exitosas.
- El frontend gestiona un `QueryInvalidationBridge` que escucha estos eventos y refresca selectivamente las queries de TanStack.
- **Alcance**: Calendario, Gestión de Usuarios, Logs de Auditoría y Dashboard.

---

## 🗒️ Gestión de Auditoría y Rollback

Sistema de logs de nivel bancario que permite:
- **Trazabilidad**: Quién hizo qué, cuándo y desde qué IP.
- **Sanitización**: Los logs filtran automáticamente datos sensibles (passwords, tokens).
- **Rollback**: Capacidad de revertir acciones de creación, edición o borrado de entidades, restaurando el estado exacto anterior.

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
