import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarDays, Plus, Save, Trash2, Pencil, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/config/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/apiError';
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

const emptyBranchForm = {
  name: '',
  code: '',
  address: '',
  city: '',
  region: '',
  countryCode: 'ES',
  timezone: 'Europe/Madrid',
};

const emptyHolidayForm = {
  date: '',
  name: '',
  type: 'local' as HolidayType,
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

export function BranchesPage() {
  const qc = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [showInactiveBranches, setShowInactiveBranches] = useState(false);
  const [branchForm, setBranchForm] = useState(emptyBranchForm);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [holidayTypeFilter, setHolidayTypeFilter] = useState<'all' | HolidayType>('all');
  const [holidayForm, setHolidayForm] = useState(emptyHolidayForm);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [branchToDisable, setBranchToDisable] = useState<Branch | null>(null);
  const [branchToHardDelete, setBranchToHardDelete] = useState<Branch | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<BranchHoliday | null>(null);
  const holidayDateInputRef = useRef<HTMLInputElement>(null);

  const { data: branches, isLoading: branchesLoading } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', showInactiveBranches],
    queryFn: () =>
      api
        .get('/branches', { params: { includeInactive: showInactiveBranches } })
        .then((r) => r.data),
  });

  const selectedBranch = useMemo(
    () => branches?.data.find((branch) => branch.id === selectedBranchId),
    [branches?.data, selectedBranchId],
  );

  const activeBranchesCount = useMemo(
    () => (branches?.data ?? []).filter((branch) => branch.isActive).length,
    [branches?.data],
  );

  const isLastActiveSelectedBranch = Boolean(
    selectedBranch?.isActive && activeBranchesCount <= 1,
  );

  useEffect(() => {
    if (!branches?.data?.length) return;
    if (!selectedBranchId || !branches.data.some((b) => b.id === selectedBranchId)) {
      const next = branches.data.find((b) => b.isActive) ?? branches.data[0];
      setSelectedBranchId(next.id);
    }
  }, [branches?.data, selectedBranchId]);

  const { data: holidays, isLoading: holidaysLoading } = useQuery<{ data: BranchHoliday[] }>({
    queryKey: ['branch-holidays', selectedBranchId, holidayYear],
    queryFn: () =>
      api
        .get(`/branches/${selectedBranchId}/holidays`, { params: { year: holidayYear } })
        .then((r) => r.data),
    enabled: Boolean(selectedBranchId),
  });

  const filteredHolidays = useMemo(() => {
    const source = holidays?.data ?? [];
    if (holidayTypeFilter === 'all') return source;
    return source.filter((holiday) => holiday.type === holidayTypeFilter);
  }, [holidays?.data, holidayTypeFilter]);

  const createBranchMutation = useMutation({
    mutationFn: () => api.post('/branches', { ...branchForm, code: branchForm.code.toUpperCase() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Sucursal creada');
      setBranchForm(emptyBranchForm);
      setEditingBranchId(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo crear la sucursal')),
  });

  const updateBranchMutation = useMutation({
    mutationFn: (branchId: string) => api.patch(`/branches/${branchId}`, { ...branchForm, code: branchForm.code.toUpperCase() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Sucursal actualizada');
      setBranchForm(emptyBranchForm);
      setEditingBranchId(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo actualizar la sucursal')),
  });

  const disableBranchMutation = useMutation({
    mutationFn: (branchId: string) => api.delete(`/branches/${branchId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Sucursal desactivada');
      setBranchToDisable(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo desactivar la sucursal')),
  });

  const hardDeleteBranchMutation = useMutation({
    mutationFn: (branchId: string) => api.delete(`/branches/${branchId}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['branch-holidays'] });
      qc.invalidateQueries({ queryKey: ['branch-holidays-calendar'] });
      toast.success('Sucursal eliminada definitivamente');
      setBranchToHardDelete(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo eliminar definitivamente la sucursal')),
  });

  const createHolidayMutation = useMutation({
    mutationFn: () => api.post(`/branches/${selectedBranchId}/holidays`, holidayForm),
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
    mutationFn: (holidayId: string) => api.patch(`/branches/${selectedBranchId}/holidays/${holidayId}`, holidayForm),
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
    mutationFn: (holidayId: string) => api.delete(`/branches/${selectedBranchId}/holidays/${holidayId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-holidays'] });
      qc.invalidateQueries({ queryKey: ['branch-holidays-calendar'] });
      toast.success('Festivo eliminado');
      setHolidayToDelete(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo eliminar el festivo')),
  });

  const onEditBranch = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setBranchForm({
      name: branch.name,
      code: branch.code,
      address: branch.address ?? '',
      city: branch.city ?? '',
      region: branch.region ?? '',
      countryCode: branch.countryCode,
      timezone: branch.timezone,
    });
  };

  const onSaveBranch = () => {
    if (!branchForm.name.trim() || !branchForm.code.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }
    if (editingBranchId) {
      updateBranchMutation.mutate(editingBranchId);
    } else {
      createBranchMutation.mutate();
    }
  };

  const onEditHoliday = (holiday: BranchHoliday) => {
    setEditingHolidayId(holiday.id);
    setHolidayForm({
      date: holiday.date.slice(0, 10),
      name: holiday.name,
      type: holiday.type,
    });
  };

  const onSaveHoliday = () => {
    if (!selectedBranchId) {
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

  const branchSaving = createBranchMutation.isPending || updateBranchMutation.isPending;
  const holidaySaving = createHolidayMutation.isPending || updateHolidayMutation.isPending;

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
        <h1 className="text-2xl font-bold text-theme-primary">Sucursales y Festivos</h1>
        <p className="text-sm text-theme-muted mt-0.5">
          Configura ubicaciones y festivos específicos por sucursal
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-5">
        <section className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
              <Building2 className="h-4 w-4" />Sucursales
            </h2>
            <label className="text-xs text-theme-muted flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showInactiveBranches}
                onChange={(e) => setShowInactiveBranches(e.target.checked)}
                className="rounded border-theme-color"
              />
              Mostrar inactivas
            </label>
          </div>

          {branchesLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
          ) : !branches?.data?.length ? (
            <EmptyState icon={Building2} title="Sin sucursales" description="Crea la primera sucursal" />
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {branches.data.map((branch) => {
                const active = selectedBranchId === branch.id;
                return (
                  <button
                    key={branch.id}
                    onClick={() => setSelectedBranchId(branch.id)}
                    className="w-full text-left rounded-xl border px-3 py-2.5 transition-colors"
                    style={
                      active
                        ? {
                            backgroundColor: 'var(--theme-sidebar-active-bg)',
                            borderColor: 'var(--theme-sidebar-active-bg)',
                            color: 'var(--theme-sidebar-active-text)',
                          }
                        : {
                            backgroundColor: 'var(--theme-surface)',
                            borderColor: 'var(--theme-border-color)',
                            color: 'var(--theme-text-primary)',
                          }
                    }
                  >
                    <p className="text-sm font-semibold truncate">{branch.name}</p>
                    <p className="text-xs opacity-80 truncate">
                      {branch.code} · {branch.city || 'Sin ciudad'}
                    </p>
                    {!branch.isActive && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-semibold">
                        Inactiva
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-theme-color pt-3 space-y-2">
            <input
              className="input-field text-sm"
              placeholder="Nombre"
              value={branchForm.name}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="input-field text-sm"
              placeholder="Código (ej: MAD01)"
              value={branchForm.code}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input-field text-sm"
                placeholder="Ciudad"
                value={branchForm.city}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, city: e.target.value }))}
              />
              <input
                className="input-field text-sm"
                placeholder="Región"
                value={branchForm.region}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, region: e.target.value }))}
              />
            </div>
            <input
              className="input-field text-sm"
              placeholder="Dirección"
              value={branchForm.address}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input-field text-sm"
                placeholder="País (ES)"
                value={branchForm.countryCode}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
              />
              <input
                className="input-field text-sm"
                placeholder="Timezone"
                value={branchForm.timezone}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, timezone: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onSaveBranch}
                disabled={branchSaving}
                className="btn-primary text-sm flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {branchSaving ? <LoadingSpinner size="sm" className="border-white border-t-white/30" /> : <Save className="h-4 w-4" />}
                {editingBranchId ? 'Guardar' : 'Crear'}
              </button>
              {editingBranchId && (
                <button
                  onClick={() => {
                    setEditingBranchId(null);
                    setBranchForm(emptyBranchForm);
                  }}
                  className="btn-ghost text-sm px-3"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {selectedBranch && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onEditBranch(selectedBranch)}
                  className="btn-ghost text-sm flex-1 flex items-center justify-center gap-2"
                >
                  <Pencil className="h-4 w-4" />Editar
                </button>
                <button
                  onClick={() => setBranchToDisable(selectedBranch)}
                  disabled={!selectedBranch.isActive || isLastActiveSelectedBranch}
                  className="text-sm px-3 py-2 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    isLastActiveSelectedBranch
                      ? 'No puedes desactivar la última sucursal activa'
                      : 'Desactivar sucursal'
                  }
                >
                  Desactivar
                </button>
                <button
                  onClick={() => setBranchToHardDelete(selectedBranch)}
                  disabled={isLastActiveSelectedBranch}
                  className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  title={
                    isLastActiveSelectedBranch
                      ? 'No puedes eliminar la última sucursal activa'
                      : 'Eliminar definitivamente'
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {selectedBranch && isLastActiveSelectedBranch && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Debe existir al menos una sucursal activa. Crea o activa otra sucursal antes de desactivar/eliminar esta.
              </p>
            )}
          </div>
        </section>

        <section className="card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />Festivos por sucursal
            </h2>
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

          {!selectedBranch ? (
            <EmptyState icon={CalendarDays} title="Selecciona una sucursal" description="Elige una sucursal para gestionar sus festivos" />
          ) : (
            <>
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
      </div>

      <ConfirmDialog
        open={!!branchToDisable}
        title="Desactivar sucursal"
        description={`¿Quieres desactivar "${branchToDisable?.name ?? ''}"?`}
        confirmLabel="Desactivar"
        variant="warning"
        loading={disableBranchMutation.isPending}
        onConfirm={() => branchToDisable && disableBranchMutation.mutate(branchToDisable.id)}
        onCancel={() => setBranchToDisable(null)}
      />

      <ConfirmDialog
        open={!!branchToHardDelete}
        title="Eliminar sucursal definitivamente"
        description={`Esta acción eliminará "${branchToHardDelete?.name ?? ''}" de forma permanente. Solo es posible si no tiene turnos asociados.`}
        confirmLabel="Eliminar definitivamente"
        variant="danger"
        loading={hardDeleteBranchMutation.isPending}
        onConfirm={() => branchToHardDelete && hardDeleteBranchMutation.mutate(branchToHardDelete.id)}
        onCancel={() => setBranchToHardDelete(null)}
      />

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
