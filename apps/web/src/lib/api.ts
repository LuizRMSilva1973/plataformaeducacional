export const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'edu_token';
const SCHOOL_KEY = 'edu_school';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(token: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getSchoolId() {
  return localStorage.getItem(SCHOOL_KEY) || '';
}
export function setSchoolId(id: string) {
  if (id) localStorage.setItem(SCHOOL_KEY, id);
  else localStorage.removeItem(SCHOOL_KEY);
}

function genRequestId(): string {
  try {
    // Prefer crypto UUID when available (modern browsers)
    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch {}
  // Fallback: timestamp + random
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as any || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Correlate requests with backend logs
  const requestId = headers['x-request-id'] || genRequestId();
  headers['x-request-id'] = String(requestId);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const respReqId = res.headers.get('x-request-id') || requestId;
    const baseMsg = text || `API ${res.status} ${res.statusText}`;
    const err = new Error(`${baseMsg} (req ${respReqId})`);
    // Attach for consumers that want to read it programmatically
    ;(err as any).requestId = respReqId;
    throw err;
  }
  return res.json() as Promise<T>;
}
