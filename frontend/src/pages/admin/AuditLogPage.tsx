import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Search,
  ChevronRight,
  RotateCcw,
  X,
  ShieldCheck,
  RefreshCw,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/config/api';
import type { AuditLog, PaginatedResponse } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
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
type AuditListResponse = PaginatedResponse<AuditLog>;
type AuditDetails = {
  before?: unknown;
  after?: unknown;
};

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

// ── Subcomponente: tabla de registros ───────────────────────────────────────
function AuditTable({
  data,
  isLoading,
  page,
  onPageChange,
  selectedLogId,
  onSelectLog,
  emptyDescription,
}: {
  data?: AuditListResponse;
  isLoading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  selectedLogId: string | null;
  onSelectLog: (id: string) => void;
  emptyDescription: string;
}) {
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
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase">Acción</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden md:table-cell">Usuario</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden lg:table-cell">Entidad</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase">Fecha</th>
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
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-navy-600 hidden md:table-cell">{log.user?.name || 'Sistema'}</td>
                <td className="px-5 py-4 text-xs text-navy-400 hidden lg:table-cell">{log.entityType}</td>
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
  const [activeTab, setActiveTab] = useState<TabType>('reversible');
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [pageRev, setPageRev] = useState(1);
  const [pageIrr, setPageIrr] = useState(1);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const commonParams = { limit: 20, action: search || undefined, entityType: entityType || undefined };

  // Query para acciones REVERTIBLES
  const { data: dataRev, isLoading: loadingRev } = useQuery({
    queryKey: ['audit', 'reversible', pageRev, search, entityType],
    queryFn: () =>
      api.get('/audit', { params: { ...commonParams, page: pageRev, reversible: 'true' } }).then((r) => r.data),
  });

  // Query para acciones IRREVERSIBLES
  const { data: dataIrr, isLoading: loadingIrr } = useQuery({
    queryKey: ['audit', 'irreversible', pageIrr, search, entityType],
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
    onSuccess: () => {
      toast.success('Cambio revertido correctamente');
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedLogId(null);
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
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Registro de Auditoría</h1>
        <p className="text-sm text-navy-400 mt-0.5">Historial completo de acciones del sistema</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
          <input
            id="audit-search"
            type="text"
            placeholder="Filtrar por acción..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageRev(1); setPageIrr(1); }}
            className="input-field with-icon text-sm"
          />
        </div>
        <select
          id="audit-entity-type"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPageRev(1); setPageIrr(1); }}
          className="input-field text-sm w-44"
        >
          <option value="">Todos los tipos</option>
          <option value="User">Usuario</option>
          <option value="Schedule">Turno</option>
          <option value="WebhookConfig">Webhook</option>
        </select>
      </div>

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
                  />

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
                          Este registro no contiene datos previos suficientes para el rollback
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
    </div>
  );
}
