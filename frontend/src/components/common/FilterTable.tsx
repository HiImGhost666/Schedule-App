import { cn } from '@/lib/utils';
import { useState } from 'react';

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterFieldConfig<TFilterKey extends string> = {
  key: TFilterKey;
  type: 'text' | 'select' | 'date';
  label?: string;
  placeholder?: string;
  options?: FilterOption[];
  className?: string;
  id?: string;
};

type FilterTableProps<TFilterKey extends string> = {
  fields: Array<FilterFieldConfig<TFilterKey>>;
  values: Record<TFilterKey, string>;
  onChange: (key: TFilterKey, value: string) => void;
  className?: string;
};

export function FilterTable<TFilterKey extends string>({
  fields,
  values,
  onChange,
  className,
}: FilterTableProps<TFilterKey>) {
  const [showDateFilters, setShowDateFilters] = useState(false);

  const textFields = fields.filter((f) => f.type === 'text' || f.type === 'select');
  const dateFields = fields.filter((f) => f.type === 'date');

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      {textFields.map((field) => {
        if (field.type === 'text') {
          return (
            <div
              key={field.key}
              className={cn(field.className ?? 'min-w-44')}
            >
              {field.label && (
                <label
                  htmlFor={field.id ?? String(field.key)}
                  className="block text-[11px] font-semibold text-navy-400 uppercase tracking-wider mb-1"
                >
                  {field.label}
                </label>
              )}
              <input
                id={field.id ?? String(field.key)}
                type="text"
                placeholder={field.placeholder}
                value={values[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="input-field text-sm"
              />
            </div>
          );
        }

        return (
          <div key={field.key} className={cn(field.className ?? 'w-40')}>
            {field.label && (
              <label
                htmlFor={field.id ?? String(field.key)}
                className="block text-[11px] font-semibold text-navy-400 uppercase tracking-wider mb-1"
              >
                {field.label}
              </label>
            )}
            <select
              id={field.id ?? String(field.key)}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="input-field text-sm w-full"
            >
              {(field.options ?? []).map((option) => (
                <option key={`${field.key}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {/* Toggle button for date filters */}
      {dateFields.length > 0 && (
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setShowDateFilters((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-navy-500 hover:text-navy-700 hover:bg-navy-50 rounded-lg border border-navy-200 transition-colors"
          >
            <span>{showDateFilters ? '−' : '+'}</span>
            <span>{showDateFilters ? 'Ocultar filtros de fecha' : 'más filtros'}</span>
          </button>
        </div>
      )}

      {/* Date filters (hidden by default) */}
      {showDateFilters &&
        dateFields.map((field) => (
          <div key={field.key} className={cn(field.className ?? 'w-36')}>
            {field.label && (
              <label
                htmlFor={field.id ?? String(field.key)}
                className="block text-[11px] font-semibold text-navy-400 uppercase tracking-wider mb-1"
              >
                {field.label}
              </label>
            )}
            <input
              id={field.id ?? String(field.key)}
              type="date"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>
        ))}
    </div>
  );
}
