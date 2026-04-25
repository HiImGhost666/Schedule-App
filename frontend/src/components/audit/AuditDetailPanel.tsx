import { X, RotateCcw, Lock } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ActivityDetail } from '@/components/audit/ActivityDetail';
import type { AuditLog } from '@/types';

export type TabType = 'reversible' | 'irreversible';

interface AuditDetailPanelProps {
  selectedLog: AuditLog | null;
  isLoading: boolean;
  onClose: () => void;
  onRollback: () => void;
  canRollback: boolean;
  isPending: boolean;
  activeTab: TabType;
  beforeSnapshot: string | Record<string, unknown> | null;
  afterSnapshot: string | Record<string, unknown> | null;
}

export function AuditDetailPanel({
  selectedLog,
  isLoading,
  onClose,
  onRollback,
  canRollback,
  isPending,
  activeTab,
  beforeSnapshot,
  afterSnapshot,
}: AuditDetailPanelProps) {
  return (
    <div className="w-96 shrink-0 flex flex-col gap-0 animate-slide-up">
      <div className="card px-5 py-4 flex items-center justify-between border-b border-navy-100 rounded-b-none">
        <h3 className="text-sm font-bold text-navy-800">Detalle del Registro</h3>
        <button
          id="audit-detail-close"
          onClick={onClose}
          className="p-1.5 text-navy-300 hover:text-navy-600 hover:bg-navy-100 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="card rounded-t-none p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-260px)]">
        {isLoading || !selectedLog ? (
          <div className="py-10 flex justify-center">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <>
            <ActivityDetail
              action={selectedLog.action}
              entityType={selectedLog.entityType}
              entityId={selectedLog.entityId}
              beforeJson={beforeSnapshot}
              afterJson={afterSnapshot}
              actorName={selectedLog.user?.name || 'Sistema'}
              createdAt={selectedLog.createdAt}
              rolledBackAt={selectedLog.rolledBackAt}
              rolledBackBy={selectedLog.rolledBackBy}
            />

            {selectedLog.entityId && (
              <div className="pt-3 border-t border-navy-100">
                <p className="text-[10px] font-medium text-navy-400 uppercase tracking-wider">ID del Recurso Afectado</p>
                <p className="text-xs font-mono text-navy-500 mt-0.5">{selectedLog.entityId}</p>
              </div>
            )}

            {selectedLog.ipAddress && (
              <div className="pt-3 border-t border-navy-100">
                <p className="text-[10px] font-medium text-navy-400 uppercase tracking-wider">Dirección IP</p>
                <p className="text-xs font-mono text-navy-500 mt-0.5">{selectedLog.ipAddress}</p>
              </div>
            )}

            {activeTab === 'reversible' && (
              <div className="pt-4 border-t border-navy-100">
                <button
                  id="audit-rollback-btn"
                  onClick={onRollback}
                  disabled={!canRollback || isPending}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    canRollback
                      ? 'bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm'
                      : 'bg-navy-50 text-navy-200 border-2 border-navy-50 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                  {isPending ? 'Revirtiendo...' : 'Revertir cambio'}
                </button>
                {!canRollback && (
                  <p className="text-[10px] text-navy-300 mt-2 text-center">
                    {selectedLog.rolledBackAt
                      ? 'Este cambio ya ha sido revertido'
                      : 'Este registro no contiene datos previos suficientes para el rollback'}
                  </p>
                )}
              </div>
            )}

            {activeTab === 'irreversible' && (
              <div className="pt-4 border-t border-navy-100">
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                  <Lock className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-600 font-medium">
                    Los eventos de seguridad y sesión no se pueden revertir
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
