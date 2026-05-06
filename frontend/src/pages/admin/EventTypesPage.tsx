import React, { useState } from 'react';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';
import { Plus, Edit2, Trash2, Palette } from 'lucide-react';
import type { CreateScheduleTypeInput, FullScheduleType } from '@/components/schedule/scheduleTypesApi';

export default function EventTypesPage() {
  const { types, isLoading, createMutation, updateMutation, deleteMutation } = useScheduleTypes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<FullScheduleType | null>(null);

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

  if (isLoading) return <div className="p-8 text-center">Cargando tipos de evento...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Tipos de Evento</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
        >
          <Plus size={18} /> Nuevo Tipo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600">Etiqueta</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Color</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Identificador</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {Array.isArray(types) && types.map((type: FullScheduleType) => (
              <tr key={type.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium">{type.label}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: type.color }} />
                    <span className="text-sm font-mono">{type.color}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{type.value}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setEditingType(type); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => confirm('¿Borrar?') && deleteMutation.mutate(type.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{editingType ? 'Editar' : 'Nuevo'} Tipo de Evento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre (Etiqueta)</label>
                <input 
                  name="label" 
                  defaultValue={editingType?.label} 
                  required 
                  className="w-full border rounded-lg px-3 py-2" 
                  placeholder="Ej: Guardia Nocturna"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Palette size={14} /> Color
                </label>
                <input 
                  type="color" 
                  name="color" 
                  defaultValue={editingType?.color || '#4F46E5'} 
                  className="w-full h-10 border rounded-lg p-1 cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}