import { ArrowUpDown, ChevronRight, ClipboardList } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog, PaginatedResponse } from '@/types';

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

import type { AuditSortBy, SortOrder } from '@/types';
type AuditListResponse = PaginatedResponse<AuditLog>;

function getLogDisplayName(log: AuditLog): string {
  const details = (log.detailsJson ?? {}) as Record<string, unknown>;
  const after = (details.after ?? {}) as Record<string, unknown>;
  const before = (details.before ?? {}) as Record<string, unknown>;
  const candidate = after.title ?? after.name ?? details.title ?? details.name ?? before.title ?? before.name;
  return typeof candidate === 'string' && candidate.trim() ? candidate : '-';
}

function getLogType(log: AuditLog): string {
  const details = (log.detailsJson ?? {}) as Record<string, unknown>;
  const after = (details.after ?? {}) as Record<string, unknown>;
  const before = (details.before ?? {}) as Record<string, unknown>;
  const candidate = after.type ?? details.type ?? before.type;
  return typeof candidate === 'string' && candidate.trim() ? candidate : '-';
}

interface AuditTableProps {
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
}

export function AuditTable({
  data, isLoading, page, onPageChange,
  sortBy, sortOrder, onSortChange,
  selectedLogId, onSelectLog, emptyDescription,
}: AuditTableProps) {
  const renderSortLabel = (field: AuditSortBy, label: string) => {
    const isActive = sortBy === field;
    const direction = isActive ? (sortOrder === 'asc' ? '^' : 'v') : '';
    return (
      <span
        role="button" tabIndex={0}
        onClick={() => onSortChange(field)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSortChange(field); }}
        className="inline-flex items-center gap-1 cursor-pointer hover:text-navy-600 select-none"
      >
        <span>{label}</span>
        {isActive ? <span className="text-[10px]">{direction}</span> : <ArrowUpDown className="h-3 w-3" />}
      </span>
    );
  };

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (!data?.data?.length) return <EmptyState icon={ClipboardList} title="Sin registros" description={emptyDescription} />;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-navy-50 border-b border-navy-100">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase">{renderSortLabel('action', 'Acción')}</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden md:table-cell">{renderSortLabel('userName', 'Usuario')}</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden lg:table-cell">{renderSortLabel('userDepartment', 'Departamento')}</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden lg:table-cell">Recurso</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase hidden xl:table-cell">{renderSortLabel('entityType', 'Tipo')}</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-navy-400 uppercase">{renderSortLabel('createdAt', 'Fecha')}</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {data.data.map((log: AuditLog) => (
              <tr key={log.id}
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
                <td className="px-5 py-4 text-xs text-navy-400 hidden lg:table-cell">
                  {log.user?.department ? <span className="capitalize">{log.user.department}</span> : <span className="text-navy-300">-</span>}
                </td>
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
          <p className="text-xs text-navy-400">Página {page} de {data.pagination.totalPages} · {data.pagination.total} registros</p>
          <div className="flex gap-2">
            <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
              className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40">Anterior</button>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= data.pagination.totalPages}
              className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </>
  );
}
