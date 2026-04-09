# Schedule App

Este proyecto es una aplicación para la gestión de turnos y usuarios, compuesta por un backend (Node.js + Express + Prisma + SQLite) y un frontend (React + Vite + TailwindCSS). A continuación se explica la estructura, funcionamiento y pasos para desarrollo y despliegue.

---

## Estructura del Proyecto

```
schedule-app/
│
├── backend/           # API REST, lógica de negocio y base de datos
│   ├── src/           # Código fuente del backend
│   │   ├── modules/   # Módulos organizados por dominio (auth, users, schedules...)
│   │   ├── config/    # Configuración (env, db, constantes)
│   │   ├── middleware/# Middlewares Express
│   │   ├── utils/     # Utilidades
│   │   └── scripts/   # Scripts auxiliares (ej: seed de usuarios)
│   ├── prisma/        # Esquema y migraciones de la base de datos
│   ├── .env           # Variables de entorno (no subir a git)
│   ├── package.json   # Dependencias y scripts
│   └── Dockerfile     # Imagen Docker del backend
│
├── frontend/          # Aplicación web (React)
│   ├── src/           # Código fuente del frontend
│   │   ├── components/# Componentes reutilizables
│   │   ├── pages/     # Páginas principales
│   │   ├── config/    # Configuración de API, holidays, queryClient
│   │   ├── hooks/     # Custom hooks
│   │   ├── lib/       # Utilidades
│   │   ├── store/     # Estado global (zustand)
│   │   └── types/     # Tipos TypeScript
│   ├── public/        # Archivos estáticos
│   ├── package.json   # Dependencias y scripts
│   └── Dockerfile     # Imagen Docker del frontend
│
├── docker-compose.yml # Orquestación de servicios
├── .gitignore         # Archivos/Carpetas ignoradas por git
└── INICIO.md          # Documentación inicial
```

---

## Backend

- **Framework:** Node.js + Express
- **ORM:** Prisma (con SQLite por defecto)
- **Autenticación:** JWT (access y refresh tokens)
- **Módulos principales:**
  - `auth`: Login, registro, manejo de tokens
  - `users`: Gestión de usuarios
  - `schedules`: Gestión de turnos
  - `notifications`: Notificaciones y plantillas
  - `audit`: Auditoría de acciones
  - `webhooks`: Integraciones externas

### Archivos clave
- `src/app.ts` y `src/server.ts`: Configuración y arranque del servidor
- `prisma/schema.prisma`: Esquema de la base de datos
- `.env`: Variables de entorno (ver ejemplo en `.env.example`)

### Scripts útiles
- `npm run dev`: Levanta el backend en modo desarrollo
- `npm run build`: Compila TypeScript
- `npm run start`: Ejecuta el backend compilado
- `npx prisma db push`: Aplica el esquema a la base de datos
- `npm run db:seed`: Inserta datos de ejemplo

---

## Frontend

- **Framework:** React + Vite
- **Estado global:** Zustand
- **Estilos:** TailwindCSS
- **Ruteo:** React Router
- **Componentes clave:**
  - `components/`: Comunes, layout, schedule, users, webhooks, etc.
  - `pages/`: Dashboard, Login, Perfil, Administración, etc.

### Scripts útiles
- `npm run dev`: Levanta el frontend en modo desarrollo
- `npm run build`: Compila la app para producción
- `npm run preview`: Sirve la app compilada

---

## Variables de entorno

- **Backend:**
  - `.env` (ver `.env.example`)
  - Variables importantes: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, etc.
- **Frontend:**
  - Variables tipo `VITE_` para configuración en tiempo de build (ejemplo: `VITE_API_URL`)

---

## Base de datos

- Por defecto usa SQLite (`backend/prisma/schedule.db`).
- El archivo `.db` se crea automáticamente al ejecutar migraciones o al iniciar el backend si no existe.
- El esquema se define en `prisma/schema.prisma`.
- Para cambiar a otra base de datos, ajusta `DATABASE_URL` y el proveedor en el schema de Prisma.

---

## Docker y Docker Compose

- El proyecto incluye `Dockerfile` para backend y frontend, y un `docker-compose.yml` para levantar ambos servicios juntos.
- Comando para levantar todo:
  ```sh
  docker compose up --build
  ```
- Los puertos expuestos por defecto son:
  - Backend: 3001
  - Frontend: 5173
- Los volúmenes montan el código fuente para desarrollo en caliente.

---

## Primeros pasos para desarrollo

1. Clona el repositorio y entra a la carpeta del proyecto.
2. Copia `.env.example` a `.env` en backend y ajusta valores si es necesario.
3. Instala dependencias:
   ```sh
   cd backend && npm install
   cd ../frontend && npm install
   ```
4. Inicializa la base de datos:
   ```sh
   cd ../backend
   npx prisma db push
   npm run db:seed
   ```
5. Levanta ambos servidores:
   - Backend: `npm run dev` en `backend/`
   - Frontend: `npm run dev` en `frontend/`
   - O usa Docker Compose: `docker compose up --build`

---

## Buenas prácticas

- No subas `.env`, `.db`, ni `node_modules` al repositorio.
- Documenta cambios y módulos nuevos en este README o en `INICIO.md`.
- Usa ramas para nuevas features y PR para revisión.
- Mantén actualizado el esquema de la base de datos y los seeds.

---

## Contacto y soporte

- Si tienes dudas sobre algún módulo, revisa primero el código fuente y los comentarios.
- Para problemas comunes, revisa los scripts y la configuración de entorno.
- Si encuentras bugs o tienes sugerencias, documenta en el README o crea un issue.

---

¡Bienvenido al equipo! 🚀
