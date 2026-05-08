import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { useAuthStore } from '@/store/authStore';
import api from '@/config/api';
import { cn } from '@/lib/utils';
import { isDarkThemePreset } from '@/config/theme';
import { useUIStore } from '@/store/uiStore';
import type { WeekScheduleItem, WeekScheduleAssignee } from '@/types';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { TeamWeeklySummaryCard } from '@/components/schedule/TeamWeeklySummaryCard';
import { MyWeeklySummaryCard } from '@/components/schedule/MyWeeklySummaryCard';
import { WeekSchedulesWidget } from '@/components/schedule/WeekSchedulesWidget';
import { RecentActivityWidget } from '@/components/audit/RecentActivityWidget';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<WeekScheduleAssignee | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<'general' | 'schedules' | 'security'>('general');

  const now = new Date();
  const isoWeek = getISOWeek(now);
  const isoWeekYear = getISOWeekYear(now);

  const { data: weekSchedules, isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules', 'week', isoWeekYear, isoWeek],
    queryFn: () =>
      api
        .get<{ data: { items: WeekScheduleItem[] } }>(`/schedules/week/${isoWeekYear}/${isoWeek}`)
        .then((r) => r.data.data.items),
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 'count', 'active'],
    queryFn: () => api.get('/users?limit=1&status=active').then((r) => r.data.pagination?.total || 0),
    enabled: user?.role?.name === 'admin' || user?.role?.name === 'general_manager' || user?.role?.name === 'department_manager',
  });

  const mySchedules = weekSchedules?.filter((s) =>
    s.assignees?.some((a) => a.id === user?.id)
  ) || [];

  const lastMinuteCount = weekSchedules?.filter((s) => s.isLastMinute).length || 0;

  const isDark = isDarkThemePreset(
    useUIStore(
      (s) => s.themePresetHoverPreview ?? s.themeDraft ?? s.themeConfig,
    ),
  );
  const statCornerLinkClass = cn(
    'absolute bottom-4 right-4 p-1.5 rounded-lg transition-all duration-200 z-20 cursor-pointer transform group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-md',
    isDark
      ? 'bg-navy-100/30 hover:bg-navy-100/50 text-navy-300 border border-navy-200/30 shadow-none'
      : 'bg-white/90 hover:bg-white text-green-600 shadow-sm border border-green-200',
  );

  const navigateToScheduleWeek = () => {
    navigate('/schedule', { state: { initialView: 'timeGridWeek', initialDate: now.toISOString() } });
  };

  const openMyProfileSchedules = () => {
    setSelectedProfileUser(user!);
    setProfileModalTab('schedules');
    setProfileModalOpen(true);
  };

  const navigateToActiveUsers = () => {
    navigate('/admin/users', { state: { status: 'active' } });
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    onActivate: () => void,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  };

  const handleOpenProfile = (assignee: WeekScheduleAssignee) => {
    setSelectedProfileUser(assignee);
    setProfileModalOpen(true);
  };

  const isAdmin = user?.role?.name === 'admin';

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="min-h-14">
        <h1 className="text-2xl font-bold text-theme-primary">
          Bienvenido, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-theme-muted text-sm mt-1.5 capitalize">
          {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          className="relative group flex flex-col h-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
          role="button"
          tabIndex={0}
          aria-label="Ver turnos de esta semana en calendario"
          onClick={navigateToScheduleWeek}
          onKeyDown={(event) => handleCardKeyDown(event, navigateToScheduleWeek)}
        >
          <StatCard
            title="Turnos de esta semana"
            value={loadingSchedules ? '—' : (weekSchedules?.length || 0)}
            icon={Calendar}
            color="navy"
            className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-navy-200"
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

        <div
          className="relative group flex flex-col h-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
          role="button"
          tabIndex={0}
          aria-label="Ver mis turnos"
          onClick={openMyProfileSchedules}
          onKeyDown={(event) => handleCardKeyDown(event, openMyProfileSchedules)}
        >
          <StatCard
            title="Mis turnos"
            value={loadingSchedules ? '—' : mySchedules.length}
            icon={Shield}
            color="gold"
            className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-navy-200"
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

        {(user?.role?.name === 'admin' || user?.role?.name === 'general_manager' || user?.role?.name === 'department_manager') && (
          <div
            className="relative group flex flex-col h-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
            role="button"
            tabIndex={0}
            aria-label="Ver gestión de usuarios activos"
            onClick={navigateToActiveUsers}
            onKeyDown={(event) => handleCardKeyDown(event, navigateToActiveUsers)}
          >
            <StatCard
              title="Usuarios activos"
              value={loadingUsers ? '—' : (usersData || 0)}
              icon={Users}
              color="green"
              className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-navy-200"
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

      {/* Main grid: Week schedules + Activity log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <WeekSchedulesWidget onOpenProfile={handleOpenProfile} />
        </div>

        {isAdmin && (
          <div className="lg:col-span-1">
            <RecentActivityWidget />
          </div>
        )}
      </div>

      {/* My weekly summary (all users) */}
      <MyWeeklySummaryCard />

      {/* Team weekly summary (admin/manager view) */}
      {(user?.role?.name === 'admin' || user?.role?.name === 'general_manager' || user?.role?.name === 'department_manager') && (
        <TeamWeeklySummaryCard />
      )}

      <UserProfileModal
        open={profileModalOpen}
        user={selectedProfileUser}
        onClose={() => setProfileModalOpen(false)}
        initialTab={profileModalTab}
        setTab={setProfileModalTab}
      />
    </div>
  );
}
