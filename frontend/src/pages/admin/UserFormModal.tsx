import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, MapPin } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/config/api';
import type { User } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/apiError';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'viewer']),
  department: z.string().optional(),
  islandCalendar: z.enum(['tenerife', 'las_palmas', 'none']).default('none'),
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type FormDataInput = z.input<typeof schema>;

interface Props { open: boolean; user: User | null; onClose: () => void; }

export function UserFormModal({ open, user, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!user;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormDataInput, unknown, FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        islandCalendar: (user.islandCalendar as 'tenerife' | 'las_palmas' | 'none') || 'none',
        companyPhone: user.companyPhone || '',
        auxiliaryPhone: user.auxiliaryPhone || ''
      });
    } else {
      reset({
        name: '',
        email: '',
        password: '',
        role: 'viewer',
        department: '',
        islandCalendar: 'none',
        companyPhone: '',
        auxiliaryPhone: ''
      });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!isEdit) {
        return api.post('/users', data);
      }
      const { role, ...rest } = data;
      const payload = { ...rest };
      if (!payload.password) delete payload.password;
      await api.patch(`/users/${user!.id}`, payload);
      if (role !== user!.role) {
        await api.patch(`/users/${user!.id}/role`, { role });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado');
      onClose();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Error')),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="card rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-color">
          <h2 className="text-lg font-semibold text-theme-primary">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Nombre completo *</label>
            <input {...register('name')} className="input-field" placeholder="Juan García" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Email *</label>
            <input {...register('email')} type="email" className="input-field" placeholder="juan@empresa.com" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">
              Contraseña {isEdit ? '(dejar en blanco para no cambiar)' : '*'}
            </label>
            <input {...register('password')} type="password" className="input-field" placeholder="Mínimo 8 caracteres" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Rol *</label>
              <select {...register('role')} className="input-field">
                <option value="viewer">Usuario</option>
                <option value="manager">Responsable</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Departamento</label>
              <input {...register('department')} className="input-field" placeholder="Seguridad" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Teléfono Empresa</label>
              <input {...register('companyPhone')} className="input-field" placeholder="Ext. 123" />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Teléfono Auxiliar</label>
              <input {...register('auxiliaryPhone')} className="input-field" placeholder="Móvil / Casa" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">
              <MapPin className="inline h-3.5 w-3.5 mr-1" />Isla / Calendario de festivos
            </label>
            <div className="flex rounded-lg border border-theme-color overflow-hidden text-sm font-medium">
              {([['tenerife', 'Tenerife'], ['las_palmas', 'Las Palmas'], ['none', 'Sin asignar']] as const).map(([val, lbl]) => (
                <label
                  key={val}
                  className="flex-1 flex items-center justify-center py-2 cursor-pointer transition-colors"
                  style={
                    watch('islandCalendar') === val
                      ? { backgroundColor: '#1e3a5f', color: '#fff' }
                      : { backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }
                  }
                >
                  <input type="radio" value={val} {...register('islandCalendar')} className="sr-only" />
                  {lbl}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {mutation.isPending && <LoadingSpinner size="sm" className="border-white border-t-white/30" />}
              {isEdit ? 'Guardar' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
