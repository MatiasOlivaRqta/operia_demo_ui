export type PageRange = Readonly<{ from: number; to: number }>;

export function totalPages(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(pageSize) || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function getPageRange(page: number, pageSize: number, total: number): PageRange {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1;
  const lastPage = totalPages(safeTotal, safePageSize);
  const safePage = Math.min(lastPage, Math.max(1, Math.floor(page) || 1));
  return safeTotal === 0
    ? { from: 0, to: 0 }
    : {
        from: (safePage - 1) * safePageSize + 1,
        to: Math.min(safePage * safePageSize, safeTotal),
      };
}
