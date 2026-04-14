import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Search, ChevronRight } from 'lucide-react';
import api from '@/config/api';
import type { AuditLog } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDateTime } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  CREATE_USER: 'bg-blue-100 text-blue-700',
  UPDATE_USER: 'bg-amber-100 text-amber-700',
  DELETE_USER: 'bg-red-100 text-red-700',
  USER_STATUS_CHANGE: 'bg-purple-100 text-purple-700',
  USER_ROLE_CHANGE: 'bg-indigo-100 text-indigo-700',
  RESET_PASSWORD: 'bg-orange-100 text-orange-700',
  CREATE_SCHEDULE: 'bg-navy-100 text-navy-700',
  UPDATE_SCHEDULE: 'bg-gold-100 text-gold-700',
  DELETE_SCHEDULE: 'bg-red-100 text-red-700',
  CREATE_WEBHOOK: 'bg-teal-100 text-teal-700',
  CHANGE_PASSWORD: 'bg-cyan-100 text-cyan-700',
};

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, search, entityType],
    queryFn: () =>
      api.get('/audit', { params: { page, limit: 20, action: search || undefined, entityType: entityType || undefined } })
        .then((r) => r.data),
  });

  const { data: selectedLog, isLoading: loadingDetail } = useQuery({
    queryKey: ['audit-detail', selectedLogId],
    queryFn: () => api.get<{ data: AuditLog }>(`/audit/${selectedLogId}`).then((r) => r.data.data),
    enabled: Boolean(selectedLogId),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Registro de Auditoría</h1>
        <p className="text-sm text-navy-400 mt-0.5">Historial completo de acciones del sistema</p>
      </div>

      {/* Filters */}
      <div className="card p-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
          <input
            type="text"
            placeholder="Filtrar por acción..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field with-icon text-sm"
          />
        </div>
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="input-field text-sm w-44">
          <option value="">Todos los tipos</option>
          <option value="User">Usuario</option>
          <option value="Schedule">Guardia</option>
          <option value="WebhookConfig">Webhook</option>
        </select>
      </div>

      <div className="flex gap-4">
        {/* Log table */}
        <div className={`card overflow-hidden ${selectedLogId ? 'flex-1' : 'w-full'}`}>
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : !data?.data?.length ? (
            <EmptyState icon={ClipboardList} title="Sin registros" description="No se encontraron registros de auditoría" />
          ) : (
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
                        onClick={() => setSelectedLogId(selectedLogId === log.id ? null : log.id)}
                      >
                        <td className="px-6 py-5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-navy-100 text-navy-600'}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-navy-600 hidden md:table-cell">{log.user?.name || 'Sistema'}</td>
                        <td className="px-6 py-5 text-xs text-navy-400 hidden lg:table-cell">{log.entityType}</td>
                        <td className="px-6 py-5 text-xs text-navy-400">{formatDateTime(log.createdAt)}</td>
                        <td className="px-6 py-5"><ChevronRight className="h-3.5 w-3.5 text-navy-300" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.pagination?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-5 border-t border-navy-100">
                  <p className="text-xs text-navy-400">Página {page} de {data.pagination.totalPages} · {data.pagination.total} registros</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40">Anterior</button>
                    <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages} className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40">Siguiente</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedLogId && (
          <div className="w-80 flex-shrink-0 card p-6 space-y-4 animate-slide-up h-fit">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy-800">Detalle del registro</h3>
              <button onClick={() => setSelectedLogId(null)} className="p-1 text-navy-300 hover:text-navy-500 hover:bg-navy-50 rounded transition-colors text-xs">✕</button>
            </div>
            {loadingDetail || !selectedLog ? (
              <div className="py-6 flex justify-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <p className="text-xs font-medium text-navy-400 mb-1">Acción</p>
                  <p className="text-sm font-semibold text-navy-700">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-navy-400 mb-1">Usuario</p>
                  <p className="text-sm font-medium text-navy-700">{selectedLog.user?.name || 'Sistema'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-navy-400 mb-1">Entidad</p>
                  <p className="text-sm font-medium text-navy-700">{selectedLog.entityType}{selectedLog.entityId ? ` · ${selectedLog.entityId.slice(0, 8)}…` : ''}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-navy-400 mb-1">Fecha</p>
                  <p className="text-sm font-medium text-navy-700">{formatDateTime(selectedLog.createdAt)}</p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <p className="text-xs font-medium text-navy-400 mb-1">IP</p>
                    <p className="text-sm font-medium text-navy-700">{selectedLog.ipAddress}</p>
                  </div>
                )}
                {Boolean(selectedLog.detailsJson) && (
                  <div>
                    <p className="text-xs font-medium text-navy-400 mb-1">Detalles</p>
                    <pre className="bg-navy-50 rounded-lg p-3 text-[11px] text-navy-600 overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(selectedLog.detailsJson, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
