# TODO - Issues Pendientes por Resolver

> Organizado por dominio/módulo. Cada tarea especifica archivo, problema y solución propuesta.
> **Actualizado tras revisión de código fuente (8 mayo 2026).**

---

> **📋 Matriz de permisos completa en [`PERMISOS.md`](./PERMISOS.md)**
> **✅ Cambios ya realizados en [`DONE.md`](./DONE.md)**

---

## 📦 Módulo: Schedule Types (Tipos de Turno)

### [ST-2] 🟡 BACKEND: Schedule-types router no delega en un controller
- **Archivo**: `backend/src/modules/schedule-types/schedule-types.router.ts`
- **Problema**: La lógica de los handlers está inline en el router, no hay un archivo `schedule-types.controller.ts`.
- **Severidad**: 🟡 Media — inconsistencia arquitectónica con el resto de módulos.
- **Solución**: Extraer la lógica de cada handler a un controller separado.

---

## 📦 Módulo: Branches (Sucursales)

### [BR-3] 🟡 BACKEND: Branch holidays CRUD requiere `branches:manage` — solo admin
- **Archivo**: `backend/src/modules/branches/branches.router.ts` (líneas 29-33)
- **Problema**: Los festivos de sucursal requieren `branches:manage` (solo admin). Un `general_manager` debería poder gestionar los festivos de SU sucursal.
- **Severidad**: 🟡 Media
- **Solución**: Crear permiso `branches:holidays:manage` y asignarlo a `general_manager`, o modificar la lógica del servicio para que un GM solo pueda gestionar festivos de su branch.

---

## 📦 Módulo: Users (Usuarios)

### [US-2] 🟡 FRONTEND: UsersPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/UsersPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `bg-navy-50`, `border-navy-100`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [US-3] 🟡 FRONTEND: UserDetailsModal usa colores navy hardcodeados
- **Archivo**: `frontend/src/components/common/UserDetailsModal.tsx`
- **Problema**: Usa `border-navy-100`, `bg-navy-50`, `text-navy-800`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [US-4] 🟢 FRONTEND: UserDetailsModal sin fallback para `departments` array
- **Archivo**: `frontend/src/components/common/UserDetailsModal.tsx` (línea 130)
- **Problema**: Solo usa `user.department?.name`, no tiene fallback a `user.departments?.[0]?.department.name`.
- **Severidad**: 🟢 Baja
- **Solución**: Añadir fallback.

---

## 📦 Módulo: Settings / Theme / Webhooks / Notifications

### [SE-2] 🟡 FRONTEND: WebhooksPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/WebhooksPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `bg-navy-50`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [SE-3] 🟡 FRONTEND: NotificationsPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/NotificationsPage.tsx`
- **Problema**: Usa `border-navy-100`, `bg-navy-50`, `text-navy-400`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Event Types (Tipos de Evento)

### [EV-1] 🟡 FRONTEND: EventTypesPage usa estilos legacy (no theme-aware)
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx`
- **Problema**: Usa `bg-indigo-600`, `text-gray-800`, `bg-white`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

### [EV-2] 🟢 FRONTEND: EventTypesPage usa `confirm()` nativo para borrar
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx` (línea 71)
- **Problema**: Usa `confirm('¿Borrar?')` en vez del componente `ConfirmDialog`.
- **Severidad**: 🟢 Baja
- **Solución**: Reemplazar con `ConfirmDialog`.

### [EV-3] 🟢 FRONTEND: EventTypesPage usa `default export`
- **Archivo**: `frontend/src/pages/admin/EventTypesPage.tsx`
- **Problema**: Usa `export default function` mientras que todas las demás páginas admin usan `export function`.
- **Severidad**: 🟢 Baja
- **Solución**: Cambiar a named export y actualizar el lazy import en `App.tsx`.

---

## 📦 Módulo: Holidays (Festivos)

### [HL-1] 🟡 FRONTEND: HolidaysPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/HolidaysPage.tsx`
- **Problema**: Usa `text-navy-600`, `bg-navy-50`, `bg-navy-100`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Audit (Auditoría)

### [AU-1] 🟡 FRONTEND: AuditLogPage usa colores navy hardcodeados
- **Archivo**: `frontend/src/pages/admin/AuditLogPage.tsx`
- **Problema**: Usa `text-navy-800`, `text-navy-400`, `text-navy-300`, etc.
- **Severidad**: 🟡 Media
- **Solución**: Reemplazar por theme-aware.

---

## 📦 Módulo: Frontend Types / Data Model

### [TY-1] 🟡 FRONTEND: Tipo `User` no incluye campo `departments` array
- **Archivo**: `frontend/src/types/index.ts`
- **Problema**: El tipo `User` solo tiene `department` (singular), pero varios componentes referencian `user.departments?.[0]?.department.name`.
- **Severidad**: 🟡 Media
- **Solución**: Añadir `departments?: Array<{ department: Department }>` al tipo `User`.

### [TY-2] 🟡 BACKEND: Prisma schema no tiene relación many-to-many User-Department
- **Archivo**: `backend/prisma/schema.prisma`
- **Problema**: El schema tiene `User.departmentId` (FK a Department), pero el frontend asume que puede venir un array `departments`.
- **Severidad**: 🟡 Media
- **Solución**: Verificar qué devuelve realmente la API `/users` y alinear el tipo frontend con la respuesta real.

---

## 📋 Resumen por Prioridad

### 🔴 Alta (resuelto — ver DONE.md)
1. ~~**[US-1] / [RP-2]** Restringir `users:manage` de GM a su sucursal~~ ✅ Resuelto
2. ~~**[ST-1]** Schedule-types service crea su propio PrismaClient~~ ✅ Resuelto

### 🟡 Media
3. **[ST-2]** Schedule-types router sin controller
4. **[BR-3]** GM no puede gestionar festivos de su sucursal
5. **[US-2]** UsersPage colores navy hardcodeados
6. **[US-3]** UserDetailsModal colores navy hardcodeados
7. **[SE-2]** WebhooksPage colores navy hardcodeados
8. **[SE-3]** NotificationsPage colores navy hardcodeados
9. **[EV-1]** EventTypesPage estilos legacy
10. **[HL-1]** HolidaysPage colores navy hardcodeados
11. **[AU-1]** AuditLogPage colores navy hardcodeados
12. **[TY-1]** Tipo User sin campo departments array
13. **[TY-2]** Desalineación modelo datos User-Department

### 🟢 Baja
14. **[US-4]** UserDetailsModal sin fallback departments array
15. **[EV-2]** EventTypesPage usa confirm() nativo
16. **[EV-3]** EventTypesPage usa default export
