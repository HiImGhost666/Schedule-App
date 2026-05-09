import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import { VacationCalendar } from '@/components/vacations/VacationCalendar';
import { VacationTable } from '@/components/vacations/VacationTable';
import { VacationRequestModal } from '@/components/vacations/VacationRequestModal';
import { VacationCreateModal } from '@/components/vacations/VacationCreateModal';
import { VacationsSkeleton } from '@/components/common/Skeleton';
import { Plus, CalendarPlus } from 'lucide-react';
import type { Branch, Department } from '@/types';

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
          {/* Employee can request */}
          <button
            onClick={() => setShowRequestModal(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Solicitar
          </button>
          {/* Admin/Manager can create directly */}
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
          isAdmin={isAdmin}
          isManager={isManager}
          userBranchId={userBranchId}
          userDepartmentId={userDepartmentId}
          userId={userId}
          roleName={roleName}
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
        branchId={isAdmin ? selectedBranchId || undefined : userBranchId || undefined}
        departmentId={isAdmin ? selectedDepartmentId || undefined : userDepartmentId || undefined}
      />
    </div>
  );
}
