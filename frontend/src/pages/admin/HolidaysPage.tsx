import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Pencil, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/config/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/apiError';
import { getEffectiveBranchId } from '@/lib/branchSelection';
import type { Branch, BranchHoliday } from '@/types';

type HolidayType = BranchHoliday['type'];

const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  nacional: 'Nacional',
  autonomica: 'Autonómica',
  local: 'Local',
  mejora: 'Mejora',
  regional: 'Regional',
  company: 'Empresa',
};

const HOLIDAY_TYPE_COLORS: Record<HolidayType, string> = {
  nacional: '#dc2626',
  autonomica: '#ea580c',
  local: '#d97706',
  mejora: '#65a30d',
  regional: '#0ea5e9',
  company: '#7c3aed',
};

const HOLIDAY_TYPE_FILTERS: Array<{ value: 'all' | HolidayType; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'nacional', label: 'Nacional' },
  { value: 'autonomica', label: 'Autonómica' },
  { value: 'regional', label: 'Regional' },
  { value: 'local', label: 'Local' },
  { value: 'mejora', label: 'Mejora' },
  { value: 'company', label: 'Empresa' },
];

const emptyHolidayForm = {
  date: '',
  name: '',
  type: 'local' as HolidayType,
};

export function HolidaysPage() {
  const qc = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [holidayTypeFilter, setHolidayTypeFilter] = useState<'all' | HolidayType>('all');
  const [holidayForm, setHolidayForm] = useState(emptyHolidayForm);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<BranchHoliday | null>(null);
  const holidayDateInputRef = useRef<HTMLInputElement>(null);

  const { data: branches, isLoading: branchesLoading } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', 'holidays-page'],
    queryFn: () =>
      api
        .get('/branches', { params: { includeInactive: true } })
        .then((r) => r.data),
  });

  const branchList = branches?.data ?? [];
  const hasBranches = branchList.length > 0;

  const effectiveSelectedBranchId = getEffectiveBranchId({
    branches: branchList,
    selectedBranchId,
    fallbackStrategy: 'active-or-first',
  });

  const selectedBranch = branches?.data.find((branch) => branch.id === effectiveSelectedBranchId);

  const { data: holidays, isLoading: holidaysLoading } = useQuery<{ data: BranchHoliday[] }>({
    queryKey: ['branch-holidays', effectiveSelectedBranchId, holidayYear],
    queryFn: () =>
      api
        .get(`/branches/${effectiveSelectedBranchId}/holidays`, { params: { year: holidayYear } })
        .then((r) => r.data),
    enabled: Boolean(effectiveSelectedBranchId),
  });

  const filteredHolidays = useMemo(() => {
    const source = holidays?.data ?? [];
    if (holidayTypeFilter === 'all') return source;
    return source.filter((holiday) => holiday.type === holidayTypeFilter);
  }, [holidays?.data, holidayTypeFilter]);

  const createHolidayMutation = useMutation({
    mutationFn: () => api.post(`/branches/${effectiveSelectedBranchId}/holidays`, holidayForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-holidays'] });
      qc.invalidateQueries({ queryKey: ['branch-holidays-calendar'] });
      toast.success('Festivo creado');
      setHolidayForm(emptyHolidayForm);
      setEditingHolidayId(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo crear el festivo')),
  });

  const updateHolidayMutation = useMutation({
    mutationFn: (holidayId: string) => api.patch(`/branches/${effectiveSelectedBranchId}/holidays/${holidayId}`, holidayForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-holidays'] });
      qc.invalidateQueries({ queryKey: ['branch-holidays-calendar'] });
      toast.success('Festivo actualizado');
      setHolidayForm(emptyHolidayForm);
      setEditingHolidayId(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo actualizar el festivo')),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (holidayId: string) => api.delete(`/branches/${effectiveSelectedBranchId}/holidays/${holidayId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-holidays'] });
      qc.invalidateQueries({ queryKey: ['branch-holidays-calendar'] });
      toast.success('Festivo eliminado');
      setHolidayToDelete(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo eliminar el festivo')),
  });

  const holidaySaving = createHolidayMutation.isPending || updateHolidayMutation.isPending;

  const onEditHoliday = (holiday: BranchHoliday) => {
    setEditingHolidayId(holiday.id);
    setHolidayForm({
      date: holiday.date.slice(0, 10),
      name: holiday.name,
      type: holiday.type,
    });
  };

  const onSaveHoliday = () => {
    if (!effectiveSelectedBranchId) {
      toast.error('Selecciona una sucursal');
      return;
    }
    if (!holidayForm.date || !holidayForm.name.trim()) {
      toast.error('Fecha y nombre son obligatorios');
      return;
    }

    if (editingHolidayId) {
      updateHolidayMutation.mutate(editingHolidayId);
    } else {
      createHolidayMutation.mutate();
    }
  };

  const openHolidayDatePicker = () => {
    const input = holidayDateInputRef.current;
    if (!input) return;

    const pickerCapableInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerCapableInput.showPicker === 'function') {
      pickerCapableInput.showPicker();
      return;
    }

    input.focus();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-theme-primary">Festivos</h1>
        <p className="text-sm text-theme-muted mt-0.5">
          Configura festivos por sucursal de forma independiente
        </p>
      </div>

      <section className="card p-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-theme-muted">
              Sucursal
            </label>
            {branchesLoading ? (
              <div className="flex items-center gap-2 text-sm text-theme-muted"><LoadingSpinner size="sm" />Cargando sucursales…</div>
            ) : !hasBranches ? (
              <p className="text-sm text-theme-muted">No hay sucursales disponibles</p>
            ) : (
              <select
                value={effectiveSelectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="input-field text-sm min-w-72"
              >
                {(branches?.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code}){branch.isActive ? '' : ' · inactiva'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="w-full lg:w-auto flex-1 lg:flex-none border border-theme-color rounded-xl p-3 bg-theme-surface-muted/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Año</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHolidayYear((prev) => Math.max(2000, prev - 1))}
                  className="p-1.5 rounded-lg border border-theme-color text-theme-muted hover:text-theme-primary hover:bg-theme-surface"
                  title="Año anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={holidayYear}
                  onChange={(e) => setHolidayYear(Number(e.target.value) || new Date().getFullYear())}
                  className="input-field text-sm w-24 text-center"
                />
                <button
                  type="button"
                  onClick={() => setHolidayYear((prev) => Math.min(2100, prev + 1))}
                  className="p-1.5 rounded-lg border border-theme-color text-theme-muted hover:text-theme-primary hover:bg-theme-surface"
                  title="Año siguiente"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />Tipo de festivo
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HOLIDAY_TYPE_FILTERS.map((option) => {
                  const active = holidayTypeFilter === option.value;
                  const tone = option.value === 'all' ? '#475569' : HOLIDAY_TYPE_COLORS[option.value as HolidayType];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setHolidayTypeFilter(option.value)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors"
                      style={
                        active
                          ? { backgroundColor: tone, borderColor: tone, color: '#fff' }
                          : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-color)', color: 'var(--theme-text-muted)' }
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {!hasBranches ? (
          <EmptyState icon={CalendarDays} title="Sin sucursales" description="Crea una sucursal para poder configurar festivos" />
        ) : !selectedBranch ? (
          <EmptyState icon={CalendarDays} title="Selecciona una sucursal" description="Elige una sucursal para gestionar sus festivos" />
        ) : (
          <>
            {selectedBranch && !selectedBranch.isActive && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Estás configurando una sucursal inactiva.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="relative">
                <input
                  ref={holidayDateInputRef}
                  type="date"
                  className="input-field text-sm pr-10"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={openHolidayDatePicker}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-theme-muted hover:text-theme-primary hover:bg-theme-surface-muted"
                  title="Abrir calendario"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </div>
              <input
                className="input-field text-sm md:col-span-2"
                placeholder="Nombre del festivo"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <select
                className="input-field text-sm"
                value={holidayForm.type}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, type: e.target.value as HolidayType }))}
              >
                {Object.entries(HOLIDAY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onSaveHoliday}
                disabled={holidaySaving}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {holidaySaving ? <LoadingSpinner size="sm" className="border-white border-t-white/30" /> : <Plus className="h-4 w-4" />}
                {editingHolidayId ? 'Guardar cambios' : 'Añadir festivo'}
              </button>
              {editingHolidayId && (
                <button
                  onClick={() => {
                    setEditingHolidayId(null);
                    setHolidayForm(emptyHolidayForm);
                  }}
                  className="btn-ghost text-sm"
                >
                  Cancelar
                </button>
              )}
            </div>

            {holidaysLoading ? (
              <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
            ) : !holidays?.data?.length ? (
              <EmptyState icon={CalendarDays} title="Sin festivos" description="No hay festivos cargados para este año" />
            ) : !filteredHolidays.length ? (
              <EmptyState icon={Filter} title="Sin resultados" description="No hay festivos para el tipo seleccionado" />
            ) : (
              <div className="overflow-x-auto border border-theme-color rounded-xl">
                <table className="w-full">
                  <thead>
                    <tr className="bg-theme-surface-muted border-b border-theme-color">
                      <th className="text-left px-4 py-2.5 text-xs text-theme-muted uppercase">Fecha</th>
                      <th className="text-left px-4 py-2.5 text-xs text-theme-muted uppercase">Nombre</th>
                      <th className="text-left px-4 py-2.5 text-xs text-theme-muted uppercase">Tipo</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-color">
                    {filteredHolidays.map((holiday) => (
                      <tr key={holiday.id} className="hover:bg-theme-surface-muted/60 transition-colors">
                        <td className="px-4 py-2.5 text-sm text-theme-primary">
                          {format(new Date(holiday.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-theme-primary">{holiday.name}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold"
                            style={{ backgroundColor: HOLIDAY_TYPE_COLORS[holiday.type] }}
                          >
                            {HOLIDAY_TYPE_LABELS[holiday.type]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => onEditHoliday(holiday)}
                              className="p-1.5 rounded-lg hover:bg-theme-surface-muted text-theme-muted hover:text-theme-primary"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setHolidayToDelete(holiday)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={!!holidayToDelete}
        title="Eliminar festivo"
        description={`¿Quieres eliminar "${holidayToDelete?.name ?? ''}"?`}
        confirmLabel="Eliminar"
        loading={deleteHolidayMutation.isPending}
        onConfirm={() => holidayToDelete && deleteHolidayMutation.mutate(holidayToDelete.id)}
        onCancel={() => setHolidayToDelete(null)}
      />
    </div>
  );
}
