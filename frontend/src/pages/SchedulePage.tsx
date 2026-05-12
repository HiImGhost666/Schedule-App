import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { Plus, Building2 } from 'lucide-react';
import { ScheduleSidebar } from '@/components/schedule/ScheduleSidebar';
import { EventContent } from '@/components/schedule/CalendarEventContent';
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
import { ScheduleSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import api from '@/config/api';
import type {
  Branch,
  BranchHoliday,
  CalendarBranchHoliday,
  Schedule,
  ScheduleAssignment,
  WeekScheduleItem,
  ScheduleType,
  Department,
} from '@/types';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { getApiErrorMessage } from '@/lib/apiError';
import { getEffectiveBranchId } from '@/lib/branchSelection';
import { isDarkThemePreset } from '@/config/theme';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';

const HOLIDAY_COLORS: Record<BranchHoliday['type'], string> = {
  nacional: '#dc2626',
  autonomica: '#ea580c',
  local: '#d97706',
  mejora: '#65a30d',
  regional: '#0ea5e9',
  company: '#7c3aed',
};

/* ─── helpers ──────────────────────────────────────────────────── */

function getTypeInfo(type: string, scheduleTypes: ScheduleType[]) {
  return scheduleTypes.find((t) => t.value === type) ?? scheduleTypes[0] ?? { 
    value: type, 
    label: type, 
    color: '#1e3a5f' 
  };
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
    scheduleTypeId: item.scheduleTypeId,
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
  const isAdmin = user?.role?.name === 'admin';
  const isGeneralManager = user?.role?.name === 'general_manager';
  const isDepartmentManager = user?.role?.name === 'department_manager';
  const isEmployee = !isAdmin && !isGeneralManager && !isDepartmentManager;
  // Solo admin puede ver y seleccionar todas las sucursales.
  // Los demás roles están restringidos a su sucursal asignada.
  const canViewAllBranches = isAdmin;
  const canEdit = isAdmin || isGeneralManager || isDepartmentManager;

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
  const [pendingDateSelect, setPendingDateSelect] = useState<DateSelectArg | null>(null);
  const [holidayWarningOpen, setHolidayWarningOpen] = useState(false);
  const [holidayWarningNames, setHolidayWarningNames] = useState<string[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<ScheduleAssignment['user'] | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('');
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
    queryKey: ['branches', 'schedule-page', user?.id, user?.role?.name],
    queryFn: () => api.get('/branches', { params: { includeInactive: true } }).then((r) => r.data),
  });

  const effectiveActiveBranchId = getEffectiveBranchId({
    branches: branches?.data,
    selectedBranchId: canViewAllBranches ? activeBranchId : undefined,
    assignedBranchId: canViewAllBranches ? undefined : (user?.branchId ?? undefined),
    fallbackStrategy: 'none',
  });

  const { data: departments } = useQuery<{ data: Department[] }>({
    queryKey: ['departments', 'schedule-page', effectiveActiveBranchId],
    queryFn: () =>
      api
        .get('/departments', {
          params: { includeInactive: false, branchId: effectiveActiveBranchId || undefined },
        })
        .then((r) => r.data),
  });

  const availableBranches = useMemo(() => branches?.data ?? [], [branches?.data]);
  const branchNameById = useMemo(
    () => Object.fromEntries(availableBranches.map((branch) => [branch.id, branch.name])),
    [availableBranches],
  );
  const branchTimezoneById = useMemo(
    () => Object.fromEntries(availableBranches.map((branch) => [branch.id, branch.timezone])),
    [availableBranches],
  );
  // Resolver filterUserId: 'me' → user.id real
  const resolvedFilterUserId = filterUserId === 'me' ? (user?.id ?? '') : filterUserId;

  const { data: schedules, isLoading } = useQuery({
    queryKey: [
      'schedules',
      effectiveActiveBranchId || 'all',
      selectedDeptId || 'all',
      resolvedFilterUserId || 'all',
      shouldUseWeekEndpoint ? 'week-view' : 'month-view',
      shouldUseWeekEndpoint ? `${isoWeekYear}-${isoWeek}` : format(dateRange.from, 'yyyy-MM'),
    ],
    queryFn: () => {
      if (shouldUseWeekEndpoint) {
        const weekParams: Record<string, string> = {};
        if (effectiveActiveBranchId) weekParams.branchId = effectiveActiveBranchId;
        if (selectedDeptId) weekParams.departmentId = selectedDeptId;
        if (resolvedFilterUserId) weekParams.userId = resolvedFilterUserId;
        return api
          .get<{ data: { items: WeekScheduleItem[] } }>(`/schedules/week/${isoWeekYear}/${isoWeek}`, {
            params: weekParams,
          })
          .then((r) => r.data.data.items.map(mapWeekItemToSchedule));
      }

      return api
        .get<{ data: Schedule[] }>('/schedules', {
          params: {
            ...(effectiveActiveBranchId ? { branchId: effectiveActiveBranchId } : {}),
            ...(resolvedFilterUserId ? { userId: resolvedFilterUserId } : {}),
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

  const { types: scheduleTypes = [] } = useScheduleTypes();

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
  const scheduleEvents = useMemo(() => {
    if (!schedules) return [];

    return schedules
      .filter((s) => {
        // [CA-1] Filtrar schedules antiguos con type='vacaciones' (ahora son VacationRequest)
        if (s.type === 'vacaciones') return false;
        if (hiddenTypes.has(s.type)) return false;
        if (selectedDeptId) {
          return s.assignments.some((a) => a.user.department?.id === selectedDeptId);
        }
        return true;
      })
      .map((s) => {
        const { color } = getTypeInfo(s.type, scheduleTypes);
        const branchTimezone = s.branchId ? branchTimezoneById[s.branchId] : undefined;
        return {
          id: s.id,
          title: s.title,
          start: s.startDatetime,
          end: normalizeWeekDayEnd(s.startDatetime, s.endDatetime),
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: { schedule: s, isLastMinute: s.isLastMinute, branchTimezone },
        };
      });
  }, [schedules, hiddenTypes, selectedDeptId, scheduleTypes, normalizeWeekDayEnd, branchTimezoneById]);

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

  const handleBranchChange = useCallback((branchId: string) => {
    setActiveBranchId(branchId);
    setSelectedDeptId('');
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

      // Verificar si la fecha seleccionada coincide con algún festivo
      const selectedDateStr = format(info.start, 'yyyy-MM-dd');
      const holidaysOnDate = (branchHolidays?.data ?? []).filter((h) => {
        const holidayDateStr = toLocalDateOnly(h.date);
        return holidayDateStr === selectedDateStr;
      });

      if (holidaysOnDate.length > 0) {
        setPendingDateSelect(info);
        setHolidayWarningNames(holidaysOnDate.map((h) => h.name));
        setHolidayWarningOpen(true);
        return;
      }

      setDetailItem(null);
      setDetailAnchor(null);
      setSelectedSchedule(null);
      setDefaultStart(info.start);
      setDefaultEnd(info.end);
      setModalOpen(true);
      if (scheduleId) navigate('/schedule', { replace: true });
    },
    [canEdit, navigate, scheduleId, branchHolidays],
  );

  const handleConfirmHolidaySchedule = useCallback(() => {
    setHolidayWarningOpen(false);
    if (!pendingDateSelect) return;
    setDetailItem(null);
    setDetailAnchor(null);
    setSelectedSchedule(null);
    setDefaultStart(pendingDateSelect.start);
    setDefaultEnd(pendingDateSelect.end);
    setModalOpen(true);
    setPendingDateSelect(null);
    if (scheduleId) navigate('/schedule', { replace: true });
  }, [pendingDateSelect, navigate, scheduleId]);

  const handleCancelHolidaySchedule = useCallback(() => {
    setHolidayWarningOpen(false);
    setPendingDateSelect(null);
  }, []);

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

      {/* Employee sin sucursal asignada */}
      {isEmployee && !user?.branchId ? (
        <div className="card p-6">
          <EmptyState
            icon={Building2}
            title="Sin sucursal asignada"
            description="No tienes una sucursal asignada. Contacta con tu administrador para que te asigne a una sucursal."
          />
        </div>
      ) : (
      <>
      <div className="card relative overflow-hidden">
        {isLoading && !schedules && (
          <div className="p-6">
            <ScheduleSkeleton />
          </div>
        )}

        <div className={isLoading && !schedules ? 'hidden' : 'grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]'}>
          <div className="flex flex-col border-r border-theme-color bg-theme-surface/5">
            <ScheduleSidebar
              branches={availableBranches}
              activeBranchId={activeBranchId}
              effectiveActiveBranchId={effectiveActiveBranchId}
              canViewAllBranches={canViewAllBranches}
              onBranchChange={handleBranchChange}
              departments={departments?.data}
              selectedDeptId={selectedDeptId}
              onDepartmentChange={setSelectedDeptId}
              hiddenTypes={hiddenTypes}
              onToggleType={toggleType}
              typeCounts={typeCounts}
              holidayTypeCounts={holidayTypeCounts}
              scheduleTypes={scheduleTypes}
              isEmployee={isEmployee}
              filterUserId={filterUserId}
              onFilterUserChange={setFilterUserId}
            />
          </div>

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
                dayMaxEvents={4}
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

      <ConfirmDialog
        open={holidayWarningOpen}
        title="Día festivo"
        description={`La fecha seleccionada coincide con ${holidayWarningNames.length > 1 ? 'los siguientes festivos' : 'un festivo'}: ${holidayWarningNames.join(', ')}. ¿Quieres crear el turno de todas formas?`}
        confirmLabel="Crear de todas formas"
        variant="warning"
        onConfirm={handleConfirmHolidaySchedule}
        onCancel={handleCancelHolidaySchedule}
      />

      <UserProfileModal
        open={profileModalOpen}
        user={selectedProfileUser}
        onClose={() => {
          setProfileModalOpen(false);
          setSelectedProfileUser(null);
        }}
      />
      </>
      )}
    </div>
  );
}
