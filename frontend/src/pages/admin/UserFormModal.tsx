import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/config/api';
import type { Branch, User } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/apiError';

const DEPARTMENT_VALUES = ['seguridad', 'mantenimiento', 'operaciones', 'administración'] as const;

const DEPARTMENT_OPTIONS = [
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'operaciones', label: 'Operaciones' },
  { value: 'administración', label: 'Administración' },
] as const;

type DepartmentValue = (typeof DEPARTMENT_VALUES)[number];
const DEPARTMENT_LOOKUP = new Map<string, DepartmentValue>(
  DEPARTMENT_VALUES.map((department) => [department.toLowerCase(), department]),
);

function normalizeDepartment(value?: string | null): DepartmentValue | '' {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return DEPARTMENT_LOOKUP.get(trimmed.toLowerCase()) ?? '';
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  role: z.enum(['admin', 'general_manager', 'department_manager', 'employee']),
  department: z.enum(DEPARTMENT_VALUES).optional().or(z.literal('')),
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1, 'La sucursal es obligatoria'),
});

type FormData = z.infer<typeof schema>;
type FormDataInput = z.input<typeof schema>;

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

export function UserFormModal({ open, user, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!user;

  const { data: branchesData, isLoading: branchesLoading } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', 'user-form'],
    queryFn: () => api.get('/branches', { params: { includeInactive: true } }).then((r) => r.data),
    enabled: open,
  });
  const branches = branchesData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormDataInput, unknown, FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) {
      const department = normalizeDepartment(user.department);

      reset({
        name: user.name,
        email: user.email,
        role: user.role?.name,
        department,
        companyPhone: user.companyPhone || '',
        auxiliaryPhone: user.auxiliaryPhone || '',
        branchId: user.branchId || '',
      });
      return;
    }

    reset({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      department: '',
      companyPhone: '',
      auxiliaryPhone: '',
      branchId: '',
    });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        department: data.department || undefined,
        branchId: data.branchId,
      };

      if (!isEdit) {
        return api.post('/users', payload);
      }

      const { role, ...rest } = payload;
      const updatePayload = { ...rest };
      if (!updatePayload.password) delete updatePayload.password;
      await api.patch(`/users/${user!.id}`, updatePayload);
      if (role !== user!.role?.name) {
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
      <div className="card rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-color flex-shrink-0">
          <h2 className="text-lg font-semibold text-theme-primary">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4 overflow-y-auto flex-1">


          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Nombre completo *</label>
            <input {...register('name')} className="input-field" placeholder="Juan Garcia" />
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
            <input {...register('password')} type="password" className="input-field" placeholder="Minimo 8 caracteres" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Rol *</label>
              <select {...register('role')} className="input-field">
                <option value="employee">Empleado</option>
                <option value="department_manager">Responsable</option>
                <option value="general_manager">Gerente General</option>
                <option value="admin">Administrador</option>
              </select>

            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Departamento</label>
                <select {...register('department')} className="input-field">
                  <option value="">Sin departamento</option>
                  {DEPARTMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Sucursal *</label>
            <select {...register('branchId')} className="input-field" disabled={branchesLoading}>
              <option value="" disabled>Selecciona una sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code}){branch.isActive ? '' : ' · inactiva'}
                </option>
              ))}
            </select>
            {errors.branchId && <p className="text-xs text-red-500 mt-1">{errors.branchId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Telefono Empresa</label>
              <input {...register('companyPhone')} className="input-field" placeholder="Ext. 123" />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Telefono Auxiliar</label>
              <input {...register('auxiliaryPhone')} className="input-field" placeholder="Movil / Casa" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm">Cancelar</button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {mutation.isPending && <LoadingSpinner size="sm" className="border-white border-t-white/30" />}
              {isEdit ? 'Guardar' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
