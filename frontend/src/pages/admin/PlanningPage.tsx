import React, { useState } from 'react';
import { useAvailabilityMatrix, type PlanningFilters } from '@/hooks/usePlanning';
import { format, addDays, startOfDay } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Loader2,
  AlertCircle
} from 'lucide-react';

// Definimos una interfaz local para asegurar que from/to no sean null en el estado de la página
interface LocalPlanningFilters extends Required<PlanningFilters> {}

const PlanningPage: React.FC = () => {
  const [filters, setFilters] = useState<LocalPlanningFilters>({
    from: startOfDay(new Date()),
    to: addDays(startOfDay(new Date()), 14),
    branchId: '',
    departmentId: '',
  });

  const { data: matrix, isLoading, isError } = useAvailabilityMatrix(filters);

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    const date = value ? new Date(value) : new Date();
    setFilters((prev) => ({ ...prev, [field]: date }));
  };

  return (
    <div className="p-6 space-y-6 max-w-full animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planificación Operativa</h1>
          <p className="text-slate-500 text-sm font-medium">Análisis de cobertura y disponibilidad de personal.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              className="bg-transparent text-sm border-none focus:ring-0 p-0 font-semibold text-slate-700"
              value={format(filters.from, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange('from', e.target.value)}
            />
            <span className="text-slate-300 mx-1">→</span>
            <input 
              type="date" 
              className="bg-transparent text-sm border-none focus:ring-0 p-0 font-semibold text-slate-700"
              value={format(filters.to, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange('to', e.target.value)}
            />
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <div className="flex items-center gap-2 px-3">
            <MapPin className="w-4 h-4 text-slate-400" />
            <select 
              className="text-sm border-none focus:ring-0 p-0 bg-transparent font-medium text-slate-700 cursor-pointer"
              value={filters.branchId}
              onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
            >
              <option value="">Todas las sedes</option>
              {/* Los catálogos se cargarán en la siguiente tarea */}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3">
            <Users className="w-4 h-4 text-slate-400" />
            <select 
              className="text-sm border-none focus:ring-0 p-0 bg-transparent font-medium text-slate-700 cursor-pointer"
              value={filters.departmentId}
              onChange={(e) => setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
            >
              <option value="">Todos los departamentos</option>
            </select>
          </div>
        </div>
      </header>

      <main className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : isError ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 gap-3">
            <AlertCircle className="w-12 h-12 text-red-500 opacity-20" />
            <p className="font-medium italic">No se pudo cargar la matriz de planificación</p>
          </div>
        ) : matrix ? (
          <div className="overflow-auto max-h-[calc(100vh-300px)]">
            <div className="p-12 text-center text-slate-400">
              <p className="text-lg font-medium text-slate-600 mb-2">Matriz de disponibilidad lista</p>
              <p className="text-sm opacity-70">
                Visualizando {matrix.rows.length} empleados durante {matrix.days.length} días.
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default PlanningPage;