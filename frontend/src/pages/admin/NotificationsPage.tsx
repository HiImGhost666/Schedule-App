import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, RefreshCw, Send, Calendar, CheckCircle, XCircle, Clock, Umbrella } from 'lucide-react';
import api from '@/config/api';
import type { NotificationLog } from '@/types';
import { NOTIFICATION_TYPE_LABELS } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { cn, formatDateTime } from '@/lib/utils';
import { isDarkThemePreset } from '@/config/theme';
import { useUIStore } from '@/store/uiStore';
import toast from 'react-hot-toast';

function StatusIcon({ status }: { status: string }) {
  if (status === 'sent') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-400" />;
  return <Clock className="h-4 w-4 text-amber-400" />;
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [announcement, setAnnouncement] = useState('');
  const activeTheme = useUIStore(
    (s) => s.themePresetHoverPreview ?? s.themeDraft ?? s.themeConfig,
  );
  const isDark = isDarkThemePreset(activeTheme);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.get('/notifications/logs', { params: { page, limit: 20 } }).then((r) => r.data),
  });

  const resendMutation = useMutation({
    mutationFn: (logId: string) => api.post(`/notifications/resend/${logId}`),
    onSuccess: () => { toast.success('Notificación reenviada'); refetch(); },
    onError: () => toast.error('Error al reenviar'),
  });

  const fridayMutation = useMutation({
    mutationFn: () => api.post('/notifications/friday-summary'),
    onSuccess: (res) => { toast.success(res.data.message || 'Resumen enviado'); refetch(); },
    onError: () => toast.error('Error al enviar resumen'),
  });

  const vacationMutation = useMutation({
    mutationFn: () => api.post('/notifications/vacation-summary'),
    onSuccess: (res) => { toast.success(res.data.message || 'Resumen vacaciones enviado'); refetch(); },
    onError: () => toast.error('Error al enviar resumen de vacaciones'),
  });

  const announceMutation = useMutation({
    mutationFn: () => api.post('/notifications/announce', { message: announcement }),
    onSuccess: () => { toast.success('Anuncio enviado'); setAnnouncement(''); refetch(); },
    onError: () => toast.error('Error al enviar anuncio'),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Centro de Notificaciones</h1>
          <p className="text-sm text-theme-muted mt-0.5">Historial de notificaciones y envíos manuales</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Vacation summary */}
        <div className="card p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-navy-50' : 'bg-green-50')}>
              <Umbrella className={cn('h-4 w-4', isDark ? 'text-navy-700' : 'text-green-600')} />
            </div>
            <div>
              <p className="font-semibold text-theme-primary text-sm">Vacaciones de la Semana</p>
              <p className="text-xs text-theme-muted">Automático cada lunes a las 8:30h</p>
            </div>
          </div>
          <button
            onClick={() => vacationMutation.mutate()}
            disabled={vacationMutation.isPending}
            className="w-full btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60 bg-green-600 hover:bg-green-700 border-green-600"
          >
            {vacationMutation.isPending ? <LoadingSpinner size="sm" className="border-white border-t-white/30" /> : <Umbrella className="h-3.5 w-3.5" />}
            Enviar resumen ahora
          </button>
        </div>

        {/* Friday summary */}
        <div className="card p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-navy-50' : 'bg-gold-50')}>
              <Calendar className={cn('h-4 w-4', isDark ? 'text-navy-700' : 'text-gold-600')} />
            </div>
            <div>
              <p className="font-semibold text-theme-primary text-sm">Resumen Semanal</p>
              <p className="text-xs text-theme-muted">Enviar planificación de la semana siguiente</p>
            </div>
          </div>
          <button
            onClick={() => fridayMutation.mutate()}
            disabled={fridayMutation.isPending}
            className="w-full btn-gold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {fridayMutation.isPending ? <LoadingSpinner size="sm" /> : <Calendar className="h-3.5 w-3.5" />}
            Enviar resumen ahora
          </button>
        </div>

        {/* Manual announcement */}
        <div className="card p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-navy-50 rounded-lg">
              <Send className={cn('h-4 w-4', isDark ? 'text-navy-700' : 'text-navy-500')} />
            </div>
            <div>
              <p className="font-semibold text-theme-primary text-sm">Anuncio Manual</p>
              <p className="text-xs text-theme-muted">Enviar mensaje personalizado a todos los webhooks</p>
            </div>
          </div>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="input-field resize-none text-sm mb-3"
            rows={2}
            placeholder="Escribe tu anuncio..."
          />
          <button
            onClick={() => announceMutation.mutate()}
            disabled={!announcement.trim() || announceMutation.isPending}
            className="w-full btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {announceMutation.isPending ? <LoadingSpinner size="sm" className="border-white border-t-white/30" /> : <Send className="h-3.5 w-3.5" />}
            Enviar anuncio
          </button>
        </div>
      </div>

      {/* Log table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100">
          <h2 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold-500" />
            Historial de Notificaciones
          </h2>
          <button onClick={() => refetch()} className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : !data?.data?.length ? (
          <EmptyState icon={Bell} title="Sin notificaciones" description="Las notificaciones enviadas aparecerán aquí" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-50 border-b border-navy-100">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase">Estado</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase">Tipo</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase hidden md:table-cell">Mensaje</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase hidden lg:table-cell">Webhook</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase">Fecha</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {data.data.map((log: NotificationLog) => (
                    <tr key={log.id} className="hover:bg-navy-50/30">
                      <td className="px-5 py-4"><StatusIcon status={log.status} /></td>
                      <td className="px-5 py-4">
                        <span className="text-xs bg-navy-100 text-navy-600 px-2 py-0.5 rounded-full font-medium">
                          {NOTIFICATION_TYPE_LABELS[log.type] || log.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-theme-muted hidden md:table-cell max-w-xs truncate">{log.message}</td>
                      <td className="px-5 py-4 text-xs text-theme-muted hidden lg:table-cell">{log.webhookConfig?.name || '—'}</td>
                      <td className="px-5 py-4 text-xs text-theme-muted">{formatDateTime(log.sentAt)}</td>
                      <td className="px-5 py-4">
                        {log.status === 'failed' && (
                          <button
                            onClick={() => resendMutation.mutate(log.id)}
                            disabled={resendMutation.isPending}
                            className="text-xs text-theme-muted hover:text-theme-primary flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />Reenviar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data?.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-navy-100">
                <p className="text-xs text-theme-muted">Página {page} de {data.pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-theme-primary hover:bg-navy-50 disabled:opacity-40">Anterior</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages} className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-theme-primary hover:bg-navy-50 disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
