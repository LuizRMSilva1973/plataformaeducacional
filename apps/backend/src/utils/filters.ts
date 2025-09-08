export type Order = 'asc' | 'desc';

type Query = Record<string, unknown> | URLSearchParams;

function read(query: Query, key: string): unknown {
  if (query instanceof URLSearchParams) return query.get(key);
  return (query as Record<string, unknown>)[key];
}

export function getString(q: Query, key: string): string | undefined {
  const v = read(q, key);
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

export function getEnum<T extends readonly string[]>(q: Query, key: string, allowed: T): T[number] | undefined {
  const v = getString(q, key);
  if (!v) return undefined;
  return (allowed as readonly string[]).includes(v) ? (v as T[number]) : undefined;
}

export function getOrder(q: Query, def: Order = 'asc'): Order {
  const v = getString(q, 'order');
  return v === 'desc' ? 'desc' : def;
}

export function getNumber(q: Query, key: string): number | undefined {
  const v = read(q, key);
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function getDate(q: Query, key: string): Date | undefined {
  const s = getString(q, key);
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(+d) ? undefined : d;
}
