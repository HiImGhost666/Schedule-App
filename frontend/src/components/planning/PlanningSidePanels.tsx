import { Check, X } from 'lucide-react';
import type {
  CoverageRiskItem,
  NotificationPreferences,
  SubstituteSuggestion,
  SupportRequest,
  TemplatePreviewDay,
  TimelineItem,
} from '@/hooks/usePlanning';

type Props = {
  risks?: CoverageRiskItem[];
  substitutes?: SubstituteSuggestion[];
  timeline?: TimelineItem[];
  templatePreview?: TemplatePreviewDay[];
  supportRequests?: SupportRequest[];
  preferences?: NotificationPreferences;
  selectedSkillIds: string[];
  skills: Array<{ id: string; name: string }>;
  supportReason: string;
  onSupportReasonChange: (value: string) => void;
  onToggleSkill: (skillId: string) => void;
  onCreateSupport: (targetUserId: string) => void;
  onReviewSupport: (id: string, status: SupportRequest['status']) => void;
  onTogglePreference: (patch: Partial<NotificationPreferences>) => void;
};

export function PlanningSidePanels({
  risks = [],
  substitutes = [],
  timeline = [],
  templatePreview = [],
  supportRequests = [],
  preferences,
  selectedSkillIds,
  skills,
  supportReason,
  onSupportReasonChange,
  onToggleSkill,
  onCreateSupport,
  onReviewSupport,
  onTogglePreference,
}: Props) {
  return (
    <aside className="space-y-4">
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Skills requeridas</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => onToggleSkill(skill.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                selectedSkillIds.includes(skill.id)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              {skill.name}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Riesgos</h2>
        <div className="mt-3 space-y-2">
          {risks.slice(0, 5).map((risk) => (
            <div key={risk.schedule.id} className="rounded-xl border border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-800">{risk.schedule.title}</p>
              <p className="text-xs text-slate-500">{risk.reasons.join(' · ')}</p>
            </div>
          ))}
          {risks.length === 0 && <p className="text-sm text-slate-400">Sin riesgos en el rango.</p>}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Sustitutos</h2>
        <textarea
          className="mt-3 w-full rounded-xl border border-slate-200 p-2 text-sm"
          placeholder="Motivo de solicitud de apoyo"
          value={supportReason}
          onChange={(event) => onSupportReasonChange(event.target.value)}
        />
        <div className="mt-3 space-y-2">
          {substitutes.slice(0, 5).map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">Score {user.score} · {user.reasons[0]}</p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
                onClick={() => onCreateSupport(user.id)}
              >
                Pedir apoyo
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Solicitudes de apoyo</h2>
        <div className="mt-3 space-y-2">
          {supportRequests.slice(0, 5).map((request) => (
            <div key={request.id} className="rounded-xl border border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-800">{request.targetUser.name}</p>
              <p className="text-xs text-slate-500">{request.status} · {request.branch.name}</p>
              {request.status === 'pending' && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => onReviewSupport(request.id, 'accepted')} className="rounded-lg border border-emerald-200 p-1 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onReviewSupport(request.id, 'rejected')} className="rounded-lg border border-red-200 p-1 text-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {supportRequests.length === 0 && <p className="text-sm text-slate-400">Sin solicitudes abiertas.</p>}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Preferencias</h2>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
          Resumen semanal
          <input
            type="checkbox"
            checked={Boolean(preferences?.weeklySummary)}
            onChange={(event) => onTogglePreference({ weeklySummary: event.target.checked })}
          />
        </label>
        <label className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600">
          Solo alertas críticas
          <input
            type="checkbox"
            checked={Boolean(preferences?.criticalAlertsOnly)}
            onChange={(event) => onTogglePreference({ criticalAlertsOnly: event.target.checked })}
          />
        </label>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Timeline y plantilla</h2>
        <p className="mt-2 text-xs text-slate-500">{timeline.length} eventos operativos</p>
        <p className="text-xs text-slate-500">{templatePreview.filter((day) => day.status !== 'covered').length} días con cobertura parcial o descubierta</p>
      </section>
    </aside>
  );
}
