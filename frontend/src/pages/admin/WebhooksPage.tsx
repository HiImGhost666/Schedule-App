import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Webhook, Trash2, Edit, Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/config/api';
import type { WebhookConfig } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/apiError';

const schema = z.object({
  name: z.string().min(2),
  webhookUrl: z.string().url('URL inválida'),
  enabled: z.boolean(),
  notifyModifications: z.boolean(),
  notifyLastMinute: z.boolean(),
  fridayReminderEnabled: z.boolean(),
  fridayReminderTime: z.string().default('12:00'),
});

type FormData = z.infer<typeof schema>;

function WebhookForm({ webhook, onClose }: { webhook?: WebhookConfig; onClose: () => void }) {
  const qc = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: webhook
      ? { ...webhook }
      : { enabled: true, notifyModifications: true, notifyLastMinute: true, fridayReminderEnabled: true, fridayReminderTime: '12:00' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      webhook ? api.patch(`/webhooks/${webhook.id}`, data) : api.post('/webhooks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success(webhook ? 'Webhook actualizado' : 'Webhook creado');
      onClose();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Error')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-800">{webhook ? 'Editar Webhook' : 'Nuevo Webhook'}</h2>
          <button onClick={onClose} className="p-1.5 text-navy-300 hover:text-navy-500 rounded-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as FormData))} className="p-7 space-y-5">
          <div>
            <label className="block text-sm font-medium text-navy-600 mb-1">Nombre *</label>
            <input {...register('name')} className="input-field" placeholder="Canal de Teams - Guardias" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-600 mb-1">URL del Webhook *</label>
            <input {...register('webhookUrl')} className="input-field" placeholder="https://outlook.office.com/webhook/..." />
            {errors.webhookUrl && <p className="text-xs text-red-500 mt-1">{errors.webhookUrl.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input {...register('fridayReminderEnabled')} type="checkbox" id="fri" className="rounded border-navy-300 text-navy-500" />
              <label htmlFor="fri" className="text-sm text-navy-600">Resumen viernes</label>
            </div>
            <div>
              <input {...register('fridayReminderTime')} type="time" className="input-field text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            {[
              { name: 'notifyModifications' as const, label: 'Notificar modificaciones de guardias' },
              { name: 'notifyLastMinute' as const, label: 'Notificar cambios de último momento (<24h)' },
              { name: 'enabled' as const, label: 'Webhook activo' },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <input {...register(item.name)} type="checkbox" id={item.name} className="rounded border-navy-300 text-navy-500" />
                <label htmlFor={item.name} className="text-sm text-navy-600">{item.label}</label>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {mutation.isPending && <LoadingSpinner size="sm" className="border-white border-t-white/30" />}
              {webhook ? 'Guardar' : 'Crear Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WebhooksPage() {
  const qc = useQueryClient();
  const [formWebhook, setFormWebhook] = useState<WebhookConfig | null | false>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<WebhookConfig | null>(null);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get<{ data: WebhookConfig[] }>('/webhooks').then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook eliminado'); setDeleteConfirm(null); },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/webhooks/${id}/test`),
    onSuccess: () => toast.success('Mensaje de prueba enviado'),
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Error al enviar prueba')),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Webhooks Microsoft Teams</h1>
          <p className="text-sm text-navy-400 mt-0.5">Configura notificaciones automáticas para canales de Teams</p>
        </div>
        <button onClick={() => setFormWebhook(null)} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" />Nuevo Webhook
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : !webhooks?.length ? (
        <div className="card">
          <EmptyState
            icon={Webhook}
            title="Sin webhooks configurados"
            description="Añade un webhook de Microsoft Teams para recibir notificaciones automáticas"
            action={<button onClick={() => setFormWebhook(null)} className="btn-primary text-sm">Añadir webhook</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {webhooks.map((wh) => (
            <div key={wh.id} className="card p-7 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${wh.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Webhook className={`h-4 w-4 ${wh.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-800 text-sm">{wh.name}</p>
                    <p className="text-xs text-navy-400 truncate max-w-48">{wh.webhookUrl.slice(0, 40)}...</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${wh.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {wh.enabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Modificaciones', value: wh.notifyModifications },
                  { label: 'Último momento', value: wh.notifyLastMinute },
                  { label: 'Resumen viernes', value: wh.fridayReminderEnabled },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    {item.value ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={item.value ? 'text-navy-600' : 'text-navy-300'}>{item.label}</span>
                  </div>
                ))}
                {wh.fridayReminderEnabled && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-navy-400" />
                    <span className="text-navy-500">Viernes {wh.fridayReminderTime}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => testMutation.mutate(wh.id)}
                  disabled={testMutation.isPending}
                  className="flex items-center gap-1.5 text-xs btn-ghost py-1.5 px-3"
                >
                  <Play className="h-3 w-3" />Probar
                </button>
                <button onClick={() => setFormWebhook(wh)} className="flex items-center gap-1.5 text-xs btn-ghost py-1.5 px-3">
                  <Edit className="h-3 w-3" />Editar
                </button>
                <button onClick={() => setDeleteConfirm(wh)} className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-50 py-1.5 px-3 rounded-lg transition-colors">
                  <Trash2 className="h-3 w-3" />Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formWebhook !== false && <WebhookForm webhook={formWebhook || undefined} onClose={() => setFormWebhook(false)} />}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Eliminar Webhook"
        description={`¿Eliminar el webhook "${deleteConfirm?.name}"?`}
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteConfirm!.id)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
