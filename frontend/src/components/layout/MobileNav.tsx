import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/schedule', icon: Calendar, label: 'Guardias' },
  { to: '/admin/users', icon: Users, label: 'Usuarios', adminOnly: true },
  { to: '/profile', icon: Settings, label: 'Perfil' },
];

export function MobileNav() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-navy-100 z-30 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.filter((i) => !i.adminOnly || isAdmin).map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-navy-600' : 'text-navy-300'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'text-gold-500')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
