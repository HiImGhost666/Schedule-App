import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';
import api from '@/config/api';
import { formatDateTime } from '@/lib/utils';
import { format, getISOWeek, getISOWeekYear, startOfWeek, endOfWeek } from 'date-fns';
import type { WeekScheduleItem, WeekScheduleAssignee, ScheduleType } from '@/types';

const ITEMS_PER_PAGE = 5;

function getTypeLabel(type: string, scheduleTypes: ScheduleType[]) {
  return scheduleTypes.find((t) => t.value === type)?.label || type;
}

function getTypeColor(type: string, scheduleTypes: ScheduleType[]) {
  return scheduleTypes.find((t) => t.value === type)?.color || '#1e3a5f';
}

interface WeekSchedulesWidgetProps {
  onOpenProfile: (user: WeekScheduleAssignee) => void;
}

/**
 * @description Widget de turnos de la semana con paginación inline y filtros rápidos.
 */
export function WeekSchedulesWidget({ onOpenProfile }: WeekSchedulesWidgetProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { types: scheduleTypes = [] } = useScheduleTypes();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const isoWeek = getISOWeek(now);
  const isoWeekYear = getISOWeekYear(now);

  const { data: weekSchedules, isLoading } = useQuery({
    queryKey: ['schedules', 'week', isoWeekYear, isoWeek],
    queryFn: () =>
      api
        .get<{ data: { items: WeekScheduleItem[] } }>(`/schedules/week/${isoWeekYear}/${isoWeek}`)
        .then((r) => r.data.data.items),
  });

  // --- Filtros ---
  const [filterType, setFilterType] = useState<string>('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  const filteredSchedules = useMemo(() => {
    if (!weekSchedules) return [];
    return weekSchedules.filter((s) => {
      if (filterType !== 'all' && s.type !== filterType) return false;
      if (onlyMine && !s.assignees.some((a) => a.id === user?.id)) return false;
      if (onlyUrgent && !s.isLastMinute) return false;
      return true;
    });
  }, [weekSchedules, filterType, onlyMine, onlyUrgent, user?.id]);

  // --- Paginación ---
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredSchedules.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Resetear página al cambiar filtros
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (value: T) => {
    setter(value);
    setPage(1);
  };

  // Tipos únicos para el filtro
  const uniqueTypes = useMemo(() => {
    if (!weekSchedules) return [];
    const seen = new Set<string>();
    return weekSchedules.filter((s) => {
      if (seen.has(s.type)) return false;
      seen.add(s.type);
      return true;
    });
  }, [weekSchedules]);

  return (
    <div className="card p-7 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-theme-primary flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gold-500" />
          Turnos de esta semana
        </h2>
        <span className="text-xs text-theme-muted">
          {format(weekStart, 'dd/MM')} — {format(weekEnd, 'dd/MM')}
        </span>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-navy-100">
        <Filter className="h-3.5 w-3.5 text-theme-muted" />

        <select
          value={filterType}
          onChange={(e) => handleFilterChange(setFilterType)(e.target.value)}
          className="text-xs px-2 py-1 rounded-lg border border-navy-200 bg-white text-navy-700 focus:outline-none focus:ring-1 focus:ring-navy-400"
        >
          <option value="all">Todos los tipos</option>
          {uniqueTypes.map((s) => (
            <option key={s.type} value={s.type}>
              {getTypeLabel(s.type, scheduleTypes)}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-theme-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => handleFilterChange(setOnlyMine)(e.target.checked)}
            className="rounded border-navy-300 text-navy-600 focus:ring-navy-400"
          />
          Solo mis turnos
        </label>

        <label className="flex items-center gap-1.5 text-xs text-theme-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyUrgent}
            onChange={(e) => handleFilterChange(setOnlyUrgent)(e.target.checked)}
            className="rounded border-navy-300 text-navy-600 focus:ring-navy-400"
          />
          Solo urgentes
        </label>

        <span className="text-xs text-theme-muted ml-auto">
          {filteredSchedules.length} turnos
        </span>
      </div>

      {/* Lista */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-theme-muted mx-auto mb-2" />
            <p className="text-sm text-theme-muted">
              {filterType !== 'all' || onlyMine || onlyUrgent
                ? 'No hay turnos que coincidan con los filtros'
                : 'No hay turnos programados esta semana'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedItems.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(`/schedule/${s.id}`, {
                    state: { initialView: 'dayGridMonth', initialDate: s.startDatetime },
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/schedule/${s.id}`, {
                      state: { initialView: 'dayGridMonth', initialDate: s.startDatetime },
                    });
                  }
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-navy-100 hover:border-navy-200 hover:shadow-sm transition-all cursor-pointer text-left w-full"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getTypeColor(s.type, scheduleTypes) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-theme-primary truncate">{s.title}</p>
                  <p className="text-xs text-theme-muted">
                    {formatDateTime(s.startDatetime)} — {format(new Date(s.endDatetime), 'HH:mm')}
                  </p>
                </div>
                <div className="flex -space-x-1 shrink-0">
                  {s.assignees.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      title={a.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile(a);
                      }}
                      className="h-6 w-6 rounded-full bg-navy-200 border-2 border-white flex items-center justify-center text-xs font-medium text-navy-600 cursor-pointer hover:bg-navy-300 transition-colors"
                    >
                      {a.name[0]}
                    </div>
                  ))}
                  {s.assignees.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-navy-100 border-2 border-white flex items-center justify-center text-xs text-navy-500">
                      +{s.assignees.length - 3}
                    </div>
                  )}
                </div>
                {s.isLastMinute && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                    Urgente
                  </span>
                )}
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0"
                  style={{ backgroundColor: getTypeColor(s.type, scheduleTypes) }}
                >
                  {getTypeLabel(s.type, scheduleTypes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-navy-100">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-navy-200 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-theme-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>

          <span className="text-xs text-theme-muted">
            Página {page} de {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-navy-200 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-theme-primary"
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
