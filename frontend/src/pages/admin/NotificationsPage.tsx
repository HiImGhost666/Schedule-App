import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, RefreshCw, Send, Calendar, CheckCircle, XCircle, Clock, Umbrella } from 'lucide-react';
import api from '@/config/api';
import type { NotificationLog, WebhookConfig } from '@/types';
import { NOTIFICATION_TYPE_LABELS } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ListPageSkeleton } from '@/components/common/Skeleton';
import { cn, formatDateTime } from '@/lib/utils';
import { isDarkThemePreset } from '@/config/theme';
import { useUIStore } from '@/store/uiStore';
import toast from 'react-hot-toast';

function StatusIcon({ status }: { status: string }) {
  if (status === 'sent') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-400" />;
  return <Clock className="h-4 w-4 text-amber-400" />;
}

function WebhookSelect({
  value,
  onChange,
  webhooks,
  placeholder = "Seleccionar webhook...",
}: {
  value: string;
  onChange: (value: string) => void;
  webhooks?: WebhookConfig[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-field text-sm"
    >
      <option value="">{placeholder}</option>
      {webhooks?.map((wh) => (
        <option key={wh.id} value={wh.id}>
          {wh.name} ({wh.scope === 'general' ? 'General' : wh.scope === 'department' ? `Dept: ${wh.department?.name}` : `Suc: ${wh.branch?.name}`})
        </option>
      ))}
    </select>
  );
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [announcement, setAnnouncement] = useState('');
  const [vacationWebhookId, setVacationWebhookId] = useState('');
  const [fridayWebhookId, setFridayWebhookId] = useState('');
  const [announceWebhookId, setAnnounceWebhookId] = useState('');
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
    mutationFn: () => api.post('/notifications/friday-summary', { webhookConfigId: fridayWebhookId || undefined }),
    onSuccess: (res) => { toast.success(res.data.message || 'Resumen enviado'); refetch(); },
    onError: () => toast.error('Error al enviar resumen'),
  });

  const vacationMutation = useMutation({
    mutationFn: () => api.post('/notifications/vacation-summary', { webhookConfigId: vacationWebhookId || undefined }),
    onSuccess: (res) => { toast.success(res.data.message || 'Resumen vacaciones enviado'); refetch(); },
    onError: () => toast.error('Error al enviar resumen de vacaciones'),
  });

  const announceMutation = useMutation({
    mutationFn: () => api.post('/notifications/announce', { message: announcement, webhookConfigId: announceWebhookId || undefined }),
    onSuccess: () => { toast.success('Anuncio enviado'); setAnnouncement(''); refetch(); },
    onError: () => toast.error('Error al enviar anuncio'),
  });

  const { data: webhooks } = useQuery<WebhookConfig[]>({
    queryKey: ['webhooks'],
    queryFn: () => api.get<{ data: WebhookConfig[] }>('/webhooks').then((r) => r.data.data),
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
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-theme-surface-muted' : 'bg-green-50')}>
              <Umbrella className={cn('h-4 w-4', isDark ? 'text-theme-primary' : 'text-green-600')} />
            </div>
            <div>
              <p className="font-semibold text-theme-primary text-sm">Vacaciones de la Semana</p>
              <p className="text-xs text-theme-muted">Automático cada lunes a las 8:30h</p>
            </div>
          </div>
          <WebhookSelect
            value={vacationWebhookId}
            onChange={setVacationWebhookId}
            webhooks={webhooks}
            placeholder="Todos los webhooks habilitados"
          />
          <button
            onClick={() => vacationMutation.mutate()}
            disabled={vacationMutation.isPending}
            className="w-full btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60 bg-green-600 hover:bg-green-700 border-green-600 mt-3"
          >
            {vacationMutation.isPending ? <LoadingSpinner size="sm" className="border-white border-t-white/30" /> : <Umbrella className="h-3.5 w-3.5" />}
            Enviar resumen ahora
          </button>
        </div>

        {/* Friday summary */}
        <div className="card p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-theme-surface-muted' : 'bg-gold-50')}>
              <Calendar className={cn('h-4 w-4', isDark ? 'text-theme-primary' : 'text-gold-600')} />
            </div>
            <div>
              <p className="font-semibold text-theme-primary text-sm">Resumen Semanal</p>
              <p className="text-xs text-theme-muted">Enviar planificación de la semana siguiente</p>
            </div>
          </div>
          <WebhookSelect
            value={fridayWebhookId}
            onChange={setFridayWebhookId}
            webhooks={webhooks}
            placeholder="Todos los webhooks habilitados"
          />
          <button
            onClick={() => fridayMutation.mutate()}
            disabled={fridayMutation.isPending}
            className="w-full btn-gold text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-3"
          >
            {fridayMutation.isPending ? <LoadingSpinner size="sm" /> : <Calendar className="h-3.5 w-3.5" />}
            Enviar resumen ahora
          </button>
        </div>

        {/* Manual announcement */}
        <div className="card p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-theme-surface-muted rounded-lg">
              <Send className={cn('h-4 w-4', isDark ? 'text-theme-primary' : 'text-theme-secondary')} />
            </div>
            <div>
              <p className="font-semibold text-theme-primary text-sm">Anuncio Manual</p>
              <p className="text-xs text-theme-muted">Enviar mensaje personalizado</p>
            </div>
          </div>
          <WebhookSelect
            value={announceWebhookId}
            onChange={setAnnounceWebhookId}
            webhooks={webhooks}
            placeholder="Todos los webhooks habilitados"
          />
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="input-field resize-none text-sm mb-3 mt-3"
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-color">
          <h2 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold-500" />
            Historial de Notificaciones
          </h2>
          <button onClick={() => refetch()} className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {isLoading ? (
          <ListPageSkeleton />
        ) : !data?.data?.length ? (
          <EmptyState icon={Bell} title="Sin notificaciones" description="Las notificaciones enviadas aparecerán aquí" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-theme-surface-muted border-b border-theme-color">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase">Estado</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase">Tipo</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase hidden md:table-cell">Mensaje</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase hidden lg:table-cell">Webhook</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-theme-muted uppercase">Fecha</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-color">
                  {data.data.map((log: NotificationLog) => (
                    <tr key={log.id} className="hover:bg-theme-surface-muted/30">
                      <td className="px-5 py-4"><StatusIcon status={log.status} /></td>
                      <td className="px-5 py-4">
                        <span className="text-xs bg-theme-surface-muted text-theme-secondary px-2 py-0.5 rounded-full font-medium">
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
              <div className="flex items-center justify-between px-5 py-4 border-t border-theme-color">
                <p className="text-xs text-theme-muted">Página {page} de {data.pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs font-medium rounded border border-theme-color text-theme-primary hover:bg-theme-surface-muted disabled:opacity-40">Anterior</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages} className="px-3 py-1 text-xs font-medium rounded border border-theme-color text-theme-primary hover:bg-theme-surface-muted disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
