interface UsersPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function UsersPagination({ page, totalPages, total, limit, onPageChange, onLimitChange }: UsersPaginationProps) {
  if (totalPages <= 0) return null;

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-navy-100 flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <p className="text-xs text-navy-400">
          {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total}
        </p>
        {totalPages > 1 && (
          <p className="text-[10px] text-navy-300">Página {page} de {totalPages}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-navy-400" htmlFor="users-page-limit">Mostrar:</label>
        <select
          id="users-page-limit"
          value={limit}
          onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(1); }}
          className="text-xs border border-navy-200 rounded px-2 py-1 text-navy-600 bg-white hover:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-300"
        >
          {[10, 15, 25, 50, 100].map((n) => (
            <option key={n} value={n}>{n} por página</option>
          ))}
        </select>
        {totalPages > 1 && (
          <>
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs font-medium rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40"
            >
              Siguiente
            </button>
          </>
        )}
      </div>
    </div>
  );
}
