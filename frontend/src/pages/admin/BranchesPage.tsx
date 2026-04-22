import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Save, Trash2, Pencil, X, Plus } from 'lucide-react';
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
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchToDisable, setBranchToDisable] = useState<Branch | null>(null);
  const [branchToHardDelete, setBranchToHardDelete] = useState<Branch | null>(null);

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
    fallbackStrategy: 'active-or-first',
  });

  const selectedBranch = branches?.data.find((branch) => branch.id === effectiveSelectedBranchId);

  const activeBranchesCount = (branches?.data ?? []).filter((branch) => branch.isActive).length;

  const isLastActiveSelectedBranch = Boolean(
    selectedBranch?.isActive && activeBranchesCount <= 1,
  );
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

  const branchSaving = createBranchMutation.isPending || updateBranchMutation.isPending;
  const hasBranches = Boolean(branches?.data?.length);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-theme-primary">Sucursales</h1>
        <p className="text-sm text-theme-muted mt-0.5">
          Configura las ubicaciones de la organización
        </p>
      </div>

      <section className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
            <Building2 className="h-4 w-4" />Gestión de sucursales
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingBranchId(null);
                setBranchForm(emptyBranchForm);
              }}
              className="btn-ghost text-sm inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />Nueva sucursal
            </button>
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
        </div>

        {branchesLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className={`grid gap-4 ${hasBranches ? 'grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]' : 'grid-cols-1'}`}>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {hasBranches ? (
                (branches?.data ?? []).map((branch) => {
                  const active = effectiveSelectedBranchId === branch.id;
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
                })
              ) : (
                <EmptyState icon={Building2} title="Sin sucursales" description="Crea la primera sucursal" />
              )}
            </div>

            <div className="border border-theme-color rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={onSaveBranch}
                  disabled={branchSaving}
                  className="btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
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
                    className="btn-ghost text-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {selectedBranch && (
                  <>
                    <button
                      onClick={() => onEditBranch(selectedBranch)}
                      className="btn-ghost text-sm flex items-center gap-2"
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
                      className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        isLastActiveSelectedBranch
                          ? 'No puedes eliminar la última sucursal activa'
                          : 'Eliminar definitivamente'
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {selectedBranch && isLastActiveSelectedBranch && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  Debe existir al menos una sucursal activa. Crea o activa otra sucursal antes de desactivar/eliminar esta.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

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
