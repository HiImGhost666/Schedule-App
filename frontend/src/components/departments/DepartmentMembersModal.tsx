import { X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Department, User } from '@/types';

interface DepartmentMembersModalProps {
  open: boolean;
  department: Department;
  branchName: string;
  branchUsers: User[];
  departmentUsers: Array<{ id: string; name: string; email: string }>;
  departments: Department[];
  isLoading?: boolean;
  onAssignUser: (userId: string) => void;
  onMoveUser: (userId: string, departmentId: string) => void;
  onCancel: () => void;
}

export function DepartmentMembersModal({
  open,
  department,
  branchName,
  branchUsers,
  departmentUsers,
  departments,
  isLoading,
  onAssignUser,
  onMoveUser,
  onCancel,
}: DepartmentMembersModalProps) {
  if (!open) return null;

  const currentMemberIds = new Set(departmentUsers.map((user) => user.id));
  const availableUsers = branchUsers.filter((user) => !currentMemberIds.has(user.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="card rounded-2xl shadow-2xl w-full max-w-3xl animate-slide-up max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-theme-color flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">Gestionar integrantes</h2>
            <p className="text-sm text-theme-muted">{department.name} · {branchName}</p>
          </div>
          <button onClick={onCancel} className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg" type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-theme-primary">Integrantes actuales</h3>
              <span className="text-xs text-theme-muted">{departmentUsers.length} usuarios</span>
            </div>

            {departmentUsers.length ? (
              <div className="space-y-2">
                {departmentUsers.map((user) => (
                  <div key={user.id} className="rounded-xl border border-theme-color bg-theme-surface p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-theme-primary">{user.name}</p>
                      <p className="text-xs text-theme-muted">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="input-field text-sm min-w-[220px]"
                        defaultValue=""
                        onChange={(event) => {
                          const nextDepartmentId = event.target.value;
                          if (!nextDepartmentId) return;
                          onMoveUser(user.id, nextDepartmentId);
                          event.target.value = '';
                        }}
                        disabled={isLoading || departments.length === 0}
                      >
                        <option value="">Mover a otro departamento</option>
                        {departments.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-theme-muted">Sin integrantes en este departamento.</p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-theme-primary">Usuarios del branch disponibles</h3>
              <span className="text-xs text-theme-muted">{availableUsers.length} usuarios</span>
            </div>

            {availableUsers.length ? (
              <div className="space-y-2">
                {availableUsers.map((user) => {
                  const currentDepartment = user.department ?? user.departments?.[0]?.department ?? null;
                  return (
                    <div key={user.id} className="rounded-xl border border-theme-color bg-theme-surface p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-theme-primary">{user.name}</p>
                        <p className="text-xs text-theme-muted">{user.email}</p>
                        <p className="text-[11px] text-theme-muted mt-0.5">
                          {currentDepartment ? `Actualmente en ${currentDepartment.name} (${currentDepartment.code})` : 'Sin departamento visible'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAssignUser(user.id)}
                        disabled={isLoading}
                        className="btn-ghost text-sm disabled:opacity-60"
                      >
                        Añadir aquí
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-theme-muted">No hay usuarios disponibles en este branch.</p>
            )}
          </section>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-theme-color flex-shrink-0">
          <button onClick={onCancel} type="button" className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
            {isLoading ? <LoadingSpinner size="sm" className="border-white border-t-white/30" /> : null}
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}