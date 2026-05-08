import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCreateVacation, useApproveVacation } from '@/hooks/useVacations';
import api from '@/config/api';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import { X } from 'lucide-react';
import type { User } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  branchId?: string;
  departmentId?: string;
}

export function VacationCreateModal({ open, onClose, branchId, departmentId }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');

  const createMutation = useCreateVacation();
  const approveMutation = useApproveVacation();

  const { data: usersData } = useQuery<{ data: User[] }>({
    queryKey: ['users', 'vacation-create', branchId, departmentId],
    queryFn: () =>
      api.get('/users', {
        params: {
          ...(branchId ? { branchId } : {}),
          ...(departmentId ? { departmentId } : {}),
          status: 'active',
        },
      }).then((r) => r.data),
    enabled: open,
  });

  const users = usersData?.data ?? [];

  if (!open) return null;

  const handleSubmit = async () => {
    if (!selectedUserId || !startDate || !endDate) {
      toast.error('Selecciona un empleado y las fechas');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      toast.error('La fecha de fin debe ser igual o posterior a la de inicio');
      return;
    }

    try {
      // Create the vacation request
      const vacation = await createMutation.mutateAsync({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        note: note.trim() || undefined,
      });

      // Auto-approve it
      await approveMutation.mutateAsync({ id: vacation.id });

      toast.success('Vacaciones creadas y aprobadas');
      resetForm();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudieron crear las vacaciones'));
    }
  };

  const resetForm = () => {
    setSelectedUserId('');
    setStartDate('');
    setEndDate('');
    setNote('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isPending = createMutation.isPending || approveMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-theme-primary">Crear vacaciones</h2>
            <p className="text-sm text-theme-muted mt-0.5">
              Las vacaciones se crearán y aprobarán automáticamente
            </p>
          </div>
          <button onClick={handleClose} className="text-theme-muted hover:text-theme-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">
              Empleado *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Seleccionar empleado...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.employeeId ? `(${user.employeeId})` : ''}
                  {user.department ? ` - ${user.department.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">
              Fecha de inicio *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">
              Fecha de fin *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field w-full"
              min={startDate || undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field w-full resize-none"
              rows={3}
              maxLength={500}
              placeholder="Comentario..."
            />
            <p className="text-xs text-theme-muted mt-1 text-right">{note.length}/500</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={handleClose} className="btn-secondary text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !selectedUserId || !startDate || !endDate}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {isPending ? 'Creando...' : 'Crear y aprobar'}
          </button>
        </div>
      </div>
    </div>
  );
}
