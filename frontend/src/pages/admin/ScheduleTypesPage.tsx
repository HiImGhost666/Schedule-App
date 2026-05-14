import { useState } from 'react';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';
import { Plus, Edit2, Trash2, Palette } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableSkeleton } from '@/components/common/Skeleton';
import { DataTable } from '@/components/common/DataTable';
import type { Column } from '@/components/common/DataTable';
import type { FullScheduleType } from '@/components/schedule/scheduleTypesApi';

export function ScheduleTypesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { types, isLoading, createMutation, updateMutation, deleteMutation } = useScheduleTypes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<FullScheduleType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FullScheduleType | null>(null);

  const isAdmin = currentUser?.role?.name === 'admin';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const labelValue = formData.get('label') as string;
    const colorValue = formData.get('color') as string;
    const newValue = labelValue.toLowerCase().trim().replace(/\s+/g, '_');

    if (editingType) {
      // Solo enviamos el 'value' si ha cambiado realmente respecto al original.
      // Esto evita errores de "valor ya existente" en el backend cuando solo se edita el color.
      const updateData: any = {
        name: labelValue,
        label: labelValue,
        color: colorValue,
      };

      if (newValue !== editingType.value) {
        updateData.value = newValue;
      }

      updateMutation.mutate({ id: editingType.id, data: updateData }, { onSuccess: closeModal });
    } else {
      const data = {
        name: labelValue,
        label: labelValue,
        value: newValue,
        color: colorValue,
      };
      createMutation.mutate(data as any, { onSuccess: closeModal });
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

  const columns: Column<FullScheduleType>[] = [
    {
      key: 'label',
      label: 'Nombre',
      render: (type) => <span className="font-medium text-theme-primary">{type.label}</span>,
    },
    {
      key: 'color',
      label: 'Color',
      render: (type) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-theme-color" style={{ backgroundColor: type.color }} />
          <span className="text-sm font-mono text-theme-secondary">{type.color}</span>
        </div>
      ),
    },
    {
      key: 'value',
      label: 'Identificador',
      render: (type) => <span className="text-theme-muted">{type.value}</span>,
    },
  ];

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
        <h1 className="text-2xl font-bold text-theme-primary">Gestión de Tipos de Turno</h1>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Tipo
          </button>
        )}
      </div>

      <DataTable
        data={Array.isArray(types) ? types : []}
        columns={columns}
        rowKey={(type) => type.id}
        isLoading={false}
        renderActions={isAdmin ? (type) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => { setEditingType(type); setIsModalOpen(true); }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setDeleteTarget(type)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : undefined}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-theme-primary mb-4">{editingType ? 'Editar' : 'Nuevo'} Tipo de Turno</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Nombre</label>
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
        title="Eliminar tipo de turno"
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
