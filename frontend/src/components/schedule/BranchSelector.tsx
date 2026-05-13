import { CalendarDays } from 'lucide-react';
import type { Branch, Department } from '@/types';

interface BranchSelectorProps {
  branches: Branch[];
  activeBranchId: string;
  effectiveActiveBranchId: string;
  canSelectBranches: boolean;
  canViewAllBranches: boolean;
  onChange: (branchId: string) => void;
  departments?: Department[];
  selectedDeptId: string;
  onDepartmentChange: (departmentId: string) => void;
}

export function BranchSelector({
  branches,
  activeBranchId,
  effectiveActiveBranchId,
  canSelectBranches,
  canViewAllBranches,
  onChange,
  departments = [],
  selectedDeptId,
  onDepartmentChange,
}: BranchSelectorProps) {
  const extraOptions = canViewAllBranches ? 1 : 0;
  const shouldUseBranchDropdown = canSelectBranches && (branches.length + extraOptions > 3);
  const departmentSelector = (
    <DepartmentSelector
      departments={departments}
      selectedDeptId={selectedDeptId}
      onChange={onDepartmentChange}
    />
  );

  return (
    <div className="px-5 py-4 border-b border-theme-color">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
        <CalendarDays className="h-3.5 w-3.5" />
        Sucursal y festivos
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-medium">
        {canSelectBranches ? (
          shouldUseBranchDropdown ? (
            <div className="w-full space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">Selección de sucursal</label>
              <select value={activeBranchId} onChange={(e) => onChange(e.target.value)} className="input-field text-sm w-full">
                {canViewAllBranches && <option value="">Todas las sucursales</option>}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{`${branch.name} (${branch.code})${branch.isActive ? '' : ' - Inactiva'}`}</option>
                ))}
              </select>
              {departmentSelector}
            </div>
          ) : (
            <>
              {canViewAllBranches && (
                <>
                  <BranchButton label="Todas las sucursales" isActive={!effectiveActiveBranchId} onClick={() => onChange('')} />
                  {!effectiveActiveBranchId && departmentSelector}
                </>
              )}
              {branches.map((branch) => (
                <div key={branch.id} className="space-y-2">
                  <BranchButton
                    label={branch.name}
                    isActive={effectiveActiveBranchId === branch.id}
                    onClick={() => onChange(branch.id)}
                    badge={!branch.isActive ? 'Inactiva' : undefined}
                  />
                  {effectiveActiveBranchId === branch.id && departmentSelector}
                </div>
              ))}
            </>
          )
        ) : effectiveActiveBranchId ? (
          <div className="space-y-2">
            <div className="rounded-lg border px-3 py-2 bg-theme-surface border-theme-color">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1">Sucursal activa</p>
              <p className="text-xs text-theme-primary">
                {branches.find((branch) => branch.id === effectiveActiveBranchId)?.name ?? 'Sucursal asignada'}
              </p>
            </div>
            {departmentSelector}
          </div>
        ) : (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            No tienes una sucursal asignada. Contacta con un administrador.
          </p>
        )}
      </div>
    </div>
  );
}

function DepartmentSelector({
  departments,
  selectedDeptId,
  onChange,
}: {
  departments: Department[];
  selectedDeptId: string;
  onChange: (departmentId: string) => void;
}) {
  return (
    <div className="rounded-lg border px-3 py-2 transition-colors"
      style={{
        backgroundColor: 'var(--theme-surface)',
        color: 'var(--theme-text-muted)',
        borderColor: 'var(--theme-border-color)',
      }}
    >
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-1.5">
        Filtrar por departamento
      </label>
      <select
        value={selectedDeptId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs font-medium border-0 rounded-md px-0 h-6 bg-transparent text-theme-primary focus:outline-none focus:ring-0"
      >
        <option value="">Todos los departamentos</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function BranchButton({ label, isActive, onClick, badge }: { label: string; isActive: boolean; onClick: () => void; badge?: string }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded-lg border transition-colors"
      style={isActive ? {
        backgroundColor: 'var(--theme-sidebar-active-bg)', color: 'var(--theme-sidebar-active-text)',
        borderColor: 'var(--theme-sidebar-active-bg)',
      } : {
        backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text-muted)', borderColor: 'var(--theme-border-color)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">{label}</span>
        {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white">{badge}</span>}
      </div>
    </button>
  );
}
