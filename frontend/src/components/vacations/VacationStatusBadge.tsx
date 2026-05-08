import type { VacationStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<VacationStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  colindante: {
    label: 'Colindante',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  approved: {
    label: 'Aprobado',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  rejected: {
    label: 'Rechazado',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

interface Props {
  status: VacationStatus;
  className?: string;
}

export function VacationStatusBadge({ status, className }: Props) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
