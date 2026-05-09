import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/config/api';

export interface InAppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: string | null;
  readAt: string | null;
  createdAt: string;
}

interface PaginatedResult {
  items: InAppNotification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useInAppNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/api/in-app-notifications/unread-count');
      setUnreadCount(res.data.data?.count ?? 0);
    } catch {
      // Silently fail
    }
  }, []);

  const fetchNotifications = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await api.get('/api/in-app-notifications', {
        params: { page, pageSize },
      });
      const data = res.data as PaginatedResult;
      setNotifications(data.items ?? []);
      setPagination({
        page: data.page ?? 1,
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 0,
      });
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/in-app-notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/api/in-app-notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  // Polling cada 30 segundos para el contador de no leídas
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUnreadCount();
    }, 0);
    pollingRef.current = setInterval(fetchUnreadCount, 30_000);
    return () => {
      clearTimeout(timer);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchUnreadCount]);

  return {
    unreadCount,
    notifications,
    loading,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}
