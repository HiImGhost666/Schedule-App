import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  searchable?: boolean;
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
  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      {fields.map((field) => {
        if (field.type === 'text') {
          const showSearchIcon = field.searchable ?? true;
          return (
            <div
              key={field.key}
              className={cn(
                showSearchIcon ? 'relative' : '',
                field.className ?? 'min-w-44',
              )}
            >
              {field.label && (
                <label
                  htmlFor={field.id ?? String(field.key)}
                  className="block text-[11px] font-semibold text-navy-400 uppercase tracking-wider mb-1"
                >
                  {field.label}
                </label>
              )}
              {showSearchIcon && (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
              )}
              <input
                id={field.id ?? String(field.key)}
                type="text"
                placeholder={field.placeholder}
                value={values[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={cn('input-field text-sm', showSearchIcon && 'with-icon')}
              />
            </div>
          );
        }

        if (field.type === 'date') {
          return (
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
    </div>
  );
}
