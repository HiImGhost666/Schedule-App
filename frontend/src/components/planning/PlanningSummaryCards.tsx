import { AlertTriangle, CalendarClock, ShieldAlert, Users } from 'lucide-react';
import type { CoverageRiskItem, EquityItem, TimelineItem } from '@/hooks/usePlanning';

type Props = {
  risks?: CoverageRiskItem[];
  equity?: EquityItem[];
  timeline?: TimelineItem[];
  highRiskCount?: number;
};

export function PlanningSummaryCards({ risks = [], equity = [], timeline = [], highRiskCount = 0 }: Props) {
  const overloadedCount = equity.filter((item) => item.overtimeEstimate > 0).length;

  const cards = [
    { label: 'Riesgos altos', value: highRiskCount || risks.filter((risk) => risk.severity === 'high').length, icon: ShieldAlert },
    { label: 'Riesgos totales', value: risks.length, icon: AlertTriangle },
    { label: 'Sobrecargas', value: overloadedCount, icon: Users },
    { label: 'Eventos', value: timeline.length, icon: CalendarClock },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon }) => (
        <article key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            </div>
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
        </article>
      ))}
    </section>
  );
}
