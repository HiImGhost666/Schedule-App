import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Webhook, Bell, ClipboardList,
  LogOut, ChevronLeft, ChevronRight, User, Palette
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import api from '@/config/api';
import toast from 'react-hot-toast';
import LogoClaro from '@/assets/Logo_Claro.png';
import LogoOscuro from '@/assets/Logo_Oscuro.png';
import LogotipoIA from '@/assets/Logotipo_IA.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/schedule', icon: Calendar, label: 'Guardias' },
];

const adminItems = [
  { to: '/admin/users', icon: Users, label: 'Usuarios' },
  { to: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/admin/notifications', icon: Bell, label: 'Notificaciones' },
  { to: '/admin/audit', icon: ClipboardList, label: 'Auditoría' },
  { to: '/admin/theme', icon: Palette, label: 'Tema Global' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, themeConfig, themeDraft } = useUIStore();
  const navigate = useNavigate();
  const activeTheme = themeDraft || themeConfig;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: useAuthStore.getState().refreshToken });
    } catch { /* ignore */ }
    logout();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  const isAdmin = user?.role === 'admin';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const expandedLogo = activeTheme.overrides.sidebar.logoVariant === 'logo_oscuro' ? LogoOscuro : LogoClaro;
  const sidebarLogo = sidebarCollapsed ? LogotipoIA : expandedLogo;

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
      <div className={cn('px-3 py-5 border-b border-navy-700/50', sidebarCollapsed ? 'flex justify-center' : 'px-5')}>
        <img
          src={sidebarLogo}
          alt="Logo Laberit"
          className={cn('object-contain select-none', sidebarCollapsed ? 'h-8 w-8' : 'h-16 w-full max-w-[210px]')}
          draggable={false}
        />
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
                isActive
                  ? 'text-white'
                  : 'text-navy-200 hover:text-white'
              )
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--theme-sidebar-active-bg)' : 'transparent',
              color: isActive ? 'var(--theme-sidebar-active-text)' : undefined,
            })}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {isAdminOrManager && (
          <>
            {!sidebarCollapsed && (
              <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider px-3 pt-5 pb-2">
                Administración
              </p>
            )}
            {(isAdmin ? adminItems : adminItems.filter((i) => i.to === '/admin/users')).map(
              ({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                      isActive
                          ? 'text-white'
                          : 'text-navy-200 hover:text-white'
                    )
                  }
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? 'var(--theme-sidebar-active-bg)' : 'transparent',
                      color: isActive ? 'var(--theme-sidebar-active-text)' : undefined,
                    })}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
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
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
              isActive ? 'bg-navy-600' : 'hover:bg-navy-700/60'
            )
          }
        >
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: getAvatarColor(user?.name || '') }}
          >
            {getInitials(user?.name || 'U')}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-navy-400 truncate">{user?.department || user?.role}</p>
            </div>
          )}
          {!sidebarCollapsed && <User className="h-3.5 w-3.5 text-navy-400 ml-auto flex-shrink-0" />}
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-navy-300 hover:bg-navy-700 hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-navy-600 text-white rounded-full p-1 shadow-lg transition-colors z-10"
        style={{ backgroundColor: 'var(--theme-sidebar-active-bg)' }}
      >
        {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
