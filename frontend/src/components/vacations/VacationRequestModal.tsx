import { useState } from 'react';
import { useCreateVacation } from '@/hooks/useVacations';
import { useCancelVacation } from '@/hooks/useVacations';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VacationRequestModal({ open, onClose }: Props) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [overlapWarning, setOverlapWarning] = useState<{
    visible: boolean;
    vacationId: string;
    employees: Array<{ id: string; name: string; email: string }>;
  }>({ visible: false, vacationId: '', employees: [] });

  const createMutation = useCreateVacation();
  const cancelMutation = useCancelVacation();

  if (!open) return null;

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecciona las fechas de inicio y fin');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      toast.error('La fecha de fin debe ser igual o posterior a la de inicio');
      return;
    }

    // Check weekdays
    const dayStart = start.getDay();
    const dayEnd = end.getDay();
    if (dayStart === 0 || dayStart === 6) {
      toast.error('La fecha de inicio debe ser un día laborable (lunes a viernes)');
      return;
    }
    if (dayEnd === 0 || dayEnd === 6) {
      toast.error('La fecha de fin debe ser un día laborable (lunes a viernes)');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        note: note.trim() || undefined,
      });

      if (result.hasOverlap && result.overlappingEmployees.length > 0) {
        setOverlapWarning({
          visible: true,
          vacationId: result.id,
          employees: result.overlappingEmployees,
        });
        toast.success('Solicitud creada con advertencia de solapamiento');
      } else {
        toast.success('Solicitud de vacaciones creada');
        resetForm();
        onClose();
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo crear la solicitud'));
    }
  };

  const handleOverlapConfirm = async () => {
    // The vacation is already created with status 'colindante'
    toast.success('Solicitud de vacaciones creada (colindante)');
    resetForm();
    onClose();
  };

  const handleOverlapCancel = async () => {
    try {
      await cancelMutation.mutateAsync(overlapWarning.vacationId);
      toast.success('Solicitud cancelada');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo cancelar la solicitud'));
    }
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setNote('');
    setOverlapWarning({ visible: false, vacationId: '', employees: [] });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Overlap warning dialog
  if (overlapWarning.visible) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-bold text-theme-primary">Aviso de solapamiento</h2>
            <button onClick={handleClose} className="text-theme-muted hover:text-theme-primary">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-2">
            <p className="font-medium">Tus fechas coinciden con las vacaciones de:</p>
            <ul className="list-disc list-inside space-y-1">
              {overlapWarning.employees.map((emp) => (
                <li key={emp.id}>
                  {emp.name} ({emp.email})
                </li>
              ))}
            </ul>
            <p className="mt-2 text-amber-700">
              La solicitud se ha creado con estado <strong>colindante</strong>.
              ¿Aún así deseas continuar?
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleOverlapCancel}
              className="btn-secondary text-sm"
            >
              Cancelar solicitud
            </button>
            <button
              onClick={handleOverlapConfirm}
              className="btn-primary text-sm"
            >
              Mantener solicitud
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-theme-primary">Solicitar vacaciones</h2>
            <p className="text-sm text-theme-muted mt-0.5">
              Selecciona las fechas para tu solicitud
            </p>
          </div>
          <button onClick={handleClose} className="text-theme-muted hover:text-theme-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">
              Fecha de inicio *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field w-full"
              min={new Date().toISOString().split('T')[0]}
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
              min={startDate || new Date().toISOString().split('T')[0]}
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
              placeholder="Motivo o comentario..."
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
            disabled={createMutation.isPending || !startDate || !endDate}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {createMutation.isPending ? 'Enviando...' : 'Solicitar'}
          </button>
        </div>
      </div>
    </div>
  );
}
