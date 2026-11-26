/**
 * Client for the Tour Financial Management API. All financial figures are
 * calculated by the server; this module only fetches and formats them.
 */
const TOKEN_KEY = 'lets_see_fin_token';

let token: string | null = (() => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
})();
const listeners = new Set<() => void>();

export function getToken() { return token; }
export function setToken(t: string | null) {
  token = t;
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}
export function onAuthChange(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) { super(message); }
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (res.status === 401 && token) setToken(null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details);
  return data as T;
}
export const get = <T = any>(p: string) => api<T>('GET', p);
export const post = <T = any>(p: string, b?: unknown) => api<T>('POST', p, b ?? {});
export const patch = <T = any>(p: string, b: unknown) => api<T>('PATCH', p, b);
export const put = <T = any>(p: string, b: unknown) => api<T>('PUT', p, b);

/** Downloads an authenticated file (CSV report, bill attachment). */
export async function download(path: string, fileName: string) {
  const res = await fetch(`/api${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(res.status, `Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function uploadDocument(entityType: string, entityId: string, file: File) {
  const qs = new URLSearchParams({ entityType, entityId, fileName: file.name });
  const res = await fetch(`/api/finance/documents?${qs}`, {
    method: 'POST', body: file,
    headers: { 'content-type': file.type || 'application/octet-stream', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Upload failed');
  return data;
}

export async function openDocument(id: string, fileName: string) {
  return download(`/finance/documents/${id}/file`, fileName);
}

// ---------- formatting (display only; never used for calculations)

/** "123456.5" → "₹1,23,456.50". Uses string splitting so large values keep every paisa. */
export function inr(v: string | number | null | undefined, opts: { blank?: string; decimals?: boolean } = {}): string {
  if (v === null || v === undefined || v === '') return opts.blank ?? '—';
  const s = typeof v === 'number' ? v.toFixed(2) : v;
  const neg = s.trim().startsWith('-');
  const [intPart, frac = ''] = s.replace('-', '').trim().split('.');
  const digits = intPart.replace(/^0+(?=\d)/, '');
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = rest ? `${rest},${last3}` : last3;
  const paise = (frac + '00').substring(0, 2);
  return `${neg ? '−' : ''}₹${grouped}${opts.decimals === false ? '' : `.${paise}`}`;
}
export const num = (v: string | null | undefined) => (v === null || v === undefined || v === '' ? 0 : Number(v));
export const isNeg = (v: string | null | undefined) => !!v && v.trim().startsWith('-') && Number(v) !== 0;
export const pctText = (v: string | null | undefined) => (v === null || v === undefined ? 'n/a' : `${Number(v).toFixed(2)}%`);
export function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  const [y, m, day] = d.substring(0, 10).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[Number(m) - 1] ?? m} ${y}`;
}
export const today = () => new Date().toISOString().substring(0, 10);
const LABELS: Record<string, string> = {
  agreed_contract_value_incl_gst: 'Contract value incl. GST', tax_invoices: 'Tax invoices', confirmed_price: 'Confirmed price', tax_invoiced: 'Tax invoiced',
};
export const label = (s: string | null | undefined) => LABELS[s ?? ''] ?? (s ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
/** Verb for a bill status change button / dialog. */
export const billAction = (s: string) => ({ under_verification: 'Send for verification', approved: 'Approve', rejected: 'Reject', cancelled: 'Cancel bill' }[s] ?? label(s));
