import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';
import { ApiError, inr, isNeg, label } from './api';

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    fn().then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message ?? String(e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

export const PageHeader: React.FC<{ title: string; subtitle?: string; children?: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
    <div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

export const Card: React.FC<{ title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }> = ({ title, right, children, className = '', pad = true }) => (
  <div className={`bg-white border border-slate-200 rounded-xl ${className}`}>
    {(title || right) && (
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
        {right}
      </div>
    )}
    <div className={pad ? 'p-5' : ''}>{children}</div>
  </div>
);

export const Kpi: React.FC<{ label: string; value: string; hint?: React.ReactNode; tone?: 'default' | 'good' | 'bad' }> = ({ label: l, value, hint, tone = 'default' }) => (
  <div className="p-4 rounded-xl border border-slate-200 bg-white min-w-0">
    <span className="text-xs font-medium text-slate-500 block truncate" title={l}>{l}</span>
    <div className={`text-base xl:text-lg font-bold mt-1 tabular-nums truncate ${tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-slate-900'}`} title={value}>{value}</div>
    {hint && <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{hint}</div>}
  </div>
);

/** Money cell: right-aligned, tabular, negative in red with a minus sign (never colour alone). */
export const Money: React.FC<{ v: string | null | undefined; strong?: boolean; signed?: boolean }> = ({ v, strong, signed }) => (
  <span className={`tabular-nums whitespace-nowrap ${strong ? 'font-semibold' : ''} ${signed && isNeg(v) ? 'text-red-700' : signed && v && Number(v) > 0 ? 'text-amber-800' : ''}`}>
    {signed && v && Number(v) > 0 ? '+' : ''}{inr(v)}
  </span>
);

const TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
};
export const Badge: React.FC<{ tone?: keyof typeof TONES; children: React.ReactNode }> = ({ tone = 'slate', children }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${TONES[tone]}`}>{children}</span>
);

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  // cost line / bill states
  estimated: 'slate', booked: 'blue', service_completed: 'blue', bill_pending: 'amber', bill_received: 'blue', under_verification: 'amber',
  approved: 'green', disputed: 'red', cancelled: 'slate', received: 'blue', rejected: 'red',
  // reconciliation
  no_difference: 'green', charged_extra: 'red', charged_less: 'amber', bill_not_received: 'amber', pending_verification: 'amber', resolved: 'green', not_due: 'slate', no_expected_amount: 'amber',
  open: 'red', under_review: 'amber',
  // payment
  paid: 'green', partially_paid: 'amber', unpaid: 'red', no_bill: 'slate',
  // financial status
  costing_pending: 'slate', expenses_in_progress: 'blue', bills_pending: 'amber', reconciliation_pending: 'red', accounts_verification: 'amber', financially_verified: 'green', financially_closed: 'green',
  pending: 'amber',
};
const STATUS_LABEL: Record<string, string> = { charged_extra: 'Charged extra', charged_less: 'Charged less', bill_not_received: 'Bill not received', no_bill: 'No bill' };
export const StatusBadge: React.FC<{ s: string | null | undefined }> = ({ s }) => (s ? <Badge tone={STATUS_TONE[s] ?? 'slate'}>{STATUS_LABEL[s] ?? label(s)}</Badge> : null);

export const Th: React.FC<{ children?: React.ReactNode; right?: boolean; className?: string }> = ({ children, right, className = '' }) => (
  <th className={`py-3 px-3 font-semibold whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${className}`}>{children}</th>
);
export const Td: React.FC<{ children?: React.ReactNode; right?: boolean; className?: string; colSpan?: number }> = ({ children, right, className = '', colSpan }) => (
  <td colSpan={colSpan} className={`py-2.5 px-3 align-top ${right ? 'text-right' : ''} ${className}`}>{children}</td>
);
export const Table: React.FC<{ head: React.ReactNode; children: React.ReactNode; empty?: string; isEmpty?: boolean }> = ({ head, children, empty = 'No records', isEmpty }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs">
      <thead className="border-b border-slate-200 text-slate-500 bg-slate-50/60"><tr>{head}</tr></thead>
      <tbody className="divide-y divide-slate-100">
        {isEmpty ? <tr><td className="py-8 text-center text-slate-400" colSpan={50}>{empty}</td></tr> : children}
      </tbody>
    </table>
  </div>
);

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; small?: boolean }> = ({ variant = 'secondary', small, className = '', ...p }) => (
  <button
    {...p}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${small ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'} ${
      variant === 'primary' ? 'bg-emerald-700 text-white hover:bg-emerald-800'
        : variant === 'danger' ? 'bg-white border border-red-200 text-red-700 hover:bg-red-50'
        : variant === 'ghost' ? 'text-emerald-700 hover:bg-emerald-50'
        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
    } ${className}`}
  />
);

export const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-700 bg-white';
export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string; className?: string; required?: boolean }> = ({ label: l, children, hint, className = '', required }) => (
  <label className={`block ${className}`}>
    <span className="text-[11px] font-semibold text-slate-600 block mb-1">{l}{required && <span className="text-red-600"> *</span>}</span>
    {children}
    {hint && <span className="text-[11px] text-slate-400 block mt-0.5">{hint}</span>}
  </label>
);
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (p) => <input {...p} className={`${inputCls} ${p.className ?? ''}`} />;
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (p) => <select {...p} className={`${inputCls} ${p.className ?? ''}`} />;
export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (p) => <textarea {...p} className={`${inputCls} ${p.className ?? ''}`} />;

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} my-8`}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const ErrorBox: React.FC<{ error: unknown }> = ({ error }) => {
  if (!error) return null;
  const e = error as any;
  const details = e instanceof ApiError && Array.isArray(e.details) ? e.details : null;
  return (
    <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex gap-2">
      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold">{typeof error === 'string' ? error : e.message}</div>
        {details && <ul className="list-disc ml-4 mt-1">{details.map((d: any, i: number) => <li key={i}>{d.label ?? JSON.stringify(d)}{d.detail ? ` — ${d.detail}` : ''}</li>)}</ul>}
        {e instanceof ApiError && e.details && !details && typeof e.details === 'string' && <div className="mt-1">{e.details}</div>}
      </div>
    </div>
  );
};

export const Loading: React.FC = () => (
  <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
);

export const WarningList: React.FC<{ warnings: { code: string; severity: string; message: string; costItemId?: string }[]; onSelect?: (id: string) => void }> = ({ warnings, onSelect }) => {
  if (!warnings.length) return <div className="text-xs text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> No warnings</div>;
  return (
    <ul className="space-y-1.5">
      {warnings.map((w, i) => (
        <li key={i} className="flex gap-2 text-xs">
          {w.severity === 'info' ? <Info className="w-4 h-4 text-sky-600 shrink-0" /> : <AlertTriangle className={`w-4 h-4 shrink-0 ${w.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />}
          <span className="text-slate-700">
            <span className="font-semibold">{w.severity === 'critical' ? 'Critical: ' : w.severity === 'warning' ? 'Warning: ' : 'Note: '}</span>
            {w.message}
            {w.costItemId && onSelect && <button className="ml-1 text-emerald-700 hover:underline font-semibold" onClick={() => onSelect(w.costItemId!)}>View line</button>}
          </span>
        </li>
      ))}
    </ul>
  );
};

/** Runs an async action, exposing busy/error for forms. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); return true; } catch (e) { setError(e); return false; } finally { setBusy(false); }
  };
  return { busy, error, run, setError };
}
