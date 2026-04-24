import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Save, X, Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/config/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/apiError';
import { getEffectiveBranchId } from '@/lib/branchSelection';
import type { Branch } from '@/types';

const emptyBranchForm = {
  name: '',
  code: '',
  address: '',
  city: '',
  region: '',
  countryCode: 'ES',
  timezone: 'Europe/Madrid',
};

export function BranchesPage() {
  const qc = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [showInactiveBranches, setShowInactiveBranches] = useState(false);
  const [branchForm, setBranchForm] = useState(emptyBranchForm);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchToActivate, setBranchToActivate] = useState<Branch | null>(null);
  const [branchToDisable, setBranchToDisable] = useState<Branch | null>(null);
  const [branchToHardDelete, setBranchToHardDelete] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'code'>('name');

  const { data: branches, isLoading: branchesLoading } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches', showInactiveBranches],
    queryFn: () =>
      api
        .get('/branches', { params: { includeInactive: showInactiveBranches } })
        .then((r) => r.data),
  });

  const effectiveSelectedBranchId = getEffectiveBranchId({
    branches: branches?.data,
    selectedBranchId,
    fallbackStrategy: 'first',
  });

  const filteredAndSortedBranches = useMemo(() => {
    const branchList = branches?.data ?? [];

    const filtered = searchTerm
      ? branchList.filter(
          (branch) =>
            branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.code.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : branchList;

    return [...filtered].sort((a, b) => {
      return a[sortBy].localeCompare(b[sortBy], 'es', { sensitivity: 'base' });
    });
  }, [branches?.data, searchTerm, sortBy]);

  const selectedBranch = branches?.data?.find((branch) => branch.id === effectiveSelectedBranchId) ?? null;

  const activeBranchesCount = (branches?.data ?? []).filter((branch) => branch.isActive).length;
  const createBranchMutation = useMutation({
    mutationFn: () => api.post('/branches', { ...branchForm, code: branchForm.code.toUpperCase() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Sucursal creada');
      setBranchForm(emptyBranchForm);
      setIsCreatingBranch(false);
      setEditingBranchId(null);
      setSelectedBranchId('');
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo crear la sucursal')),
  });

  const updateBranchMutation = useMutation({
    mutationFn: (branchId: string) => api.patch(`/branches/${branchId}`, { ...branchForm, code: branchForm.code.toUpperCase() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Sucursal actualizada');
      setBranchForm(emptyBranchForm);
      setIsCreatingBranch(false);
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

  const activateBranchMutation = useMutation({
    mutationFn: (branchId: string) => api.patch(`/branches/${branchId}`, { isActive: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Sucursal activada');
      setBranchToActivate(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo activar la sucursal')),
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

  const onSelectBranch = (branch: Branch) => {
    setSelectedBranchId(branch.id);
    setIsCreatingBranch(false);
    setEditingBranchId(null);
  };

  const startEditBranch = (branch: Branch) => {
    setSelectedBranchId(branch.id);
    setIsCreatingBranch(true);
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
      return;
    }

    createBranchMutation.mutate();
  };

  const branchSaving = createBranchMutation.isPending || updateBranchMutation.isPending;
  const hasBranches = Boolean(branches?.data?.length);
  const inactiveBranchesCount = Math.max((branches?.data?.length ?? 0) - activeBranchesCount, 0);

  const startNewBranch = () => {
    setSelectedBranchId('');
    setIsCreatingBranch(true);
    setEditingBranchId(null);
    setBranchForm(emptyBranchForm);
  };

  const cancelNewBranch = () => {
    setIsCreatingBranch(false);
    setEditingBranchId(null);
    setBranchForm(emptyBranchForm);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <section
        className="card border border-theme-color rounded-2xl p-5 sm:p-6 space-y-4"
        style={{ background: 'linear-gradient(140deg, var(--theme-surface), color-mix(in srgb, var(--theme-surface) 82%, var(--theme-sidebar-active-bg) 18%))' }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Administración</p>
            <h1 className="text-2xl font-bold text-theme-primary mt-1">Sucursales</h1>
            <p className="text-sm text-theme-muted mt-1">
              Gestiona ubicaciones, códigos y datos operativos de cada sede.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="rounded-xl border border-theme-color bg-theme-surface px-3 py-2 min-w-24">
              <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Total</p>
              <p className="text-lg font-bold text-theme-primary leading-tight">{branches?.data?.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-theme-color bg-theme-surface px-3 py-2 min-w-24">
              <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Activas</p>
              <p className="text-lg font-bold text-theme-primary leading-tight">{activeBranchesCount}</p>
            </div>
            <div className="rounded-xl border border-theme-color bg-theme-surface px-3 py-2 min-w-24">
              <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Inactivas</p>
              <p className="text-lg font-bold text-theme-primary leading-tight">{inactiveBranchesCount}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-theme-color bg-theme-surface px-3 py-2.5">
          <h2 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Gestión de sucursales
          </h2>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="text-xs text-theme-muted flex items-center gap-2 rounded-lg border border-theme-color px-2.5 py-1.5 bg-theme-surface-muted/30">
              <input
                type="checkbox"
                checked={showInactiveBranches}
                onChange={(e) => setShowInactiveBranches(e.target.checked)}
                className="rounded border-theme-color"
              />
              Mostrar inactivas
            </label>
          </div>
        </div>
      </section>

      <section className="card border border-theme-color rounded-2xl p-4 sm:p-5">
        {branchesLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className={`grid gap-4 lg:gap-5 ${hasBranches ? 'grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)]' : 'grid-cols-1'}`}>
            <aside className="rounded-xl border border-theme-color bg-theme-surface p-2.5 sm:p-3">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-theme-color">
                <p className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Listado</p>
                <p className="text-[11px] text-theme-muted">{branches?.data?.length ?? 0} sucursales</p>
              </div>

              <div className="p-2 space-y-2 border-b border-theme-color">
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  className="input-field text-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-2 text-xs px-1">
                  <span className="text-theme-muted shrink-0">Ordenar por:</span>
                  <button
                    onClick={() => setSortBy('name')}
                    className={`px-2 py-0.5 rounded-md transition-colors text-xs ${sortBy === 'name' ? 'bg-theme-primary text-white font-semibold' : 'bg-theme-surface-muted hover:bg-theme-surface-hover'}`}
                  >
                    Nombre
                  </button>
                  <button
                    onClick={() => setSortBy('code')}
                    className={`px-2 py-0.5 rounded-md transition-colors text-xs ${sortBy === 'code' ? 'bg-theme-primary text-white font-semibold' : 'bg-theme-surface-muted hover:bg-theme-surface-hover'}`}
                  >
                    Código
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[25rem] overflow-y-auto mt-2 pr-1">
                {hasBranches ? (
                  filteredAndSortedBranches.map((branch) => {
                    const active = !isCreatingBranch && effectiveSelectedBranchId === branch.id;
                    return (
                      <button
                        key={branch.id}
                        onClick={() => onSelectBranch(branch)}
                        className="w-full text-left rounded-xl border px-3 py-2.5 transition-all focus:outline-none focus-visible:ring-2"
                        style={
                          active
                            ? {
                                backgroundColor: 'var(--theme-sidebar-active-bg)',
                                borderColor: 'var(--theme-sidebar-active-bg)',
                                color: 'var(--theme-sidebar-active-text)',
                                boxShadow: '0 0 0 2px color-mix(in srgb, var(--theme-sidebar-active-bg) 45%, transparent)',
                              }
                            : {
                                backgroundColor: 'var(--theme-surface)',
                                borderColor: 'var(--theme-border-color)',
                                color: 'var(--theme-text-primary)',
                              }
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{branch.name}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                              branch.isActive
                                ? 'border border-theme-color bg-theme-surface text-theme-primary'
                                : 'bg-amber-500/20 text-amber-700'
                            }`}
                          >
                            {branch.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <p className="text-xs opacity-85 truncate mt-0.5">{branch.code}</p>
                        <p className="text-xs opacity-75 truncate mt-0.5">{branch.city || 'Sin ciudad'}</p>
                      </button>
                    );
                  })
                ) : (
                  <EmptyState icon={Building2} title="Sin sucursales" description="Crea la primera sucursal" className="py-10" />
                )}
              </div>

              <button
                type="button"
                onClick={startNewBranch}
                className="mt-3 w-full btn-ghost text-sm inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />Nueva sucursal
              </button>
            </aside>

            <div className="rounded-xl border border-theme-color bg-theme-surface p-4 sm:p-5 space-y-4">
              {isCreatingBranch ? (
                <>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-theme-primary">
                      {editingBranchId ? 'Editar sucursal' : 'Nueva sucursal'}
                    </h3>
                    <p className="text-xs text-theme-muted">
                      Completa los datos principales. Nombre y código son obligatorios.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-theme-muted">Nombre</span>
                      <input
                        className="input-field text-sm"
                        placeholder="Nombre"
                        value={branchForm.name}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-theme-muted">Código</span>
                      <input
                        className="input-field text-sm"
                        placeholder="Código (ej: MAD01)"
                        value={branchForm.code}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-theme-muted">Ciudad</span>
                      <input
                        className="input-field text-sm"
                        placeholder="Ciudad"
                        value={branchForm.city}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, city: e.target.value }))}
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-theme-muted">Región</span>
                      <input
                        className="input-field text-sm"
                        placeholder="Región"
                        value={branchForm.region}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, region: e.target.value }))}
                      />
                    </label>
                  </div>

                  <label className="space-y-1 block">
                    <span className="text-xs font-medium text-theme-muted">Dirección</span>
                    <input
                      className="input-field text-sm"
                      placeholder="Dirección"
                      value={branchForm.address}
                      onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-theme-muted">País</span>
                      <input
                        className="input-field text-sm"
                        placeholder="País (ES)"
                        value={branchForm.countryCode}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-theme-muted">Timezone</span>
                      <input
                        className="input-field text-sm"
                        placeholder="Timezone"
                        value={branchForm.timezone}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, timezone: e.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-theme-color/80 pt-3">
                    <button
                      type="button"
                      onClick={onSaveBranch}
                      disabled={branchSaving}
                      className="btn-primary text-sm min-w-28 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {branchSaving ? <LoadingSpinner size="sm" className="border-white border-t-white/30" /> : <Save className="h-4 w-4" />}
                      {editingBranchId ? 'Guardar cambios' : 'Crear'}
                    </button>

                    <button
                      type="button"
                      onClick={cancelNewBranch}
                      className="btn-ghost text-sm inline-flex items-center gap-1.5"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                  </div>
                </>
              ) : selectedBranch ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Sucursal seleccionada</p>
                      <h3 className="text-base font-semibold text-theme-primary">{selectedBranch.name}</h3>
                      <p className="text-xs text-theme-muted">{selectedBranch.code}</p>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        selectedBranch.isActive
                          ? 'border border-theme-color bg-theme-surface text-theme-primary'
                          : 'bg-amber-500/15 text-amber-600'
                      }`}
                    >
                      {selectedBranch.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-theme-color bg-theme-surface-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Nombre</p>
                      <p className="text-sm text-theme-primary mt-1">{selectedBranch.name}</p>
                    </div>
                    <div className="rounded-xl border border-theme-color bg-theme-surface-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Código</p>
                      <p className="text-sm text-theme-primary mt-1">{selectedBranch.code}</p>
                    </div>
                    <div className="rounded-xl border border-theme-color bg-theme-surface-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Ciudad</p>
                      <p className="text-sm text-theme-primary mt-1">{selectedBranch.city || 'Sin ciudad'}</p>
                    </div>
                    <div className="rounded-xl border border-theme-color bg-theme-surface-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Región</p>
                      <p className="text-sm text-theme-primary mt-1">{selectedBranch.region || 'Sin región'}</p>
                    </div>
                    <div className="rounded-xl border border-theme-color bg-theme-surface-muted/30 p-3 md:col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Dirección</p>
                      <p className="text-sm text-theme-primary mt-1">{selectedBranch.address || 'Sin dirección'}</p>
                    </div>
                    <div className="rounded-xl border border-theme-color bg-theme-surface-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">País</p>
                      <p className="text-sm text-theme-primary mt-1">{selectedBranch.countryCode}</p>
                    </div>
                    <div className="rounded-xl border border-theme-color bg-theme-surface-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-theme-muted font-semibold">Zona horaria</p>
                      <p className="text-sm text-theme-primary mt-1">{selectedBranch.timezone}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-theme-color/80 pt-3">
                    {selectedBranch.isActive ? (
                      <button
                        type="button"
                        onClick={() => setBranchToDisable(selectedBranch)}
                        disabled={disableBranchMutation.isPending}
                        className="btn-ghost text-sm inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBranchToActivate(selectedBranch)}
                        disabled={activateBranchMutation.isPending}
                        className="btn-ghost text-sm inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        Activar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setBranchToHardDelete(selectedBranch)}
                      disabled={hardDeleteBranchMutation.isPending}
                      className="btn-ghost text-sm inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      Eliminar definitivamente
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditBranch(selectedBranch)}
                      className="btn-ghost text-sm inline-flex items-center gap-1.5"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar sucursal
                    </button>
                  </div>
                </>
              ) : (
                <EmptyState icon={Building2} title="Sin sucursales" description="Crea la primera sucursal" className="py-10" />
              )}
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!branchToActivate}
        title="Activar sucursal"
        description={`¿Quieres activar "${branchToActivate?.name ?? ''}"?`}
        confirmLabel="Activar"
        variant="warning"
        loading={activateBranchMutation.isPending}
        onConfirm={() => branchToActivate && activateBranchMutation.mutate(branchToActivate.id)}
        onCancel={() => setBranchToActivate(null)}
      />

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
    </div>
  );
}
