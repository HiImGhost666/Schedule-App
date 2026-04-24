import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterFieldConfig<TFilterKey extends string> = {
  key: TFilterKey;
  type: 'text' | 'select' | 'date';
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
    <div className={cn('card px-4 py-3 flex flex-wrap gap-3', className)}>
      {fields.map((field) => {
        if (field.type === 'text') {
          const showSearchIcon = field.searchable ?? true;
          return (
            <div
              key={field.key}
              className={cn(showSearchIcon ? 'relative flex-1 min-w-48' : 'flex-1 min-w-48', field.className)}
            >
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
            <input
              key={field.key}
              id={field.id ?? String(field.key)}
              type="date"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className={cn('input-field text-sm w-44', field.className)}
            />
          );
        }

        return (
          <select
            key={field.key}
            id={field.id ?? String(field.key)}
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={cn('input-field text-sm w-40', field.className)}
          >
            {(field.options ?? []).map((option) => (
              <option key={`${field.key}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      })}
    </div>
  );
}
