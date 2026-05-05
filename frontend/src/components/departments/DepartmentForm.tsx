import { Save, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
}

interface DepartmentFormProps {
  form: DepartmentFormData;
  isEditing: boolean;
  isSaving: boolean;
  onChange: (form: DepartmentFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function DepartmentForm({ form, isEditing, isSaving, onChange, onSave, onCancel }: DepartmentFormProps) {
  const update = (key: keyof DepartmentFormData, value: string) => onChange({ ...form, [key]: value });

  return (
    <>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-theme-primary">
          {isEditing ? 'Editar departamento' : 'Nuevo departamento'}
        </h3>
        <p className="text-xs text-theme-muted">Completa los datos principales. Nombre y codigo son obligatorios.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-theme-muted">Nombre</span>
          <input
            className="input-field text-sm"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-theme-muted">Codigo</span>
          <input
            className="input-field text-sm"
            placeholder="Codigo (ej: DEP01)"
            value={form.code}
            onChange={(e) => update('code', e.target.value.toUpperCase())}
          />
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="text-xs font-medium text-theme-muted">Descripcion</span>
        <textarea
          className="input-field text-sm min-h-[92px]"
          placeholder="Descripcion breve del departamento"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-theme-color/80 pt-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="btn-primary text-sm min-w-28 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSaving ? <LoadingSpinner size="sm" className="border-white border-t-white/30" /> : <Save className="h-4 w-4" />}
          {isEditing ? 'Guardar cambios' : 'Crear'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm inline-flex items-center gap-1.5">
          <X className="h-4 w-4" />Cancelar
        </button>
      </div>
    </>
  );
}
