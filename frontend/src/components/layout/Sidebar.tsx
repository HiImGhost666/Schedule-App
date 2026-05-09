import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Webhook, Bell, ClipboardList,
  LogOut, ChevronLeft, ChevronRight, User, Palette, Building2, CalendarDays, Layers, Clock
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/types';
import { useUIStore } from '@/store/uiStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import api from '@/config/api';
import toast from 'react-hot-toast';
import LogoClaroSidebar from '@/assets/Logo_Claro.webp';
import LogoOscuroSidebar from '@/assets/Logo_Oscuro.webp';
import LogotipoIA from '@/assets/Logotipo_IA.webp';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/schedule', icon: Calendar, label: 'Turnos' },
  { to: '/vacaciones', icon: CalendarDays, label: 'Vacaciones' },
];

const adminItems = [
  { to: '/admin/users', icon: Users, label: 'Usuarios' },
  { to: '/admin/event-types', icon: CalendarDays, label: 'Tipos de Evento' },
  { to: '/admin/branches', icon: Building2, label: 'Sucursales' },
  { to: '/admin/departments', icon: Layers, label: 'Departamentos' },
  { to: '/admin/holidays', icon: CalendarDays, label: 'Festivos' },
  { to: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/admin/notifications', icon: Bell, label: 'Notificaciones' },
  { to: '/admin/audit', icon: ClipboardList, label: 'Auditoría' },
  { to: '/admin/theme', icon: Palette, label: 'Apariencia' },
  { to: '/admin/shift-presets', icon: Clock, label: 'Turnos Predefinidos' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, themeConfig, themeDraft, themePresetHoverPreview } = useUIStore();
  const navigate = useNavigate();
  const activeTheme = themePresetHoverPreview ?? themeDraft ?? themeConfig;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: useAuthStore.getState().refreshToken });
    } catch { /* ignore */ }
    logout();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  const isAdmin = user?.role?.name === 'admin';
  const isAdminOrManager = user?.role?.name === 'admin' || user?.role?.name === 'general_manager' || user?.role?.name === 'department_manager';


  const expandedLogo =
    activeTheme.overrides.sidebar.logoVariant === 'logo_oscuro' ? LogoOscuroSidebar : LogoClaroSidebar;

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 transition-all duration-300 z-30',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
      style={{
        backgroundColor: 'var(--theme-sidebar-bg)',
        color: 'var(--theme-sidebar-text)',
      }}
    >
      {/* Logo */}
      <div
        className={cn(
          'border-b border-navy-700/50 flex items-center justify-center',
          sidebarCollapsed ? 'h-16 px-2' : 'px-5 py-5'
        )}
      >
        {sidebarCollapsed ? (
          /* Collapsed: show small square logo, fully contained */
          <img
            src={LogotipoIA}
            alt="Logo"
            width={36}
            height={36}
            decoding="async"
            className="h-9 w-9 object-contain select-none rounded"
            draggable={false}
          />
        ) : (
          /* Expanded: show full logo */
          <img
            src={expandedLogo}
            alt="Logo Laberit"
            width={420}
            height={141}
            fetchPriority="high"
            className="h-16 w-full max-w-52.5 object-contain select-none"
            draggable={false}
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                sidebarCollapsed && 'justify-center',
                isActive
                  ? 'text-white'
                  : 'text-theme-sidebar hover:text-white'
              )
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--theme-sidebar-active-bg)' : 'transparent',
              color: isActive ? 'var(--theme-sidebar-active-text)' : undefined,
            })}
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {isAdminOrManager && (
          <>
            {!sidebarCollapsed && (
              <p className="text-xs font-semibold text-theme-sidebar uppercase tracking-wider px-3 pt-5 pb-2">
                Administración
              </p>
            )}
            {sidebarCollapsed && (
              <div className="my-2 border-t border-navy-700/50" />
            )}
            {(isAdmin 
              ? adminItems 
              : adminItems.filter((i) => ['/admin/users', '/admin/event-types'].includes(i.to))
            ).map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                      sidebarCollapsed && 'justify-center',
                      isActive
                        ? 'text-white'
                        : 'text-theme-sidebar hover:text-white'
                    )
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--theme-sidebar-active-bg)' : 'transparent',
                    color: isActive ? 'var(--theme-sidebar-active-text)' : undefined,
                  })}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{label}</span>}
                </NavLink>
              )
            )}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-navy-700 p-4 space-y-1.5">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center py-2.5 rounded-lg text-sm transition-all',
              sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
              isActive ? 'bg-navy-600' : 'hover:bg-navy-700/60'
            )
          }
          title={sidebarCollapsed ? 'Mi Perfil' : undefined}
        >
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: getAvatarColor(user?.name || '') }}
          >
            {getInitials(user?.name || 'U')}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-theme-sidebar truncate">{user?.department?.name || (user?.role?.name ? ROLE_LABELS[user.role.name] : '')}</p>
            </div>
          )}
          {!sidebarCollapsed && <User className="h-3.5 w-3.5 text-theme-sidebar ml-auto shrink-0" />}
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-theme-sidebar hover:bg-navy-700 hover:text-white transition-all',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          {!sidebarCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-navy-600 text-white rounded-full p-1 shadow-lg transition-colors z-10"
        style={{ backgroundColor: 'var(--theme-sidebar-active-bg)' }}
        aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3" aria-hidden />
        ) : (
          <ChevronLeft className="h-3 w-3" aria-hidden />
        )}
      </button>
    </aside>
  );
}
