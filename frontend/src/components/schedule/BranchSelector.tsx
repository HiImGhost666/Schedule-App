import { CalendarDays } from 'lucide-react';
import type { Branch } from '@/types';

interface BranchSelectorProps {
  branches: Branch[];
  activeBranchId: string;
  effectiveActiveBranchId: string;
  canViewAllBranches: boolean;
  onChange: (branchId: string) => void;
}

export function BranchSelector({ branches, activeBranchId, effectiveActiveBranchId, canViewAllBranches, onChange }: BranchSelectorProps) {
  const shouldUseBranchDropdown = canViewAllBranches && (branches.length + 1 > 3);

  return (
    <div className="px-5 py-4 border-b border-theme-color">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
        <CalendarDays className="h-3.5 w-3.5" />
        Sucursal y festivos
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-medium">
        {canViewAllBranches ? (
          shouldUseBranchDropdown ? (
            <div className="w-full space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">Selección de sucursal</label>
              <select value={activeBranchId} onChange={(e) => onChange(e.target.value)} className="input-field text-sm w-full">
                <option value="">Todas las sucursales</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{`${branch.name} (${branch.code})${branch.isActive ? '' : ' - Inactiva'}`}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <BranchButton label="Todas las sucursales" isActive={!effectiveActiveBranchId} onClick={() => onChange('')} />
              {branches.map((branch) => (
                <BranchButton key={branch.id}
                  label={branch.name}
                  isActive={effectiveActiveBranchId === branch.id}
                  onClick={() => onChange(branch.id)}
                  badge={!branch.isActive ? 'Inactiva' : undefined}
                />
              ))}
            </>
          )
        ) : (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            No tienes una sucursal asignada. Contacta con un administrador.
          </p>
        )}
      </div>
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
