import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  ClipboardList,
  ChevronRight,
  RotateCcw,
  X,
  ShieldCheck,
  RefreshCw,
  Lock,
  ArrowUpDown,
  Download,
  FileDown,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/config/api';
import type { AuditLog, PaginatedResponse } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterTable, type FilterFieldConfig } from '@/components/common/FilterTable';
import { formatDateTime } from '@/lib/utils';
import { ActivityDetail } from '@/components/audit/ActivityDetail';
import { getApiErrorMessage } from '@/lib/apiError';
import type { LucideIcon } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  CREATE_USER: 'bg-blue-100 text-blue-700',
  UPDATE_USER: 'bg-amber-100 text-amber-700',
  DELETE_USER: 'bg-red-100 text-red-700',
  USER_STATUS_CHANGE: 'bg-purple-100 text-purple-700',
  USER_ROLE_CHANGE: 'bg-indigo-100 text-indigo-700',
  RESET_PASSWORD: 'bg-orange-100 text-orange-700',
  CREATE_SCHEDULE: 'bg-blue-100 text-blue-700',
  UPDATE_SCHEDULE: 'bg-amber-100 text-amber-700',
  DELETE_SCHEDULE: 'bg-red-100 text-red-700',
  CREATE_WEBHOOK: 'bg-teal-100 text-teal-700',
  CHANGE_PASSWORD: 'bg-cyan-100 text-cyan-700',
  FAILED_LOGIN_ATTEMPT: 'bg-red-100 text-red-700',
  ROLLBACK_PERFORMED: 'bg-indigo-100 text-indigo-700',
};

const IRREVERSIBLE_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'CHANGE_PASSWORD',
  'RESET_PASSWORD',
  'FAILED_LOGIN_ATTEMPT',
  'ROLLBACK_PERFORMED',
];

type TabType = 'reversible' | 'irreversible';
type AuditSortBy = 'updatedAt' | 'createdAt' | 'action' | 'entityType';
type SortOrder = 'asc' | 'desc';
type AuditFilterKey = 'action' | 'entityType';
type AuditListResponse = PaginatedResponse<AuditLog>;
type AuditDetails = {
  before?: unknown;
  after?: unknown;
};

const AUDIT_FILTER_FIELDS: Array<FilterFieldConfig<AuditFilterKey>> = [
  {
    key: 'action',
    type: 'text',
    id: 'audit-search',
    placeholder: 'Filtrar por acción...',
    className: 'min-w-56',
  },
  {
    key: 'entityType',
    type: 'select',
    id: 'audit-entity-type',
    className: 'w-44',
    options: [
      { value: '', label: 'Todos los tipos' },
      { value: 'User', label: 'Usuario' },
      { value: 'Schedule', label: 'Turno' },
      { value: 'WebhookConfig', label: 'Webhook' },
    ],
  },
];

// ── CSV Export helpers ─────────────────────────────────────────────────────
function escapeCsv(v: string): string {
  if (v.includes('"') || v.includes(',') || v.includes('\n') || v.includes('\r')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

const AUDIT_CSV_HEADERS = ['Fecha', 'Acción', 'Usuario', 'Email', 'Tipo Entidad', 'ID Entidad', 'IP', 'Revertido'] as const;

function auditLogToCsvRow(log: AuditLog, headers: string[]): string {
  const data: Record<string, string> = {
    'Fecha': formatDateTime(log.createdAt),
    'Acción': log.action.replace(/_/g, ' '),
    'Usuario': log.user?.name ?? 'Sistema',
    'Email': log.user?.email ?? '',
    'Tipo Entidad': log.entityType ?? '',
    'ID Entidad': log.entityId ?? '',
    'IP': log.ipAddress ?? '',
    'Revertido': log.rolledBackAt ? 'Sí' : 'No',
  };
  return headers.map(h => escapeCsv(data[h] ?? '')).join(',');
}

function buildAuditCsv(logs: AuditLog[], headers: string[]): string {
  const header = headers.join(',');
  const rows = logs.map(log => auditLogToCsvRow(log, headers));
  return [header, ...rows].join('\n');
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

// ── Export Modal ────────────────────────────────────────────────────────────
type ExportType = 'all' | 'reversible' | 'irreversible';

function ExportModal({ onClose }: { onClose: () => void }) {
  const [exportType, setExportType] = useState<ExportType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([...AUDIT_CSV_HEADERS]);
  const [isExporting, setIsExporting] = useState(false);

  const { data: usersList } = useQuery({
    queryKey: ['users-list-export'],
    queryFn: () => api.get<{ data: { id: string; name: string; email: string }[] }>('/users', { params: { limit: 100, sortBy: 'name', sortOrder: 'asc' } }).then((r) => r.data.data),
  });

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast.error('Selecciona al menos una columna');
      return;
    }

    setIsExporting(true);
    try {
      const allLogs: AuditLog[] = [];
      const limit = 100;

      const targets: Array<'reversible' | 'irreversible'> =
        exportType === 'all'
          ? ['reversible', 'irreversible']
          : [exportType];

      for (const target of targets) {
        let currentPage = 1;
        while (true) {
          const params: Record<string, unknown> = {
            page: currentPage,
            limit,
            reversible: target === 'reversible' ? 'true' : 'false',
            sortBy: 'createdAt',
            sortOrder: 'desc',
          };
          if (dateFrom) params.dateFrom = `${dateFrom}T00:00:00.000Z`;
          if (dateTo)   params.dateTo   = `${dateTo}T23:59:59.999Z`;
          if (selectedUserId) params.userId = selectedUserId;

          const res = await api.get<{ data: AuditLog[]; pagination: { totalPages: number } }>('/audit', { params });
          allLogs.push(...res.data.data);
          if (currentPage >= res.data.pagination.totalPages) break;
          currentPage += 1;
        }
      }

      if (allLogs.length === 0) {
        toast('No hay registros con los filtros seleccionados', { icon: 'ℹ️' });
        return;
      }

      // Sort merged result by date desc
      allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const date = new Date().toISOString().slice(0, 10);
      const suffix = exportType === 'all' ? 'completo' : exportType === 'reversible' ? 'acciones' : 'eventos';
      downloadCsv(`auditoria-${suffix}-${date}.csv`, buildAuditCsv(allLogs, selectedColumns));
      toast.success(`CSV exportado (${allLogs.length} registros)`);
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Error al exportar los datos'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions: { value: ExportType; label: string; description: string; icon: LucideIcon; color: string }[] = [
    {
      value: 'all',
      label: 'Todo el registro',
      description: 'Acciones de datos y eventos de seguridad',
      icon: ClipboardList,
      color: 'text-navy-600',
    },
    {
      value: 'reversible',
      label: 'Acciones de Datos',
      description: 'Modificaciones sobre usuarios, turnos y configuraciones',
      icon: RefreshCw,
      color: 'text-blue-600',
    },
    {
      value: 'irreversible',
      label: 'Eventos de Seguridad',
      description: 'Inicios de sesión, cambios de contraseña...',
      icon: Lock,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-navy-50 flex items-center justify-center">
              <FileDown className="h-5 w-5 text-navy-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-800">Exportar Auditoría</h2>
              <p className="text-xs text-navy-400">Descarga los registros en formato CSV</p>
            </div>
          </div>
          <button
            id="audit-export-modal-close"
            onClick={onClose}
            className="p-1.5 text-navy-300 hover:text-navy-600 hover:bg-navy-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Tipo de datos */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider">Tipo de registros</p>
            <div className="space-y-2">
              {exportOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = exportType === opt.value;
                return (
                  <button
                    key={opt.value}
                    id={`audit-export-type-${opt.value}`}
                    type="button"
                    onClick={() => setExportType(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-navy-700 bg-navy-50'
                        : 'border-navy-100 hover:border-navy-200 hover:bg-navy-50/50'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-navy-100' : 'bg-navy-50'
                    }`}>
                      <Icon className={`h-4 w-4 ${opt.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-navy-800' : 'text-navy-600'}`}>{opt.label}</p>
                      <p className="text-xs text-navy-400 truncate">{opt.description}</p>
                    </div>
                    <div className={`ml-auto h-4 w-4 rounded-full border-2 shrink-0 transition-colors ${
                      isSelected ? 'border-navy-700 bg-navy-700' : 'border-navy-200'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtro de Usuario */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider">Usuario (Opcional)</p>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full text-xs border border-navy-200 rounded-lg px-3 py-2 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
            >
              <option value="">Todos los usuarios</option>
              {usersList?.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>

          {/* Rango de fechas */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Rango de fechas
              <span className="font-normal text-navy-300 normal-case tracking-normal">(opcional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="audit-export-from" className="text-xs text-navy-400 mb-1 block">Desde</label>
                <input
                  id="audit-export-from"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full text-xs border border-navy-200 rounded-lg px-3 py-2 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
                />
              </div>
              <div>
                <label htmlFor="audit-export-to" className="text-xs text-navy-400 mb-1 block">Hasta</label>
                <input
                  id="audit-export-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full text-xs border border-navy-200 rounded-lg px-3 py-2 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
                />
              </div>
            </div>
            {(!dateFrom && !dateTo) && (
              <p className="text-[11px] text-navy-300">Sin rango → se exporta el historial completo</p>
            )}
          </div>

          {/* Columns info */}
          <div className="bg-navy-50 rounded-xl px-4 py-3">
            <p className="text-[11px] font-semibold text-navy-500 mb-1.5">Columnas incluidas (haz clic para alternar)</p>
            <div className="flex flex-wrap gap-1.5">
              {AUDIT_CSV_HEADERS.map((h) => {
                const isSelected = selectedColumns.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setSelectedColumns(prev => 
                        prev.includes(h) 
                          ? prev.filter(c => c !== h) 
                          : [...AUDIT_CSV_HEADERS].filter(c => prev.includes(c) || c === h)
                      );
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      isSelected 
                        ? 'bg-navy-600 border-navy-600 text-white' 
                        : 'bg-white border-navy-200 text-navy-400 hover:border-navy-400 hover:text-navy-600'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-navy-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            id="audit-export-confirm"
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-navy-700 text-white rounded-lg hover:bg-navy-800 disabled:opacity-60 transition-colors"
          >
            {isExporting ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

function toSnapshotValue(value: unknown): string | Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value as Record<string, unknown>;
  return String(value);
}

function parseAuditDetails(value: unknown): AuditDetails {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as AuditDetails;
      }
      return {};
    } catch {
      return {};
    }
  }

  if (typeof value === 'object') {
    return value as AuditDetails;
  }

  return {};
}

function getLogDisplayName(log: AuditLog): string {
  const details = (log.detailsJson ?? {}) as Record<string, unknown>;
  const after = (details.after ?? {}) as Record<string, unknown>;
  const before = (details.before ?? {}) as Record<string, unknown>;

  const candidate =
    after.title ??
    after.name ??
    details.title ??
    details.name ??
    before.title ??
    before.name;

  return typeof candidate === 'string' && candidate.trim() ? candidate : '-';
}

function getLogType(log: AuditLog): string {
  const details = (log.detailsJson ?? {}) as Record<string, unknown>;
  const after = (details.after ?? {}) as Record<string, unknown>;
  const before = (details.before ?? {}) as Record<string, unknown>;

  const candidate = after.type ?? details.type ?? before.type;
  return typeof candidate === 'string' && candidate.trim() ? candidate : '-';
}

// ── Subcomponente: tabla de registros ───────────────────────────────────────
function AuditTable({
  data,
  isLoading,
  page,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  selectedLogId,
  onSelectLog,
  emptyDescription,
}: {
  data?: AuditListResponse;
  isLoading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  sortBy: AuditSortBy;
  sortOrder: SortOrder;
  onSortChange: (field: AuditSortBy) => void;
  selectedLogId: string | null;
  onSelectLog: (id: string) => void;
  emptyDescription: string;
}) {
  const renderSortLabel = (field: AuditSortBy, label: string) => {
    const isActive = sortBy === field;
    const direction = isActive ? (sortOrder === 'asc' ? '^' : 'v') : '';

    return (
      <button
        type="button"
        onClick={() => onSortChange(field)}
        className="inline-flex items-center gap-1 hover:text-navy-600"
      >
        <span>{label}</span>
        {isActive ? <span className="text-[10px]">{direction}</span> : <ArrowUpDown className="h-3 w-3" />}
      </button>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }
  if (!data?.data?.length) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin registros"
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-navy-50 border-b border-navy-100">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase">{renderSortLabel('action', 'Acción')}</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden md:table-cell">Usuario</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden lg:table-cell">Nombre</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden xl:table-cell">{renderSortLabel('entityType', 'Tipo')}</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase">{renderSortLabel('createdAt', 'Fecha')}</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {data.data.map((log: AuditLog) => (
              <tr
                key={log.id}
                className={`hover:bg-navy-50/50 cursor-pointer transition-colors ${selectedLogId === log.id ? 'bg-navy-50' : ''}`}
                onClick={() => onSelectLog(log.id)}
              >
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-navy-100 text-navy-600'}`}>
                    {log.action.replace(/_/g, ' ')}
                    {log.rolledBackAt && <span className="ml-1 opacity-70">(ROLLBACK)</span>}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-navy-600 hidden md:table-cell">{log.user?.name || 'Sistema'}</td>
                <td className="px-5 py-4 text-xs text-navy-400 hidden lg:table-cell">{getLogDisplayName(log)}</td>
                <td className="px-5 py-4 text-xs text-navy-400 hidden xl:table-cell">{getLogType(log)}</td>
                <td className="px-5 py-4 text-xs text-navy-400">{formatDateTime(log.createdAt)}</td>
                <td className="px-5 py-4"><ChevronRight className="h-3.5 w-3.5 text-navy-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-navy-100">
          <p className="text-xs text-navy-400">
            Página {page} de {data.pagination.totalPages} · {data.pagination.total} registros
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= data.pagination.totalPages}
              className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export function AuditLogPage() {
  const location = useLocation();
  const navState = location.state as { selectedLogId?: string; activeTab?: TabType } | null;

  const [activeTab, setActiveTab] = useState<TabType>(navState?.activeTab || 'reversible');
  const [filters, setFilters] = useState<Record<AuditFilterKey, string>>({
    action: '',
    entityType: '',
  });
  const [sortBy, setSortBy] = useState<AuditSortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [pageRev, setPageRev] = useState(1);
  const [pageIrr, setPageIrr] = useState(1);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(navState?.selectedLogId || null);
  const [showExportModal, setShowExportModal] = useState(false);
  const queryClient = useQueryClient();

  const commonParams = {
    limit: 20,
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    sortBy,
    sortOrder,
  };

  const handleFilterChange = (key: AuditFilterKey, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageRev(1);
    setPageIrr(1);
  };

  const handleSortChange = (field: AuditSortBy) => {
    setPageRev(1);
    setPageIrr(1);

    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(field);
    setSortOrder(field === 'createdAt' || field === 'updatedAt' ? 'desc' : 'asc');
  };

  // Query para acciones REVERTIBLES
  const { data: dataRev, isLoading: loadingRev } = useQuery({
    queryKey: ['audit', 'reversible', pageRev, filters.action, filters.entityType, sortBy, sortOrder],
    queryFn: () =>
      api.get('/audit', { params: { ...commonParams, page: pageRev, reversible: 'true' } }).then((r) => r.data),
  });

  // Query para acciones IRREVERSIBLES
  const { data: dataIrr, isLoading: loadingIrr } = useQuery({
    queryKey: ['audit', 'irreversible', pageIrr, filters.action, filters.entityType, sortBy, sortOrder],
    queryFn: () =>
      api.get('/audit', { params: { ...commonParams, page: pageIrr, reversible: 'false' } }).then((r) => r.data),
  });

  // Query de detalle del log seleccionado
  const { data: selectedLog, isLoading: loadingDetail } = useQuery({
    queryKey: ['audit-detail', selectedLogId],
    queryFn: () => api.get<{ data: AuditLog }>(`/audit/${selectedLogId}`).then((r) => r.data.data),
    enabled: Boolean(selectedLogId),
  });

  const rollbackMutation = useMutation({
    mutationFn: (id: string) => api.post(`/audit/${id}/rollback`),
    onSuccess: (_, logId) => {
      toast.success('Cambio revertido correctamente');
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['audit-detail', logId] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Error al revertir el cambio')),
  });

  const selectedLogDetails = parseAuditDetails(selectedLog?.detailsJson);
  const beforeSnapshot = toSnapshotValue(
    selectedLogDetails.before !== undefined
      ? selectedLogDetails.before
      : (selectedLog?.action.includes('DELETE') ? selectedLog.detailsJson : null),
  );
  const afterSnapshot = toSnapshotValue(
    selectedLogDetails.after !== undefined
      ? selectedLogDetails.after
      : (!selectedLog?.action.includes('DELETE') && !selectedLog?.action.includes('UPDATE') && selectedLogDetails.before === undefined
        ? selectedLog?.detailsJson
        : null),
  );

  const canRollback =
    selectedLog &&
    !IRREVERSIBLE_ACTIONS.includes(selectedLog.action) &&
    !selectedLog.rolledBackAt &&
    (selectedLogDetails.before !== undefined || selectedLog.action.includes('CREATE'));

  const handleSelectLog = (id: string) => {
    setSelectedLogId((prev) => (prev === id ? null : id));
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedLogId(null);
  };

  const tabs: { key: TabType; label: string; icon: LucideIcon; count?: number; description: string }[] = [
    {
      key: 'reversible',
      label: 'Acciones de Datos',
      icon: RefreshCw,
      count: dataRev?.pagination?.total,
      description: 'Modificaciones sobre usuarios, turnos y configuraciones que pueden revertirse.',
    },
    {
      key: 'irreversible',
      label: 'Eventos de Seguridad',
      icon: Lock,
      count: dataIrr?.pagination?.total,
      description: 'Inicios de sesión, cierres de sesión y cambios de contraseña. No revertibles.',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Registro de Auditoría</h1>
          <p className="text-sm text-navy-400 mt-0.5">Historial completo de acciones del sistema</p>
        </div>
        <button
          id="audit-export-btn"
          onClick={() => setShowExportModal(true)}
          className="btn-ghost text-sm flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <FilterTable
        fields={AUDIT_FILTER_FIELDS}
        values={filters}
        onChange={handleFilterChange}
        className="p-4 gap-4"
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-navy-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`audit-tab-${tab.key}`}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
                isActive
                  ? 'border-navy-700 text-navy-800'
                  : 'border-transparent text-navy-400 hover:text-navy-600 hover:border-navy-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  isActive ? 'bg-navy-100 text-navy-700' : 'bg-navy-50 text-navy-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <div className="flex items-start gap-2 px-1">
        <ShieldCheck className="h-4 w-4 text-navy-300 mt-0.5 shrink-0" />
        <p className="text-xs text-navy-400">
          {tabs.find((t) => t.key === activeTab)?.description}
        </p>
      </div>

      {/* Content area */}
      <div className="flex gap-4">
        {/* Table */}
        <div className={`card overflow-hidden ${selectedLogId ? 'flex-1' : 'w-full'}`}>
          {activeTab === 'reversible' && (
            <AuditTable
              data={dataRev}
              isLoading={loadingRev}
              page={pageRev}
              onPageChange={setPageRev}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              selectedLogId={selectedLogId}
              onSelectLog={handleSelectLog}
              emptyDescription="No se encontraron acciones de datos con los filtros actuales."
            />
          )}
          {activeTab === 'irreversible' && (
            <AuditTable
              data={dataIrr}
              isLoading={loadingIrr}
              page={pageIrr}
              onPageChange={setPageIrr}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              selectedLogId={selectedLogId}
              onSelectLog={handleSelectLog}
              emptyDescription="No se encontraron eventos de seguridad con los filtros actuales."
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedLogId && (
          <div className="w-96 shrink-0 flex flex-col gap-0 animate-slide-up">
            {/* Panel Header */}
            <div className="card px-5 py-4 flex items-center justify-between border-b border-navy-100 rounded-b-none">
              <h3 className="text-sm font-bold text-navy-800">Detalle del Registro</h3>
              <button
                id="audit-detail-close"
                onClick={() => setSelectedLogId(null)}
                className="p-1.5 text-navy-300 hover:text-navy-600 hover:bg-navy-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="card rounded-t-none p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-260px)]">
              {loadingDetail || !selectedLog ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <>
                  <ActivityDetail
                    action={selectedLog.action}
                    entityType={selectedLog.entityType}
                    entityId={selectedLog.entityId}
                    beforeJson={beforeSnapshot}
                    afterJson={afterSnapshot}
                    actorName={selectedLog.user?.name || 'Sistema'}
                    createdAt={selectedLog.createdAt}
                    rolledBackAt={selectedLog.rolledBackAt}
                    rolledBackBy={selectedLog.rolledBackBy}
                  />

                  {selectedLog.entityId && (
                    <div className="pt-3 border-t border-navy-100">
                      <p className="text-[10px] font-medium text-navy-400 uppercase tracking-wider">ID del Recurso Afectado</p>
                      <p className="text-xs font-mono text-navy-500 mt-0.5">{selectedLog.entityId}</p>
                    </div>
                  )}

                  {selectedLog.ipAddress && (
                    <div className="pt-3 border-t border-navy-100">
                      <p className="text-[10px] font-medium text-navy-400 uppercase tracking-wider">Dirección IP</p>
                      <p className="text-xs font-mono text-navy-500 mt-0.5">{selectedLog.ipAddress}</p>
                    </div>
                  )}


                  {/* Rollback — solo en pestaña reversible */}
                  {activeTab === 'reversible' && (
                    <div className="pt-4 border-t border-navy-100">
                      <button
                        id="audit-rollback-btn"
                        onClick={() => {
                          if (window.confirm('¿Estás seguro de que deseas revertir este cambio? Esta acción no se puede deshacer.')) {
                            rollbackMutation.mutate(selectedLog.id);
                          }
                        }}
                        disabled={!canRollback || rollbackMutation.isPending}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                          canRollback
                            ? 'bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm'
                            : 'bg-navy-50 text-navy-200 border-2 border-navy-50 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw className={`h-4 w-4 ${rollbackMutation.isPending ? 'animate-spin' : ''}`} />
                        {rollbackMutation.isPending ? 'Revirtiendo...' : 'Revertir cambio'}
                      </button>
                      {!canRollback && (
                        <p className="text-[10px] text-navy-300 mt-2 text-center">
                          {selectedLog.rolledBackAt 
                            ? 'Este cambio ya ha sido revertido'
                            : 'Este registro no contiene datos previos suficientes para el rollback'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Aviso en pestaña irreversible */}
                  {activeTab === 'irreversible' && (
                    <div className="pt-4 border-t border-navy-100">
                      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Lock className="h-4 w-4 text-red-400 shrink-0" />
                        <p className="text-[11px] text-red-600 font-medium">
                          Los eventos de seguridad y sesión no se pueden revertir
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
}
