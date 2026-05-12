import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVacationsList, useApproveVacation, useRejectVacation, useCancelVacation } from '@/hooks/useVacations';
import api from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import { VacationCalendar } from '@/components/vacations/VacationCalendar';
import { VacationTable } from '@/components/vacations/VacationTable';
import { VacationRequestModal } from '@/components/vacations/VacationRequestModal';
import { VacationCreateModal } from '@/components/vacations/VacationCreateModal';
import { VacationsSkeleton } from '@/components/common/Skeleton';
import { Plus, CalendarPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import type { Branch, Department, VacationStatus } from '@/types';

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
        <VacationTable
          vacations={sortedVacations}
          isLoading={vacationsLoading}
          total={total}
          totalPages={totalPages}
          page={page}
          pageSize={pageSize}
          sortBy={sortBy}
          sortOrder={sortOrder}
          statusFilter={statusFilter}
          branchFilter={branchFilter}
          departmentFilter={departmentFilter}
          searchQuery={searchQuery}
          branches={branches}
          departments={departments}
          isAdmin={isAdmin}
          isManager={isManager}
          roleName={roleName}
          userBranchId={userBranchId}
          userDepartmentId={userDepartmentId}
          userId={userId}
          approvePending={approveMutation.isPending}
          rejectPending={rejectMutation.isPending}
          cancelPending={cancelMutation.isPending}
          onPageChange={setPage}
          onSortChange={handleSortChange}
          onStatusFilterChange={setStatusFilter}
          onBranchFilterChange={setBranchFilter}
          onDepartmentFilterChange={setDepartmentFilter}
          onSearchChange={setSearchQuery}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancel}
        />
      </section>

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
