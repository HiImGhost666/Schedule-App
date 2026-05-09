import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';
import api from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/common/Skeleton';
import toast from 'react-hot-toast';

interface ShiftPreset {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShiftPresetFormData {
  name: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export default function ShiftPresetsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role?.name === 'admin';
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ShiftPreset | null>(null);

  const { data: presets, isLoading } = useQuery<ShiftPreset[]>({
    queryKey: ['shift-presets'],
    queryFn: async () => {
      const { data } = await api.get('/shift-presets');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: ShiftPresetFormData) => {
      const { data } = await api.post('/shift-presets', formData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-presets'] });
      toast.success('Turno predefinido creado');
      closeModal();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Error al crear turno predefinido');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: Partial<ShiftPresetFormData> }) => {
      const { data } = await api.patch(`/shift-presets/${id}`, formData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-presets'] });
      toast.success('Turno predefinido actualizado');
      closeModal();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Error al actualizar turno predefinido');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/shift-presets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-presets'] });
      toast.success('Turno predefinido eliminado');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Error al eliminar turno predefinido');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: ShiftPresetFormData = {
      name: formData.get('name') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
    };

    if (editingPreset) {
      updateMutation.mutate({ id: editingPreset.id, formData: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateModal = () => {
    setEditingPreset(null);
    setIsModalOpen(true);
  };

  const openEditModal = (preset: ShiftPreset) => {
    setEditingPreset(preset);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPreset(null);
  };

  const handleDelete = (preset: ShiftPreset) => {
    if (window.confirm(`¿Eliminar el turno predefinido "${preset.name}"?`)) {
      deleteMutation.mutate(preset.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Turnos Predefinidos</h1>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
          >
            <Plus size={18} /> Nuevo Turno
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600">Nombre</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Inicio</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Fin</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Estado</th>
              {isAdmin && <th className="px-6 py-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {Array.isArray(presets) && presets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  No hay turnos predefinidos. Crea el primero.
                </td>
              </tr>
            )}
            {Array.isArray(presets) && presets.map((preset) => (
              <tr key={preset.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium">{preset.name}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-sm font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    <Clock size={14} /> {preset.startTime}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-sm font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded">
                    <Clock size={14} /> {preset.endTime}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      preset.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {preset.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(preset)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(preset)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Eliminar"
                    >
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">
              {editingPreset ? 'Editar' : 'Nuevo'} Turno Predefinido
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  name="name"
                  defaultValue={editingPreset?.name}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ej: Turno Mañana"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora de inicio</label>
                <input
                  type="time"
                  name="startTime"
                  defaultValue={editingPreset?.startTime || '09:00'}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora de fin</label>
                <input
                  type="time"
                  name="endTime"
                  defaultValue={editingPreset?.endTime || '17:00'}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
