import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Download, Shield, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { formatRelative } from 'date-fns';
import { es } from 'date-fns/locale';

import { useLocation } from 'react-router-dom';
import api from '@/config/api';
import type { Branch, User } from '@/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterTable, type FilterFieldConfig } from '@/components/common/FilterTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { UsersTable } from '@/components/users/UsersTable';
import { UsersPagination } from '@/components/users/UsersPagination';
import { UserActionMenu } from '@/components/users/UserActionMenu';
import type { UsersSortBy, SortOrder } from '@/types';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { UserFormModal } from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';

const CSV_HEADERS = ['employeeId', 'name', 'email', 'role', 'status', 'department', 'branchId', 'companyPhone', 'auxiliaryPhone'] as const;
const CSV_DELIMITERS = [',', ';', '\t', '|'] as const;
const ALLOWED_ROLES = new Set(['admin', 'general_manager', 'department_manager', 'employee']);
const ALLOWED_STATUS = new Set(['active', 'disabled', 'locked']);
const DEPARTMENT_VALUES = ['Seguridad', 'Mantenimiento', 'Operaciones', 'Administración'] as const;
const ALLOWED_DEPARTMENTS = new Set<string>(DEPARTMENT_VALUES);

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  general_manager: 'Gerente General',
  department_manager: 'Responsable',
  employee: 'Empleado',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  disabled: 'Deshabilitado',
  locked: 'Bloqueado',
};


type CsvHeader = (typeof CSV_HEADERS)[number];
type UserCsvRow = Record<CsvHeader, string>;
type CsvDelimiter = (typeof CSV_DELIMITERS)[number];
type UsersFilterKey = 'search' | 'role' | 'status' | 'department' | 'branchId' | 'employeeId' | 'lastLoginFrom' | 'lastLoginTo' | 'createdFrom' | 'createdTo';

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(rows: Array<Record<string, string>>, headers: string[]) {
  const lines = rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? '')).join(','));
  return [headers.join(','), ...lines].join('\n');
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function decodeCsvFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) return '';

  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

function parseCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  const cells: string[] = [];
  let value = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { value += '"'; i += 1; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (char === delimiter && !inQuotes) { cells.push(value); value = ''; continue; }
    value += char;
  }
  cells.push(value);
  return cells;
}

function detectCsvDelimiter(headerLine: string): CsvDelimiter {
  const normalizedHeaderLine = headerLine.replace(/^\uFEFF/, '').trim();
  if (!normalizedHeaderLine) return ',';
  let bestDelimiter: CsvDelimiter = ',';
  let bestMatches = -1;
  let bestColumns = -1;
  for (const delimiter of CSV_DELIMITERS) {
    const headers = parseCsvLine(normalizedHeaderLine, delimiter).map((column) => column.trim().toLowerCase());
    const headerSet = new Set(headers);
    const matches = CSV_HEADERS.filter((header) => headerSet.has(header.toLowerCase())).length;
    if (matches > bestMatches || (matches === bestMatches && headers.length > bestColumns)) {
      bestDelimiter = delimiter;
      bestMatches = matches;
      bestColumns = headers.length;
    }
  }
  return bestDelimiter;
}

function normalizeDepartment(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.toLowerCase();
  const matched = DEPARTMENT_VALUES.find((department) => department.toLowerCase() === normalized);
  return matched ?? undefined;
}

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role?.name === 'admin';
  const usersTemplateCsvUrl = `${import.meta.env.BASE_URL}templates/Plantilla%20CSV.xlsx`;
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navState = location.state as { status?: string } | null;
  const [filters, setFilters] = useState<Record<UsersFilterKey, string>>({
    search: '', role: '', status: navState?.status || '', department: '', employeeId: '',
    branchId: '', lastLoginFrom: '', lastLoginTo: '', createdFrom: '', createdTo: '',
  });
  const [sortBy, setSortBy] = useState<UsersSortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [formUser, setFormUser] = useState<User | null | false>(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: User } | null>(null);

  useEffect(() => {
    if (!menuOpenId) return;
    const closeMenu = () => { setMenuOpenId(null); setMenuPosition(null); };
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [menuOpenId]);

  const { data: branchesData } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', 'users-page'],
    queryFn: () => api.get('/branches').then((r) => r.data),
  });

  const branchOptions = [
    { value: '', label: 'Todas las sucursales' },
    ...(branchesData?.data ?? []).map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })),
  ];

  const USERS_FILTER_FIELDS_DYNAMIC: Array<FilterFieldConfig<UsersFilterKey>> = [
    {
      key: 'search',
      type: 'text',
      label: 'Buscar',
      placeholder: 'Nombre o email...',
      className: 'min-w-56',
    },
    {
      key: 'role',
      type: 'select',
      label: 'Rol',
      options: [
        { value: '', label: 'Todos los roles' },
        { value: 'admin', label: 'Administrador' },
        { value: 'general_manager', label: 'Gerente General' },
        { value: 'department_manager', label: 'Responsable' },
        { value: 'employee', label: 'Empleado' },
      ],

    },
    {
      key: 'status',
      type: 'select',
      label: 'Estado',
      options: [
        { value: '', label: 'Todos los estados' },
        { value: 'active', label: 'Activo' },
        { value: 'disabled', label: 'Deshabilitado' },
        { value: 'locked', label: 'Bloqueado' },
      ],
    },
    {
      key: 'department',
      type: 'select',
      label: 'Departamento',
      options: [
        { value: '', label: 'Todos los departamentos' },
        { value: 'seguridad', label: 'Seguridad' },
        { value: 'mantenimiento', label: 'Mantenimiento' },
        { value: 'operaciones', label: 'Operaciones' },
        { value: 'administración', label: 'Administración' },
      ],
    },
    {
      key: 'branchId',
      type: 'select',
      label: 'Sucursal',
      options: branchOptions,
    },
    {
      key: 'lastLoginFrom',
      type: 'date',
      label: 'Último login desde',
      className: 'w-36',
    },
    {
      key: 'lastLoginTo',
      type: 'date',
      label: 'Último login hasta',
      className: 'w-36',
    },
    {
      key: 'createdFrom',
      type: 'date',
      label: 'Creado desde',
      className: 'w-36',
    },
    {
      key: 'createdTo',
      type: 'date',
      label: 'Creado hasta',
      className: 'w-36',
    },

  ];

  const { data, isLoading } = useQuery<{ data: User[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ['users', page, limit, filters, sortBy, sortOrder],
    queryFn: () =>
      api.get('/users', {
        params: {
          page, limit,
          search: filters.search || undefined, role: filters.role || undefined,
          status: filters.status || undefined, department: filters.department || undefined,
          employeeId: filters.employeeId || undefined, branchId: filters.branchId || undefined,
          lastLoginFrom: filters.lastLoginFrom || undefined, lastLoginTo: filters.lastLoginTo || undefined,
          createdFrom: filters.createdFrom || undefined, createdTo: filters.createdTo || undefined,
          sortBy, sortOrder,
        },
      }).then((r) => r.data),
  });

  const handleFilterChange = (key: UsersFilterKey, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSortChange = (field: UsersSortBy) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortOrder(field === 'createdAt' || field === 'lastLoginAt' ? 'desc' : 'asc');
  };

  const renderSortLabel = (field: UsersSortBy, label: string) => {
    const isActive = sortBy === field;
    return (
      <button
        onClick={() => handleSortChange(field)}
        className="flex items-center gap-1 hover:text-navy-700 transition-colors"
      >
        {label}
        {isActive ? (
          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUp className="h-3 w-3 opacity-0 group-hover:opacity-50" />
        )}
      </button>
    );
  };


  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/users/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Estado actualizado'); setConfirmAction(null); },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario eliminado'); setConfirmAction(null); },
    onError: () => toast.error('Error al eliminar usuario'),
  });

  const forcePasswordChangeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/force-password-change`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Cambio de contraseña forzado'); },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo forzar el cambio de contraseña')),
  });

  const exportCsvMutation = useMutation({
    mutationFn: async () => {
      const allUsers: User[] = [];
      let currentPage = 1;
      while (true) {
        const response = await api.get<{ data: User[]; pagination: { totalPages: number } }>('/users', {
          params: { page: currentPage, limit: 100 },
        });
        allUsers.push(...response.data.data);
        if (currentPage >= response.data.pagination.totalPages) break;
        currentPage += 1;
      }
      const rows = allUsers.map((user) => ({
        employeeId: user.employeeId ?? '',
        name: user.name ?? '',
        email: user.email ?? '',
        role: user.role?.name ?? '',
        status: user.status ?? '',

        department: normalizeDepartment(user.department ?? '') ?? '',
        branchId: user.branch?.code ?? '', companyPhone: user.companyPhone ?? '', auxiliaryPhone: user.auxiliaryPhone ?? '',
      }));
      const csv = buildCsv(rows, [...CSV_HEADERS]);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`users-export-${date}.csv`, csv);
      return allUsers.length;
    },
    onSuccess: (total) => toast.success(`CSV exportado (${total} usuarios)`),
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo exportar el CSV')),
  });

  const importCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (response) => {
      const summary = response.data;
      if (summary.created > 0 || summary.updated > 0) qc.invalidateQueries({ queryKey: ['users'] });
      if (summary.failed > 0) {
        const rejectedCsv = buildCsv(summary.rejectedRows, [...CSV_HEADERS, 'reason']);
        downloadCsv('users-import-rejected.csv', rejectedCsv);
      }
      toast.success(`Importación completada: ${summary.created} creados, ${summary.updated} actualizados, ${summary.unchanged} sin cambios, ${summary.failed} rechazados`);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo importar el CSV')),
  });

  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleMenuToggle = (userId: string, event: MouseEvent<HTMLButtonElement>) => {
    if (menuOpenId === userId) { setMenuOpenId(null); setMenuPosition(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = isAdmin ? 260 : 48;
    const viewportPadding = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < (menuHeight + viewportPadding);
    const top = openUp
      ? Math.max(viewportPadding, rect.top - menuHeight - 4)
      : Math.min(window.innerHeight - menuHeight - viewportPadding, rect.bottom + 4);
    const left = Math.min(window.innerWidth - menuWidth - viewportPadding, Math.max(viewportPadding, rect.right - menuWidth));
    setMenuOpenId(userId);
    setMenuPosition({ top, left });
  };

  const validateCsvRow = (row: UserCsvRow, index: number, branchesCatalog: Branch[]): string | null => {
    if (!row.name?.trim()) return `Fila ${index + 2}: El nombre es obligatorio`;
    if (!row.email?.trim() || !row.email.includes('@')) return `Fila ${index + 2}: Email inválido`;
    const branchValue = row.branchId?.trim();
    if (!branchValue) return `Fila ${index + 2}: La sucursal es obligatoria`;
    const normalizedBranch = branchValue.toUpperCase();
    const normalizedBranchName = branchValue.toLowerCase();
    const branchExists = branchesCatalog.some(
      (branch) => branch.code.toUpperCase() === normalizedBranch || branch.name.toLowerCase().includes(normalizedBranchName),
    );
    if (!branchExists) return `Fila ${index + 2}: Sucursal inválida "${row.branchId}". Usa TFN, GC o nombre de sede`;
    if (row.role && !ALLOWED_ROLES.has(row.role.trim().toLowerCase())) return `Fila ${index + 2}: Rol inválido "${row.role}"`;
    if (row.status && !ALLOWED_STATUS.has(row.status.trim().toLowerCase())) return `Fila ${index + 2}: Estado inválido "${row.status}"`;
    if (row.department) {
      const normalizedDepartment = normalizeDepartment(row.department);
      if (!normalizedDepartment || !ALLOWED_DEPARTMENTS.has(normalizedDepartment)) return `Fila ${index + 2}: Departamento inválido "${row.department}"`;
    }
    return null;
  };

  const handleCsvSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { toast.error('Selecciona un archivo CSV válido'); return; }
    const text = await decodeCsvFile(file);
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length <= 1) { toast.error('El archivo CSV está vacío o solo contiene cabeceras'); return; }
    const delimiter = detectCsvDelimiter(lines[0]);
    const normalizedHeaders = parseCsvLine(lines[0], delimiter).map((column) => column.trim().toLowerCase());
    const columnIndices: Record<string, number> = {};
    CSV_HEADERS.forEach(h => { columnIndices[h] = normalizedHeaders.findIndex((col) => col === h.toLowerCase() || col.includes(h.toLowerCase())); });
    const missingHeaders = CSV_HEADERS.filter((h) => columnIndices[h] < 0);
    if (missingHeaders.length > 0) { toast.error(`Faltan columnas obligatorias en el CSV: ${missingHeaders.join(', ')}`); return; }
    const branchesResponse = await api.get<{ data: Branch[] }>('/branches', { params: { includeInactive: true } });
    const branchesCatalog = branchesResponse.data.data ?? [];
    if (branchesCatalog.length === 0) { toast.error('No se pudo validar el catálogo de sucursales para importar el CSV'); return; }
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const cols = parseCsvLine(lines[i], delimiter);
      const rowData = {} as UserCsvRow;
      CSV_HEADERS.forEach(h => { rowData[h] = cols[columnIndices[h]]?.trim() || ''; });
      const error = validateCsvRow(rowData, i - 1, branchesCatalog);
      if (error) { toast.error(error); return; }
    }
    await importCsvMutation.mutateAsync(file);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = usersTemplateCsvUrl;
    link.download = 'Plantilla CSV.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const roleBadge = (role: string) => {
    const cls: Record<string, string> = {
      admin: 'badge-role-admin',
      general_manager: 'badge-role-manager',
      department_manager: 'badge-role-manager',
      employee: 'badge-role-viewer',
    };
    return <span className={cls[role] || 'badge-role-viewer'}>{ROLE_LABELS[role] || role}</span>;
  };


  const statusBadge = (status: string) => {
    const cls = { active: 'badge-status-active', disabled: 'badge-status-disabled', locked: 'badge-status-locked' };
    return <span className={cls[status as keyof typeof cls] || 'badge-status-disabled'}>{STATUS_LABELS[status]}</span>;
  };

  const openMenuUser = data?.data?.find((user) => user.id === menuOpenId) ?? null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Gestión de Usuarios</h1>
          <p className="text-sm text-navy-400 mt-0.5">Administra cuentas. Sedes válidas: TFN (Tenerife), GC (Las Palmas)</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvSelected} data-testid="csv-upload-input" />
            <button onClick={handleImportClick} disabled={importCsvMutation.isPending} className="btn-ghost text-sm flex items-center gap-2 disabled:opacity-60">
              {importCsvMutation.isPending ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}Importar CSV
            </button>
            <button onClick={handleDownloadTemplate} className="btn-ghost text-sm flex items-center gap-2">
              <Download className="h-4 w-4" />Descargar plantilla
            </button>
            <button onClick={() => exportCsvMutation.mutate()} disabled={exportCsvMutation.isPending} className="btn-ghost text-sm flex items-center gap-2 disabled:opacity-60">
              {exportCsvMutation.isPending ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}Exportar CSV
            </button>
            <button onClick={() => setFormUser(null)} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />Nuevo Usuario
            </button>
          </div>
        )}
      </div>

      <FilterTable fields={USERS_FILTER_FIELDS_DYNAMIC} values={filters} onChange={handleFilterChange} />

      <div className="card overflow-visible">
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : !data?.data?.length ? (
          <EmptyState icon={Shield} title="Sin usuarios" description="No se encontraron usuarios con los filtros aplicados" />
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-50 border-b border-navy-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden xl:table-cell">ID Empleado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">{renderSortLabel('name', 'Usuario')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden md:table-cell">Departamento</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden lg:table-cell">Sucursal</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">{renderSortLabel('role', 'Rol')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">{renderSortLabel('status', 'Estado')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden lg:table-cell">{renderSortLabel('lastLoginAt', 'Último acceso')}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {data.data.map((u: User) => {
                    return (
                    <tr key={u.id} className="hover:bg-navy-50/50 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-navy-400 hidden xl:table-cell">{u.employeeId || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-full bg-navy-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {u.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-theme-primary truncate">{u.name}</p>
                            <p className="text-xs text-theme-muted truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-navy-500 hidden md:table-cell">{normalizeDepartment(u.department ?? '') || '—'}</td>
                      <td className="px-5 py-3 text-sm text-navy-500 hidden lg:table-cell">
                        {u.branch ? `${u.branch.name} (${u.branch.code})` : '—'}
                      </td>
                      <td className="px-5 py-3">{roleBadge(u.role?.name)}</td>
                      <td className="px-5 py-3">{statusBadge(u.status)}</td>
                      <td className="px-5 py-3 text-xs text-navy-400 hidden lg:table-cell">
                        {u.lastLoginAt ? formatRelative(new Date(u.lastLoginAt), new Date(), { locale: es }) : 'Nunca'}
                      </td>

                      <td className="px-5 py-3 relative">
                        <button
                          onClick={(event) => handleMenuToggle(u.id, event)}
                          className="p-1 rounded hover:bg-theme-surface-muted text-theme-muted"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {data?.pagination && (
              <UsersPagination
                page={page}
                totalPages={data.pagination.totalPages}
                total={data.pagination.total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            )}
          </>
        )}
      </div>

      {openMenuUser && menuPosition && (
        <UserActionMenu
          user={openMenuUser}
          isAdmin={isAdmin}
          position={menuPosition}
          onClose={() => { setMenuOpenId(null); setMenuPosition(null); }}
          onViewDetail={(u) => setDetailUser(u)}
          onEdit={(u) => setFormUser(u)}
          onResetPassword={(u) => setResetUser(u)}
          onForcePasswordChange={(u) => { forcePasswordChangeMutation.mutate(u.id); setMenuOpenId(null); setMenuPosition(null); }}
          onToggleStatus={(u) => {
            if (u.status === 'active') setConfirmAction({ type: 'lock', user: u });
            else statusMutation.mutate({ id: u.id, status: 'active' });
          }}
          onDelete={(u) => setConfirmAction({ type: 'delete', user: u })}
        />
      )}

      {isAdmin && formUser !== false && (
        <UserFormModal open user={formUser} onClose={() => setFormUser(false)} />
      )}
      {isAdmin && resetUser && (
        <ResetPasswordModal open user={resetUser} onClose={() => setResetUser(null)} />
      )}
      <UserProfileModal open={!!detailUser} user={detailUser} onClose={() => setDetailUser(null)} />

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'delete' ? 'Eliminar Usuario' : 'Bloquear Usuario'}
        description={
          confirmAction?.type === 'delete'
            ? `¿Eliminar la cuenta de "${confirmAction?.user.name}"? Esta acción no se puede deshacer.`
            : `¿Bloquear la cuenta de "${confirmAction?.user.name}"?`
        }
        confirmLabel={confirmAction?.type === 'delete' ? 'Eliminar' : 'Bloquear'}
        loading={deleteMutation.isPending || statusMutation.isPending}
        onConfirm={() => {
          if (!isAdmin) return;
          if (confirmAction?.type === 'delete') deleteMutation.mutate(confirmAction.user.id);
          else if (confirmAction?.type === 'lock') statusMutation.mutate({ id: confirmAction.user.id, status: 'locked' });
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
