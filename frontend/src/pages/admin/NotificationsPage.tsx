import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, RefreshCw, Send, Calendar, CheckCircle, XCircle, Clock, Umbrella, Globe, Building2, Users } from 'lucide-react';
import api from '@/config/api';
import type { Branch, Department, NotificationLog, WebhookConfig } from '@/types';
import { NOTIFICATION_TYPE_LABELS } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ListPageSkeleton } from '@/components/common/Skeleton';
import { DataTable } from '@/components/common/DataTable';
import { cn, formatDateTime } from '@/lib/utils';
import { isDarkThemePreset } from '@/config/theme';
import { useUIStore } from '@/store/uiStore';
import toast from 'react-hot-toast';

type ScopeFilter = 'all' | 'branch' | 'department' | 'specific';

function StatusIcon({ status }: { status: string }) {
  if (status === 'sent') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-400" />;
  return <Clock className="h-4 w-4 text-amber-400" />;
}

function ScopeSelector({
  scope,
  onScopeChange,
  branchId,
  onBranchChange,
  departmentId,
  onDepartmentChange,
  webhookId,
  onWebhookChange,
  branches,
  departments,
  webhooks,
}: {
  scope: ScopeFilter;
  onScopeChange: (s: ScopeFilter) => void;
  branchId: string;
  onBranchChange: (id: string) => void;
  departmentId: string;
  onDepartmentChange: (id: string) => void;
  webhookId: string;
  onWebhookChange: (id: string) => void;
  branches: Branch[];
  departments: Department[];
  webhooks: WebhookConfig[];
}) {
  const filteredWebhooks = useMemo(() => {
    if (scope === 'specific') return webhooks;
    return webhooks.filter((wh) => {
      if (scope === 'all') return true;
      if (scope === 'branch') return !branchId || wh.branchId === branchId;
      if (scope === 'department') return !departmentId || wh.departmentId === departmentId;
      return true;
    });
  }, [webhooks, scope, branchId, departmentId]);

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[
          { value: 'all' as ScopeFilter, icon: Globe, label: 'Todos' },
          { value: 'branch' as ScopeFilter, icon: Building2, label: 'Sucursal' },
          { value: 'department' as ScopeFilter, icon: Users, label: 'Departamento' },
          { value: 'specific' as ScopeFilter, icon: Bell, label: 'Específico' },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onScopeChange(opt.value)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
              scope === opt.value
                ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-medium'
                : 'border-theme-color text-theme-muted hover:border-theme-primary/40'
            )}
          >
            <opt.icon className="h-3 w-3" />
            {opt.label}
          </button>
        ))}
      </div>

      {scope === 'branch' && (
        <select
          value={branchId}
          onChange={(e) => onBranchChange(e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Todas las sucursales</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}

      {scope === 'department' && (
        <select
          value={departmentId}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}

      {scope === 'specific' && (
        <select
          value={webhookId}
          onChange={(e) => onWebhookChange(e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Seleccionar webhook...</option>
          {webhooks.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name} ({wh.scope === 'general' ? 'General' : wh.scope === 'department' ? `Dept: ${wh.department?.name}` : `Suc: ${wh.branch?.name}`})
            </option>
          ))}
        </select>
      )}

      {scope !== 'specific' && filteredWebhooks.length > 0 && (
        <p className="text-xs text-theme-muted">
          Se enviará a {filteredWebhooks.length} webhook(s)
          {scope === 'branch' && branchId && ` de la sucursal seleccionada`}
          {scope === 'department' && departmentId && ` del departamento seleccionado`}
        </p>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [announcement, setAnnouncement] = useState('');

  // Vacation summary filters
  const [vacationScope, setVacationScope] = useState<ScopeFilter>('all');
  const [vacationBranchId, setVacationBranchId] = useState('');
  const [vacationDeptId, setVacationDeptId] = useState('');
  const [vacationWebhookId, setVacationWebhookId] = useState('');

  // Friday summary filters
  const [fridayScope, setFridayScope] = useState<ScopeFilter>('all');
  const [fridayBranchId, setFridayBranchId] = useState('');
  const [fridayDeptId, setFridayDeptId] = useState('');
  const [fridayWebhookId, setFridayWebhookId] = useState('');

  // Announcement filters
  const [announceScope, setAnnounceScope] = useState<ScopeFilter>('all');
  const [announceBranchId, setAnnounceBranchId] = useState('');
  const [announceDeptId, setAnnounceDeptId] = useState('');
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

  const { data: webhooks } = useQuery<WebhookConfig[]>({
    queryKey: ['webhooks'],
    queryFn: () => api.get<{ data: WebhookConfig[] }>('/webhooks').then((r) => r.data.data),
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['branches', 'notifications'],
    queryFn: () => api.get<{ data: Branch[] }>('/branches', { params: { includeInactive: false } }).then((r) => r.data.data),
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments', 'notifications'],
    queryFn: () => api.get<{ data: Department[] }>('/departments', { params: { includeInactive: false } }).then((r) => r.data.data),
  });

  // Helper: obtener webhookIds según el scope seleccionado
  function getWebhookIds(scope: ScopeFilter, branchId: string, deptId: string, whId: string): string[] | undefined {
    if (scope === 'specific' && whId) return [whId];
    if (!webhooks) return undefined;
    return webhooks
      .filter((wh) => {
        if (!wh.enabled) return false;
        if (scope === 'all') return true;
        if (scope === 'branch') return !branchId || wh.branchId === branchId;
        if (scope === 'department') return !deptId || wh.departmentId === deptId;
        return true;
      })
      .map((wh) => wh.id);
  }

  const fridayMutation = useMutation({
    mutationFn: () => {
      const ids = getWebhookIds(fridayScope, fridayBranchId, fridayDeptId, fridayWebhookId);
      return api.post('/notifications/friday-summary', { webhookConfigIds: ids });
    },
    onSuccess: (res) => { toast.success(res.data.message || 'Resumen enviado'); refetch(); },
    onError: () => toast.error('Error al enviar resumen'),
  });

  const vacationMutation = useMutation({
    mutationFn: () => {
      const ids = getWebhookIds(vacationScope, vacationBranchId, vacationDeptId, vacationWebhookId);
      return api.post('/notifications/vacation-summary', { webhookConfigIds: ids });
    },
    onSuccess: (res) => { toast.success(res.data.message || 'Resumen vacaciones enviado'); refetch(); },
    onError: () => toast.error('Error al enviar resumen de vacaciones'),
  });

  const announceMutation = useMutation({
    mutationFn: () => {
      const ids = getWebhookIds(announceScope, announceBranchId, announceDeptId, announceWebhookId);
      return api.post('/notifications/announce', { message: announcement, webhookConfigIds: ids });
    },
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
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-theme-surface-muted' : 'bg-green-50')}>
              <Umbrella className={cn('h-4 w-4', isDark ? 'text-theme-primary' : 'text-green-600')} />
            </div>
            <div>
              <p className="font-semibold text-theme-primary text-sm">Vacaciones de la Semana</p>
              <p className="text-xs text-theme-muted">Automático cada lunes a las 8:30h</p>
            </div>
          </div>
          <ScopeSelector
            scope={vacationScope}
            onScopeChange={setVacationScope}
            branchId={vacationBranchId}
            onBranchChange={setVacationBranchId}
            departmentId={vacationDeptId}
            onDepartmentChange={setVacationDeptId}
            webhookId={vacationWebhookId}
            onWebhookChange={setVacationWebhookId}
            branches={branches ?? []}
            departments={departments ?? []}
            webhooks={webhooks ?? []}
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
          <ScopeSelector
            scope={fridayScope}
            onScopeChange={setFridayScope}
            branchId={fridayBranchId}
            onBranchChange={setFridayBranchId}
            departmentId={fridayDeptId}
            onDepartmentChange={setFridayDeptId}
            webhookId={fridayWebhookId}
            onWebhookChange={setFridayWebhookId}
            branches={branches ?? []}
            departments={departments ?? []}
            webhooks={webhooks ?? []}
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
          <ScopeSelector
            scope={announceScope}
            onScopeChange={setAnnounceScope}
            branchId={announceBranchId}
            onBranchChange={setAnnounceBranchId}
            departmentId={announceDeptId}
            onDepartmentChange={setAnnounceDeptId}
            webhookId={announceWebhookId}
            onWebhookChange={setAnnounceWebhookId}
            branches={branches ?? []}
            departments={departments ?? []}
            webhooks={webhooks ?? []}
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
            <DataTable<NotificationLog>
              data={data.data}
              rowKey={(log) => log.id}
              columns={[
                {
                  key: 'status',
                  label: 'Estado',
                  render: (log) => <StatusIcon status={log.status} />,
                },
                {
                  key: 'type',
                  label: 'Tipo',
                  render: (log) => (
                    <span className="text-xs bg-theme-surface-muted text-theme-secondary px-2 py-0.5 rounded-full font-medium">
                      {NOTIFICATION_TYPE_LABELS[log.type] || log.type}
                    </span>
                  ),
                },
                {
                  key: 'message',
                  label: 'Mensaje',
                  hide: 'md',
                  className: 'max-w-xs truncate',
                  render: (log) => <span className="text-xs text-theme-muted">{log.message}</span>,
                },
                {
                  key: 'webhook',
                  label: 'Webhook',
                  hide: 'lg',
                  render: (log) => <span className="text-xs text-theme-muted">{log.webhookConfig?.name || '—'}</span>,
                },
                {
                  key: 'sentAt',
                  label: 'Fecha',
                  render: (log) => <span className="text-xs text-theme-muted">{formatDateTime(log.sentAt)}</span>,
                },
              ]}
              renderActions={(log) =>
                log.status === 'failed' ? (
                  <button
                    onClick={() => resendMutation.mutate(log.id)}
                    disabled={resendMutation.isPending}
                    className="text-xs text-theme-muted hover:text-theme-primary flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />Reenviar
                  </button>
                ) : null
              }
            />
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
