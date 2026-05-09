import { useState } from 'react';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';
import { Plus, Edit2, Trash2, Palette } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableSkeleton } from '@/components/common/Skeleton';
import type { CreateScheduleTypeInput, FullScheduleType } from '@/components/schedule/scheduleTypesApi';

export function EventTypesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { types, isLoading, createMutation, updateMutation, deleteMutation } = useScheduleTypes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<FullScheduleType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FullScheduleType | null>(null);

  const isAdmin = currentUser?.role?.name === 'admin';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      label: formData.get('label') as string,
      value: (formData.get('label') as string).toLowerCase().replace(/\s+/g, '_'),
      color: formData.get('color') as string,
    };

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data }, { onSuccess: closeModal });
    } else {
      createMutation.mutate(data as CreateScheduleTypeInput, { onSuccess: closeModal });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <TableSkeleton rows={4} cols={3} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-theme-primary">Gestión de Tipos de Evento</h1>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Tipo
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-theme-surface-muted border-b border-theme-color">
            <tr>
              <th className="px-6 py-4 font-semibold text-theme-muted">Etiqueta</th>
              <th className="px-6 py-4 font-semibold text-theme-muted">Color</th>
              <th className="px-6 py-4 font-semibold text-theme-muted">Identificador</th>
              {isAdmin && <th className="px-6 py-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-color">
            {Array.isArray(types) && types.map((type: FullScheduleType) => (
              <tr key={type.id} className="hover:bg-theme-surface-muted/50 transition">
                <td className="px-6 py-4 font-medium text-theme-primary">{type.label}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border border-theme-color" style={{ backgroundColor: type.color }} />
                    <span className="text-sm font-mono text-theme-secondary">{type.color}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-theme-muted">{type.value}</td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditingType(type); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget(type)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-theme-primary mb-4">{editingType ? 'Editar' : 'Nuevo'} Tipo de Evento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Nombre (Etiqueta)</label>
                <input 
                  name="label" 
                  defaultValue={editingType?.label} 
                  required 
                  className="input-field" 
                  placeholder="Ej: Guardia Nocturna"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-theme-muted mb-1 flex items-center gap-2">
                  <Palette size={14} /> Color
                </label>
                <input 
                  type="color" 
                  name="color" 
                  defaultValue={editingType?.color || '#4F46E5'} 
                  className="w-full h-10 border border-theme-color rounded-lg p-1 cursor-pointer bg-theme-surface"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="btn-ghost text-sm">Cancelar</button>
                <button type="submit" className="btn-primary text-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar tipo de evento"
        description={`¿Estás seguro de que deseas eliminar "${deleteTarget?.label}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
