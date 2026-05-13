import { format } from 'date-fns';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { Branch, Department } from '@/types';
import type { PlanningFilters as PlanningFiltersValue } from '@/hooks/usePlanning';

type Props = {
  filters: PlanningFiltersValue;
  branches: Branch[];
  departments: Department[];
  onChange: (filters: PlanningFiltersValue) => void;
};

export function PlanningFilters({ filters, branches, departments, onChange }: Props) {
  const updateDate = (field: 'from' | 'to', value: string) => {
    const date = new Date(`${value}T${field === 'from' ? '00:00:00' : '23:59:59'}`);
    onChange({ ...filters, [field]: date });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
        <Calendar className="w-4 h-4 text-slate-400" />
        <input
          type="date"
          className="bg-transparent text-sm border-none focus:ring-0 p-0 font-semibold text-slate-700"
          value={format(filters.from, 'yyyy-MM-dd')}
          onChange={(event) => updateDate('from', event.target.value)}
        />
        <span className="text-slate-300 mx-1">→</span>
        <input
          type="date"
          className="bg-transparent text-sm border-none focus:ring-0 p-0 font-semibold text-slate-700"
          value={format(filters.to, 'yyyy-MM-dd')}
          onChange={(event) => updateDate('to', event.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 px-3">
        <MapPin className="w-4 h-4 text-slate-400" />
        <select
          className="text-sm border-none focus:ring-0 p-0 bg-transparent font-medium text-slate-700 cursor-pointer"
          value={filters.branchId ?? ''}
          onChange={(event) => onChange({ ...filters, branchId: event.target.value || undefined, departmentId: undefined })}
        >
          <option value="">Todas las sedes visibles</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 px-3">
        <Users className="w-4 h-4 text-slate-400" />
        <select
          className="text-sm border-none focus:ring-0 p-0 bg-transparent font-medium text-slate-700 cursor-pointer"
          value={filters.departmentId ?? ''}
          onChange={(event) => onChange({ ...filters, departmentId: event.target.value || undefined })}
        >
          <option value="">Todos los departamentos</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
