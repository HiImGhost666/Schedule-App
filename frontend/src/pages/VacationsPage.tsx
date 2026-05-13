import { useCallback, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVacationsList, useApproveVacation, useRejectVacation, useCancelVacation } from '@/hooks/useVacations';
import api from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import { VacationCalendar } from '@/components/vacations/VacationCalendar';
import { VacationStatusBadge } from '@/components/vacations/VacationStatusBadge';
import { VacationRequestModal } from '@/components/vacations/VacationRequestModal';
import { VacationCreateModal } from '@/components/vacations/VacationCreateModal';
import { VacationsSkeleton } from '@/components/common/Skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { Plus, CalendarPlus, Search, Check, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import type { Branch, Department, VacationRequest, VacationStatus } from '@/types';
import type { Column } from '@/components/common/DataTable';

type SortField = 'employee' | 'startDate' | 'status' | 'department' | 'branch';

export function VacationsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.name === 'admin';
  const isManager = user?.role?.name === 'admin' || user?.role?.name === 'general_manager' || user?.role?.name === 'department_manager';
  const roleName = user?.role?.name ?? 'employee';
  const userBranchId = user?.branchId;
  const userDepartmentId = user?.departmentId;
  const userId = user?.id ?? '';

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: string; employeeName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<{ id: string; employeeName: string } | null>(null);

  // Vacation table state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<VacationStatus | ''>('');
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const approveMutation = useApproveVacation();
  const rejectMutation = useRejectVacation();
  const cancelMutation = useCancelVacation();

  const { data: branchesData, isLoading: branchesLoading } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', 'vacations-page'],
    queryFn: () => api.get('/branches', { params: { includeInactive: true } }).then((r) => r.data),
  });

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery<{ data: Department[] }>({
    queryKey: ['departments', 'vacations-page'],
    queryFn: () => api.get('/departments', { params: { includeInactive: true } }).then((r) => r.data),
  });

  const branches = branchesData?.data ?? [];
  const departments = departmentsData?.data ?? [];

  const filters = useMemo(() => ({
    status: statusFilter || undefined,
    branchId: isAdmin ? (branchFilter || undefined) : undefined,
    departmentId: isAdmin ? (departmentFilter || undefined) : (roleName === 'general_manager' ? (departmentFilter || undefined) : undefined),
    page,
    pageSize,
    search: searchQuery || undefined,
  }), [statusFilter, branchFilter, departmentFilter, page, pageSize, searchQuery, isAdmin, roleName]);

  const { data: vacationsData, isLoading: vacationsLoading } = useVacationsList(filters);

  const vacations = useMemo(() => vacationsData?.items ?? [], [vacationsData?.items]);
  const total = vacationsData?.total ?? 0;
  const totalPages = vacationsData?.totalPages ?? 0;

  const sortedVacations = useMemo(() => {
    return [...vacations].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'employee') {
        cmp = a.employee.name.localeCompare(b.employee.name, 'es', { sensitivity: 'base' });
      } else if (sortBy === 'startDate') {
        cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status, 'es');
      } else if (sortBy === 'department') {
        cmp = (a.department?.name ?? '').localeCompare(b.department?.name ?? '', 'es');
      } else if (sortBy === 'branch') {
        cmp = (a.branch?.name ?? '').localeCompare(b.branch?.name ?? '', 'es');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [vacations, sortBy, sortOrder]);

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortOrder('asc');
  };

  const handleStatusFilterChange = useCallback((status: VacationStatus | '') => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handleBranchFilterChange = useCallback((branchId: string) => {
    setBranchFilter(branchId);
    setDepartmentFilter('');
    setPage(1);
  }, []);

  const handleDepartmentFilterChange = useCallback((departmentId: string) => {
    setDepartmentFilter(departmentId);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync({ id });
      toast.success('Vacaciones aprobadas');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudieron aprobar las vacaciones'));
    }
  };

  const handleReject = async (id: string, rejectionReason: string) => {
    try {
      await rejectMutation.mutateAsync({ id, rejectionReason });
      toast.success('Vacaciones rechazadas');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudieron rechazar las vacaciones'));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Solicitud cancelada');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo cancelar la solicitud'));
    }
  };

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

  const hasAnyAction = sortedVacations.some((vacation) => {
    if (isAdmin) return true;
    if (isManager) {
      const inScope = roleName === 'general_manager' ? vacation.branchId === userBranchId : vacation.departmentId === userDepartmentId;
      if (inScope) return true;
    }
    if (vacation.employeeId === userId && (vacation.status === 'pending' || vacation.status === 'colindante')) return true;
    return false;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const vacationColumns: Column<VacationRequest>[] = [
    {
      key: 'employee',
      label: 'Empleado',
      sortable: true,
      render: (vacation) => (
        <div className="flex items-center gap-2">
          <div className="font-medium text-theme-primary">{vacation.employee.name}</div>
          {vacation.employee.employeeId && (
            <span className="text-xs text-theme-muted">({vacation.employee.employeeId})</span>
          )}
        </div>
      ),
    },
    {
      key: 'startDate',
      label: 'Fechas',
      sortable: true,
      className: 'text-theme-primary whitespace-nowrap',
      render: (vacation) => `${formatDate(vacation.startDate)} - ${formatDate(vacation.endDate)}`,
    },
    {
      key: 'status',
      label: 'Estado',
      sortable: true,
      render: (vacation) => <VacationStatusBadge status={vacation.status} />,
    },
    {
      key: 'department',
      label: 'Departamento',
      sortable: true,
      className: 'text-theme-muted',
      render: (vacation) => vacation.department?.name ?? '-',
    },
    {
      key: 'branch',
      label: 'Sucursal',
      sortable: true,
      className: 'text-theme-muted',
      render: (vacation) => vacation.branch?.name ?? '-',
    },
  ];

  const renderVacationActions = (vacation: VacationRequest) => (
    <div className="flex items-center justify-end gap-1">
      {canApprove(vacation) && (
        <>
          <button
            onClick={() => handleApprove(vacation.id)}
            disabled={approveMutation.isPending}
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
          disabled={cancelMutation.isPending}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors"
          title="Cancelar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const isLoading = branchesLoading || departmentsLoading;

  if (isLoading) {
    return <VacationsSkeleton />;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Vacaciones</h1>
          <p className="text-sm text-theme-muted mt-0.5">
            {isAdmin
              ? 'Gestiona las vacaciones de todas las sucursales'
              : isManager
                ? 'Gestiona las vacaciones de tu equipo'
                : 'Solicita y consulta tus vacaciones'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRequestModal(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Solicitar
          </button>
          {isManager && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Crear
            </button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <section className="card p-4">
        <VacationCalendar
          branches={branches}
          departments={departments}
          selectedBranchId={selectedBranchId}
          selectedDepartmentId={selectedDepartmentId}
          onBranchChange={setSelectedBranchId}
          onDepartmentChange={setSelectedDepartmentId}
          isAdmin={isAdmin}
          userBranchId={userBranchId}
        />
      </section>

      {/* CRUD Table */}
      <section className="card p-4">
        <h2 className="text-lg font-bold text-theme-primary mb-4">Solicitudes</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            {isAdmin && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-theme-muted">Sucursal</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => handleBranchFilterChange(e.target.value)}
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
                    onChange={(e) => handleDepartmentFilterChange(e.target.value)}
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
                  onChange={(e) => handleDepartmentFilterChange(e.target.value)}
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
                onChange={(e) => handleStatusFilterChange(e.target.value as VacationStatus | '')}
                className="input-field text-sm"
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="colindante">Colindante (solapa con equipo)</option>
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
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Nombre del empleado..."
                  className="input-field text-sm pl-9 w-full"
                />
              </div>
            </div>
          </div>

          <DataTable<VacationRequest>
            data={sortedVacations}
            columns={vacationColumns}
            rowKey={(vacation) => vacation.id}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(field) => handleSortChange(field as SortField)}
            isLoading={vacationsLoading}
            emptyIcon={Search}
            emptyTitle="Sin solicitudes"
            emptyDescription="No hay solicitudes de vacaciones que coincidan con los filtros"
            renderActions={hasAnyAction ? renderVacationActions : undefined}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-theme-muted">
                Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-sm p-2 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-theme-primary font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary text-sm p-2 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

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
                    handleReject(rejectModal.id, rejectReason.trim());
                    setRejectModal(null);
                    setRejectReason('');
                  }
                }}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar solicitud"
        description={
          cancelTarget
            ? `¿Quieres cancelar la solicitud de vacaciones de ${cancelTarget.employeeName}?`
            : ''
        }
        confirmLabel="Cancelar solicitud"
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelTarget) {
            handleCancel(cancelTarget.id);
            setCancelTarget(null);
          }
        }}
        onCancel={() => setCancelTarget(null)}
      />

      {/* Modals */}
      <VacationRequestModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />
      <VacationCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
