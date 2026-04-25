import { Building2, Plus, ArrowUpDown } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import type { Branch } from '@/types';

interface BranchListProps {
  branches: Branch[];
  selectedBranchId: string;
  isCreatingBranch: boolean;
  searchTerm: string;
  sortBy: 'name' | 'code';
  onSearchChange: (value: string) => void;
  onSortChange: (sort: 'name' | 'code') => void;
  onSelectBranch: (branch: Branch) => void;
  onNewBranch: () => void;
}

export function BranchList({
  branches, selectedBranchId, isCreatingBranch,
  searchTerm, sortBy,
  onSearchChange, onSortChange, onSelectBranch, onNewBranch,
}: BranchListProps) {
  const filteredAndSorted = branches
    .filter((b) => !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.code.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a[sortBy].localeCompare(b[sortBy], 'es', { sensitivity: 'base' }));

  return (
    <aside className="rounded-xl border border-theme-color bg-theme-surface p-2.5 sm:p-3">
      <div className="flex items-center justify-between px-1 pb-2 border-b border-theme-color">
        <p className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Listado</p>
        <p className="text-[11px] text-theme-muted">{branches.length} sucursales</p>
      </div>

      <div className="p-2 space-y-2 border-b border-theme-color">
        <input type="text" placeholder="Buscar por nombre o código..." className="input-field text-sm w-full"
          value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
        <div className="flex items-center gap-2 text-xs px-1">
          <span className="text-theme-muted shrink-0">Ordenar por:</span>
          <button onClick={() => onSortChange('name')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors text-xs font-medium ${
              sortBy === 'name'
                ? 'bg-theme-primary text-white shadow-sm ring-1 ring-theme-primary/50'
                : 'bg-theme-surface-muted text-theme-muted hover:bg-theme-surface-hover hover:text-theme-primary'
            }`}>
            {sortBy === 'name' && <ArrowUpDown className="h-3 w-3" />}
            Nombre
          </button>
          <button onClick={() => onSortChange('code')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors text-xs font-medium ${
              sortBy === 'code'
                ? 'bg-theme-primary text-white shadow-sm ring-1 ring-theme-primary/50'
                : 'bg-theme-surface-muted text-theme-muted hover:bg-theme-surface-hover hover:text-theme-primary'
            }`}>
            {sortBy === 'code' && <ArrowUpDown className="h-3 w-3" />}
            Código
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[25rem] overflow-y-auto mt-2 pr-1">
        {filteredAndSorted.length > 0 ? (
          filteredAndSorted.map((branch) => {
            const active = !isCreatingBranch && selectedBranchId === branch.id;
            return (
              <button key={branch.id} onClick={() => onSelectBranch(branch)}
                className="w-full text-left rounded-xl border px-3 py-2.5 transition-all focus:outline-none focus-visible:ring-2"
                style={active ? {
                  backgroundColor: 'var(--theme-sidebar-active-bg)', borderColor: 'var(--theme-sidebar-active-bg)',
                  color: 'var(--theme-sidebar-active-text)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--theme-sidebar-active-bg) 45%, transparent)',
                } : {
                  backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-color)', color: 'var(--theme-text-primary)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{branch.name}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                    branch.isActive ? 'border border-theme-color bg-theme-surface text-theme-primary' : 'bg-amber-500/20 text-amber-700'
                  }`}>{branch.isActive ? 'Activa' : 'Inactiva'}</span>
                </div>
                <p className="text-xs opacity-85 truncate mt-0.5">{branch.code}</p>
                <p className="text-xs opacity-75 truncate mt-0.5">{branch.city || 'Sin ciudad'}</p>
              </button>
            );
          })
        ) : (
          <EmptyState icon={Building2} title="Sin sucursales" description="Crea la primera sucursal" className="py-10" />
        )}
      </div>

      <button type="button" onClick={onNewBranch} className="mt-3 w-full btn-ghost text-sm inline-flex items-center justify-center gap-1.5">
        <Plus className="h-4 w-4" />Nueva sucursal
      </button>
    </aside>
  );
}
