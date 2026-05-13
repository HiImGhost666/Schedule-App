import { useState } from 'react';
import { addDays, startOfDay } from 'date-fns';
import { AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PlanningFilters } from '@/components/planning/PlanningFilters';
import { PlanningMatrix } from '@/components/planning/PlanningMatrix';
import { PlanningSidePanels } from '@/components/planning/PlanningSidePanels';
import { PlanningSummaryCards } from '@/components/planning/PlanningSummaryCards';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  useAvailability,
  useAvailabilityMatrix,
  useCoverageRisks,
  useCreateSupportRequest,
  useCrisisMode,
  useEquity,
  useNotificationPreferences,
  usePlanningLookups,
  useReviewSupportRequest,
  useSubstitutes,
  useSupportRequests,
  useTemplatePreview,
  useTimeline,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
  type PlanningFilters as PlanningFiltersValue,
  type SupportRequest,
} from '@/hooks/usePlanning';

export function PlanningPage() {
  const [filters, setFilters] = useState<PlanningFiltersValue>({
    from: startOfDay(new Date()),
    to: addDays(startOfDay(new Date()), 14),
  });
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [supportReason, setSupportReason] = useState('');

  const lookups = usePlanningLookups(filters.branchId);
  const risks = useCoverageRisks(filters);
  const availability = useAvailability(filters);
  const substitutes = useSubstitutes(filters, selectedSkillIds);
  const matrix = useAvailabilityMatrix(filters);
  const equity = useEquity(filters);
  const timeline = useTimeline(filters);
  const crisis = useCrisisMode(filters);
  const templatePreview = useTemplatePreview(filters, selectedSkillIds);
  const supportRequests = useSupportRequests(filters);
  const preferences = useNotificationPreferences();
  const createSupport = useCreateSupportRequest();
  const reviewSupport = useReviewSupportRequest();
  const updatePreferences = useUpdateNotificationPreferences();

  const isLoading = lookups.isLoading || matrix.isLoading;
  const isError = matrix.isError || risks.isError || availability.isError;

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId],
    );
  };

  const handleCreateSupport = (targetUserId: string) => {
    const branchId = filters.branchId || substitutes.data?.find((user) => user.id === targetUserId)?.branch?.id;
    if (!branchId) {
      toast.error('Selecciona una sede para crear la solicitud de apoyo.');
      return;
    }

    createSupport.mutate({
      targetUserId,
      branchId,
      departmentId: filters.departmentId ?? null,
      startDate: filters.from.toISOString(),
      endDate: filters.to.toISOString(),
      reason: supportReason.trim() || undefined,
    }, {
      onSuccess: () => {
        setSupportReason('');
        toast.success('Solicitud de apoyo creada');
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo crear la solicitud de apoyo')),
    });
  };

  const handleReviewSupport = (id: string, status: SupportRequest['status']) => {
    reviewSupport.mutate({ id, status }, {
      onSuccess: () => toast.success('Solicitud actualizada'),
      onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo actualizar la solicitud')),
    });
  };

  const handleTogglePreference = (patch: Partial<NotificationPreferences>) => {
    updatePreferences.mutate(patch, {
      onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudieron guardar las preferencias')),
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-full animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planificación Operativa</h1>
          <p className="text-slate-500 text-sm font-medium">
            Cobertura, sustituciones, equidad, solicitudes de apoyo y preferencias.
          </p>
        </div>

        <PlanningFilters
          filters={filters}
          branches={lookups.data?.branches ?? []}
          departments={lookups.data?.departments ?? []}
          onChange={setFilters}
        />
      </header>

      <PlanningSummaryCards
        risks={risks.data}
        equity={equity.data}
        timeline={timeline.data}
        highRiskCount={crisis.data?.highRisks.length}
      />

      <main className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <section className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-32 bg-white/50 backdrop-blur-sm">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          ) : isError ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <AlertCircle className="w-12 h-12 text-red-500 opacity-20" />
              <p className="font-medium italic">No se pudo cargar la planificación</p>
            </div>
          ) : (
            <PlanningMatrix matrix={matrix.data} />
          )}
        </section>

        <PlanningSidePanels
          risks={risks.data}
          substitutes={substitutes.data}
          timeline={timeline.data}
          templatePreview={templatePreview.data}
          supportRequests={supportRequests.data}
          preferences={preferences.data}
          selectedSkillIds={selectedSkillIds}
          skills={lookups.data?.skills ?? []}
          supportReason={supportReason}
          onSupportReasonChange={setSupportReason}
          onToggleSkill={toggleSkill}
          onCreateSupport={handleCreateSupport}
          onReviewSupport={handleReviewSupport}
          onTogglePreference={handleTogglePreference}
        />
      </main>
    </div>
  );
}

export default PlanningPage;