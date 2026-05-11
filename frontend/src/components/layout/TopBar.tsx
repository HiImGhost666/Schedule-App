import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/types';
import { NotificationPanel } from '@/components/common/NotificationPanel';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {

  const user = useAuthStore((s) => s.user);
  const {
    unreadCount,
    notifications,
    loading,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useInAppNotifications();

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
        <NotificationPanel
          unreadCount={unreadCount}
          notifications={notifications}
          loading={loading}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onFetchMore={(page) => fetchNotifications(page)}
          pagination={pagination}
        />
        <Link to="/profile" className="flex items-center gap-2 px-2 hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-tight text-theme-primary">{user?.name}</p>
            <p className="text-xs opacity-75 text-theme-muted">{user?.role?.name ? ROLE_LABELS[user.role.name] : ''}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
