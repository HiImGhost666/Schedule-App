import { useState, useCallback } from 'react';

export type SortOrder = 'asc' | 'desc';

export interface SortConfig<T extends string> {
  sortBy: T;
  sortOrder: SortOrder;
}

export function useSortable<T extends string>(initialField: T, initialOrder: SortOrder = 'asc') {
  const [sortBy, setSortBy] = useState<T>(initialField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder);

  const handleSortChange = useCallback((field: T) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('asc');
      return field;
    });
  }, []);

  return { sortBy, sortOrder, handleSortChange };
}
