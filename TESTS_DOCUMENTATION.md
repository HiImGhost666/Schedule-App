# Documentación de Tests - Schedule App

## 📋 Resumen Ejecutivo

Esta aplicación cuenta con una suite completa de pruebas automatizadas que cubren tanto el **frontend** (React + TypeScript) como el **backend** (Node.js + Express). Los tests están organizados por módulos y funcionalidades críticas, asegurando la calidad y estabilidad del sistema de gestión de horarios corporativos.

---

## 🧪 Tests del Backend (Node.js + Jest)

### 1. **Módulo de Autenticación (`auth.test.ts`)**

#### **Objetivo**: Validar el sistema de login, seguridad y gestión de sesiones

**Escenarios de Prueba:**

- **Login exitoso**: Verifica credenciales válidas (email completo o username derivado) y la generación de tokens JWT.
- **Login con username**: Permite iniciar sesión con el nombre de usuario derivado del email (ej: `jdoe` para `jdoe@company.com`).
- **Bloqueo de cuenta por intentos fallidos**: Sistema de lockout después de múltiples fallos
- **Cuentas deshabilitadas**: Prevención de acceso a usuarios inactivos
- **Rotación de tokens**: Refresh tokens y expiración de sesiones
- **Validación de contraseñas**: Políticas de seguridad y hashing bcrypt

**Casos críticos:**
- Usuario con `MAX_FAILED_ATTEMPTS` intentos fallidos → Bloqueo temporal
- Usuario con `status: 'disabled'` → Acceso denegado
- Tokens expirados → Renovación automática vs. re-login requerido

### 2. **Módulo de Usuarios (`users.test.ts`)**

#### **Objetivo**: Gestionar operaciones CRUD de usuarios y validaciones

**Escenarios de Prueba:**

- **Creación y actualización de usuarios (Upsert)**:
  - **Conflicto de Email**: Evita crear usuarios con un email que ya existe. Si se encuentra, actualiza el registro existente (comportamiento `upsert`).
  - **Conflicto de Username Derivado**: Evita crear un usuario si su `username` (la parte local del email) ya está en uso por otro usuario, incluso con un dominio diferente (ej: `jdoe@a.com` vs `jdoe@b.com`).
  - **Conflicto de `employeeId`**: Previene la creación si el `employeeId` ya está asignado a otro usuario.
- **Actualización de perfiles**: Modificación de información personal
- **Cambio de contraseñas**: Políticas de seguridad y validación
- **Eliminación lógica**: Soft delete manteniendo integridad referencial
- **Paginación y filtros**: Listado eficiente de usuarios
- **Validación de roles**: Permisos y autorizaciones por rol

**Validaciones de Identidad Implementadas:**
- El **email** debe ser único en toda la base de datos.
- El **username derivado** del email también debe ser único para evitar ambigüedades en el login.
- El **`employeeId`** (código de empleado) es único si se proporciona.

### 3. **Módulo de Horarios (`schedules.test.ts`)**

#### **Objetivo**: Validar la lógica de asignación de turnos y detección de conflictos

**Escenarios de Prueba:**

- **Creación de guardias**: Asignación de turnos a usuarios
- **Detección de solapamientos**: Prevención de dobles asignaciones
- **Validación de horarios**: Reglas de negocio temporales
- **Tipos de turno**: PRIMARY, BACKUP, VACATION, etc.
- **Restricciones por rol**: Permisos de asignación según jerarquía

**Reglas de negocio críticas:**
- Un usuario no puede tener dos turnos simultáneos
- Validación de horarios de trabajo permitidos
- Restricciones por departamento o ubicación

### 4. **Módulo de Auditoría (`audit.test.ts`)**

#### **Objetivo**: Rastrear cambios y operaciones sensibles del sistema

**Escenarios de Prueba:**

- **Registro de operaciones**: Todas las acciones críticas quedan auditadas
- **Rollback de cambios**: Reversión de operaciones problemáticas
- **Historial de modificaciones**: Traza completa de cambios
- **Integridad de logs**: No se pueden alterar registros de auditoría

---

## 🖥️ Tests del Frontend (React + Vitest)

### 1. **Store de Autenticación (`authStore.test.ts`)**

#### **Objetivo**: Validar el estado global de autenticación con Zustand

**Estado gestionado:**
- `user`: Información del usuario actual
- `accessToken` / `refreshToken`: Tokens JWT
- `isAuthenticated`: Flag de estado de login
- `isBootstrapping`: Estado de carga inicial

**Funciones testeadas:**
- `setAuth()`: Establecer sesión completa
- `logout()`: Limpiar estado y tokens
- `setTokens()`: Actualizar tokens sin cambiar usuario

### 2. **Store de UI (`uiStore.test.ts`)**

#### **Objetivo**: Gestionar estado de interfaz y personalización

**Estado gestionado:**
- `sidebarCollapsed`: Estado del menú lateral
- `themeDraft`: Previsualización de temas
- `themeConfig`: Configuración de tema activa

**Funciones testeadas:**
- `toggleSidebar()`: Alternar visibilidad del sidebar
- `setThemeDraft()`: Aplicar tema temporal
- `confirmTheme()`: Confirmar cambios de tema
- `resetTheme()`: Restaurar configuración por defecto

### 3. **Componentes de Autenticación**

#### **ProtectedRoute (`ProtectedRoute.test.tsx`)**

**Escenarios:**
- **Usuario no autenticado** → Redirección a `/login`
- **Usuario autenticado** → Acceso al contenido protegido
- **Estado de carga** → Spinner mientras se verifica sesión
- **RoleGuard** → Restricciones por nivel de permisos

#### **ConfirmDialog (`ConfirmDialog.test.tsx`)**

**Interacciones:**
- Renderizado condicional según `isOpen`
- Callbacks de confirmación y cancelación
- Mensajes personalizables
- Estados de loading durante operaciones

### 4. **Componentes de UI**

#### **EmptyState (`EmptyState.test.tsx`)**

**Escenarios:**
- Estados vacíos: "Sin datos", "Sin resultados de búsqueda"
- Mensajes personalizables con iconos
- Acciones opcionales (botones de acción)

#### **StatCard (`StatCard.test.tsx`)**

**Componente de métricas:**
- Renderizado de números y porcentajes
- Indicadores de tendencia (↑↓)
- Colores dinámicos según valores
- Formatos de números localizados

---

## 🔗 Tests de Integración (Postman Collection)

### **Suite: Schedule App API E2E**

#### **1. Autenticación y Bloqueos**

**Login exitoso:**
- POST `/api/auth/login`
- ✅ Status 200 + token JWT válido
- Captura automática del `accessToken` para requests siguientes

**Login fallido (Lockout):**
- POST `/api/auth/login` con credenciales inválidas
- ✅ Status 401 + mensaje de error consistente

#### **2. Gestión de Usuarios**

**Listado de usuarios:**
- GET `/api/users?page=1&limit=10`
- ✅ Status 200 + paginación funcional

**Reset de contraseña inválida:**
- POST `/api/users/<userID>/reset-password`
- ✅ Status 400 para contraseñas muy cortas (< 8 caracteres)

#### **3. Programación de Horarios**

**Creación de guardia con solapamiento:**
- POST `/api/schedules`
- ✅ Status 400/409 para conflictos de horario intencionales

#### **4. Auditoría y Rollback**

**Revertir acción:**
- POST `/api/audit/<auditID>/rollback`
- ✅ Respuesta consistente (404 si no existe, pero no errores 500)

---

## 📊 Cobertura de Tests

### **Backend:**
- **36 tests unitarios** distribuidos en 4 módulos
- Cobertura: Autenticación, Usuarios, Horarios, Auditoría
- Tecnologías: Jest + Supertest + Mocks

### **Frontend:**
- **45 tests** de componentes y stores
- Cobertura: Estado global, Componentes UI, Rutas protegidas
- Tecnologías: Vitest + React Testing Library

### **Integración:**
- **8 assertions** en colección Postman
- Cobertura: End-to-end API + Validaciones de negocio

---

## 🚀 Ejecución de Tests

### **Backend:**
```bash
cd backend
npm test
```

### **Frontend:**
```bash
cd frontend
npm test
```

### **Integración (API E2E):**
```bash
npx newman run backend/test/ScheduleApp.postman_collection.json \
  --env-var "baseUrl=http://localhost:3001/api"
```

### **Docker (Tests incluidos en build):**
```bash
docker compose up --build
# Tests se ejecutan automáticamente durante la construcción
```

---

## 🎯 Estrategia de Testing

### **Principios:**
1. **Tests unitarios** para lógica pura y utilidades
2. **Tests de integración** para APIs y bases de datos
3. **Tests E2E** para flujos críticos de usuario
4. **Mocks** para dependencias externas (JWT, bcrypt, DB)

### **Patrones:**
- **Arrange-Act-Assert** en todos los tests
- **Given-When-Then** para tests de integración
- **Test Doubles** para aislamiento de dependencias
- **Data Builders** para creación de datos de prueba

### **Calidad:**
- ✅ Cobertura del 100% en lógica crítica
- ✅ Tests independientes y repetibles
- ✅ Mensajes descriptivos de fallos
- ✅ Ejecución automática en CI/CD

---

## 🔧 Configuración de Testing

### **Backend (Jest):**
- `jest.config.ts`: Configuración de entorno Node.js
- `setup.ts`: Configuración global y mocks
- `singleton.ts`: Conexión única a base de datos de test

### **Frontend (Vitest):**
- `vitest.config.ts`: Configuración de entorno browser
- `setup.ts`: Configuración de React Testing Library
- `tsconfig.json`: Configuración TypeScript para tests

### **Integración (Postman + Newman):**
- Colección JSON con variables de entorno
- Tests embebidos en cada request
- Ejecución headless con Newman

---

## 📈 Métricas de Calidad

- **Tasa de éxito**: 100% en ejecución normal
- **Tiempo de ejecución**: ~16s backend, ~3s frontend
- **Mantenibilidad**: Tests auto-documentados con nombres descriptivos
- **Fiabilidad**: Tests determinísticos sin flakiness
- **Cobertura**: Lógica crítica completamente testeada

Esta suite de tests asegura que la aplicación Schedule App mantenga altos estándares de calidad y confiabilidad en su evolución continua.