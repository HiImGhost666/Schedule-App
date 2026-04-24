import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DateSelectArg, EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { Plus, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  CalendarDetailPopover,
  type CalendarDetailItem,
  type PopoverAnchor,
} from '@/components/schedule/CalendarDetailPopover';
import { HolidayEditModal } from '@/components/schedule/HolidayEditModal';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { ShiftModal } from '@/components/schedule/ShiftModal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import api from '@/config/api';
import type { Branch, BranchHoliday, CalendarBranchHoliday, Schedule, ScheduleAssignment, WeekScheduleItem } from '@/types';
import { SCHEDULE_TYPES } from '@/types';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { getApiErrorMessage } from '@/lib/apiError';
import { getEffectiveBranchId } from '@/lib/branchSelection';
import { isDarkThemePreset } from '@/config/theme';

const HOLIDAY_TYPE_LABELS: Record<BranchHoliday['type'], string> = {
  nacional: 'Nacional',
  autonomica: 'Autonómica',
  local: 'Local',
  mejora: 'Mejora convenio',
  regional: 'Regional',
  company: 'Empresa',
};

const HOLIDAY_COLORS: Record<BranchHoliday['type'], string> = {
  nacional: '#dc2626',
  autonomica: '#ea580c',
  local: '#d97706',
  mejora: '#65a30d',
  regional: '#0ea5e9',
  company: '#7c3aed',
};

/* ─── helpers ──────────────────────────────────────────────────── */

function getTypeInfo(type: string) {
  return SCHEDULE_TYPES.find((t) => t.value === type) ?? SCHEDULE_TYPES[0];
}

function computePopoverAnchorFromEventEl(
  eventEl: HTMLElement,
  pageContainerEl: HTMLElement | null,
): PopoverAnchor {
  const rect = eventEl.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  const pageRect = pageContainerEl?.getBoundingClientRect();
  return {
    x: pageRect ? clientX - pageRect.left : clientX,
    y: pageRect ? clientY - pageRect.top : clientY,
  };
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
    branchId: item.branchId ?? undefined,
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
        email: assignee.email ?? '',
        avatarUrl: assignee.avatarUrl ?? undefined,
        department: assignee.department ?? undefined,
        companyPhone: assignee.companyPhone ?? undefined,
        auxiliaryPhone: assignee.auxiliaryPhone ?? undefined,
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

function isGroupedHoliday(holiday: CalendarBranchHoliday): holiday is Extract<CalendarBranchHoliday, { holidayIds: string[] }> {
  return 'holidayIds' in holiday;
}

/* ─── month-view event pill ─────────────────────────────────────── */

function MonthEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  return (
    <div className="google-month-event">
      {event.start && <span className="google-month-event-time">{format(event.start, 'HH:mm')}</span>}
      <span className="google-month-event-title">{event.title}</span>
      {event.extendedProps.isLastMinute && (
        <span className="google-month-event-flag">!</span>
      )}
    </div>
  );
}

/* ─── week/day-view event card ──────────────────────────────────── */

function TimeGridEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  const schedule = event.extendedProps.schedule as Schedule | undefined;
  const timeText =
    schedule?.startDatetime && schedule?.endDatetime
      ? `${format(new Date(schedule.startDatetime), 'HH:mm')} - ${format(new Date(schedule.endDatetime), 'HH:mm')}`
      : info.timeText;
  const assigneeText =
    schedule?.assignments
      ?.map((assignment) => assignment.user.name.split(' ')[0])
      .slice(0, 2)
      .join(', ') ?? '';

  return (
    <div className="google-timegrid-event">
      <div className="google-timegrid-event-title">
        {event.extendedProps.isLastMinute ? '!' : ''} {event.title}
      </div>
      <div className="google-timegrid-event-time">{timeText}</div>
      {assigneeText && <div className="google-timegrid-event-meta">{assigneeText}</div>}
    </div>
  );
}

/* ─── list-view event row ───────────────────────────────────────── */

function ListEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  const schedule = event.extendedProps.schedule as Schedule;
  const timeText =
    schedule?.startDatetime && schedule?.endDatetime
      ? `${format(new Date(schedule.startDatetime), 'HH:mm')} - ${format(new Date(schedule.endDatetime), 'HH:mm')}`
      : info.timeText;
  const typeInfo = getTypeInfo(schedule?.type ?? '');

  return (
    <div className="google-list-event">
      <span
        className="google-list-event-dot"
        style={{ backgroundColor: typeInfo.color }}
      />

      <div className="google-list-event-main">
        <span className="google-list-event-title">{event.title}</span>
        <span className="google-list-event-time">{timeText}</span>
      </div>

      {event.extendedProps.isLastMinute && (
        <span className="google-list-event-urgent">Urgente</span>
      )}
    </div>
  );
}

function HolidayEventContent({ info }: { info: EventContentArg }) {
  const isDark = isDarkThemePreset(
    useUIStore(
      (s) => s.themePresetHoverPreview ?? s.themeDraft ?? s.themeConfig,
    ),
  );
  const holidayType = info.event.extendedProps.holidayType as BranchHoliday['type'] | undefined;
  const color = holidayType ? HOLIDAY_COLORS[holidayType] : '#5f6368';
  const labelColor = isDark ? '#e8eef4' : color;

  return (
    <div className="google-holiday-event" style={{ borderColor: color, color: labelColor }}>
      <span className="google-holiday-event-dot" style={{ backgroundColor: color }} />
      <span className="google-holiday-event-title">{info.event.title}</span>
    </div>
  );
}

/* ─── unified event content dispatcher ─────────────────────────── */

function EventContent({
  info,
}: {
  info: EventContentArg;
}) {
  if (info.event.extendedProps.isHoliday) return <HolidayEventContent info={info} />;
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
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
          Tipos de turno
        </span>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-theme-muted hover:text-theme-primary transition-colors"
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
                      borderColor: '#d0d7de',
                      color: '#5f6368',
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
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { initialView?: string; initialDate?: string } | null;
  const { scheduleId } = useParams<{ scheduleId?: string }>();
  const user = useAuthStore((s) => s.user);
  const isDark = isDarkThemePreset(
    useUIStore(
      (s) => s.themePresetHoverPreview ?? s.themeDraft ?? s.themeConfig,
    ),
  );
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const isAdmin = user?.role === 'admin';
  const canViewAllBranches = Boolean(user);
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const skipNextRouteDetailSyncRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | undefined>();
  const [defaultEnd, setDefaultEnd] = useState<Date | undefined>();
  const [detailItem, setDetailItem] = useState<CalendarDetailItem | null>(null);
  const [detailAnchor, setDetailAnchor] = useState<PopoverAnchor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarDetailItem | null>(null);
  const [holidayEditTarget, setHolidayEditTarget] = useState<CalendarBranchHoliday | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<ScheduleAssignment['user'] | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [activeView, setActiveView] = useState(navState?.initialView || 'dayGridMonth');
  const [dateRange, setDateRange] = useState(() => {
    if (navState?.initialDate) {
      const d = new Date(navState.initialDate);
      return { from: d, to: d };
    }
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

  const { data: branches } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', 'schedule-page', user?.id, user?.role],
    queryFn: () => api.get('/branches', { params: { includeInactive: true } }).then((r) => r.data),
  });

  const effectiveActiveBranchId = getEffectiveBranchId({
    branches: branches?.data,
    selectedBranchId: canViewAllBranches ? activeBranchId : undefined,
    assignedBranchId: undefined,
    fallbackStrategy: 'none',
  });

  const availableBranches = useMemo(() => branches?.data ?? [], [branches?.data]);
  const branchNameById = useMemo(
    () => Object.fromEntries(availableBranches.map((branch) => [branch.id, branch.name])),
    [availableBranches],
  );
  const shouldUseBranchDropdown = canViewAllBranches && (availableBranches.length + 1 > 3);

  const { data: schedules, isLoading } = useQuery({
    queryKey: [
      'schedules',
      effectiveActiveBranchId || 'all',
      shouldUseWeekEndpoint ? 'week-view' : 'month-view',
      shouldUseWeekEndpoint ? `${isoWeekYear}-${isoWeek}` : format(dateRange.from, 'yyyy-MM'),
    ],
    queryFn: () => {
      if (shouldUseWeekEndpoint) {
        return api
          .get<{ data: { items: WeekScheduleItem[] } }>(`/schedules/week/${isoWeekYear}/${isoWeek}`, {
            params: effectiveActiveBranchId ? { branchId: effectiveActiveBranchId } : {},
          })
          .then((r) => r.data.data.items.map(mapWeekItemToSchedule));
      }

      return api
        .get<{ data: Schedule[] }>('/schedules', {
          params: {
            ...(effectiveActiveBranchId ? { branchId: effectiveActiveBranchId } : {}),
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
    enabled: canViewAllBranches || Boolean(effectiveActiveBranchId),
  });

  const { data: branchHolidays } = useQuery<{ data: CalendarBranchHoliday[] }>({
    queryKey: [
      'branch-holidays-calendar',
      effectiveActiveBranchId || 'all',
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd'),
    ],
    queryFn: () =>
      api
        .get(`/branches/${effectiveActiveBranchId || 'all'}/holidays`, {
          params: {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString(),
            ...(effectiveActiveBranchId ? {} : { groupShared: true }),
          },
        })
        .then((r) => r.data),
    enabled: canViewAllBranches || Boolean(effectiveActiveBranchId),
  });

  const { data: scheduleDetail } = useQuery({
    queryKey: ['schedule-detail', scheduleId],
    queryFn: () => api.get<{ data: Schedule }>(`/schedules/${scheduleId}`).then((r) => r.data.data),
    enabled: Boolean(scheduleId),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (schedule: Schedule) =>
      api.delete(`/schedules/${schedule.id}`, { data: { reason: 'Eliminada desde el calendario' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['schedule-detail'] });
      toast.success('Turno eliminado');
      setDeleteTarget(null);
      setDetailItem(null);
      setDetailAnchor(null);
      if (scheduleId) {
        navigate('/schedule', { replace: true });
      }
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el turno'));
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (holiday: CalendarBranchHoliday) => {
      if (isGroupedHoliday(holiday)) {
        return api.delete('/branches/all/holidays/bulk', { data: { holidayIds: holiday.holidayIds } });
      }
      return api.delete(`/branches/${holiday.branchId}/holidays/${holiday.id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-holidays'] });
      qc.invalidateQueries({ queryKey: ['branch-holidays-calendar'] });
      toast.success('Festivo eliminado');
      setDeleteTarget(null);
      setDetailItem(null);
      setDetailAnchor(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el festivo'));
    },
  });

  const detailScheduleId = detailItem?.kind === 'schedule' ? detailItem.schedule.id : null;

  useEffect(() => {
    if (!scheduleId || !scheduleDetail) return;
    if (skipNextRouteDetailSyncRef.current) {
      skipNextRouteDetailSyncRef.current = false;
      return;
    }
    if (modalOpen || Boolean(deleteTarget) || Boolean(holidayEditTarget) || profileModalOpen) return;

    /* Clic en el calendario: mismo turno y ancla ya definida; no tocar */
    if (detailScheduleId === scheduleDetail.id && detailAnchor) {
      return;
    }

    const branchName = scheduleDetail.branchId ? branchNameById[scheduleDetail.branchId] : undefined;
    const detailPayload: CalendarDetailItem = {
      kind: 'schedule',
      schedule: scheduleDetail,
      branchName,
    };

    if (detailScheduleId !== scheduleDetail.id) {
      setDetailItem(detailPayload);
      setDetailAnchor(null);
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 72;

    const tryPosition = () => {
      if (cancelled) return;

      const container = calendarContainerRef.current;
      const pageEl = pageContainerRef.current;
      const el = container?.querySelector(`[data-schedule-id="${scheduleDetail.id}"]`);

      if (el instanceof HTMLElement && pageEl) {
        setDetailAnchor(computePopoverAnchorFromEventEl(el, pageEl));
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        requestAnimationFrame(tryPosition);
      } else {
        setDetailAnchor(null);
      }
    };

    requestAnimationFrame(tryPosition);
    return () => {
      cancelled = true;
    };
  }, [
    scheduleId,
    scheduleDetail,
    detailScheduleId,
    detailAnchor,
    branchNameById,
    modalOpen,
    deleteTarget,
    holidayEditTarget,
    profileModalOpen,
    schedules,
    isLoading,
    hiddenTypes,
  ]);

  const normalizeWeekDayEnd = useCallback((startIso: string, endIso: string) => {
    if (!shouldUseWeekEndpoint) return endIso;

    const start = new Date(startIso);
    const end = new Date(endIso);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return endIso;

    const isAllDayLike =
      start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      end.getHours() === 0 &&
      end.getMinutes() === 0;

    if (isAllDayLike) return endIso;

    const adjusted = new Date(end);
    adjusted.setHours(adjusted.getHours() + 1);
    return adjusted.toISOString();
  }, [shouldUseWeekEndpoint]);

  /* derive color from type (ignore stale DB color field) */
  const scheduleEvents =
    schedules
      ?.filter((s) => !hiddenTypes.has(s.type))
      .map((s) => {
        const { color } = getTypeInfo(s.type);
        return {
          id: s.id,
          title: s.title,
          start: s.startDatetime,
          end: normalizeWeekDayEnd(s.startDatetime, s.endDatetime),
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: { schedule: s, isLastMinute: s.isLastMinute },
        };
      }) ?? [];

  const holidayBackgroundEvents = useMemo(() => {
    return (branchHolidays?.data ?? []).map((holiday) => ({
      id: `holiday-bg-${holiday.id}`,
      title: holiday.name,
      start: toLocalDateOnly(holiday.date),
      end: addOneDay(toLocalDateOnly(holiday.date)),
      allDay: true,
      display: 'background' as const,
      backgroundColor: isDark
        ? HOLIDAY_COLORS[holiday.type] + '3d'
        : HOLIDAY_COLORS[holiday.type] + '33',
      textColor: isDark ? '#e8eef4' : '#1e2b3a',
      extendedProps: { isHolidayBackground: true, holidayType: holiday.type },
    }));
  }, [branchHolidays?.data, isDark]);

  const holidayInteractiveEvents = useMemo(() => {
    const holidays = branchHolidays?.data ?? [];
    const isGeneralView = !effectiveActiveBranchId;

    return holidays.map((holiday) => {
      const dateStr = toLocalDateOnly(holiday.date);
      const grouped = isGroupedHoliday(holiday);
      const sharedCount = grouped ? holiday.sharedCount : 1;
      const firstBranchName = grouped ? holiday.branches[0]?.name : holiday.branch?.name;

      let displayTitle = holiday.name;

      if (isGeneralView && sharedCount === 1 && firstBranchName) {
        displayTitle = `${holiday.name} (${firstBranchName})`;
      }

      if (holiday.isPartial) {
        displayTitle = `🌓 ${displayTitle}`;
      }

      const c = HOLIDAY_COLORS[holiday.type];
      return {
        id: `holiday-${holiday.id}`,
        title: displayTitle,
        start: dateStr,
        end: addOneDay(dateStr),
        allDay: true,
        backgroundColor: isDark ? `color-mix(in srgb, ${c} 32%, #0f172a 68%)` : '#ffffff',
        borderColor: c,
        textColor: isDark ? '#e8eef4' : c,
        extendedProps: {
          isHoliday: true,
          holiday,
          holidayType: holiday.type,
          isGroupedHoliday: grouped,
          sharedCount,
        },
      };
    });
  }, [branchHolidays?.data, effectiveActiveBranchId, isDark]);

  /* type counts for legend badges */
  const typeCounts: Record<string, number> = {};
  schedules?.forEach((s) => {
    typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
  });

  const holidayTypeCounts = useMemo(() => {
    const counts: Partial<Record<BranchHoliday['type'], number>> = {};
    (branchHolidays?.data ?? []).forEach((holiday) => {
      counts[holiday.type] = (counts[holiday.type] ?? 0) + 1;
    });
    return counts;
  }, [branchHolidays?.data]);

  const toggleType = useCallback((type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    if (info.event.extendedProps.isHolidayBackground) return;

    const rect = info.el.getBoundingClientRect();
    const clientX = info.jsEvent.clientX > 0 ? info.jsEvent.clientX : rect.left + rect.width / 2;
    const clientY = info.jsEvent.clientY > 0 ? info.jsEvent.clientY : rect.top + rect.height / 2;

    const pageRect = pageContainerRef.current?.getBoundingClientRect();
    const x = pageRect ? clientX - pageRect.left : clientX;
    const y = pageRect ? clientY - pageRect.top : clientY;

    if (info.event.extendedProps.isHoliday) {
      const holiday = info.event.extendedProps.holiday as CalendarBranchHoliday | undefined;
      if (!holiday) return;

      setDetailItem({
        kind: 'holiday',
        holiday,
        branchName: isGroupedHoliday(holiday)
          ? holiday.branches.map((branch) => branch.name).join(', ')
          : branchNameById[holiday.branchId],
      });
      setDetailAnchor({ x, y });
      if (scheduleId) {
        navigate('/schedule', { replace: true });
      }
      return;
    }

    const clickedSchedule = info.event.extendedProps.schedule as Schedule | undefined;
    if (!clickedSchedule) return;

    setDetailItem({
      kind: 'schedule',
      schedule: clickedSchedule,
      branchName: clickedSchedule.branchId ? branchNameById[clickedSchedule.branchId] : undefined,
    });
    setDetailAnchor({ x, y });
    navigate(`/schedule/${clickedSchedule.id}`);
  }, [branchNameById, navigate, scheduleId]);

  const handleDateSelect = useCallback(
    (info: DateSelectArg) => {
      if (!canEdit) return;
      setDetailItem(null);
      setDetailAnchor(null);
      setSelectedSchedule(null);
      setDefaultStart(info.start);
      setDefaultEnd(info.end);
      setModalOpen(true);
      if (scheduleId) navigate('/schedule', { replace: true });
    },
    [canEdit, navigate, scheduleId],
  );

  const closeDetailPopover = useCallback(() => {
    if (scheduleId) {
      skipNextRouteDetailSyncRef.current = true;
    }
    setDetailItem(null);
    setDetailAnchor(null);
    if (scheduleId) {
      navigate('/schedule', { replace: true });
    }
  }, [navigate, scheduleId]);

  const handleEditDetail = useCallback(() => {
    if (!detailItem) return;

    if (detailItem.kind === 'schedule') {
      setSelectedSchedule(detailItem.schedule);
      setDefaultStart(undefined);
      setDefaultEnd(undefined);
      setModalOpen(true);
    } else if (isAdmin) {
      setHolidayEditTarget(detailItem.holiday);
    }

    setDetailItem(null);
    setDetailAnchor(null);
  }, [detailItem, isAdmin]);

  const handleDeleteDetail = useCallback(() => {
    if (!detailItem) return;
    setDetailItem(null);
    setDetailAnchor(null);
    setDeleteTarget(detailItem);
  }, [detailItem]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    if (deleteTarget.kind === 'schedule') {
      deleteScheduleMutation.mutate(deleteTarget.schedule);
      return;
    }

    deleteHolidayMutation.mutate(deleteTarget.holiday);
  }, [deleteTarget, deleteScheduleMutation, deleteHolidayMutation]);

  const handleAssigneeClick = useCallback((userProfile: ScheduleAssignment['user']) => {
    setSelectedProfileUser(userProfile);
    setProfileModalOpen(true);
    setDetailItem(null);
    setDetailAnchor(null);
    if (scheduleId) {
      navigate('/schedule', { replace: true });
    }
  }, [navigate, scheduleId]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedSchedule(null);
    setDefaultStart(undefined);
    setDefaultEnd(undefined);
    if (scheduleId) {
      navigate('/schedule', { replace: true });
    }
  }, [navigate, scheduleId]);

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

  useEffect(() => {
    reflowCalendar();

    const delayA = window.setTimeout(reflowCalendar, 120);
    const delayB = window.setTimeout(reflowCalendar, 340);

    return () => {
      window.clearTimeout(delayA);
      window.clearTimeout(delayB);
    };
  }, [sidebarCollapsed, reflowCalendar]);

  return (
    <div ref={pageContainerRef} className="relative space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Planificación de Turnos</h1>
          <p className="text-sm text-theme-muted mt-0.5">
            Gestiona los turnos y asignaciones del personal
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => {
                const start = new Date();
                start.setMinutes(0, 0, 0);
                start.setHours(start.getHours() + 1);
                const end = new Date(start);
                end.setHours(end.getHours() + 8);
                setDetailItem(null);
                setDetailAnchor(null);
                setSelectedSchedule(null);
                setDefaultStart(start);
                setDefaultEnd(end);
                setModalOpen(true);
              }}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Turno
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

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-theme-color lg:border-b-0 lg:border-r">
            <div className="px-5 py-4 border-b border-theme-color">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
                <CalendarDays className="h-3.5 w-3.5" />
                Sucursal y festivos
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-medium">
                {canViewAllBranches ? (
                  shouldUseBranchDropdown ? (
                    <div className="w-full space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
                        Selección de sucursal
                      </label>
                      <select
                        value={activeBranchId}
                        onChange={(event) => setActiveBranchId(event.target.value)}
                        className="input-field text-sm w-full"
                      >
                        <option value="">Todas las sucursales</option>
                        {availableBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {`${branch.name} (${branch.code})${branch.isActive ? '' : ' - Inactiva'}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setActiveBranchId('')}
                        className="w-full text-left px-3 py-2 rounded-lg border transition-colors"
                        style={
                          !effectiveActiveBranchId
                            ? {
                              backgroundColor: 'var(--theme-sidebar-active-bg)',
                              color: 'var(--theme-sidebar-active-text)',
                              borderColor: 'var(--theme-sidebar-active-bg)',
                            }
                            : {
                              backgroundColor: 'var(--theme-surface)',
                              color: 'var(--theme-text-muted)',
                              borderColor: 'var(--theme-border-color)',
                            }
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">Todas las sucursales</span>
                        </div>
                      </button>

                      {availableBranches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => setActiveBranchId(branch.id)}
                          className="w-full text-left px-3 py-2 rounded-lg border transition-colors"
                          style={
                            effectiveActiveBranchId === branch.id
                              ? {
                                backgroundColor: 'var(--theme-sidebar-active-bg)',
                                color: 'var(--theme-sidebar-active-text)',
                                borderColor: 'var(--theme-sidebar-active-bg)',
                              }
                              : {
                                backgroundColor: 'var(--theme-surface)',
                                color: 'var(--theme-text-muted)',
                                borderColor: 'var(--theme-border-color)',
                              }
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{branch.name}</span>
                            {!branch.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white">Inactiva</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </>
                  )
                ) : (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    No tienes una sucursal asignada. Contacta con un administrador.
                  </p>
                )}
              </div>

              {effectiveActiveBranchId && (
                <div className="mt-3 pt-3 border-t border-theme-color flex flex-col gap-1.5">
                  {(Object.keys(HOLIDAY_TYPE_LABELS) as BranchHoliday['type'][]).map((type) => (
                    <span key={type} className="flex items-center gap-1.5 text-[10px] text-theme-muted">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm opacity-70"
                        style={{ backgroundColor: HOLIDAY_COLORS[type] }}
                      />
                      <span className="text-theme-muted">
                        {HOLIDAY_TYPE_LABELS[type]}
                        {holidayTypeCounts[type] ? ` (${holidayTypeCounts[type]})` : ''}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <TypeLegend hidden={hiddenTypes} onToggle={toggleType} counts={typeCounts} />
          </aside>

          {/* Calendar */}
          <div className="p-6">
            <div ref={calendarContainerRef} className="fc-google-like">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView={navState?.initialView || 'dayGridMonth'}
                initialDate={navState?.initialDate ? new Date(navState.initialDate) : undefined}
                locale={esLocale}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                }}
                buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' }}
                events={[...scheduleEvents, ...holidayInteractiveEvents, ...holidayBackgroundEvents]}
                selectable={canEdit}
                selectMirror
                dayMaxEvents
                dayMaxEventRows
                moreLinkClick="popover"
                navLinks
                stickyHeaderDates
                weekends
                select={handleDateSelect}
                eventClick={handleEventClick}
                eventDidMount={(info) => {
                  if (info.event.extendedProps.isHolidayBackground) return;
                  if (info.event.extendedProps.isHoliday) return;
                  info.el.setAttribute('data-schedule-id', info.event.id);
                }}
                eventWillUnmount={(info) => {
                  if (info.event.extendedProps.isHolidayBackground) return;
                  if (info.event.extendedProps.isHoliday) return;
                  info.el.removeAttribute('data-schedule-id');
                }}
                eventClassNames={(arg) => {
                  if (arg.event.extendedProps.isHolidayBackground) return ['fc-holiday-background-event'];
                  if (arg.event.extendedProps.isHoliday) return ['fc-holiday-event'];
                  return [];
                }}
                eventContent={(info) => <EventContent info={info} />}
                eventOrder="start,-duration,allDay,title"
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                displayEventTime
                displayEventEnd
                height="auto"
                expandRows
                views={{
                  timeGridWeek: {
                    slotMinTime: '01:00:00',
                    slotMaxTime: '24:00:00',
                  },
                  timeGridDay: {
                    slotMinTime: '01:00:00',
                    slotMaxTime: '24:00:00',
                  },
                }}
                datesSet={(info) => {
                  setActiveView(info.view.type);
                  setDateRange({ from: info.start, to: info.end });
                }}
                eventDisplay="block"
                nowIndicator
                eventOverlap
                slotEventOverlap
                eventMaxStack={4}
                /* Time grid settings */
                slotDuration="01:00:00"
                slotLabelInterval="01:00"
                slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                eventMinHeight={28}
                /* Week starts Monday */
                firstDay={1}
              />
            </div>
          </div>
        </div>
      </div>

      <ShiftModal
        open={modalOpen}
        onClose={closeModal}
        schedule={selectedSchedule}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        defaultBranchId={effectiveActiveBranchId}
      />

      <CalendarDetailPopover
        open={Boolean(detailItem)}
        item={detailItem}
        anchor={detailAnchor}
        canEditSchedule={canEdit}
        canEditHoliday={isAdmin}
        onClose={closeDetailPopover}
        onEdit={handleEditDetail}
        onDelete={handleDeleteDetail}
        onAssigneeClick={handleAssigneeClick}
      />

      <HolidayEditModal
        key={holidayEditTarget?.id ?? 'holiday-edit-empty'}
        open={Boolean(holidayEditTarget)}
        holiday={holidayEditTarget}
        branchName={holidayEditTarget ? branchNameById[holidayEditTarget.branchId] : undefined}
        onClose={() => setHolidayEditTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'holiday' ? 'Eliminar festivo' : 'Eliminar turno'}
        description={
          deleteTarget?.kind === 'holiday'
            ? `¿Quieres eliminar "${deleteTarget.holiday.name}"?`
            : `¿Quieres eliminar "${deleteTarget?.kind === 'schedule' ? deleteTarget.schedule.title : ''}"?`
        }
        confirmLabel="Eliminar"
        loading={deleteScheduleMutation.isPending || deleteHolidayMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <UserProfileModal
        open={profileModalOpen}
        user={selectedProfileUser}
        onClose={() => {
          setProfileModalOpen(false);
          setSelectedProfileUser(null);
        }}
      />
    </div>
  );
}
