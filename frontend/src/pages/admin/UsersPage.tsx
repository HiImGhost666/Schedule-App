import { useRef, useState, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Search, MoreVertical, Edit, Eye, Lock, Unlock, Trash2, Key, Shield, Upload, Download } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '@/config/api';
import type { User } from '@/types';
import { ROLE_LABELS, STATUS_LABELS } from '@/types';
import { formatRelative } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiError';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { UserFormModal } from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserDetailsModal } from './UserDetailsModal';

const CSV_HEADERS = ['employeeId', 'name', 'email', 'role', 'status', 'department', 'branchId', 'companyPhone', 'auxiliaryPhone'] as const;
const ALLOWED_ROLES = new Set(['admin', 'manager', 'viewer']);
const ALLOWED_STATUS = new Set(['active', 'disabled', 'locked']);
const ALLOWED_DEPARTMENTS = new Set(['seguridad', 'mantenimiento', 'operaciones', 'administración']);
const ALLOWED_BRANCH_CODES = new Set(['TFN', 'GC']);

type CsvHeader = (typeof CSV_HEADERS)[number];
type UserCsvRow = Record<CsvHeader, string>;

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



export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navState = location.state as { status?: string } | null;
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(navState?.status || '');
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [formUser, setFormUser] = useState<User | null | false>(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: User } | null>(null);

  const { data, isLoading } = useQuery<{ data: User[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ['users', page, search, roleFilter, statusFilter],
    queryFn: () =>
      api.get('/users', { params: { page, limit: 15, search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined } })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/users/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Estado actualizado'); setConfirmAction(null); },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario eliminado'); setConfirmAction(null); },
    onError: () => toast.error('Error al eliminar usuario'),
  });

  const exportCsvMutation = useMutation({
    mutationFn: async () => {
      const allUsers: User[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await api.get<{ data: User[]; pagination: { totalPages: number } }>('/users', {
          params: { page: currentPage, limit: 100 },
        });
        allUsers.push(...response.data.data);
        totalPages = response.data.pagination.totalPages;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const rows = allUsers.map((user) => ({
        employeeId: user.employeeId ?? '',
        name: user.name ?? '',
        email: user.email ?? '',
        role: user.role ?? '',
        status: user.status ?? '',
        department: user.department ?? '',
        branchId: user.branch?.code ?? '',
        companyPhone: user.companyPhone ?? '',
        auxiliaryPhone: user.auxiliaryPhone ?? '',
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (response) => {
      const summary = response.data;
      if (summary.created > 0 || summary.updated > 0) {
        qc.invalidateQueries({ queryKey: ['users'] });
      }

      if (summary.failed > 0) {
        const rejectedCsv = buildCsv(summary.rejectedRows, [...CSV_HEADERS, 'reason']);
        downloadCsv('users-import-rejected.csv', rejectedCsv);
      }

      toast.success(
        `Importación completada: ${summary.created} creados, ${summary.updated} actualizados, ${summary.unchanged} sin cambios, ${summary.failed} rechazados`
      );
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo importar el CSV')),
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const validateCsvRow = (row: any, index: number): string | null => {
    if (!row.name?.trim()) return `Fila ${index + 2}: El nombre es obligatorio`;
    if (!row.email?.trim() || !row.email.includes('@')) return `Fila ${index + 2}: Email inválido`;

    const branchValue = row.branchId?.trim();
    if (branchValue) {
      const normalizedBranch = branchValue.toUpperCase();
      const branchLooksLikeName = branchValue.toLowerCase().includes('tenerife') || branchValue.toLowerCase().includes('palmas');
      if (!ALLOWED_BRANCH_CODES.has(normalizedBranch) && !branchLooksLikeName) {
        return `Fila ${index + 2}: Sucursal inválida "${row.branchId}". Usa TFN, GC o nombre de sede`;
      }
    }
    
    if (row.role && !ALLOWED_ROLES.has(row.role.trim().toLowerCase())) {
      return `Fila ${index + 2}: Rol inválido "${row.role}"`;
    }
    if (row.status && !ALLOWED_STATUS.has(row.status.trim().toLowerCase())) {
      return `Fila ${index + 2}: Estado inválido "${row.status}"`;
    }
    if (row.department && !ALLOWED_DEPARTMENTS.has(row.department.trim().toLowerCase())) {
      return `Fila ${index + 2}: Departamento inválido "${row.department}"`;
    }
    return null;
  };

  const handleCsvSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Selecciona un archivo CSV válido');
      return;
    }

    // Validación básica de formato antes de subir
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length <= 1) {
        toast.error('El archivo CSV está vacío o solo contiene cabeceras');
        return;
      }

      // Validamos las primeras 5 filas para dar feedback inmediato sin procesar todo en el cliente
      const normalizedHeaders = lines[0].split(',').map((column) => column.trim().toLowerCase());
      const columnIndices: Record<string, number> = {};
      CSV_HEADERS.forEach(h => {
        columnIndices[h] = normalizedHeaders.findIndex((col) => col === h.toLowerCase() || col.includes(h.toLowerCase()));
      });

      const missingHeaders = CSV_HEADERS.filter((h) => columnIndices[h] < 0);
      if (missingHeaders.length > 0) {
        toast.error(`Faltan columnas obligatorias en el CSV: ${missingHeaders.join(', ')}`);
        return;
      }

      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const cols = lines[i].split(',');
        const rowData: Record<string, string> = {};
        CSV_HEADERS.forEach(h => {
          rowData[h] = cols[columnIndices[h]]?.trim() || '';
        });
        
        const error = validateCsvRow(rowData as UserCsvRow, i - 1);
        if (error) {
          toast.error(error);
          return;
        }
      }
      
      await importCsvMutation.mutateAsync(file);
    };
    reader.readAsText(file.slice(0, 10000));
  };

  const roleBadge = (role: string) => {
    const cls = { admin: 'badge-role-admin', manager: 'badge-role-manager', viewer: 'badge-role-viewer' };
    return <span className={cls[role as keyof typeof cls] || 'badge-role-viewer'}>{ROLE_LABELS[role]}</span>;
  };

  const statusBadge = (status: string) => {
    const cls = { active: 'badge-status-active', disabled: 'badge-status-disabled', locked: 'badge-status-locked' };
    return <span className={cls[status as keyof typeof cls] || 'badge-status-disabled'}>{STATUS_LABELS[status]}</span>;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Gestión de Usuarios</h1>
          <p className="text-sm text-navy-400 mt-0.5">Administra cuentas. Sedes válidas: TFN (Tenerife), GC (Las Palmas)</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCsvSelected}
              data-testid="csv-upload-input"
            />
            <button
              onClick={handleImportClick}
              disabled={importCsvMutation.isPending}
              className="btn-ghost text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {importCsvMutation.isPending ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
              Importar CSV
            </button>
            <button
              onClick={() => exportCsvMutation.mutate()}
              disabled={exportCsvMutation.isPending}
              className="btn-ghost text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {exportCsvMutation.isPending ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
              Exportar CSV
            </button>
            <button onClick={() => setFormUser(null)} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />Nuevo Usuario
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card px-4 py-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field with-icon text-sm"
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input-field text-sm w-40">
          <option value="">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="manager">Responsable</option>
          <option value="viewer">Usuario</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field text-sm w-40">
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="disabled">Deshabilitado</option>
          <option value="locked">Bloqueado</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : !data?.data?.length ? (
          <EmptyState icon={Shield} title="Sin usuarios" description="No se encontraron usuarios con los filtros aplicados" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-50 border-b border-navy-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden xl:table-cell">ID Empleado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Usuario</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden md:table-cell">Departamento</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden lg:table-cell">Sucursal</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden lg:table-cell">Último acceso</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {data.data.map((u: User, idx: number) => {
                    const shouldOpenUp = idx >= data.data.length - 3;

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
                      <td className="px-5 py-3 text-sm text-navy-500 hidden md:table-cell">{u.department || '—'}</td>
                      <td className="px-5 py-3 text-sm text-navy-500 hidden lg:table-cell">
                        {u.branch ? `${u.branch.name} (${u.branch.code})` : '—'}
                      </td>
                      <td className="px-5 py-3">{roleBadge(u.role)}</td>
                      <td className="px-5 py-3">{statusBadge(u.status)}</td>
                      <td className="px-5 py-3 text-xs text-navy-400 hidden lg:table-cell">
                        {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Nunca'}
                      </td>
                      <td className="px-5 py-3 relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === u.id ? null : u.id)}
                          className="p-1 rounded hover:bg-theme-surface-muted text-theme-muted"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuOpenId === u.id && (
                          <div className={`absolute right-4 ${shouldOpenUp ? 'bottom-8' : 'top-8'} card rounded-xl shadow-xl border border-theme-color z-20 w-48 py-1 animate-slide-down`}>
                            <button onClick={() => { setDetailUser(u); setMenuOpenId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-navy-50 text-navy-700">
                              <Eye className="h-3.5 w-3.5" />Ver detalle
                            </button>
                            {isAdmin && (
                              <>
                                <button onClick={() => { setFormUser(u); setMenuOpenId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-theme-surface-muted text-theme-primary">
                                  <Edit className="h-3.5 w-3.5" />Editar
                                </button>
                                <button onClick={() => { setResetUser(u); setMenuOpenId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-theme-surface-muted text-theme-primary">
                                  <Key className="h-3.5 w-3.5" />Resetear contraseña
                                </button>
                                {u.status === 'active' ? (
                                  <button onClick={() => { setConfirmAction({ type: 'lock', user: u }); setMenuOpenId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-amber-50 text-amber-700">
                                    <Lock className="h-3.5 w-3.5" />Bloquear
                                  </button>
                                ) : (
                                  <button onClick={() => { statusMutation.mutate({ id: u.id, status: 'active' }); setMenuOpenId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-green-50 text-green-700">
                                    <Unlock className="h-3.5 w-3.5" />Activar
                                  </button>
                                )}
                                <hr className="border-navy-100 my-1" />
                                <button onClick={() => { setConfirmAction({ type: 'delete', user: u }); setMenuOpenId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600">
                                  <Trash2 className="h-3.5 w-3.5" />Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-navy-100">
                <p className="text-xs text-navy-400">
                  {((page - 1) * 15) + 1}–{Math.min(page * 15, data.pagination.total)} de {data.pagination.total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40">
                    Anterior
                  </button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages} className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40">
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {isAdmin && formUser !== false && (
        <UserFormModal
          open
          user={formUser}
          onClose={() => setFormUser(false)}
        />
      )}

      {isAdmin && resetUser && (
        <ResetPasswordModal
          open
          user={resetUser}
          onClose={() => setResetUser(null)}
        />
      )}

      {detailUser && (
        <UserDetailsModal
          open
          userId={detailUser.id}
          userName={detailUser.name}
          onClose={() => setDetailUser(null)}
        />
      )}

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

      {/* Click outside to close menu */}
      {menuOpenId && <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />}
    </div>
  );
}