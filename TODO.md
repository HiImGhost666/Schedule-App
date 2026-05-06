# Merge Review - Issues Found & Fixed

## ✅ Fixed Issues

### 1. BACKEND: Roles router not mounted in app.ts (CRITICAL)
- **Problem**: `rolesRouter` was imported but never used with `app.use()`
- **Fix**: Added `app.use('/api/roles', rolesRouter)` so `/api/roles` endpoints are accessible

### 2. FRONTEND: UsersPage - Added department filter
- **Problem**: The filter fields didn't include a department filter, even though the backend supports `departmentId` query param
- **Fix**: Added a `departmentId` select filter that loads departments dynamically from `/api/departments`

## ✅ Already Working Correctly (Verified)

### 3. Department select loads dynamically based on selected branch
- `UserFormModal.tsx` line 57-61: Departments query depends on `selectedBranchId`
- When branch changes, department selection resets correctly (line 91-101)

### 4. UsersTable shows department name correctly
- Line 88: `u.department?.name || u.departments?.[0]?.department.name || '—'`

### 5. UsersTable shows role name correctly
- Line 93: `roleBadge(u.role?.name || '')` with proper labels from ROLE_LABELS

### 6. UsersPage shows department name correctly
- Uses `u.departments?.[0]?.department.name || u.department?.name || '—'`

### 7. UsersPage shows role name correctly
- Uses `roleBadge(u.role?.name)` with proper labels

### 8. UserProfileModal shows department name correctly
- Line 240: `(profileUser as User).department?.name || (profileUser as User).departments?.[0]?.department.name`

### 9. UserDetailsModal shows department name correctly
- Line 130: `user.department?.name || user.departments?.[0]?.department.name || 'Sin departamento'`

### 10. UserFormModal role field handling
- Create: sends `role` in payload → backend `createUserBodySchema` accepts `role` as `z.enum(ROLE_NAMES)`
- Update: strips `role` from payload, sends separately to `/users/${id}/role` endpoint

### 11. UserFormModal department handling
- Sends `departmentIds: [data.departmentId]` → backend accepts `departmentIds` array
- When editing, `departmentId` is set from `user.departments[0]?.department.id`

### 12. Backend departmentId filter in users list
- `buildUsersWhere()` correctly filters by `departments: { some: { departmentId } }`
- `listUsersQuerySchema` accepts `departmentId` as optional string
