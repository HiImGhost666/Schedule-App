import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMyWeeklySummary } from '@/hooks/useMyWeeklySummary';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

/**
 * @description Tarjeta que muestra el resumen semanal de horas del usuario autenticado.
 * Visible para todos los roles, especialmente employee.
 */
export function MyWeeklySummaryCard() {
  const user = useAuthStore((s) => s.user);
  const now = new Date();
  const isoWeek = getISOWeek(now);
  const isoWeekYear = getISOWeekYear(now);

  const { data: summary, isLoading } = useMyWeeklySummary(isoWeekYear, isoWeek);

  const dailyData = useMemo(() => {
    const dayLabels: Record<string, string> = {
      '1': 'Lun',
      '2': 'Mar',
      '3': 'Mié',
      '4': 'Jue',
      '5': 'Vie',
      '6': 'Sáb',
      '7': 'Dom',
    };

    if (!summary?.dailyBreakdown) return [];
    const breakdown =
      typeof summary.dailyBreakdown === 'string'
        ? JSON.parse(summary.dailyBreakdown)
        : summary.dailyBreakdown;

    return Object.entries(breakdown)
      .map(([day, hours]) => ({
        day: dayLabels[day] || `Día ${day}`,
        hours: hours as number,
        isOvertime: (hours as number) > 8,
      }))
      .sort((a, b) => {
        const order = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        return order.indexOf(a.day) - order.indexOf(b.day);
      });
  }, [summary]);

  if (!user) return null;

  return (
    <div className="card p-7">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-theme-primary flex items-center gap-2">
          <Clock className="h-4 w-4 text-gold-500" />
          Mi resumen semanal
        </h2>
        <span className="text-xs text-theme-muted">
          Semana {isoWeek} · {format(now, "MMMM yyyy", { locale: es })}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : !summary ? (
        <div className="text-center py-8">
          <Clock className="h-10 w-10 text-theme-muted mx-auto mb-2" />
          <p className="text-sm text-theme-muted">No hay datos de resumen semanal disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Métricas principales */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-theme-surface-muted rounded-xl p-3.5">
              <p className="text-xs text-theme-muted uppercase tracking-wider">Horas totales</p>
              <p className="text-xl font-bold text-theme-primary mt-1">
                {Math.round(summary.totalHours * 10) / 10}h
              </p>
            </div>
            <div className="bg-theme-surface-muted rounded-xl p-3.5">
              <p className="text-xs text-theme-muted uppercase tracking-wider">Base semanal</p>
              <p className="text-xl font-bold text-theme-primary mt-1">
                {Math.round(summary.baseHours * 10) / 10}h
              </p>
            </div>
            <div className="bg-theme-surface-muted rounded-xl p-3.5">
              <p className="text-xs text-theme-muted uppercase tracking-wider">Horas extra</p>
              <p className={`text-xl font-bold mt-1 ${summary.overtimeHours > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {Math.round(summary.overtimeHours * 10) / 10}h
              </p>
            </div>
          </div>

          {/* Alerta de horas extra */}
          {summary.overtimeHours > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">
                Has registrado <strong>{Math.round(summary.overtimeHours * 10) / 10}h</strong> de horas extra esta semana
              </p>
            </div>
          )}

          {/* Desglose diario */}
          {dailyData.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-theme-muted mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Desglose diario
              </p>
              <div className="space-y-1.5">
                {dailyData.map(({ day, hours, isOvertime }) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-theme-muted w-8 shrink-0">{day}</span>
                    <div className="flex-1 h-5 bg-theme-surface-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOvertime ? 'bg-amber-400' : 'bg-navy-500'
                        }`}
                        style={{ width: `${Math.min((hours / 12) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-10 text-right shrink-0 ${
                      isOvertime ? 'text-amber-600' : 'text-theme-primary'
                    }`}>
                      {hours}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
