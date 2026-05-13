import type { VacationRequest } from '@/types';
import { VacationStatusBadge } from './VacationStatusBadge';
import { X, Calendar, MapPin, Building2, MessageSquare, UserCheck, UserX, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VacationDetailModalProps {
  open: boolean;
  onClose: () => void;
  vacation: VacationRequest | null;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  canApprove?: boolean;
  canCancel?: boolean;
  isActionPending?: boolean;
}

export function VacationDetailModal({
  open,
  onClose,
  vacation,
  onApprove,
  onReject,
  onCancel,
  canApprove,
  canCancel,
  isActionPending
}: VacationDetailModalProps) {
  if (!open || !vacation) return null;

  const formatDate = (date: string) => format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="bg-theme-primary/5 p-6 flex justify-between items-start border-b border-theme-primary/10">
          <div>
            <h2 className="text-xl font-bold text-theme-primary">Detalles de Vacaciones</h2>
            <p className="text-sm text-theme-muted mt-1">ID Solicitud: {vacation.id.slice(-8).toUpperCase()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full text-theme-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Status and Employee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary font-bold text-lg">
                {vacation.employee.name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-theme-primary">{vacation.employee.name}</div>
                <div className="text-sm text-theme-muted">{vacation.employee.email}</div>
              </div>
            </div>
            <VacationStatusBadge status={vacation.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-theme-primary mt-0.5" />
              <div>
                <p className="text-xs font-medium text-theme-muted uppercase">Fechas</p>
                <p className="text-sm font-medium text-theme-primary">Desde: {formatDate(vacation.startDate)}</p>
                <p className="text-sm font-medium text-theme-primary">Hasta: {formatDate(vacation.endDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-theme-primary mt-0.5" />
              <div>
                <p className="text-xs font-medium text-theme-muted uppercase">Sucursal</p>
                <p className="text-sm font-medium text-theme-primary">{vacation.branch?.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-theme-primary mt-0.5" />
              <div>
                <p className="text-xs font-medium text-theme-muted uppercase">Departamento</p>
                <p className="text-sm font-medium text-theme-primary">{vacation.department?.name || '-'}</p>
              </div>
            </div>
          </div>

          {vacation.note && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex gap-3">
              <MessageSquare className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-theme-muted uppercase mb-1">Nota del empleado</p>
                <p className="text-sm text-gray-700 italic">"{vacation.note}"</p>
              </div>
            </div>
          )}

          {vacation.status === 'rejected' && vacation.rejectionReason && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3">
              <UserX className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-600 uppercase mb-1">Motivo de rechazo</p>
                <p className="text-sm text-red-800 font-medium">{vacation.rejectionReason}</p>
              </div>
            </div>
          )}

          {(vacation.status === 'approved' || vacation.status === 'rejected') && vacation.reviewer && (
            <div className="flex items-center gap-2 pt-2 text-xs text-theme-muted border-t border-gray-100 pt-4">
              <UserCheck className="h-4 w-4" />
              <span>Revisado por <span className="font-semibold">{vacation.reviewer.name}</span> el {vacation.reviewedAt ? formatDate(vacation.reviewedAt) : '-'}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {(canApprove || canCancel) && (
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
            {canCancel && (
              <button
                onClick={() => onCancel?.(vacation.id)}
                disabled={isActionPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Cancelar Solicitud
              </button>
            )}
            {canApprove && (
              <>
                <button
                  onClick={() => onReject?.(vacation.id)}
                  disabled={isActionPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg transition-all"
                >
                  <UserX className="h-4 w-4" />
                  Rechazar
                </button>
                <button
                  onClick={() => onApprove?.(vacation.id)}
                  disabled={isActionPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-all"
                >
                  <Check className="h-4 w-4" />
                  Aprobar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}