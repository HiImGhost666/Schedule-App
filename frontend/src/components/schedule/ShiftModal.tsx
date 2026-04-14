import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Trash2, Clock, MapPin, FileText, Users, CalendarDays, Info, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/config/api';
import { SCHEDULE_TYPES, type Schedule, type User } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  countWorkingDays,
  getHolidaysForCalendar,
  CALENDAR_LABELS,
  HOLIDAY_COLORS,
  HOLIDAY_TYPE_LABELS,
  type CalendarType,
  type HolidayEntry,
} from '@/config/holidays';

const shiftSchema = z.object({
  title: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().optional(),
  startDatetime: z.string().min(1, 'Requerido'),
  endDatetime: z.string().min(1, 'Requerido'),
  type: z.string().default('guardia'),
  color: z.string().default('#2563eb'),
  location: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  hoursPerDay: z.coerce.number().min(0.5).max(24).default(8),
  calendarType: z.string().default('tenerife'),
});

type ShiftForm = z.infer<typeof shiftSchema>;

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  schedule?: Schedule | null;
  defaultStart?: Date;
  defaultEnd?: Date;
}

export function ShiftModal({ open, onClose, schedule, defaultStart, defaultEnd }: ShiftModalProps) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [holidayConflicts, setHolidayConflicts] = useState<{
    userName: string;
    island: string;
    holidays: HolidayEntry[];
  }[]>([]);
  const [pendingPayload, setPendingPayload] = useState<(ShiftForm & { assigneeIds: string[] }) | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);

  const { data: users } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => api.get<{ data: User[] }>('/users?limit=100&status=active').then((r) => r.data.data),
    enabled: open && canEdit,
  });

  const fmt = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ShiftForm>({
    resolver: zodResolver(shiftSchema) as any,
    defaultValues: {
      type: 'guardia',
      color: '#2563eb',
      hoursPerDay: 8,
      calendarType: 'tenerife',
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
        calendarType: schedule.calendarType ?? 'tenerife',
      });
      setSelectedUsers(schedule.assignments.map((a) => a.userId));
      setIncludeWeekends(false);
    } else {
      reset({
        type: 'guardia',
        color: '#2563eb',
        hoursPerDay: 8,
        calendarType: 'tenerife',
        startDatetime: defaultStart ? fmt(defaultStart) : '',
        endDatetime: defaultEnd ? fmt(defaultEnd) : '',
      });
      setSelectedUsers([]);
      setIncludeWeekends(false);
    }
  }, [schedule, defaultStart, defaultEnd, reset]);

  const selectedType = watch('type');
  useEffect(() => {
    const typeColor = SCHEDULE_TYPES.find((t) => t.value === selectedType)?.color || '#1e3a5f';
    setValue('color', typeColor);
  }, [selectedType, setValue]);

  // Live preview calculation
  const startVal = watch('startDatetime');
  const endVal = watch('endDatetime');
  const hoursPerDay = watch('hoursPerDay');
  const calendarType = watch('calendarType') as CalendarType;

  const preview = useMemo(() => {
    if (!startVal || !endVal) return null;
    try {
      const start = new Date(startVal);
      const end = new Date(endVal);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
      const days = countWorkingDays(start, end, !includeWeekends, calendarType ?? 'tenerife');
      const totalHours = Math.round(days * (hoursPerDay ?? 8) * 10) / 10;
      return { days, totalHours };
    } catch {
      return null;
    }
  }, [startVal, endVal, hoursPerDay, includeWeekends, calendarType]);

  const createMutation = useMutation({
    mutationFn: (data: ShiftForm & { assigneeIds: string[] }) => api.post('/schedules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Turno creado');
      onClose();
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ShiftForm & { assigneeIds: string[] }) =>
      api.patch(`/schedules/${schedule!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Turno actualizado');
      onClose();
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error'),
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
    assigneeIds: string[],
    usersData: User[],
  ) => {
    const conflicts: { userName: string; island: string; holidays: HolidayEntry[] }[] = [];

    for (const uid of assigneeIds) {
      const u = usersData.find((x) => x.id === uid);
      if (!u || !u.islandCalendar || u.islandCalendar === 'none') continue;

      const cal = u.islandCalendar as CalendarType;
      const holidays = getHolidaysForCalendar(cal);

      // Iterate through each day in range
      const hits: HolidayEntry[] = [];
      const cur = new Date(start);
      cur.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);

      while (cur <= endDay) {
        const dow = cur.getDay();
        // Only check working days (respect includeWeekends state)
        if (includeWeekends || (dow !== 0 && dow !== 6)) {
          const isoDate = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
          const match = holidays.find((h) => h.date === isoDate);
          if (match && !hits.find((h) => h.date === match.date)) {
            hits.push(match);
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      if (hits.length > 0) {
        conflicts.push({
          userName: u.name,
          island: cal === 'tenerife' ? 'Tenerife' : 'Las Palmas',
          holidays: hits,
        });
      }
    }

    return conflicts;
  }, [includeWeekends]);

  const onSubmit = (data: ShiftForm) => {
    if (selectedUsers.length === 0) {
      toast.error('Asigna al menos una persona');
      return;
    }
    const payload = { ...data, assigneeIds: selectedUsers };

    // Check for holiday conflicts among assigned users
    if (users && data.startDatetime && data.endDatetime) {
      const start = new Date(data.startDatetime);
      const end = new Date(data.endDatetime);
      const conflicts = checkHolidayConflicts(start, end, selectedUsers, users);
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
    if (schedule) updateMutation.mutate(pendingPayload);
    else createMutation.mutate(pendingPayload);
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

  const isLoading = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  const calOptions: CalendarType[] = ['tenerife', 'las_palmas', 'none'];

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-navy-100 sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold text-navy-800">
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
              <button onClick={onClose} className="p-1.5 text-navy-300 hover:text-navy-500 hover:bg-navy-50 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit as any)} className="p-7 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-navy-600 mb-1">Título *</label>
              <input {...register('title')} className="input-field" placeholder="Nombre del turno" disabled={!canEdit} />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-navy-600 mb-2">Tipo</label>
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
                          : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#475569' }
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
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-navy-600 mb-1">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />Inicio *
                </label>
                <input {...register('startDatetime')} type="datetime-local" className="input-field text-sm" disabled={!canEdit} />
                {errors.startDatetime && <p className="text-xs text-red-500 mt-1">{errors.startDatetime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-600 mb-1">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />Fin *
                </label>
                <input {...register('endDatetime')} type="datetime-local" className="input-field text-sm" disabled={!canEdit} />
                {errors.endDatetime && <p className="text-xs text-red-500 mt-1">{errors.endDatetime.message}</p>}
              </div>
            </div>

            {/* Hours per day + calendar type */}
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-sm font-medium text-navy-600 mb-1">
                  <CalendarDays className="inline h-3.5 w-3.5 mr-1" />Festivos
                </label>
                <div className="flex rounded-lg border border-navy-200 overflow-hidden">
                  {calOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => canEdit && setValue('calendarType', opt)}
                      className="flex-1 py-2 text-xs font-medium transition-colors"
                      style={
                        calendarType === opt
                          ? { backgroundColor: '#1e3a5f', color: '#fff' }
                          : { backgroundColor: '#fff', color: '#64748b' }
                      }
                    >
                      {opt === 'none' ? 'Ninguno' : opt === 'tenerife' ? 'Tenerife' : 'LP'}
                    </button>
                  ))}
                </div>
                <input type="hidden" {...register('calendarType')} />
              </div>
            </div>

            {/* Weekend checkbox */}
            {canEdit && (
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeWeekends}
                  onChange={(e) => setIncludeWeekends(e.target.checked)}
                  className="rounded border-navy-300 text-navy-600 focus:ring-navy-400 w-4 h-4"
                />
                <span className="text-sm text-navy-600 group-hover:text-navy-800 transition-colors">
                  Extender turno al fin de semana
                  <span className="text-xs text-navy-400 ml-1">(por defecto se excluyen)</span>
                </span>
              </label>
            )}

            {/* Live preview */}
            {preview && (
              <div className="flex items-start gap-3 p-3.5 bg-navy-50 border border-navy-200 rounded-xl">
                <Info className="h-4 w-4 text-navy-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-navy-700">
                    {preview.days} día{preview.days !== 1 ? 's' : ''} laborable{preview.days !== 1 ? 's' : ''}
                    {' '}&times; {hoursPerDay ?? 8} h/día ={' '}
                    <span className="text-navy-900 font-bold">{preview.totalHours} h totales</span>
                  </p>
                  <p className="text-xs text-navy-400 mt-0.5">
                    {!includeWeekends ? 'Fines de semana excluidos' : 'Fines de semana incluidos'}
                    {calendarType !== 'none' ? ` · Festivos ${CALENDAR_LABELS[calendarType]}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-navy-600 mb-1">
                <MapPin className="inline h-3.5 w-3.5 mr-1" />Ubicación
              </label>
              <input {...register('location')} className="input-field" placeholder="Ej: Puesto Norte" disabled={!canEdit} />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-navy-600 mb-1">
                <FileText className="inline h-3.5 w-3.5 mr-1" />Notas
              </label>
              <textarea {...register('notes')} className="input-field resize-none" rows={2} placeholder="Observaciones adicionales" disabled={!canEdit} />
            </div>

            {/* Assignees */}
            {canEdit && users && (
              <div>
                <label className="block text-sm font-medium text-navy-600 mb-2">
                  <Users className="inline h-3.5 w-3.5 mr-1" />Personal asignado *
                  <span className="ml-1 text-xs text-navy-400">({selectedUsers.length} seleccionados)</span>
                </label>
                <div className="border border-navy-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-navy-50 cursor-pointer border-b border-navy-100 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="rounded border-navy-300 text-navy-500 focus:ring-navy-400"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-700 truncate">{u.name}</p>
                        <p className="text-xs text-navy-400 truncate">{u.department || u.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedProfileUser(u);
                          setProfileModalOpen(true);
                        }}
                        className="p-1.5 text-navy-300 hover:text-navy-500 hover:bg-navy-50 rounded-lg transition-colors"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </label>
                  ))}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-amber-100 bg-amber-50 rounded-t-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800">Festivos detectados</h3>
                <p className="text-xs text-amber-600 mt-0.5">
                  Algunos técnicos tienen días festivos en el periodo seleccionado
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-72 overflow-y-auto">
              {holidayConflicts.map((c) => (
                <div key={c.userName} className="space-y-1.5">
                  <p className="text-sm font-semibold text-navy-700 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                    {c.userName}
                    <span className="text-xs font-normal text-navy-400">({c.island})</span>
                  </p>
                  <ul className="space-y-0.5 pl-3.5">
                    {c.holidays.map((h) => (
                      <li key={h.date} className="flex items-center gap-2 text-xs text-navy-600">
                        <span className="font-mono text-navy-400">{h.date}</span>
                        <span className="truncate">{h.name}</span>
                        <span
                          className="shrink-0 px-1.5 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: HOLIDAY_COLORS[h.type], fontSize: '9px' }}
                        >
                          {HOLIDAY_TYPE_LABELS[h.type]}
                        </span>
                      </li>
                    ))}
                  </ul>
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
