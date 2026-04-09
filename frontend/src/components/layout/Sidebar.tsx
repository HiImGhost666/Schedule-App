import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Webhook, Bell, ClipboardList,
  LogOut, ChevronLeft, ChevronRight, Shield, User
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import api from '@/config/api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/schedule', icon: Calendar, label: 'Guardias' },
];

const adminItems = [
  { to: '/admin/users', icon: Users, label: 'Usuarios' },
  { to: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/admin/notifications', icon: Bell, label: 'Notificaciones' },
  { to: '/admin/audit', icon: ClipboardList, label: 'Auditoría' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

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

  return (
    <aside
      className={cn(
        'flex flex-col bg-navy-800 text-white h-screen sticky top-0 transition-all duration-300 z-30',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-navy-700">
        <div className="flex-shrink-0 h-8 w-8 bg-gold-400 rounded-lg flex items-center justify-center">
          <Shield className="h-4 w-4 text-navy-900" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">Guardias</p>
            <p className="text-xs text-navy-300 truncate">Sistema Corporativo</p>
          </div>
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
                isActive
                  ? 'bg-gold-400 text-navy-900'
                  : 'text-navy-200 hover:bg-navy-700 hover:text-white'
              )
            }
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
                        ? 'bg-gold-400 text-navy-900'
                        : 'text-navy-200 hover:bg-navy-700 hover:text-white'
                    )
                  }
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
              isActive ? 'bg-navy-600' : 'hover:bg-navy-700'
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
        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-navy-600 hover:bg-navy-500 text-white rounded-full p-1 shadow-lg transition-colors z-10"
      >
        {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
