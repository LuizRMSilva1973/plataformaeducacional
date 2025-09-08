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

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as any || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
