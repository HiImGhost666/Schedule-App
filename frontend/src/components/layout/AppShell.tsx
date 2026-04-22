import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { useAuthStore } from '@/store/authStore';
import { ForceChangePassword } from '../auth/ForceChangePassword';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/schedule': 'Planificación de Turnos',
  '/admin/users': 'Gestión de Usuarios',
  '/admin/branches': 'Sucursales',
  '/admin/holidays': 'Festivos',
  '/admin/webhooks': 'Webhooks de Microsoft Teams',
  '/admin/notifications': 'Notificaciones',
  '/admin/audit': 'Registro de Auditoría',
  '/admin/theme': 'Apariencia',
  '/profile': 'Mi Perfil',
};

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = location.pathname.startsWith('/schedule')
    ? pageTitles['/schedule']
    : pageTitles[location.pathname] || '';
  const user = useAuthStore((s) => s.user);
  const forcePasswordChange = user?.forcePasswordChange === true;

  if (forcePasswordChange) {
    return <ForceChangePassword />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-navy-50">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={title} />

        <main className="flex-1 overflow-y-auto p-6 md:p-9 pb-24 md:pb-9">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
