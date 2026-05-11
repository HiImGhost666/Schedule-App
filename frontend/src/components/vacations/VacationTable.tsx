import { useState } from 'react';
import { VacationStatusBadge } from './VacationStatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SortableHeader } from '@/components/common/SortableHeader';
import { Search, ChevronLeft, ChevronRight, Check, X, Trash2 } from 'lucide-react';
import type { VacationStatus, VacationRequest, Branch, Department } from '@/types';

type SortField = 'employee' | 'startDate' | 'status' | 'department' | 'branch';

interface VacationTableProps {
  vacations: VacationRequest[];
  isLoading: boolean;
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  statusFilter: VacationStatus | '';
  branchFilter: string;
  departmentFilter: string;
  searchQuery: string;
  branches: Branch[];
  departments: Department[];
  isAdmin: boolean;
  isManager: boolean;
  roleName: string;
  userBranchId?: string | null;
  userDepartmentId?: string | null;
  userId: string;
  approvePending: boolean;
  rejectPending: boolean;
  cancelPending: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (field: SortField) => void;
  onStatusFilterChange: (status: VacationStatus | '') => void;
  onBranchFilterChange: (branchId: string) => void;
  onDepartmentFilterChange: (departmentId: string) => void;
  onSearchChange: (query: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onCancel: (id: string) => void;
}

export function VacationTable({
  vacations, isLoading, total, totalPages, page, pageSize,
  sortBy, sortOrder, statusFilter, branchFilter, departmentFilter, searchQuery,
  branches, departments, isAdmin, isManager, roleName, userBranchId, userDepartmentId, userId,
  approvePending, rejectPending, cancelPending,
  onPageChange, onSortChange, onStatusFilterChange, onBranchFilterChange, onDepartmentFilterChange, onSearchChange,
  onApprove, onReject, onCancel,
}: VacationTableProps) {
  const [rejectModal, setRejectModal] = useState<{ id: string; employeeName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<{ id: string; employeeName: string } | null>(null);

  const sh = (field: SortField, label: string) => (
    <SortableHeader field={field} currentSortBy={sortBy} sortOrder={sortOrder} label={label} onSortChange={onSortChange} />
  );

  const canApprove = (vacation: VacationRequest) => {
    if (!isManager && !isAdmin) return false;
    if (vacation.status !== 'pending' && vacation.status !== 'colindante') return false;
    if (isAdmin) return true;
    if (roleName === 'general_manager' && vacation.branchId === userBranchId) return true;
    if (roleName === 'department_manager' && vacation.departmentId === userDepartmentId) return true;
    return false;
  };

  const canCancel = (vacation: VacationRequest) => {
    if (isAdmin) return true;
    if (isManager) {
      if (roleName === 'general_manager' && vacation.branchId === userBranchId) return true;
      if (roleName === 'department_manager' && vacation.departmentId === userDepartmentId) return true;
    }
    if (vacation.employeeId === userId && (vacation.status === 'pending' || vacation.status === 'colindante')) return true;
    return false;
  };

  const hasAnyAction = vacations.some((v) => {
    if (isAdmin) return true;
    if (isManager) {
      const inScope = roleName === 'general_manager' ? v.branchId === userBranchId : v.departmentId === userDepartmentId;
      if (inScope) return true;
    }
    if (v.employeeId === userId && (v.status === 'pending' || v.status === 'colindante')) return true;
    return false;
  });

  const actionColspan = hasAnyAction ? 6 : 5;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {isAdmin && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-theme-muted">Sucursal</label>
              <select
                value={branchFilter}
                onChange={(e) => { onBranchFilterChange(e.target.value); onPageChange(1); }}
                className="input-field text-sm"
              >
                <option value="">Todas</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-theme-muted">Departamento</label>
              <select
                value={departmentFilter}
                onChange={(e) => { onDepartmentFilterChange(e.target.value); onPageChange(1); }}
                className="input-field text-sm"
              >
                <option value="">Todos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {roleName === 'general_manager' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-theme-muted">Departamento</label>
            <select
              value={departmentFilter}
              onChange={(e) => { onDepartmentFilterChange(e.target.value); onPageChange(1); }}
              className="input-field text-sm"
            >
              <option value="">Todos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-theme-muted">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => { onStatusFilterChange(e.target.value as VacationStatus | ''); onPageChange(1); }}
            className="input-field text-sm"
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="colindante">Colindante</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-theme-muted">Buscar empleado</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }}
              placeholder="Nombre del empleado..."
              className="input-field text-sm pl-9 w-full"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-theme-color">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-theme-surface-muted/60 border-b border-theme-color">
              <th className="text-left px-4 py-3 font-semibold text-theme-primary">{sh('employee', 'Empleado')}</th>
              <th className="text-left px-4 py-3 font-semibold text-theme-primary">{sh('startDate', 'Fechas')}</th>
              <th className="text-left px-4 py-3 font-semibold text-theme-primary">{sh('status', 'Estado')}</th>
              <th className="text-left px-4 py-3 font-semibold text-theme-primary">{sh('department', 'Departamento')}</th>
              <th className="text-left px-4 py-3 font-semibold text-theme-primary">{sh('branch', 'Sucursal')}</th>
              {hasAnyAction && <th className="text-right px-4 py-3 font-semibold text-theme-primary">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={actionColspan} className="px-4 py-12">
                  <LoadingSpinner size="lg" />
                </td>
              </tr>
            ) : vacations.length === 0 ? (
              <tr>
                <td colSpan={actionColspan} className="px-4 py-12">
                  <EmptyState
                    icon={Search}
                    title="Sin solicitudes"
                    description="No hay solicitudes de vacaciones que coincidan con los filtros"
                  />
                </td>
              </tr>
            ) : (
              vacations.map((vacation) => (
                <tr key={vacation.id} className="border-b border-theme-color hover:bg-theme-surface-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-theme-primary">{vacation.employee.name}</div>
                      {vacation.employee.employeeId && (
                        <span className="text-xs text-theme-muted">({vacation.employee.employeeId})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-theme-primary whitespace-nowrap">
                    {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <VacationStatusBadge status={vacation.status} />
                  </td>
                  <td className="px-4 py-3 text-theme-muted">
                    {vacation.department?.name ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-theme-muted">
                    {vacation.branch?.name ?? '-'}
                  </td>
                  {hasAnyAction && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canApprove(vacation) && (
                          <>
                            <button
                              onClick={() => onApprove(vacation.id)}
                              disabled={approvePending}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
                              title="Aprobar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setRejectModal({ id: vacation.id, employeeName: vacation.employee.name })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                              title="Rechazar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {canCancel(vacation) && (
                          <button
                            onClick={() => setCancelTarget({ id: vacation.id, employeeName: vacation.employee.name })}
                            disabled={cancelPending}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors"
                            title="Cancelar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-theme-muted">
            Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn-secondary text-sm p-2 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-theme-primary font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-sm p-2 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <h2 className="text-lg font-bold text-theme-primary">
              Rechazar vacaciones de {rejectModal.employeeName}
            </h2>
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">
                Motivo de rechazo *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input-field w-full resize-none"
                rows={3}
                maxLength={500}
                placeholder="Indica el motivo del rechazo..."
              />
              <p className="text-xs text-theme-muted mt-1 text-right">{rejectReason.length}/500</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="btn-secondary text-sm">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (rejectModal && rejectReason.trim()) {
                    onReject(rejectModal.id, rejectReason.trim());
                    setRejectModal(null);
                    setRejectReason('');
                  }
                }}
                disabled={rejectPending || !rejectReason.trim()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectPending ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar solicitud"
        description={
          cancelTarget
            ? `¿Quieres cancelar la solicitud de vacaciones de ${cancelTarget.employeeName}?`
            : ''
        }
        confirmLabel="Cancelar solicitud"
        loading={cancelPending}
        onConfirm={() => {
          if (cancelTarget) {
            onCancel(cancelTarget.id);
            setCancelTarget(null);
          }
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
