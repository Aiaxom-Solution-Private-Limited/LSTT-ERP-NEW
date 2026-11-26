import React from 'react';
import { Input, Select } from './ui';

export interface FinanceFilters {
  preset: string; from: string; to: string; tourCode: string; destination: string; client: string;
  salesperson: string; operations: string; status: string; financialStatus: string;
}
export const emptyFilters = (): FinanceFilters => ({ preset: 'all', from: '', to: '', tourCode: '', destination: '', client: '', salesperson: '', operations: '', status: '', financialStatus: '' });

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Date presets resolve to a tour-date overlap range (tour start..end intersects range). */
export function presetRange(p: string): { from: string; to: string } | null {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (p) {
    case 'today': return { from: iso(now), to: iso(now) };
    case 'week': {
      const d = new Date(now); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
      const e = new Date(d); e.setDate(d.getDate() + 6);
      return { from: iso(d), to: iso(e) };
    }
    case 'month': return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case 'prev_month': return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case 'fy': { // Indian financial year: 1 April – 31 March
      const fyStart = m >= 3 ? y : y - 1;
      return { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` };
    }
    default: return null;
  }
}

export function toQuery(f: FinanceFilters) {
  const q = new URLSearchParams();
  const r = f.preset === 'custom' ? { from: f.from, to: f.to } : presetRange(f.preset);
  if (r?.from) q.set('from', r.from);
  if (r?.to) q.set('to', r.to);
  for (const k of ['tourCode', 'destination', 'client', 'salesperson', 'operations', 'status', 'financialStatus'] as const) if (f[k]) q.set(k, f[k]);
  const s = q.toString();
  return s ? `?${s}` : '';
}

const DESTINATIONS = ['Meghalaya', 'Assam', 'Arunachal Pradesh', 'Sikkim & Darjeeling', 'Nagaland & Manipur', 'Bhutan', 'Nepal', 'Thailand', 'Vietnam', 'Central Asia', 'Other'];
const TOUR_STATUS = ['confirmed', 'operations_prep', 'vouchers_issued', 'on_tour', 'completed', 'reconciled', 'closed', 'cancelled'];
const FIN_STATUS = ['costing_pending', 'expenses_in_progress', 'bills_pending', 'reconciliation_pending', 'accounts_verification', 'financially_verified', 'financially_closed'];
const lab = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const FilterBar: React.FC<{ value: FinanceFilters; onChange: (f: FinanceFilters) => void; people?: { sales: string[]; ops: string[] } }> = ({ value: f, onChange, people }) => {
  const set = (k: keyof FinanceFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...f, [k]: e.target.value });
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 items-end">
      <label className="text-[11px] font-semibold text-slate-600">Period
        <Select value={f.preset} onChange={set('preset')} className="mt-1">
          <option value="all">All dates</option><option value="today">Today</option><option value="week">This week</option>
          <option value="month">This month</option><option value="prev_month">Previous month</option><option value="fy">Financial year</option><option value="custom">Custom range</option>
        </Select>
      </label>
      {f.preset === 'custom' && <>
        <label className="text-[11px] font-semibold text-slate-600">From<Input type="date" value={f.from} onChange={set('from')} className="mt-1" /></label>
        <label className="text-[11px] font-semibold text-slate-600">To<Input type="date" value={f.to} onChange={set('to')} className="mt-1" /></label>
      </>}
      <label className="text-[11px] font-semibold text-slate-600">Tour Code<Input value={f.tourCode} onChange={set('tourCode')} placeholder="LST-…" className="mt-1" /></label>
      <label className="text-[11px] font-semibold text-slate-600">Client<Input value={f.client} onChange={set('client')} placeholder="Search" className="mt-1" /></label>
      <label className="text-[11px] font-semibold text-slate-600">Destination
        <Select value={f.destination} onChange={set('destination')} className="mt-1"><option value="">All</option>{DESTINATIONS.map((d) => <option key={d}>{d}</option>)}</Select>
      </label>
      {people && <>
        <label className="text-[11px] font-semibold text-slate-600">Salesperson
          <Select value={f.salesperson} onChange={set('salesperson')} className="mt-1"><option value="">All</option>{people.sales.map((d) => <option key={d}>{d}</option>)}</Select>
        </label>
        <label className="text-[11px] font-semibold text-slate-600">Operations exec.
          <Select value={f.operations} onChange={set('operations')} className="mt-1"><option value="">All</option>{people.ops.map((d) => <option key={d}>{d}</option>)}</Select>
        </label>
      </>}
      <label className="text-[11px] font-semibold text-slate-600">Tour status
        <Select value={f.status} onChange={set('status')} className="mt-1"><option value="">All</option>{TOUR_STATUS.map((d) => <option key={d} value={d}>{lab(d)}</option>)}</Select>
      </label>
      <label className="text-[11px] font-semibold text-slate-600">Financial status
        <Select value={f.financialStatus} onChange={set('financialStatus')} className="mt-1"><option value="">All</option>{FIN_STATUS.map((d) => <option key={d} value={d}>{lab(d)}</option>)}</Select>
      </label>
      <button onClick={() => onChange(emptyFilters())} className="text-[11px] font-semibold text-emerald-700 hover:underline justify-self-start pb-2">Clear filters</button>
    </div>
  );
};
