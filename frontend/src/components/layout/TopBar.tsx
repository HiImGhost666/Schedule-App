import { Menu, Bell } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/types';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);

  return (
    <header
      className="border-b border-navy-100 px-5 md:px-8 h-16 flex items-center justify-between sticky top-0 z-20 shadow-sm"
      style={{
        backgroundColor: 'var(--theme-topbar-bg)',
        color: 'var(--theme-topbar-text)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1.5 rounded-lg hover:bg-navy-50 text-navy-400"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && <h1 className="text-base font-semibold hidden md:block">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <button className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 relative">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 px-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-tight">{user?.name}</p>
            <p className="text-xs opacity-75">{ROLE_LABELS[user?.role || '']}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
