import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/types';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {

  const user = useAuthStore((s) => s.user);

  return (
    <header
      className="border-b border-navy-100 px-5 md:px-8 h-16 flex items-center justify-between sticky top-0 z-20 shadow-sm"
      style={{
        backgroundColor: 'var(--theme-topbar-bg)',
        color: 'var(--theme-topbar-text)',
      }}
    >
        {title && <h1 className="text-base font-semibold hidden md:block">{title}</h1>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-1.5 rounded-lg hover:bg-navy-50 text-theme-muted relative"
          aria-label="Notificaciones (próximamente)"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex items-center gap-2 px-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-tight text-theme-primary">{user?.name}</p>
            <p className="text-xs opacity-75 text-theme-muted">{ROLE_LABELS[user?.role || '']}</p>
          </div>
        </div>
      </div>
    </header>
  );
}