# Design System — Schedule App

> **Última actualización:** 9 mayo 2026
> **Propósito:** Centralizar la lógica de componentes de frontend, patrones de diseño y decisiones visuales para unificar la UI.

---

## 1. Filosofía de Componentes

### Principios
1. **Componentes Dumb (Presentacionales)**: Sin lógica de negocio. Reciben props y renderizan. Ubicados en `components/common/`.
2. **Componentes Smart (Contenedores)**: Conectados a stores/queries. Orquestan datos y pasan props a dumb components. Ubicados en `components/<modulo>/`.
3. **Páginas**: Composición de smart components. Una página = una ruta. Ubicadas en `pages/`.
4. **Hooks**: Lógica reutilizable extraída de smart components. Ubicados en `hooks/`.

### Árbol de decisión para crear un componente

```
¿Tiene estado local o lógica de UI?
  ├── Sí → ¿Se reutiliza en varias páginas?
  │       ├── Sí → Componente Dumb en common/
  │       └── No → Componente Dumb en <modulo>/
  └── No → ¿Obtiene datos de API o store?
          ├── Sí → Smart Component en <modulo>/
          └── No → ¿Es una página?
                  ├── Sí → Página en pages/
                  └── No → Hook en hooks/
```

---

## 2. Patrones de Componentes

### 2.1 StatCard (Dumb)
```tsx
// Props: title, value, icon?, trend?, onClick?
// Uso: Dashboard, reportes
<StatCard title="Usuarios activos" value={42} icon={Users} />
```

### 2.2 DataTable (Dumb)
```tsx
// Props: columns[], data[], sortable?, onSort?, pagination?, onPageChange?
// Uso: UsersTable, VacationTable, AuditLogTable
<DataTable columns={columns} data={users} sortable pagination />
```

### 2.3 ConfirmDialog (Dumb)
```tsx
// Props: open, title, message, confirmLabel?, cancelLabel?, onConfirm, onCancel, variant?
// Uso: Confirmar eliminación, acciones destructivas
<ConfirmDialog open={isOpen} title="Eliminar usuario" message="..." onConfirm={handleDelete} />
```

### 2.4 Modal / Drawer (Dumb)
```tsx
// Props: open, onClose, title, children, size?
// Uso: ShiftModal, HolidayEditModal, UserProfileModal
<Modal open={isOpen} onClose={handleClose} title="Editar turno">
  <Form ... />
</Modal>
```

### 2.5 EmptyState (Dumb)
```tsx
// Props: icon?, title, description, action?, actionLabel?
// Uso: Tablas sin datos, calendarios vacíos
<EmptyState title="Sin turnos" description="No hay turnos para esta semana" />
```

### 2.6 CalendarWrapper (Smart)
```tsx
// Props: events[], onEventClick, onDateSelect, view?
// Uso: SchedulePage, VacationsPage
// Internamente usa @fullcalendar/react con configuración unificada
<CalendarWrapper events={events} onEventClick={handleEventClick} />
```

---

## 3. Convenciones de Nomenclatura

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Página | `{Nombre}Page.tsx` | `DashboardPage.tsx` |
| Smart Component | `{Nombre}Widget.tsx` | `WeekSchedulesWidget.tsx` |
| Dumb Component | `{Nombre}.tsx` | `StatCard.tsx` |
| Hook | `use{Nombre}.ts` | `useVacations.ts` |
| Store (Zustand) | `{nombre}Store.ts` | `authStore.ts` |
| Tipo/Interface | `{Nombre}Types.ts` o en `types/index.ts` | `ScheduleTypes.ts` |
| Utilidad | `{nombre}.ts` | `utils.ts` |

---

## 4. Manejo de Estado

### Stores Globales (Zustand)
- **authStore**: Usuario autenticado, token, rol, branchId
- **uiStore**: Sidebar colapsado, tema activo, preferencias de UI

### Estado de Servidor (TanStack Query)
- Todas las queries de API usan TanStack Query con `queryClient.ts` centralizado
- Mutaciones: `useMutation` con invalidación automática de queries relacionadas
- Stale time global: 30 segundos (configurable por query)

### Estado Local (React useState/useReducer)
- Preferir estado local para UI efímera (modales abiertos/cerrados, formularios)
- Extraer a hook si la lógica se repite

---

## 5. Tema y Estilos

### Sistema de Tema
- **TailwindCSS** con configuración en `tailwind.config.ts`
- **Tema corporativo**: Colores, logo y favicon configurables desde `admin/settings`
- **Modo claro/oscuro**: Gestionado por `uiStore.themeConfig.preset`
- **Theme-aware**: Todos los componentes deben usar clases Tailwind que respeten el tema (`bg-surface`, `text-primary`, etc.)

### Paleta Base
| Token | Uso | Clase |
|-------|-----|-------|
| `primary` | Acciones principales, links | `text-primary`, `bg-primary` |
| `surface` | Fondos de cards, modales | `bg-surface` |
| `danger` | Acciones destructivas | `text-danger`, `bg-danger` |
| `warning` | Alertas, advertencias | `text-warning` |
| `success` | Confirmaciones, estados OK | `text-success` |

---

## 6. Manejo de Errores

### Frontend
- **apiError.ts**: Clase `ApiError` que parsea errores del backend
- **ErrorBoundary**: Componente que captura errores de renderizado
- **TanStack Query**: `onError` global en `queryClient.ts` para mostrar toasts

### Backend
- **AppError**: Clase de error con código, mensaje y detalles
- **Error Catalog**: `createAppError('NOT_FOUND', 'mensaje')` — catálogo centralizado
- **Error Handler Middleware**: Captura todos los errores y responde con formato JSON consistente

---

## 7. Patrón de Mutaciones (Backend)

Todas las mutaciones críticas siguen este patrón:

```
1. Validar input (Zod schema)
2. Validar permisos (middleware requirePermission)
3. Validar scope (servicio: assertUserScope, ensureBranchScope, etc.)
4. Ejecutar en transacción (executeInTransaction)
5. Log de auditoría (logAuditOrThrow)
6. Publicar evento en tiempo real (publishRealtimeEvent)
7. Notificar (notifyScheduleChange / notifyVacationChange) — no bloqueante
8. Recalcular resúmenes (recalculateWeeklySummaries) — no bloqueante
```

---

## 8. Estructura de Archivos por Módulo

```
src/modules/<modulo>/
├── <modulo>.service.ts       # Lógica de negocio
├── <modulo>.controller.ts    # Handlers HTTP
├── <modulo>.router.ts        # Definición de rutas
├── <modulo>.repository.ts    # Acceso a datos (Prisma)
├── <modulo>.constants.ts     # Constantes del módulo
├── domain/
│   ├── <modulo>.rules.ts     # Reglas de negocio puras
│   ├── <modulo>.types.ts     # Tipos del dominio
│   └── <modulo>.factory.ts   # Fábricas de entidades
└── <modulo>.http.schemas.ts  # Schemas Zod para HTTP
```

---

## 9. Testing

### Frontend (Vitest)
- **setup.ts**: Configuración global (mocks de IntersectionObserver, matchMedia, etc.)
- **Patrón**: Mock de stores, API y componentes hijos
- **Cobertura**: Renderizado condicional por rol, edge cases, estados de carga/error

### Backend (Jest)
- **setup.ts**: Base de datos de prueba, Prisma singleton
- **Patrón**: Tests de integración con BD real (SQLite en memoria)
- **Cobertura**: Servicios con transacciones, repositorios, reglas de dominio
