import { format } from 'date-fns';
import type { AvailabilityMatrix, PlanningStatus } from '@/hooks/usePlanning';
import { cn } from '@/lib/utils';

function statusLabel(status: PlanningStatus) {
  if (status === 'vacation') return 'Vac.';
  if (status === 'busy') return 'Turno';
  return 'Libre';
}

function statusClass(status: PlanningStatus) {
  if (status === 'vacation') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'busy') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

type Props = {
  matrix?: AvailabilityMatrix;
};

export function PlanningMatrix({ matrix }: Props) {
  if (!matrix) return null;

  return (
    <div className="overflow-auto max-h-[calc(100vh-360px)]">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-slate-200">
            <th className="text-left font-semibold text-slate-600 p-3 min-w-56">Empleado</th>
            {matrix.days.map((day) => (
              <th key={day} className="text-center font-semibold text-slate-500 p-3 min-w-24">
                {format(new Date(day), 'dd/MM')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="p-3">
                <p className="font-semibold text-slate-800">{row.name}</p>
                <p className="text-xs text-slate-400">{row.department?.name ?? row.branch?.name ?? 'Sin scope'}</p>
              </td>
              {row.days.map((day) => (
                <td key={day.date} className="p-2 text-center">
                  <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', statusClass(day.status))}>
                    {statusLabel(day.status)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
