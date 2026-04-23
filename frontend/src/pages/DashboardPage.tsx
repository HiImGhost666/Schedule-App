import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Shield, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { useAuthStore } from '@/store/authStore';
import api from '@/config/api';
import { cn, formatDateTime, formatRelative } from '@/lib/utils';
import { isDarkThemePreset } from '@/config/theme';
import { useUIStore } from '@/store/uiStore';
import type { Schedule, AuditLog, WeekScheduleItem, ScheduleAssignment } from '@/types';
import { format, getISOWeek, getISOWeekYear, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { SCHEDULE_TYPES } from '@/types';

const IRREVERSIBLE_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'CHANGE_PASSWORD',
  'RESET_PASSWORD',
  'FAILED_LOGIN_ATTEMPT',
  'ROLLBACK_PERFORMED',
];

function getTypeLabel(type: string) {
  return SCHEDULE_TYPES.find((t) => t.value === type)?.label || type;
}

function getTypeColor(type: string) {
  return SCHEDULE_TYPES.find((t) => t.value === type)?.color || '#1e3a5f';
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

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<ScheduleAssignment['user'] | null>(null);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const isoWeek = getISOWeek(now);
  const isoWeekYear = getISOWeekYear(now);

  const { data: weekSchedules, isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules', 'week', isoWeekYear, isoWeek],
    queryFn: () =>
      api
        .get<{ data: { items: WeekScheduleItem[] } }>(`/schedules/week/${isoWeekYear}/${isoWeek}`)
        .then((r) => r.data.data.items.map(mapWeekItemToSchedule)),
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 'count', 'active'],
    queryFn: () => api.get('/users?limit=1&status=active').then((r) => r.data.pagination?.total || 0),
    enabled: user?.role === 'admin' || user?.role === 'manager',
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: () => api.get<{ data: AuditLog[] }>('/audit?limit=5').then((r) => r.data.data),
    enabled: user?.role === 'admin',
  });

  const mySchedules = weekSchedules?.filter((s) =>
    s.assignments.some((a) => a.userId === user?.id)
  ) || [];

  const lastMinuteCount = weekSchedules?.filter((s) => s.isLastMinute).length || 0;

  const isDark = isDarkThemePreset(useUIStore((s) => s.themeDraft || s.themeConfig));
  const statCornerLinkClass = cn(
    'absolute bottom-4 right-4 p-1.5 rounded-lg transition-all z-20',
    isDark
      ? 'bg-navy-100/30 hover:bg-navy-100/50 text-navy-300 border border-navy-200/30 shadow-none'
      : 'bg-white/90 hover:bg-white text-green-600 shadow-sm border border-green-200',
  );

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header: altura mínima evita CLS al cargar la webfont */}
      <div className="min-h-[3.5rem]">
        <h1 className="text-2xl font-bold text-theme-primary">
          Bienvenido, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-theme-muted text-sm mt-1.5 capitalize">
          {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="relative group flex flex-col h-full">
          <StatCard
            title="Turnos de esta semana"
            value={loadingSchedules ? '—' : (weekSchedules?.length || 0)}
            icon={Calendar}
            color="navy"
            className="h-full"
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/schedule', { state: { initialView: 'timeGridWeek', initialDate: now.toISOString() } }); }}
            className={statCornerLinkClass}
            title="Ver en calendario (Vista semanal)"
            aria-label="Ver en calendario (Vista semanal)"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="relative group flex flex-col h-full">
          <StatCard
            title="Mis turnos"
            value={loadingSchedules ? '—' : mySchedules.length}
            icon={Shield}
            color="gold"
            className="h-full"
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/schedule', { state: { initialView: 'timeGridWeek', initialDate: now.toISOString() } }); }}
            className={statCornerLinkClass}
            title="Abrir calendario (Vista semanal)"
            aria-label="Abrir calendario, vista semanal"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="relative group flex flex-col h-full">
            <StatCard
              title="Usuarios activos"
              value={loadingUsers ? '—' : (usersData || 0)}
              icon={Users}
              color="green"
              className="h-full"
            />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/admin/users', { state: { status: 'active' } }); }}
              className={statCornerLinkClass}
              title="Ver gestión de usuarios"
              aria-label="Ver gestión de usuarios"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        <div className="relative group flex flex-col h-full">
          <StatCard
            title="Cambios urgentes"
            value={loadingSchedules ? '—' : lastMinuteCount}
            icon={AlertTriangle}
            color={lastMinuteCount > 0 ? 'purple' : 'navy'}
            className="h-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* This week schedule */}
        <div className="lg:col-span-2 card p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-theme-primary flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold-500" />
              Turnos de esta semana
            </h2>

            <span className="text-xs text-theme-muted">
              {format(weekStart, 'dd/MM')} — {format(weekEnd, 'dd/MM')}
            </span>
          </div>

          {loadingSchedules ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : weekSchedules?.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-theme-muted mx-auto mb-2" />
              <p className="text-sm text-theme-muted">No hay turnos programados esta semana</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weekSchedules?.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-5 py-4 rounded-xl border border-navy-100 hover:border-navy-200 hover:shadow-sm transition-all"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getTypeColor(s.type) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-theme-primary truncate">{s.title}</p>
                    <p className="text-xs text-theme-muted">
                      {formatDateTime(s.startDatetime)} — {format(new Date(s.endDatetime), 'HH:mm')}
                    </p>
                  </div>
                  <div className="flex -space-x-1 flex-shrink-0">
                    {s.assignments.slice(0, 3).map((a) => (
                      <div
                        key={a.userId}
                        title={a.user.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProfileUser(a.user);
                          setProfileModalOpen(true);
                        }}
                        className="h-6 w-6 rounded-full bg-navy-200 border-2 border-white flex items-center justify-center text-xs font-medium text-navy-600 cursor-pointer hover:bg-navy-300 transition-colors"
                      >
                        {a.user.name[0]}
                      </div>
                    ))}
                    {s.assignments.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-navy-100 border-2 border-white flex items-center justify-center text-xs text-navy-500">
                        +{s.assignments.length - 3}
                      </div>
                    )}
                  </div>
                  {s.isLastMinute && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                      Urgente
                    </span>
                  )}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0"
                    style={{ backgroundColor: getTypeColor(s.type) }}
                  >
                    {getTypeLabel(s.type)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity log */}
        {user?.role === 'admin' && (
          <div className="card p-7 min-h-[220px]">
            <h2 className="text-base font-semibold text-theme-primary flex items-center gap-2 mb-5">
              <Clock className="h-4 w-4 text-gold-500" />
              Actividad Reciente
            </h2>

            {!auditLogs ? (
              <LoadingSpinner size="sm" />
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-theme-muted">Sin actividad reciente</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex gap-3 cursor-pointer hover:bg-navy-100/80 p-2 -m-2 rounded-lg transition-colors group"
                    onClick={() => {
                      const isIrreversible = IRREVERSIBLE_ACTIONS.includes(log.action);
                      navigate('/admin/audit', { 
                        state: { 
                          selectedLogId: log.id,
                          activeTab: isIrreversible ? 'irreversible' : 'reversible'
                        } 
                      });
                    }}
                  >
                    <div className="h-2 w-2 rounded-full bg-gold-400 mt-1.5 flex-shrink-0 group-hover:scale-125 transition-all" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-theme-primary group-hover:text-navy-800 transition-colors">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-theme-muted mt-0.5">
                        {log.user?.name || 'Sistema'} · {formatRelative(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <UserProfileModal
        open={profileModalOpen}
        user={selectedProfileUser}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}