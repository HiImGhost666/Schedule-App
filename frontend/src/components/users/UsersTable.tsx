import { ArrowUpDown, MoreVertical } from 'lucide-react';
import type { User } from '@/types';
import { ROLE_LABELS, STATUS_LABELS } from '@/types';
import { formatRelative } from '@/lib/utils';

import type { UsersSortBy, SortOrder } from '@/types';

interface UsersTableProps {
  data: User[];
  sortBy: UsersSortBy;
  sortOrder: SortOrder;
  onSortChange: (field: UsersSortBy) => void;
  onMenuToggle: (userId: string, event: React.MouseEvent<HTMLButtonElement>) => void;
}

function normalizeDepartment(value: string): string | undefined {
  const DEPARTMENT_VALUES = ['Seguridad', 'Mantenimiento', 'Operaciones', 'Administración'] as const;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.toLowerCase();
  const matched = DEPARTMENT_VALUES.find((department) => department.toLowerCase() === normalized);
  return matched ?? undefined;
}

function renderSortLabel(
  field: UsersSortBy,
  label: string,
  sortBy: UsersSortBy,
  sortOrder: SortOrder,
  onSortChange: (field: UsersSortBy) => void,
) {
  const isActive = sortBy === field;
  const direction = isActive ? (sortOrder === 'asc' ? '^' : 'v') : '';

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => onSortChange(field)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSortChange(field); }}
      className="inline-flex items-center gap-1 cursor-pointer hover:text-navy-600 select-none"
    >
      <span>{label}</span>
      {isActive ? <span className="text-[10px]">{direction}</span> : <ArrowUpDown className="h-3 w-3" />}
    </span>
  );
}

function roleBadge(role: string) {
  const cls = { admin: 'badge-role-admin', manager: 'badge-role-manager', viewer: 'badge-role-viewer' };
  return <span className={cls[role as keyof typeof cls] || 'badge-role-viewer'}>{ROLE_LABELS[role]}</span>;
}

function statusBadge(status: string) {
  const cls = { active: 'badge-status-active', disabled: 'badge-status-disabled', locked: 'badge-status-locked' };
  return <span className={cls[status as keyof typeof cls] || 'badge-status-disabled'}>{STATUS_LABELS[status]}</span>;
}

export function UsersTable({ data, sortBy, sortOrder, onSortChange, onMenuToggle }: UsersTableProps) {
  return (
    <div className="overflow-x-auto overflow-y-visible">
      <table className="w-full">
        <thead>
          <tr className="bg-navy-50 border-b border-navy-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden xl:table-cell">ID Empleado</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">
              {renderSortLabel('name', 'Usuario', sortBy, sortOrder, onSortChange)}
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden md:table-cell">Departamento</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden lg:table-cell">Sucursal</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">
              {renderSortLabel('role', 'Rol', sortBy, sortOrder, onSortChange)}
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">
              {renderSortLabel('status', 'Estado', sortBy, sortOrder, onSortChange)}
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden lg:table-cell">
              {renderSortLabel('lastLoginAt', 'Último acceso', sortBy, sortOrder, onSortChange)}
            </th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {data.map((u: User) => (
            <tr key={u.id} className="hover:bg-navy-50/50 transition-colors">
              <td className="px-5 py-3 text-xs font-mono text-navy-400 hidden xl:table-cell">{u.employeeId || '—'}</td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-navy-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {u.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-theme-primary truncate">{u.name}</p>
                    <p className="text-xs text-theme-muted truncate">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3 text-sm text-navy-500 hidden md:table-cell">{normalizeDepartment(u.department ?? '') || '—'}</td>
              <td className="px-5 py-3 text-sm text-navy-500 hidden lg:table-cell">
                {u.branch ? `${u.branch.name} (${u.branch.code})` : '—'}
              </td>
              <td className="px-5 py-3">{roleBadge(u.role)}</td>
              <td className="px-5 py-3">{statusBadge(u.status)}</td>
              <td className="px-5 py-3 text-xs text-navy-400 hidden lg:table-cell">
                {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Nunca'}
              </td>
              <td className="px-5 py-3 relative">
                <button
                  onClick={(event) => onMenuToggle(u.id, event)}
                  className="p-1 rounded hover:bg-theme-surface-muted text-theme-muted"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
