import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DateSelectArg, EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { Plus, RefreshCw, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ShiftModal } from '@/components/schedule/ShiftModal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import api from '@/config/api';
import type { Schedule, WeekScheduleItem } from '@/types';
import { SCHEDULE_TYPES } from '@/types';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import {
  getHolidaysForCalendar,
  getPartialDaysForCalendar,
  CALENDAR_LABELS,
  HOLIDAY_COLORS,
  HOLIDAY_TYPE_LABELS,
  type CalendarType,
} from '@/config/holidays';

/* ─── helpers ──────────────────────────────────────────────────── */

function getTypeInfo(type: string) {
  return SCHEDULE_TYPES.find((t) => t.value === type) ?? SCHEDULE_TYPES[0];
}

function mapWeekItemToSchedule(item: WeekScheduleItem): Schedule {
  return {
    id: item.id,
    title: item.title,
    description: item.notes ?? undefined,
    startDatetime: item.startDatetime,
    endDatetime: item.endDatetime,
    type: item.type,
    color: item.color,
    location: item.location ?? undefined,
    notes: item.notes ?? undefined,
    isLastMinute: item.isLastMinute,
    hoursPerDay: item.hoursPerDay,
    calendarType: item.calendarType,
    createdById: '',
    createdBy: { id: '', name: 'Sistema' },
    createdAt: item.startDatetime,
    updatedAt: item.endDatetime,
    assignments: item.assignees.map((assignee) => ({
      scheduleId: item.id,
      userId: assignee.id,
      assignedAt: item.startDatetime,
      user: {
        id: assignee.id,
        name: assignee.name,
        email: '',
        avatarUrl: assignee.avatarUrl ?? undefined,
      },
    })),
  };
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

/* ─── month-view event pill ─────────────────────────────────────── */

function MonthEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 overflow-hidden w-full min-w-0">
      <span className="text-[10px] font-semibold opacity-80 shrink-0 tabular-nums leading-none">
        {event.start && format(event.start, 'HH:mm')}
      </span>
      <span className="text-[11px] font-semibold truncate leading-none">{event.title}</span>
      {event.extendedProps.isLastMinute && (
        <span className="shrink-0 text-[8px] bg-white/30 px-1 rounded font-bold leading-none">!</span>
      )}
    </div>
  );
}

/* ─── week/day-view event card ──────────────────────────────────── */

function TimeGridEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  const schedule = event.extendedProps.schedule as Schedule;
  const assignees = schedule?.assignments?.map((a) => a.user) ?? [];
  const color = event.backgroundColor ?? '#2563eb';

  return (
    <div
      className="h-full flex flex-col overflow-hidden rounded-[5px]"
      style={{
        borderLeft: `3px solid rgba(${hexToRgb(color)}, 0.5)`,
        background: `rgba(${hexToRgb(color)}, 0.92)`,
      }}
    >
      <div className="flex-1 flex flex-col px-2 py-1.5 gap-0.5 overflow-hidden min-h-0">
        {/* title + urgente badge */}
        <div className="flex items-start justify-between gap-1">
          <span className="text-[11px] font-bold leading-tight line-clamp-2 flex-1 text-white">
            {event.title}
          </span>
          {event.extendedProps.isLastMinute && (
            <span className="shrink-0 text-[7px] bg-white/20 border border-white/40 px-1 py-0.5 rounded-full font-bold text-white uppercase leading-none mt-0.5">
              URG
            </span>
          )}
        </div>

        {/* time range */}
        <div className="text-[10px] text-white/70 font-medium tabular-nums leading-none">
          {event.start && format(event.start, 'HH:mm')}
          {event.end && ` – ${format(event.end, 'HH:mm')}`}
        </div>

        {/* assignee avatars */}
        {assignees.length > 0 && (
          <div className="flex items-center gap-0.5 mt-auto pt-1 flex-wrap">
            {assignees.slice(0, 5).map((a) => (
              <div
                key={a.id}
                title={a.name}
                className="w-[18px] h-[18px] rounded-full bg-white/25 border border-white/50 flex items-center justify-center text-[7px] font-bold uppercase text-white shrink-0"
              >
                {a.name.charAt(0)}
              </div>
            ))}
            {assignees.length > 5 && (
              <span className="text-[8px] text-white/60 font-medium">
                +{assignees.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── list-view event row ───────────────────────────────────────── */

function ListEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  const schedule = event.extendedProps.schedule as Schedule;
  const typeInfo = getTypeInfo(schedule?.type ?? '');

  return (
    <div className="flex items-center gap-3 py-1 px-2 w-full">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: typeInfo.color }}
      />
      <span className="font-semibold text-navy-800 text-sm truncate">{event.title}</span>
      <span className="text-xs text-navy-400 ml-auto shrink-0">
        {event.start && format(event.start, 'HH:mm')}
        {event.end && ` – ${format(event.end, 'HH:mm')}`}
      </span>
      {event.extendedProps.isLastMinute && (
        <span className="shrink-0 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
          Urgente
        </span>
      )}
    </div>
  );
}

/* ─── unified event content dispatcher ─────────────────────────── */

function EventContent({ info }: { info: EventContentArg }) {
  const viewType = info.view.type;
  if (viewType.startsWith('timeGrid')) return <TimeGridEventContent info={info} />;
  if (viewType.startsWith('list')) return <ListEventContent info={info} />;
  return <MonthEventContent info={info} />;
}

/* ─── interactive type legend ───────────────────────────────────── */

interface LegendProps {
  hidden: Set<string>;
  onToggle: (v: string) => void;
  counts: Record<string, number>;
}

function TypeLegend({ hidden, onToggle, counts }: LegendProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-b border-navy-100 px-6 pt-5 pb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-navy-400 uppercase tracking-wider">
          Tipos de turno
        </span>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-navy-300 hover:text-navy-500 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_TYPES.map(({ value, label, color }) => {
            const active = !hidden.has(value);
            const count = counts[value] ?? 0;
            return (
              <button
  key={value}
  onClick={() => onToggle(value)}
  title={count > 0 ? `${count} evento${count > 1 ? 's' : ''}` : 'Sin eventos'}
  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 whitespace-nowrap"
  style={
    active
      ? {
          backgroundColor: color,
          borderColor: color,
          color: '#fff',
          boxShadow: `0 1px 4px rgba(${hexToRgb(color)}, 0.4)`,
        }
      : {
          backgroundColor: 'transparent',
          borderColor: '#cbd5e1',
          color: '#94a3b8',
        }
  }
>
  <span
    className="w-2 h-2 rounded-full shrink-0 flex-none"
    style={{ backgroundColor: active ? 'rgba(255,255,255,0.6)' : color }}
  />
  <span className="leading-none">{label}</span>
  {count > 0 && (
    <span
      className="rounded-full px-1 text-[10px] font-bold leading-none py-0.5"
      style={
        active
          ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
          : { backgroundColor: color, color: '#fff' }
      }
    >
      {count}
    </span>
  )}
</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────── */

export function SchedulePage() {
  const navigate = useNavigate();
  const { scheduleId } = useParams<{ scheduleId?: string }>();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const calendarRef = useRef<FullCalendar>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | undefined>();
  const [defaultEnd, setDefaultEnd] = useState<Date | undefined>();
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [activeCalendar, setActiveCalendar] = useState<CalendarType>('tenerife');
  const [activeView, setActiveView] = useState('dayGridMonth');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  });
  const shouldUseWeekEndpoint = activeView !== 'dayGridMonth';
  const weekRefDate = dateRange.from;
  const isoWeekYear = getISOWeekYear(weekRefDate);
  const isoWeek = getISOWeek(weekRefDate);

  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: [
      'schedules',
      shouldUseWeekEndpoint ? 'week-view' : 'month-view',
      shouldUseWeekEndpoint ? `${isoWeekYear}-${isoWeek}` : format(dateRange.from, 'yyyy-MM'),
    ],
    queryFn: () => {
      if (shouldUseWeekEndpoint) {
        return api
          .get<{ data: { items: WeekScheduleItem[] } }>(`/schedules/week/${isoWeekYear}/${isoWeek}`)
          .then((r) => r.data.data.items.map(mapWeekItemToSchedule));
      }

      return api
        .get<{ data: Schedule[] }>('/schedules', {
          params: {
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
        .then((r) => r.data.data);
    },
  });

  const { data: scheduleDetail } = useQuery({
    queryKey: ['schedule-detail', scheduleId],
    queryFn: () => api.get<{ data: Schedule }>(`/schedules/${scheduleId}`).then((r) => r.data.data),
    enabled: Boolean(scheduleId),
  });

  useEffect(() => {
    if (!scheduleDetail) return;
    const openDetailTimer = window.setTimeout(() => {
      setSelectedSchedule(scheduleDetail);
      setModalOpen(true);
    }, 0);

    return () => window.clearTimeout(openDetailTimer);
  }, [scheduleDetail]);

  /* derive color from type (ignore stale DB color field) */
  const events =
    schedules
      ?.filter((s) => !hiddenTypes.has(s.type))
      .map((s) => {
        const { color } = getTypeInfo(s.type);
        return {
          id: s.id,
          title: s.title,
          start: s.startDatetime,
          end: s.endDatetime,
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: { schedule: s, isLastMinute: s.isLastMinute },
        };
      }) ?? [];

  /* holiday background events for the active calendar */
  const holidayEvents = useMemo(() => {
    const holidays = getHolidaysForCalendar(activeCalendar).map((h) => ({
      id: `holiday-${h.date}-${h.type}`,
      title: h.name,
      start: h.date,
      display: 'background' as const,
      backgroundColor: HOLIDAY_COLORS[h.type] + '33', // 20% opacity
      extendedProps: { isHoliday: true, holidayType: h.type },
    }));
    const partials = getPartialDaysForCalendar(activeCalendar).map((p) => ({
      id: `partial-${p.date}`,
      title: p.name,
      start: p.date,
      display: 'background' as const,
      backgroundColor: '#7c3aed33',
      extendedProps: { isHoliday: true, holidayType: 'partial' },
    }));
    return [...holidays, ...partials];
  }, [activeCalendar]);

  /* type counts for legend badges */
  const typeCounts: Record<string, number> = {};
  schedules?.forEach((s) => {
    typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
  });

  const toggleType = useCallback((type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    if (info.event.extendedProps.isHoliday) return; // background holiday events are not clickable
    const clickedSchedule = info.event.extendedProps.schedule as Schedule;
    setSelectedSchedule(clickedSchedule);
    setModalOpen(true);
    navigate(`/schedule/${clickedSchedule.id}`);
  }, [navigate]);

  const handleDateSelect = useCallback(
    (info: DateSelectArg) => {
      if (!canEdit) return;
      setSelectedSchedule(null);
      setDefaultStart(info.start);
      setDefaultEnd(info.end);
      setModalOpen(true);
      if (scheduleId) navigate('/schedule', { replace: true });
    },
    [canEdit, navigate, scheduleId],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedSchedule(null);
    setDefaultStart(undefined);
    setDefaultEnd(undefined);
    if (scheduleId) {
      navigate('/schedule', { replace: true });
    }
  }, [navigate, scheduleId]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Planificación de Guardias</h1>
          <p className="text-sm text-navy-400 mt-0.5">
            Gestiona los turnos y asignaciones del personal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-navy-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {canEdit && (
            <button
              onClick={() => {
                const start = new Date();
                start.setMinutes(0, 0, 0);
                start.setHours(start.getHours() + 1);
                const end = new Date(start);
                end.setHours(end.getHours() + 8);
                setSelectedSchedule(null);
                setDefaultStart(start);
                setDefaultEnd(end);
                setModalOpen(true);
              }}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Guardia
            </button>
          )}
        </div>
      </div>

      {/* Calendar card */}
      <div className="card relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Holiday calendar selector */}
        <div className="border-b border-navy-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-400 uppercase tracking-wider">
              <CalendarDays className="h-3.5 w-3.5" />
              Festivos
            </div>
            <div className="flex rounded-lg border border-navy-200 overflow-hidden text-xs font-medium">
              {(['tenerife', 'las_palmas', 'none'] as CalendarType[]).map((cal) => (
                <button
                  key={cal}
                  onClick={() => setActiveCalendar(cal)}
                  className="px-3 py-1.5 transition-colors"
                  style={
                    activeCalendar === cal
                      ? { backgroundColor: '#1e3a5f', color: '#fff' }
                      : { backgroundColor: '#fff', color: '#64748b' }
                  }
                >
                  {CALENDAR_LABELS[cal]}
                </button>
              ))}
            </div>
            {activeCalendar !== 'none' && (
              <div className="flex items-center gap-2 flex-wrap">
                {(['nacional', 'autonomica', 'local', 'mejora'] as const).map((type) => (
                  <span key={type} className="flex items-center gap-1 text-[10px] text-navy-500">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm opacity-70"
                      style={{ backgroundColor: HOLIDAY_COLORS[type] }}
                    />
                    {HOLIDAY_TYPE_LABELS[type]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <TypeLegend hidden={hiddenTypes} onToggle={toggleType} counts={typeCounts} />

        {/* Calendar */}
        <div className="p-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' }}
            events={[...events, ...holidayEvents]}
            selectable={canEdit}
            selectMirror
            dayMaxEvents={4}
            weekends
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={(info) => <EventContent info={info} />}
            height="auto"
            datesSet={(info) => {
              setActiveView(info.view.type);
              setDateRange({ from: info.start, to: info.end });
            }}
            eventDisplay="block"
            nowIndicator
            /* Time grid settings */
            slotMinTime="06:00:00"
            slotMaxTime="26:00:00"
            slotDuration="01:00:00"
            slotLabelInterval="01:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventMinHeight={28}
            /* Week starts Monday */
            firstDay={1}
          />
        </div>
      </div>

      <ShiftModal
        open={modalOpen}
        onClose={closeModal}
        schedule={selectedSchedule}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />
    </div>
  );
}
