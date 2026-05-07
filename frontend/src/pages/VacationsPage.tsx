import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { CalendarDays } from 'lucide-react';
import api from '@/config/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import type { Branch, Schedule, ScheduleAssignment } from '@/types';
import { getEffectiveBranchId } from '@/lib/branchSelection';

const DEPARTMENT_PALETTE = [
  '#1d4ed8',
  '#0f766e',
  '#b45309',
  '#7c3aed',
  '#be185d',
  '#0ea5e9',
  '#16a34a',
  '#ea580c',
  '#334155',
  '#0891b2',
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

// function isAllDayLike removed - unused

function getDepartmentLabel(assignments: ScheduleAssignment[]) {
  const departments = new Set<string>();
  assignments.forEach((assignment) => {
    const label = assignment.user.department?.name?.trim();
    if (label) departments.add(label);
  });

  if (departments.size === 0) return UNKNOWN_DEPARTMENT;
  if (departments.size > 1) return MIXED_DEPARTMENT;
  return Array.from(departments)[0];
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

export function VacationsPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  });

  const { data: branches, isLoading: branchesLoading } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', 'vacations-page'],
    queryFn: () => api.get('/branches', { params: { includeInactive: true } }).then((r) => r.data),
  });

  const branchList = branches?.data ?? [];
  const effectiveBranchId = getEffectiveBranchId({
    branches: branchList,
    selectedBranchId,
    fallbackStrategy: 'active-or-first',
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['vacations', effectiveBranchId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: () =>
      api
        .get<{ data: Schedule[] }>('/schedules', {
          params: {
            branchId: effectiveBranchId,
            type: 'vacaciones',
            from: new Date(
              dateRange.from.getFullYear(),
              dateRange.from.getMonth() - 1,
              1,
            ).toISOString(),
            to: new Date(
              dateRange.to.getFullYear(),
              dateRange.to.getMonth() + 2,
              0,
            ).toISOString(),
          },
        })
        .then((r) => r.data.data),
    enabled: Boolean(effectiveBranchId),
  });

  const departmentLabels = useMemo(() => {
    const base = new Set<string>();
    let hasMixed = false;
    let hasUnknown = false;

    (schedules ?? []).forEach((schedule) => {
      const label = getDepartmentLabel(schedule.assignments ?? []);
      if (label === MIXED_DEPARTMENT) {
        hasMixed = true;
      } else if (label === UNKNOWN_DEPARTMENT) {
        hasUnknown = true;
      } else {
        base.add(label);
      }
    });

    const sorted = Array.from(base).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    if (hasMixed) sorted.push(MIXED_DEPARTMENT);
    if (hasUnknown) sorted.push(UNKNOWN_DEPARTMENT);
    return sorted;
  }, [schedules]);

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
    return (schedules ?? []).map((schedule) => {
      const departmentLabel = getDepartmentLabel(schedule.assignments ?? []);
      const departmentColor = departmentColors[departmentLabel] ?? '#64748b';
      const titleParts = schedule.assignments?.map((a) => a.user.name).filter(Boolean) ?? [];
      const title = titleParts.length ? titleParts.join(', ') : schedule.title || 'Vacaciones';
      const start = toLocalDateOnly(schedule.startDatetime);
      const end = addOneDay(toLocalDateOnly(schedule.endDatetime));

      return {
        id: schedule.id,
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
  }, [departmentColors, schedules]);

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

  const isLoading = branchesLoading || schedulesLoading;
  const hasBranches = branchList.length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Vacaciones</h1>
          <p className="text-sm text-theme-muted mt-0.5">
            Consulta el calendario de vacaciones por sucursal y departamento
          </p>
        </div>
      </div>

      <section className="card p-4 space-y-4">
        {!hasBranches ? (
          <EmptyState
            icon={CalendarDays}
            title="Sin sucursales"
            description="Crea una sucursal para poder visualizar vacaciones"
          />
        ) : !effectiveBranchId ? (
          <EmptyState
            icon={CalendarDays}
            title="Selecciona una sucursal"
            description="Elige una sucursal para ver sus vacaciones"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
              <aside className="space-y-4">
                <div className="border border-theme-color rounded-xl p-3 bg-theme-surface-muted/40 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">
                    Sucursal
                  </span>
                  <select
                    value={effectiveBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="input-field text-sm w-full"
                  >
                    {branchList.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code}){branch.isActive ? '' : ' · inactiva'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border border-theme-color rounded-xl p-3 bg-theme-surface-muted/40 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">
                    Departamentos
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
          </>
        )}
      </section>
    </div>
  );
}
