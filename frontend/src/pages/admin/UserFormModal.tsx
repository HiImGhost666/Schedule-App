import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/config/api';
import type { Branch, Department, Skill, User } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

function actorBranchScopeIds(actor: User | null): string[] {
  if (!actor?.branchId) return [];
  const extras = actor.visibleBranches?.map((v) => v.branch.id) ?? [];
  return [...new Set([actor.branchId, ...extras].filter(Boolean))];
}

/** IDs almacenados en `user_visible_branch` (sucursales extra visibles, sin duplicar la sucursal base). */
function extraVisibleIdsFromUser(u: User | null | undefined): string[] {
  if (!u) return [];
  const base = u.branchId ?? '';
  return (u.visibleBranches?.map((item) => item.branch.id) ?? []).filter((id) => id && id !== base);
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  role: z.enum(['admin', 'general_manager', 'department_manager', 'employee']),
  departmentId: z.string().min(1, 'Debes seleccionar un departamento'),
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1, 'La sucursal es obligatoria'),
  skillIds: z.array(z.string()).optional().default([]),
  visibleBranchIds: z.array(z.string()).optional().default([]),
});

type FormData = z.infer<typeof schema>;
type FormDataInput = z.input<typeof schema>;

interface Props {
  open: boolean;
  user: User | null;
  roleName?: string;
  onClose: () => void;
}

export function UserFormModal({ open, user, roleName, onClose }: Props) {
  const actor = useAuthStore((s) => s.user);
  const actorRole = roleName ?? actor?.role?.name ?? 'employee';
  const isDepartmentManager = actorRole === 'department_manager';
  const isAdminActor = actorRole === 'admin';
  const isGeneralManagerActor = actorRole === 'general_manager';
  const canEditVisibleBranches = isAdminActor || isGeneralManagerActor;
  const scopeIds = useMemo(() => actorBranchScopeIds(actor), [actor]);
  const qc = useQueryClient();
  const isEdit = !!user;

  const { data: branchesData, isLoading: branchesLoading } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', 'user-form'],
    queryFn: () => api.get('/branches', { params: { includeInactive: true } }).then((r) => r.data),
    enabled: open,
  });
  const branches = useMemo(() => branchesData?.data ?? [], [branchesData?.data]);

  const { data: skillsData, isLoading: skillsLoading } = useQuery<{ data: Skill[] }>({
    queryKey: ['skills', 'user-form'],
    queryFn: () => api.get('/skills').then((r) => r.data),
    enabled: open,
  });
  const skills = skillsData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormDataInput, unknown, FormData>({
    resolver: zodResolver(schema),
  });

  const selectedBranchId = watch('branchId');

  const { data: userDetailData } = useQuery<User>({
    queryKey: ['user-detail', user?.id],
    queryFn: () => api.get<{ data: User }>(`/users/${user!.id}`).then((r) => r.data.data),
    enabled: open && isEdit && Boolean(user?.id),
    retry: false,
  });
  const selectedUser = userDetailData ?? user;

  /** Sucursal efectiva para catálogos y UI cuando el select está bloqueado (DM) y `watch` puede ir vacío en tests/jsdom. */
  const effectiveBranchId = useMemo(
    () =>
      (typeof selectedBranchId === 'string' && selectedBranchId ? selectedBranchId : '') ||
      (isEdit ? (selectedUser?.branchId ?? user?.branchId ?? '') : ''),
    [selectedBranchId, isEdit, selectedUser?.branchId, user?.branchId],
  );

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery<{ data: Department[] }>({
    queryKey: ['departments', 'user-form', effectiveBranchId],
    queryFn: () => api.get('/departments', { params: { branchId: effectiveBranchId, includeInactive: false } }).then((r) => r.data),
    enabled: open && Boolean(effectiveBranchId),
  });
  const departments = useMemo(() => departmentsData?.data ?? [], [departmentsData?.data]);

  useEffect(() => {
    if (selectedUser) {
      const currentDepartmentId = selectedUser.departmentId ?? selectedUser.department?.id ?? '';
      reset({
        name: selectedUser.name,
        email: selectedUser.email,
        role: (selectedUser.role?.name ?? 'employee') as FormData['role'],
        departmentId: currentDepartmentId,
        companyPhone: selectedUser.companyPhone || '',
        auxiliaryPhone: selectedUser.auxiliaryPhone || '',
        branchId: selectedUser.branchId || '',
        skillIds: selectedUser.skills?.map((item) => item.skill.id) ?? [],
        visibleBranchIds: extraVisibleIdsFromUser(selectedUser),
      });
      return;
    }

    reset({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      departmentId: '',
      companyPhone: '',
      auxiliaryPhone: '',
      branchId: '',
      skillIds: [],
      visibleBranchIds: [],
    });
  }, [selectedUser, reset]);

  useEffect(() => {
    if (!effectiveBranchId) {
      setValue('departmentId', '', { shouldDirty: true });
      return;
    }
    if (departmentsLoading) return;
    // Con lista vacía, `.some()` es siempre false: no limpiar hasta tener catálogo real (evita borrar el valor del reset).
    if (departments.length === 0) return;
    const currentDepartmentId = getValues('departmentId');
    if (!currentDepartmentId) return;
    if (!departments.some((department) => department.id === currentDepartmentId)) {
      setValue('departmentId', '', { shouldDirty: true });
    }
  }, [effectiveBranchId, departments, departmentsLoading, setValue, getValues]);

  /** No duplicar la sucursal base en “visibles adicionales”. */
  useEffect(() => {
    if (!effectiveBranchId) return;
    const current = getValues('visibleBranchIds');
    if (!Array.isArray(current) || current.length === 0) return;
    const next = current.filter((id) => id !== effectiveBranchId);
    if (next.length !== current.length) {
      setValue('visibleBranchIds', next, { shouldDirty: true });
    }
  }, [effectiveBranchId, setValue, getValues]);

  const branchesForBaseSelect = useMemo(() => {
    if (isAdminActor) return branches;
    if (isGeneralManagerActor && scopeIds.length > 0) {
      return branches.filter((b) => scopeIds.includes(b.id));
    }
    return branches;
  }, [branches, isAdminActor, isGeneralManagerActor, scopeIds]);

  const visibleBranchSelectOptions = useMemo(() => {
    if (!effectiveBranchId) return [];
    const pool = branches.filter((b) => b.id !== effectiveBranchId);
    if (isGeneralManagerActor && scopeIds.length > 0) {
      return pool.filter((b) => scopeIds.includes(b.id));
    }
    return pool;
  }, [branches, isGeneralManagerActor, scopeIds, effectiveBranchId]);

  const dmExtraVisibleRows = useMemo(() => {
    if (!isDepartmentManager || !selectedUser?.visibleBranches?.length) return [];
    const base = selectedUser.branchId ?? '';
    return selectedUser.visibleBranches.filter((v) => v.branch.id !== base);
  }, [isDepartmentManager, selectedUser]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const baseBranchId = data.branchId;
      const extraVisible = (data.visibleBranchIds ?? []).filter((id) => id && id !== baseBranchId);

      const payload: Record<string, unknown> = {
        ...data,
        departmentIds: data.departmentId ? [data.departmentId] : [],
        branchId: data.branchId,
        skillIds: data.skillIds ?? [],
      };

      if (isDepartmentManager) {
        delete payload.visibleBranchIds;
      } else {
        payload.visibleBranchIds = extraVisible;
      }

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

  // DM solo puede editar, no crear
  if (isDepartmentManager && !isEdit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
        <div className="card rounded-2xl shadow-2xl w-full max-w-md animate-slide-up p-6 text-center">
          <h2 className="text-lg font-semibold text-theme-primary mb-2">Acción no permitida</h2>
          <p className="text-sm text-theme-muted mb-4">
            Como responsable de departamento no puedes crear nuevos usuarios. Contacta con un administrador o gerente general.
          </p>
          <button onClick={onClose} className="btn-primary text-sm">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="card rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-color shrink-0">
          <h2 className="text-lg font-semibold text-theme-primary">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4 overflow-y-auto flex-1">

          {isDepartmentManager && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Como responsable de departamento solo puedes modificar nombre, email y teléfono.
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Sucursal *</label>
            <select
              {...register('branchId')}
              className={cn(
                'input-field',
                isDepartmentManager && 'pointer-events-none cursor-not-allowed opacity-80',
              )}
              disabled={branchesLoading}
              aria-disabled={isDepartmentManager || undefined}
              tabIndex={isDepartmentManager ? -1 : undefined}
            >
              <option value="" disabled>Selecciona una sucursal</option>
              {branchesForBaseSelect.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code}){branch.isActive ? '' : ' · inactiva'}
                </option>
              ))}
            </select>
            {errors.branchId && <p className="text-xs text-red-500 mt-1">{errors.branchId.message}</p>}
            {isDepartmentManager && <p className="text-[10px] text-theme-muted mt-0.5">No puedes cambiar la sucursal</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Rol *</label>
              <select
                {...register('role')}
                className={cn(
                  'input-field',
                  isDepartmentManager && 'pointer-events-none cursor-not-allowed opacity-80',
                )}
                aria-disabled={isDepartmentManager || undefined}
                tabIndex={isDepartmentManager ? -1 : undefined}
              >
                <option value="employee">Empleado</option>
                <option value="department_manager">Responsable</option>
                <option value="general_manager">Gerente General</option>
                <option value="admin">Administrador</option>
              </select>
              {isDepartmentManager && <p className="text-[10px] text-theme-muted mt-0.5">No puedes cambiar el rol</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Departamento *</label>
              <select {...register('departmentId')} className="input-field" disabled={departmentsLoading || !effectiveBranchId}>
                <option value="" disabled>Selecciona un departamento</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} ({department.code})
                  </option>
                ))}
              </select>
              {errors.departmentId && <p className="text-xs text-red-500 mt-1">{errors.departmentId.message}</p>}
              {!effectiveBranchId && <p className="text-xs text-theme-muted mt-1">Primero selecciona una sucursal para ver los departamentos disponibles.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Skills</label>
              <select
                {...register('skillIds')}
                multiple
                className="input-field min-h-28"
                disabled={skillsLoading}
              >
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name} {skill.category ? `(${skill.category})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-theme-muted mt-0.5">Mantén Ctrl/Cmd para selección múltiple.</p>
            </div>

            {canEditVisibleBranches ? (
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Sucursales visibles adicionales</label>
                {isGeneralManagerActor && (
                  <p className="text-[11px] text-theme-muted mb-1.5 rounded-lg border border-theme-color bg-theme-surface-muted/40 px-2 py-1.5">
                    Solo puedes asignar sedes dentro de tu alcance (tu sucursal base y las que ya tienes como visibles). La sucursal base ya da acceso a esa sede; aquí añades otras para consulta.
                  </p>
                )}
                {isAdminActor && (
                  <p className="text-[11px] text-theme-muted mb-1.5">
                    Opcional: sucursales extra que este usuario puede consultar además de su sucursal base (visibilidad de datos, no permisos de edición).
                  </p>
                )}
                {!effectiveBranchId ? (
                  <p className="text-xs text-theme-muted border border-dashed border-theme-color rounded-lg px-3 py-2">
                    Selecciona primero la sucursal base para elegir sucursales adicionales visibles.
                  </p>
                ) : (
                  <>
                    <select
                      {...register('visibleBranchIds')}
                      multiple
                      className="input-field min-h-24"
                      disabled={branchesLoading}
                    >
                      {visibleBranchSelectOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code}){branch.isActive ? '' : ' · inactiva'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-theme-muted mt-0.5">
                      Mantén Ctrl/Cmd para selección múltiple. No incluyas la sucursal base aquí.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Sucursales visibles adicionales</label>
                <p className="text-[11px] text-theme-muted mb-1.5">
                  Solo administración o gerencia general pueden modificarlas. El usuario sigue viendo datos según lo configurado en el servidor.
                </p>
                {dmExtraVisibleRows.length === 0 ? (
                  <p className="text-xs text-theme-muted border border-theme-color rounded-lg px-3 py-2">Ninguna además de la sucursal base.</p>
                ) : (
                  <ul className="text-xs text-theme-secondary border border-theme-color rounded-lg px-3 py-2 space-y-1 list-disc list-inside">
                    {dmExtraVisibleRows.map((row) => (
                      <li key={row.branch.id}>{row.branch.name} ({row.branch.code})</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
