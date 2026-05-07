import type { EventContentArg } from '@fullcalendar/core';
import { format } from 'date-fns';
import { useUIStore } from '@/store/uiStore';
import { isDarkThemePreset } from '@/config/theme';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';
import type { BranchHoliday, Schedule } from '@/types';
import type { FullScheduleType } from './scheduleTypesApi';

const HOLIDAY_COLORS: Record<BranchHoliday['type'], string> = {
  nacional: '#dc2626', autonomica: '#ea580c', local: '#d97706',
  mejora: '#65a30d', regional: '#0ea5e9', company: '#7c3aed',
};

function useGetTypeInfo() {
  const { types: scheduleTypes } = useScheduleTypes();
  return (type: string) => scheduleTypes.find((t: FullScheduleType) => t.value === type) ?? scheduleTypes[0];
}

/* ─── month-view event pill ─────────────────────────────────────── */
export function MonthEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  // const getTypeInfo = useGetTypeInfo(); // Removed unused variable
  // const _typeInfo = getTypeInfo(event.extendedProps.type as string); // Removed unused variable
  return (
    <div className="google-month-event">
      {event.start && <span className="google-month-event-time">{format(event.start, 'HH:mm')}</span>}
      <span className="google-month-event-title">{event.title}</span>
      {event.extendedProps.isLastMinute && <span className="google-month-event-flag">!</span>}
    </div>
  );
}

/* ─── week/day-view event card ──────────────────────────────────── */
export function TimeGridEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  const schedule = event.extendedProps.schedule as Schedule | undefined;
  const timeText = schedule?.startDatetime && schedule?.endDatetime
    ? `${format(new Date(schedule.startDatetime), 'HH:mm')} - ${format(new Date(schedule.endDatetime), 'HH:mm')}`
    : info.timeText;
  const assigneeText = schedule?.assignments?.map((a) => a.user.name.split(' ')[0]).slice(0, 2).join(', ') ?? '';

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
export function ListEventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  const schedule = event.extendedProps.schedule as Schedule;
  const timeText = schedule?.startDatetime && schedule?.endDatetime
    ? `${format(new Date(schedule.startDatetime), 'HH:mm')} - ${format(new Date(schedule.endDatetime), 'HH:mm')}`
    : info.timeText;
  const getTypeInfo = useGetTypeInfo();
  const typeInfo = getTypeInfo(schedule?.type ?? '');

  return (
    <div className="google-list-event">
      <span className="google-list-event-dot" style={{ backgroundColor: typeInfo.color }} />
      <div className="google-list-event-main">
        <span className="google-list-event-title">{event.title}</span>
        <span className="google-list-event-time">{timeText}</span>
      </div>
      {event.extendedProps.isLastMinute && <span className="google-list-event-urgent">Urgente</span>}
    </div>
  );
}

/* ─── holiday event ─────────────────────────────────────────────── */
export function HolidayEventContent({ info }: { info: EventContentArg }) {
  const isDark = isDarkThemePreset(useUIStore((s) => s.themePresetHoverPreview ?? s.themeDraft ?? s.themeConfig));
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
export function EventContent({ info }: { info: EventContentArg }) {
  if (info.event.extendedProps.isHoliday) return <HolidayEventContent info={info} />;
  const viewType = info.view.type;
  if (viewType.startsWith('timeGrid')) return <TimeGridEventContent info={info} />;
  if (viewType.startsWith('list')) return <ListEventContent info={info} />;
  return <MonthEventContent info={info} />;
}
