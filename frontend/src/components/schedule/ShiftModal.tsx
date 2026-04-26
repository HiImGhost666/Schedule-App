import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Trash2, Clock, MapPin, FileText, Users, Info, AlertTriangle, CalendarDays } from 'lucide-react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/config/api';
import { SCHEDULE_TYPES, type BranchHoliday, type Schedule, type User } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getApiErrorMessage } from '@/lib/apiError';

const HOLIDAY_COLORS: Record<BranchHoliday['type'], string> = {
  nacional: '#dc2626',
  autonomica: '#ea580c',
  local: '#d97706',
  mejora: '#65a30d',
  regional: '#0ea5e9',
  company: '#7c3aed',
};

const HOLIDAY_TYPE_LABELS: Record<BranchHoliday['type'], string> = {
  nacional: 'Nacional',
  autonomica: 'Autonómica',
  local: 'Local',
  mejora: 'Mejora convenio',
  regional: 'Regional',
  company: 'Empresa',
};

function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function countWorkingDaysWithHolidays(
  start: Date,
  end: Date,
  excludeWeekends: boolean,
  holidayDates: Set<string>,
) {
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    const day = cursor.getDay();
    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidayDates.has(toIsoDate(cursor));

    if (!(excludeWeekends && isWeekend) && !isHoliday) {
      count += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

const shiftSchema = z.object({
  title: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().optional(),
  startDatetime: z.string().min(1, 'Requerido'),
  endDatetime: z.string().min(1, 'Requerido'),
  type: z.string().default('guardia'),
  color: z.string().default('#2563eb'),
  location: z.string().optional(),
  notes: z.string().optional(),
  branchId: z.string().min(1, 'Sucursal requerida'),
  reason: z.string().optional(),
  hoursPerDay: z.coerce.number().min(0.5).max(24).default(8),
});

type ShiftForm = z.infer<typeof shiftSchema>;
type ShiftFormInput = z.input<typeof shiftSchema>;

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  schedule?: Schedule | null;
  defaultStart?: Date;
  defaultEnd?: Date;
  defaultBranchId?: string;
}

export function ShiftModal({ open, onClose, schedule, defaultStart, defaultEnd, defaultBranchId }: ShiftModalProps) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [holidayConflicts, setHolidayConflicts] = useState<BranchHoliday[]>([]);
  const [pendingPayload, setPendingPayload] = useState<(ShiftForm & { assigneeIds: string[] }) | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [asideBranchFilter, setAsideBranchFilter] = useState('');
  const [asideDeptFilter, setAsideDeptFilter] = useState('');
  const [asideSearchFilter, setAsideSearchFilter] = useState('');

  const { data: users } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => api.get<{ data: User[] }>('/users?limit=500&status=active').then((r) => r.data.data),
    enabled: open && canEdit,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', 'shift-modal'],
    queryFn: () => api.get('/branches').then((r) => r.data?.data ?? []),
    enabled: open && canEdit,
  });

  const fmt = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
  const toIsoFromLocalInput = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  };

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm<ShiftFormInput, unknown, ShiftForm>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      type: 'guardia',
      color: '#2563eb',
      hoursPerDay: 8,
      branchId: user?.branchId ?? defaultBranchId ?? '',
      startDatetime: defaultStart ? fmt(defaultStart) : '',
      endDatetime: defaultEnd ? fmt(defaultEnd) : '',
    },
  });

  useEffect(() => {
    if (schedule) {
      reset({
        title: schedule.title,
        description: schedule.description || '',
        startDatetime: fmt(new Date(schedule.startDatetime)),
        endDatetime: fmt(new Date(schedule.endDatetime)),
        type: schedule.type,
        color: schedule.color,
        location: schedule.location || '',
        notes: schedule.notes || '',
        hoursPerDay: schedule.hoursPerDay ?? 8,
        branchId: schedule.branchId ?? defaultBranchId ?? '',
      });
      setSelectedUsers(schedule.assignments.map((a) => a.userId));
      setIncludeWeekends(false);
    } else {
      reset({
        type: 'guardia',
        color: '#2563eb',
        hoursPerDay: 8,
        branchId: user?.branchId ?? defaultBranchId ?? '',
        startDatetime: defaultStart ? fmt(defaultStart) : '',
        endDatetime: defaultEnd ? fmt(defaultEnd) : '',
      });
      setSelectedUsers([]);
      setIncludeWeekends(false);
    }
  }, [schedule, defaultStart, defaultEnd, reset, defaultBranchId, user?.branchId]);

  const selectedType = watch('type');
  const selectedBranchId = watch('branchId');
  const startVal = watch('startDatetime');
  const endVal = watch('endDatetime');
  const isAllBranchesMode = !schedule && !defaultBranchId;

  const availableAssignees = useMemo(() => {
    const sourceUsers = users ?? [];
    if (schedule) return sourceUsers;
    if (!defaultBranchId) return sourceUsers;
    return sourceUsers.filter((candidate) => candidate.branchId === defaultBranchId);
  }, [users, schedule, defaultBranchId]);

  const selectedAssigneeUsers = useMemo(() => {
    const sourceUsers = users ?? [];
    if (sourceUsers.length === 0 || selectedUsers.length === 0) return [];
    return sourceUsers.filter((u) => selectedUsers.includes(u.id));
  }, [users, selectedUsers]);

  const selectedBranchIds = useMemo(() => {
    return Array.from(new Set(selectedAssigneeUsers.map((u) => u.branchId).filter(Boolean))) as string[];
  }, [selectedAssigneeUsers]);

  const autoBranchId = useMemo(() => {
    if (schedule?.branchId) return schedule.branchId;
    if (selectedBranchIds.length > 0) return selectedBranchIds[0];
    if (defaultBranchId) return defaultBranchId;
    if (user?.branchId) return user.branchId;
    return '';
  }, [schedule?.branchId, selectedBranchIds, defaultBranchId, user?.branchId]);

  const selectedBranchName = useMemo(() => {
    if (schedule?.branch?.name) return schedule.branch.name;
    return selectedAssigneeUsers.find((u) => u.branch?.name)?.branch?.name;
  }, [schedule?.branch?.name, selectedAssigneeUsers]);

  useEffect(() => {
    if (!open || !canEdit) return;
    const currentBranchId = getValues('branchId');
    if (currentBranchId === autoBranchId) return;
    setValue('branchId', autoBranchId, { shouldValidate: true, shouldDirty: false });
  }, [open, canEdit, autoBranchId, getValues, setValue]);

  useEffect(() => {
    const typeColor = SCHEDULE_TYPES.find((t) => t.value === selectedType)?.color || '#1e3a5f';
    setValue('color', typeColor);
  }, [selectedType, setValue]);

  const { data: branchRangeHolidays } = useQuery({
    queryKey: ['branch-holidays-modal', selectedBranchId, startVal, endVal],
    queryFn: () =>
      api
        .get<{ data: BranchHoliday[] }>(`/branches/${selectedBranchId}/holidays`, {
          params: {
            ...(startVal ? { from: new Date(startVal).toISOString() } : {}),
            ...(endVal ? { to: new Date(endVal).toISOString() } : {}),
          },
        })
        .then((r) => r.data.data),
    enabled: open && Boolean(selectedBranchId),
  });

  // Live preview calculation
  const hoursPerDayRaw = watch('hoursPerDay');
  const hoursPerDay = typeof hoursPerDayRaw === 'number' ? hoursPerDayRaw : Number(hoursPerDayRaw ?? 8);

  const holidayDates = useMemo(
    () => new Set((branchRangeHolidays ?? []).map((h) => h.date.slice(0, 10))),
    [branchRangeHolidays],
  );

  const preview = useMemo(() => {
    if (!startVal || !endVal) return null;
    try {
      const start = new Date(startVal);
      const end = new Date(endVal);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
      const days = countWorkingDaysWithHolidays(start, end, !includeWeekends, holidayDates);
      const totalHours = Math.round(days * hoursPerDay * 10) / 10;
      return { days, totalHours };
    } catch {
      return null;
    }
  }, [startVal, endVal, hoursPerDay, includeWeekends, holidayDates]);

  const createMutation = useMutation({
    mutationFn: (data: ShiftForm & { assigneeIds: string[] }) => api.post('/schedules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Turno creado');
      onClose();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Error')),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ShiftForm & { assigneeIds: string[] }) =>
      api.patch(`/schedules/${schedule!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Turno actualizado');
      onClose();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (reason: string) => api.delete(`/schedules/${schedule!.id}`, { data: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Turno eliminado');
      onClose();
    },
  });

  const checkHolidayConflicts = useCallback((
    start: Date,
    end: Date,
    holidays: BranchHoliday[],
  ) => {
    const rangeStart = new Date(start);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(end);
    rangeEnd.setHours(23, 59, 59, 999);

    const hits = holidays.filter((holiday) => {
      const holidayDate = new Date(holiday.date);
      holidayDate.setHours(0, 0, 0, 0);

      if (holidayDate < rangeStart || holidayDate > rangeEnd) return false;
      if (includeWeekends) return true;

      const day = holidayDate.getDay();
      return day !== 0 && day !== 6;
    });

    return hits.sort((a, b) => a.date.localeCompare(b.date));
  }, [includeWeekends]);

  const onSubmit = (data: ShiftForm) => {
    if (selectedUsers.length === 0) {
      toast.error('Asigna al menos una persona');
      return;
    }

    if (!schedule && selectedBranchIds.length > 1) {
      toast.error('Selecciona personal de una sola sucursal para crear el turno');
      return;
    }

    if (!data.branchId) {
      toast.error('No se pudo determinar la sucursal del turno');
      return;
    }

    const payload = {
      ...data,
      startDatetime: toIsoFromLocalInput(data.startDatetime),
      endDatetime: toIsoFromLocalInput(data.endDatetime),
      assigneeIds: selectedUsers,
    };

    // Warn when branch holidays overlap selected period.
    if (data.startDatetime && data.endDatetime) {
      const start = new Date(data.startDatetime);
      const end = new Date(data.endDatetime);
      const conflicts = checkHolidayConflicts(start, end, branchRangeHolidays ?? []);
      if (conflicts.length > 0) {
        setHolidayConflicts(conflicts);
        setPendingPayload(payload);
        return; // Wait for user confirmation
      }
    }

    if (schedule) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const confirmDespiteHolidays = () => {
    if (!pendingPayload) return;
    const payloadWithConfirmation = { ...pendingPayload, confirmed: true };
    if (schedule) updateMutation.mutate(payloadWithConfirmation);
    else createMutation.mutate(payloadWithConfirmation);
    setHolidayConflicts([]);
    setPendingPayload(null);
  };


  const cancelConflictDialog = () => {
    setHolidayConflicts([]);
    setPendingPayload(null);
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const filteredUsers = useMemo(() => {
    let result = availableAssignees;
    if (asideBranchFilter) {
      result = result.filter((u) => u.branchId === asideBranchFilter);
    }
    if (asideDeptFilter) {
      result = result.filter((u) => (u.department ?? '').toLowerCase() === asideDeptFilter);
    }
    if (asideSearchFilter) {
      const q = asideSearchFilter.toLowerCase();
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return result;
  }, [availableAssignees, asideBranchFilter, asideDeptFilter, asideSearchFilter]);

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const assigneesContent = (
    <>
      {filteredUsers.map((u) => (
        <label
          key={u.id}
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-theme-surface-muted cursor-pointer border-b border-theme-color last:border-0"
        >
          <input
            type="checkbox"
            checked={selectedUsers.includes(u.id)}
            onChange={() => toggleUser(u.id)}
            className="rounded border-theme-color text-theme-primary focus:ring-theme-primary"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-theme-primary truncate">{u.name}</p>
            <p className="text-xs text-theme-muted truncate">{u.department || u.email}</p>
            {isAllBranchesMode && (
              <p className="text-[10px] text-theme-muted truncate mt-0.5">
                Sucursal: {u.branch?.name ?? 'Sin sucursal'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedProfileUser(u);
              setProfileModalOpen(true);
            }}
            className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-surface-muted rounded-lg transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>
        </label>
      ))}
      {availableAssignees.length === 0 && (
        <div className="px-3 py-4 text-xs text-theme-muted text-center">
          No hay personal activo para la sucursal seleccionada.
        </div>
      )}
    </>
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
        <div className="card rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-theme-color bg-theme-surface z-10">
            <h2 className="text-lg font-semibold text-theme-primary">
              {schedule ? 'Editar Turno' : 'Nuevo Turno'}
            </h2>
            <div className="flex items-center gap-2">
              {schedule && canEdit && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-surface-muted rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] min-h-0 h-[calc(90vh-77px)]">
            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-7 space-y-5 overflow-y-auto min-h-0">
              {/* Title */}
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Título *</label>
              <input {...register('title')} className="input-field" placeholder="Nombre del turno" disabled={!canEdit} />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-1.5">
                {SCHEDULE_TYPES.map((t) => {
                  const active = selectedType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => canEdit && setValue('type', t.value)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all"
                      style={
                        active
                          ? { backgroundColor: t.color, borderColor: t.color, color: '#fff', boxShadow: `0 2px 8px ${t.color}55` }
                          : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-color)', color: 'var(--theme-text-muted)' }
                      }
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border"
                        style={
                          active
                            ? { backgroundColor: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.6)' }
                            : { backgroundColor: t.color, borderColor: t.color }
                        }
                      />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <input type="hidden" {...register('type')} />
              <input type="hidden" {...register('branchId')} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-navy-600 mb-1">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />Inicio *
                </label>
                <div className="relative">
                  <input {...register('startDatetime')} type="datetime-local" className="input-field text-sm pr-9" disabled={!canEdit} />
                  <CalendarDays className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                </div>
                {errors.startDatetime && <p className="text-xs text-red-500 mt-1">{errors.startDatetime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />Fin *
                </label>
                <div className="relative">
                  <input {...register('endDatetime')} type="datetime-local" className="input-field text-sm pr-9" disabled={!canEdit} />
                  <CalendarDays className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                </div>
                {errors.endDatetime && <p className="text-xs text-red-500 mt-1">{errors.endDatetime.message}</p>}
              </div>
            </div>


            {/* Hours per day */}
            <div>
              <div>
                <label className="block text-sm font-medium text-navy-600 mb-1">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />Horas por día
                </label>
                <input
                  {...register('hoursPerDay')}
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  className="input-field text-sm"
                  disabled={!canEdit}
                  placeholder="8"
                />
              </div>
            </div>

            {errors.branchId && <p className="text-xs text-red-500 mt-1">{errors.branchId.message}</p>}

            {/* Weekend checkbox */}
            {canEdit && (
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeWeekends}
                  onChange={(e) => setIncludeWeekends(e.target.checked)}
                  className="rounded border-theme-color text-theme-primary focus:ring-theme-primary w-4 h-4"
                />
                <span className="text-sm text-theme-muted group-hover:text-theme-primary transition-colors">
                  Extender turno al fin de semana
                  <span className="text-xs text-theme-muted ml-1">(por defecto se excluyen)</span>
                </span>
              </label>
            )}

            {/* Live preview */}
            {preview && (
              <div className="flex items-start gap-3 p-3.5 bg-theme-surface-muted border border-theme-color rounded-xl">
                <Info className="h-4 w-4 text-theme-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-theme-primary">
                    {preview.days} día{preview.days !== 1 ? 's' : ''} laborable{preview.days !== 1 ? 's' : ''}
                    {' '}&times; {hoursPerDay} h/día ={' '}
                    <span className="text-navy-900 font-bold">{preview.totalHours} h totales</span>
                  </p>
                  <p className="text-xs text-theme-muted mt-0.5">
                    {!includeWeekends ? 'Fines de semana excluidos' : 'Fines de semana incluidos'}
                    {selectedBranchName ? ` · Sucursal ${selectedBranchName}` : ''}
                    {(branchRangeHolidays?.length ?? 0) > 0 ? ` · ${(branchRangeHolidays?.length ?? 0)} festivo(s) en rango` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">
                <MapPin className="inline h-3.5 w-3.5 mr-1" />Ubicación
              </label>
              <input {...register('location')} className="input-field" placeholder="Ej: Puesto Norte" disabled={!canEdit} />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">
                <FileText className="inline h-3.5 w-3.5 mr-1" />Notas
              </label>
              <textarea {...register('notes')} className="input-field resize-none" rows={2} placeholder="Observaciones adicionales" disabled={!canEdit} />
            </div>

              {/* Assignees (mobile/tablet) */}
              {canEdit && users && (
              <div className="lg:hidden">
                <label className="block text-sm font-medium text-theme-muted mb-2">
                  <Users className="inline h-3.5 w-3.5 mr-1" />Personal asignado *
                  <span className="ml-1 text-xs text-theme-muted">({selectedUsers.length} seleccionados)</span>
                </label>
                <div className="border border-theme-color rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {assigneesContent}
                </div>
              </div>
            )}

            {/* Reason (for edits) */}
            {schedule && canEdit && (
              <div>
                <label className="block text-sm font-medium text-navy-600 mb-1">Motivo del cambio</label>
                <input {...register('reason')} className="input-field" placeholder="Ej: Cambio de última hora por bajas" />
              </div>
            )}

            {canEdit && (
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading && <LoadingSpinner size="sm" className="border-white border-t-white/30" />}
                  {schedule ? 'Guardar cambios' : 'Crear Turno'}
                </button>
              </div>
            )}
            </form>

            {canEdit && users && (
              <aside className="hidden lg:flex min-h-0 border-l border-theme-color bg-theme-surface-muted/20 flex-col">
                <div className="px-5 py-4 border-b border-theme-color bg-theme-surface space-y-3">
                  <p className="text-sm font-medium text-theme-muted">
                    <Users className="inline h-3.5 w-3.5 mr-1" />Personal asignado *
                    <span className="ml-1 text-xs text-theme-muted">({selectedUsers.length} seleccionados)</span>
                  </p>
                  {/* Filtros */}
                  {isAllBranchesMode && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={asideBranchFilter}
                        onChange={(e) => setAsideBranchFilter(e.target.value)}
                        className="text-xs border border-theme-color rounded-lg px-2 py-1.5 text-theme-primary bg-white focus:outline-none focus:ring-1 focus:ring-navy-300"
                      >
                        <option value="">Todas las sucursales</option>
                        {(branches ?? []).map((b: { id: string; name: string }) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <select
                        value={asideDeptFilter}
                        onChange={(e) => setAsideDeptFilter(e.target.value)}
                        className="text-xs border border-theme-color rounded-lg px-2 py-1.5 text-theme-primary bg-white focus:outline-none focus:ring-1 focus:ring-navy-300"
                      >
                        <option value="">Todos los dptos.</option>
                        <option value="seguridad">Seguridad</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="operaciones">Operaciones</option>
                        <option value="administración">Administración</option>
                      </select>
                    </div>
                  )}
                  {!isAllBranchesMode && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={asideDeptFilter}
                        onChange={(e) => setAsideDeptFilter(e.target.value)}
                        className="text-xs border border-theme-color rounded-lg px-2 py-1.5 text-theme-primary bg-white focus:outline-none focus:ring-1 focus:ring-navy-300 col-span-2"
                      >
                        <option value="">Todos los departamentos</option>
                        <option value="seguridad">Seguridad</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="operaciones">Operaciones</option>
                        <option value="administración">Administración</option>
                      </select>
                    </div>
                  )}
                  <input
                    type="text"
                    value={asideSearchFilter}
                    onChange={(e) => setAsideSearchFilter(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="w-full text-xs border border-theme-color rounded-lg px-2 py-1.5 text-theme-primary bg-white focus:outline-none focus:ring-1 focus:ring-navy-300"
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {assigneesContent}
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar Turno"
        description={`¿Estás seguro de eliminar "${schedule?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate('Eliminada por el administrador')}
        onCancel={() => setConfirmDelete(false)}
      />

      {holidayConflicts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="card rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-amber-100 bg-amber-50 rounded-t-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800">Festivos detectados</h3>
                <p className="text-xs text-amber-600 mt-0.5">
                  Hay festivos configurados para la sucursal en el periodo seleccionado
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-72 overflow-y-auto">
              {holidayConflicts.map((holiday) => (
                <div key={holiday.id} className="flex items-center gap-2 text-xs text-theme-muted">
                  <span className="font-mono text-theme-muted">{holiday.date.slice(0, 10)}</span>
                  <span className="truncate flex-1">{holiday.name}</span>
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: HOLIDAY_COLORS[holiday.type], fontSize: '9px' }}
                  >
                    {HOLIDAY_TYPE_LABELS[holiday.type]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 pb-6 pt-2">
              <button
                type="button"
                onClick={cancelConflictDialog}
                className="flex-1 btn-ghost text-sm"
              >
                Revisar fechas
              </button>
              <button
                type="button"
                onClick={confirmDespiteHolidays}
                disabled={isLoading}
                className="flex-1 text-sm px-4 py-2 rounded-xl font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading && <LoadingSpinner size="sm" className="border-white border-t-white/30" />}
                Confirmar igualmente
              </button>
            </div>
          </div>
        </div>
      )}

      <UserProfileModal
        open={profileModalOpen}
        user={selectedProfileUser}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}
