import type { BranchHoliday } from '@/types';

const HOLIDAY_TYPE_LABELS: Record<BranchHoliday['type'], string> = {
  nacional: 'Nacional', autonomica: 'Autonómica', local: 'Local',
  mejora: 'Mejora convenio', regional: 'Regional', company: 'Empresa',
};

const HOLIDAY_COLORS: Record<BranchHoliday['type'], string> = {
  nacional: '#dc2626', autonomica: '#ea580c', local: '#d97706',
  mejora: '#65a30d', regional: '#0ea5e9', company: '#7c3aed',
};

interface HolidayLegendProps {
  holidayTypeCounts: Partial<Record<BranchHoliday['type'], number>>;
}

export function HolidayLegend({ holidayTypeCounts }: HolidayLegendProps) {
  return (
    <div className="mt-3 pt-3 border-t border-theme-color flex flex-col gap-1.5">
      {(Object.keys(HOLIDAY_TYPE_LABELS) as BranchHoliday['type'][]).map((type) => (
        <span key={type} className="flex items-center gap-1.5 text-[10px] text-theme-muted">
          <span className="inline-block w-2.5 h-2.5 rounded-sm opacity-70" style={{ backgroundColor: HOLIDAY_COLORS[type] }} />
          <span className="text-theme-muted">
            {HOLIDAY_TYPE_LABELS[type]}
            {holidayTypeCounts[type] ? ` (${holidayTypeCounts[type]})` : ''}
          </span>
        </span>
      ))}
    </div>
  );
}
