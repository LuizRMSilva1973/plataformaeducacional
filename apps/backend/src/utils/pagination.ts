export type Pagination = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

function getParam(query: Record<string, unknown>, key: string): string | number | undefined {
  const v = query[key];
  if (typeof v === 'string' || typeof v === 'number') return v;
  return undefined;
}

export function parsePagination(query: Record<string, unknown>): Pagination {
  const rawPage = Number(getParam(query, 'page') ?? 1);
  const rawLimit = Number(getParam(query, 'limit') ?? 20);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 100000) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const skip = (page - 1) * limit;
  const take = limit;
  return { page, limit, skip, take };
}

export function buildMeta(total: number, p: Pagination) {
  const pages = Math.max(1, Math.ceil(total / p.limit));
  return { page: p.page, limit: p.limit, total, pages };
}
