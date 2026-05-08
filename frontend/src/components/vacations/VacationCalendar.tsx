import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { useVacationCalendar } from '@/hooks/useVacations';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { CalendarDays } from 'lucide-react';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import type { Branch, Department } from '@/types';

const DEPARTMENT_PALETTE = [
  '#1d4ed8', '#0f766e', '#b45309', '#7c3aed', '#be185d',
  '#0ea5e9', '#16a34a', '#ea580c', '#334155', '#0891b2',
];

const MIXED_DEPARTMENT = 'Mixto';
const UNKNOWN_DEPARTMENT = 'Sin departamento';

function toLocalDateOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addOneDay(dateIso: string) {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function VacationEventContent({ info }: { info: EventContentArg }) {
  const departmentLabel = info.event.extendedProps.departmentLabel as string | undefined;
  const departmentColor = info.event.extendedProps.departmentColor as string | undefined;
  const isListView = info.view.type.startsWith('list');

  if (isListView) {
    return (
      <div className="google-list-event">
        <span className="google-list-event-dot" style={{ backgroundColor: departmentColor }} />
        <div className="google-list-event-main">
          <span className="google-list-event-title">{info.event.title}</span>
          {departmentLabel && (
            <span className="google-list-event-time">{departmentLabel}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="vacation-bar" style={{ color: '#ffffff' }}>
      <span className="vacation-bar-title">{info.event.title}</span>
      {departmentLabel && <span className="vacation-bar-dept">{departmentLabel}</span>}
    </div>
  );
}

interface Props {
  branches: Branch[];
  departments: Department[];
  selectedBranchId: string;
  selectedDepartmentId: string;
  onBranchChange: (branchId: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  isAdmin: boolean;
  userBranchId?: string | null;
}

export function VacationCalendar({
  branches,
  departments,
  selectedBranchId,
  selectedDepartmentId,
  onBranchChange,
  onDepartmentChange,
  isAdmin,
  userBranchId,
}: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  });

  const weekRefDate = dateRange.from;
  const isoWeekYear = getISOWeekYear(weekRefDate);
  const isoWeek = getISOWeek(weekRefDate);

  const effectiveBranchId = isAdmin ? selectedBranchId : (userBranchId || '');

  const { data: calendarData, isLoading } = useVacationCalendar(
    isoWeekYear,
    isoWeek,
    {
      branchId: effectiveBranchId || undefined,
      departmentId: selectedDepartmentId || undefined,
    },
    true,
  );

  const vacationItems = useMemo(() => calendarData?.items ?? [], [calendarData?.items]);

  // Compute department labels from calendar items
  const departmentLabels = useMemo(() => {
    const base = new Set<string>();
    const hasMixed = false;
    let hasUnknown = false;

    vacationItems.forEach((item) => {
      const label = item.employeeDepartment?.name?.trim();
      if (!label) {
        hasUnknown = true;
      } else {
        base.add(label);
      }
    });

    const sorted = Array.from(base).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    if (hasMixed) sorted.push(MIXED_DEPARTMENT);
    if (hasUnknown) sorted.push(UNKNOWN_DEPARTMENT);
    return sorted;
  }, [vacationItems]);

  const departmentColors = useMemo(() => {
    const map: Record<string, string> = {
      [MIXED_DEPARTMENT]: '#64748b',
      [UNKNOWN_DEPARTMENT]: '#94a3b8',
    };

    let paletteIndex = 0;
    departmentLabels.forEach((label) => {
      if (map[label]) return;
      map[label] = DEPARTMENT_PALETTE[paletteIndex % DEPARTMENT_PALETTE.length];
      paletteIndex += 1;
    });

    return map;
  }, [departmentLabels]);

  const vacationEvents = useMemo(() => {
    return vacationItems.map((item) => {
      const departmentLabel = item.employeeDepartment?.name || UNKNOWN_DEPARTMENT;
      const departmentColor = departmentColors[departmentLabel] ?? '#64748b';
      const title = item.employeeName;
      const start = toLocalDateOnly(item.startDate);
      const end = addOneDay(toLocalDateOnly(item.endDate));

      return {
        id: `vac-${item.id}`,
        title,
        start,
        end,
        allDay: true,
        backgroundColor: departmentColor,
        borderColor: departmentColor,
        textColor: '#ffffff',
        extendedProps: {
          isVacation: true,
          departmentLabel,
          departmentColor,
        },
      };
    });
  }, [vacationItems, departmentColors]);

  const reflowCalendar = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.updateSize();
  }, []);

  useEffect(() => {
    if (!calendarContainerRef.current || typeof ResizeObserver === 'undefined') return;

    let rafId: number | null = null;
    const scheduleReflow = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        reflowCalendar();
      });
    };

    const observer = new ResizeObserver(() => {
      scheduleReflow();
    });

    observer.observe(calendarContainerRef.current);
    window.addEventListener('resize', scheduleReflow);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleReflow);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [reflowCalendar]);

  const hasBranches = branches.length > 0;

  if (!hasBranches) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin sucursales"
        description="Crea una sucursal para poder visualizar vacaciones"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
      <aside className="space-y-4">
        <div className="border border-theme-color rounded-xl p-3 bg-theme-surface-muted/40 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">
            Sucursal
          </span>
          <select
            value={effectiveBranchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className="input-field text-sm w-full"
            disabled={!isAdmin}
          >
            {isAdmin && <option value="">Todas las sucursales</option>}
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} ({branch.code}){branch.isActive ? '' : ' · inactiva'}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-theme-color rounded-xl p-3 bg-theme-surface-muted/40 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">
            Departamento
          </span>
          <select
            value={selectedDepartmentId}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="input-field text-sm w-full"
          >
            <option value="">Todos los departamentos</option>
            {departments
              .filter((d) => !effectiveBranchId || d.branches?.some((b) => b.branch.id === effectiveBranchId))
              .map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
          </select>
        </div>

        <div className="border border-theme-color rounded-xl p-3 bg-theme-surface-muted/40 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">
            Departamentos (leyenda)
          </span>
          {departmentLabels.length === 0 ? (
            <p className="text-xs text-theme-muted">Sin datos disponibles</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {departmentLabels.map((label) => (
                <div key={label} className="flex items-center gap-2 text-[11px] text-theme-muted">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm opacity-80"
                    style={{ backgroundColor: departmentColors[label] }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
            <LoadingSpinner size="lg" />
          </div>
        )}

        <div ref={calendarContainerRef} className="fc-google-like">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,listWeek',
            }}
            buttonText={{ today: 'Hoy', month: 'Mes', list: 'Lista' }}
            events={vacationEvents}
            dayMaxEvents={4}
            moreLinkClick="popover"
            navLinks
            stickyHeaderDates
            weekends
            eventClassNames={() => ['fc-vacation-event']}
            eventContent={(info) => <VacationEventContent info={info} />}
            eventOrder="start,-duration,allDay,title"
            displayEventTime={false}
            height="auto"
            expandRows
            datesSet={(info) => {
              setDateRange({ from: info.start, to: info.end });
            }}
            eventDisplay="block"
            firstDay={1}
          />
        </div>
      </div>
    </div>
  );
}
