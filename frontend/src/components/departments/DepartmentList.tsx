import { Layers, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import type { Department } from '@/types';

interface DepartmentListProps {
  departments: Department[];
  selectedDepartmentId: string;
  isCreatingDepartment: boolean;
  searchTerm: string;
  sortBy: 'name' | 'code';
  sortOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onSortChange: (sort: 'name' | 'code', order: 'asc' | 'desc') => void;
  onSelectDepartment: (department: Department) => void;
  onNewDepartment: () => void;
}

export function DepartmentList({
  departments,
  selectedDepartmentId,
  isCreatingDepartment,
  searchTerm,
  sortBy,
  sortOrder,
  onSearchChange,
  onSortChange,
  onSelectDepartment,
  onNewDepartment,
}: DepartmentListProps) {
  const filteredAndSorted = departments
    .filter((d) => !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.code.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const cmp = a[sortBy].localeCompare(b[sortBy], 'es', { sensitivity: 'base' });
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  return (
    <aside className="rounded-xl border border-theme-color bg-theme-surface p-2.5 sm:p-3">
      <div className="flex items-center justify-between px-1 pb-2 border-b border-theme-color">
        <p className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Listado</p>
        <p className="text-[11px] text-theme-muted">{departments.length} departamentos</p>
      </div>

      <div className="p-2 space-y-2 border-b border-theme-color">
        <input
          type="text"
          placeholder="Buscar por nombre o codigo..."
          className="input-field text-sm w-full"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="flex items-center gap-2 text-xs px-1">
          <span className="text-theme-muted shrink-0">Ordenar por:</span>
          <button
            onClick={() => onSortChange('name', sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors text-xs font-medium ${
              sortBy === 'name'
                ? 'bg-navy-700 text-white shadow-sm ring-1 ring-navy-700/50'
                : 'bg-theme-surface-muted text-theme-muted hover:bg-theme-surface-hover hover:text-theme-primary'
            }`}
          >
            {sortBy === 'name' ? (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            ) : <ArrowUpDown className="h-3 w-3" />}
            Nombre
          </button>
          <button
            onClick={() => onSortChange('code', sortBy === 'code' && sortOrder === 'asc' ? 'desc' : 'asc')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors text-xs font-medium ${
              sortBy === 'code'
                ? 'bg-navy-700 text-white shadow-sm ring-1 ring-navy-700/50'
                : 'bg-theme-surface-muted text-theme-muted hover:bg-theme-surface-hover hover:text-theme-primary'
            }`}
          >
            {sortBy === 'code' ? (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            ) : <ArrowUpDown className="h-3 w-3" />}
            Codigo
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[25rem] overflow-y-auto mt-2 pr-1">
        {filteredAndSorted.length > 0 ? (
          filteredAndSorted.map((department) => {
            const active = !isCreatingDepartment && selectedDepartmentId === department.id;
            return (
              <button
                key={department.id}
                onClick={() => onSelectDepartment(department)}
                className="w-full text-left rounded-xl border px-3 py-2.5 transition-all focus:outline-none focus-visible:ring-2"
                style={active ? {
                  backgroundColor: 'var(--theme-sidebar-active-bg)',
                  borderColor: 'var(--theme-sidebar-active-bg)',
                  color: 'var(--theme-sidebar-active-text)',
                  boxShadow: '0 0 0 2px color-mix(in srgb, var(--theme-sidebar-active-bg) 45%, transparent)',
                } : {
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: 'var(--theme-border-color)',
                  color: 'var(--theme-text-primary)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{department.name}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                    department.isActive ? 'border border-theme-color bg-theme-surface text-theme-primary' : 'bg-amber-500/20 text-amber-700'
                  }`}>{department.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
                <p className="text-xs opacity-85 truncate mt-0.5">{department.code}</p>
                <p className="text-xs opacity-75 truncate mt-0.5">{department.description || 'Sin descripcion'}</p>
                <p className="text-[11px] opacity-70 truncate mt-1">
                  {department.branches?.length
                    ? department.branches.map((item) => item.branch.code).join(', ')
                    : 'Sin sucursales'}
                </p>
              </button>
            );
          })
        ) : (
          <EmptyState icon={Layers} title="Sin departamentos" description="Crea el primer departamento" className="py-10" />
        )}
      </div>

      <button type="button" onClick={onNewDepartment} className="mt-3 w-full btn-ghost text-sm inline-flex items-center justify-center gap-1.5">
        <Plus className="h-4 w-4" />Nuevo departamento
      </button>
    </aside>
  );
}
