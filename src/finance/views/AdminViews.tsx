/** Reports, spreadsheet import and master data/settings. */
import React, { useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { download, get, label, patch, post, put } from '../api';
import { useFinanceUser } from '../FinanceAuth';
import { emptyFilters, FilterBar, toQuery, type FinanceFilters } from '../FilterBar';
import { Badge, Btn, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, StatusBadge, Table, Td, Th, useAction, useLoad } from '../ui';

type Rec = Record<string, any>;

// ------------------------------------------------------------------ Reports
const REPORTS: { id: string; name: string; desc: string; costs?: boolean }[] = [
  { id: 'tour-pnl', name: 'Tour-wise P&L', desc: 'Tour Code, client, destination, revenue, expenses, gross profit, margin, financial status' },
  { id: 'expense-categories', name: 'Expense category report', desc: 'Expected, actual, variance and verified cost by category across the selected tours', costs: true },
  { id: 'hotel-reconciliation', name: 'Hotel reconciliation', desc: 'Hotel, Tour Code, check-in/out, rooms, expected, actual, variance, dispute status', costs: true },
  { id: 'restaurant-reconciliation', name: 'Restaurant reconciliation', desc: 'Restaurant, Tour Code, date, pax, FOC, rate, expected, actual, variance', costs: true },
  { id: 'vendor-payables', name: 'Vendor payables', desc: 'Vendor, invoice, Tour Codes, bill, paid, outstanding, due date', costs: true },
  { id: 'client-receivables', name: 'Client receivables', desc: 'Client, Tour Code, invoiced, collected, outstanding' },
  { id: 'profitability', name: 'Profitability', desc: 'Tour profitability with salesperson / operations columns, filtered by the period above' },
  { id: 'variance', name: 'Variance & dispute report', desc: 'All unresolved and resolved discrepancies', costs: true },
];

export const FinanceReportsView: React.FC = () => {
  const { can } = useFinanceUser();
  const [filters, setFilters] = useState<FinanceFilters>(emptyFilters());
  const [preview, setPreview] = useState<{ id: string; rows: Rec[] } | null>(null);
  const { busy, error, run } = useAction();
  const q = toQuery(filters);
  const withFmt = (id: string) => `/finance/reports/${id}${q ? `${q}&` : '?'}format=csv`;
  return (
    <div className="space-y-6">
      <PageHeader title="Financial Reports" subtitle="Exports open in Excel (CSV, UTF-8). Every report respects your access permissions." />
      <FilterBar value={filters} onChange={setFilters} />
      <ErrorBox error={error} />
      <div className="grid md:grid-cols-2 gap-3">
        {REPORTS.filter((r) => !r.costs || can('finance.view_costs')).map((r) => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
            <div className="text-sm font-bold text-slate-900">{r.name}</div>
            <div className="text-xs text-slate-500 flex-1">{r.desc}</div>
            <div className="flex gap-2">
              <Btn small disabled={busy} onClick={() => run(async () => setPreview({ id: r.id, rows: await get(`/finance/reports/${r.id}${q}`) }))}>Preview</Btn>
              <Btn small variant="primary" disabled={busy} onClick={() => run(() => download(withFmt(r.id), `${r.id}.csv`))}><Download className="w-3 h-3" /> Excel (CSV)</Btn>
              <Btn small disabled={busy} onClick={() => run(async () => printReport(r.name, await get(`/finance/reports/${r.id}${q}`)))}>Print / PDF</Btn>
            </div>
          </div>
        ))}
      </div>
      {preview && (
        <Modal title={`${REPORTS.find((r) => r.id === preview.id)?.name} · ${preview.rows.length} rows`} onClose={() => setPreview(null)} wide>
          <ReportTable rows={preview.rows} />
        </Modal>
      )}
    </div>
  );
};

const ReportTable: React.FC<{ rows: Rec[] }> = ({ rows }) => {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return (
    <Table isEmpty={!rows.length} head={cols.map((c) => <Th key={c}>{label(c)}</Th>)}>
      {rows.slice(0, 300).map((r, i) => <tr key={i}>{cols.map((c) => <Td key={c} className="whitespace-nowrap">{r[c] === null || r[c] === undefined ? '' : String(r[c])}</Td>)}</tr>)}
    </Table>
  );
};

/** Opens a print-friendly window; the browser's "Save as PDF" produces the PDF. */
function printReport(title: string, rows: Rec[]) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font:11px system-ui,sans-serif;margin:24px;color:#0f172a} h1{font-size:16px} table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left} th{background:#f1f5f9} @page{size:landscape;margin:12mm}</style></head><body>
    <h1>Let's See Tour &amp; Travels: ${esc(title)}</h1><p>Generated ${esc(new Date().toLocaleString('en-IN'))} · ${rows.length} rows</p>
    <table><thead><tr>${cols.map((c) => `<th>${esc(label(c))}</th>`).join('')}</tr></thead><tbody>
    ${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

// ------------------------------------------------------------------ Import
const FIELD_LABELS: Record<string, string> = {
  tour_code: 'Tour Code', client_name: 'Client / group', city: 'City', hotel_name: 'Hotel name', check_in: 'Check-in', check_out: 'Check-out', nights: 'Nights',
  dbl: 'Dbl', sng: 'Sng', eb: 'EB', foc: 'FOC', meal_plan: 'Meal plan', sng_rate: 'SNG.Rate', dbl_rate: 'DBL.Rate', eb_rate: 'EB RATE', cwb: 'CWB', cnb: 'CNB',
  cwb_rate: 'CWB rate', cnb_rate: 'CNB rate', tea_coffee: 'Tea/coffee', amount_lstt: 'Amount (LSTT)', amount_hotel: 'Amount (Hotel)', dispute_amount: 'Dispute amount',
  remarks: 'Remarks (lets See)', restaurant_name: 'Restaurant', date: 'Date', pax: 'No. of pax', rate: 'Rate', amount_restaurant: 'Restaurant amount',
};

export const FinanceImportView: React.FC = () => {
  const templates = useLoad(() => get('/finance/imports/templates'), []);
  const [type, setType] = useState<'hotel' | 'restaurant' | 'consolidated'>('hotel');
  const [file, setFile] = useState<{ name: string; csv?: string; xlsx_base64?: string } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerRow, setHeaderRow] = useState(1);
  const [map, setMap] = useState<Record<string, string>>({});
  const [headMap, setHeadMap] = useState<Record<string, string>>({});
  const [batchId, setBatchId] = useState<string | null>(null);
  const batch = useLoad(() => (batchId ? get(`/finance/imports/${batchId}`) : Promise.resolve(null)), [batchId]);
  const [mapRow, setMapRow] = useState<Rec | null>(null);
  const { busy, error, run, setError } = useAction();

  const readFile = async (f: File) => {
    setBatchId(null); setError(null);
    if (/\.xlsx$/i.test(f.name)) {
      const buf = new Uint8Array(await f.arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      setFile({ name: f.name, xlsx_base64: btoa(bin) });
      setHeaders([]); // headers for xlsx are discovered by a first preview attempt
    } else {
      const text = await f.text();
      setFile({ name: f.name, csv: text });
      setHeaders(parseHeader(text, headerRow));
    }
  };
  const autoMap = (hs: string[]) => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const m: Record<string, string> = {};
    for (const fld of (templates.data?.[type] ?? []) as string[]) {
      const want = [fld, FIELD_LABELS[fld] ?? ''].map(norm);
      const h = hs.find((x) => want.includes(norm(x)));
      if (h) m[fld] = h;
    }
    setMap(m);
    if (type === 'consolidated') {
      const hm: Record<string, string> = {};
      for (const h of templates.data?.consolidated_heads ?? []) { const col = hs.find((x) => norm(x) === norm(h.original_label)); if (col) hm[h.code] = col; }
      setHeadMap(hm);
    }
  };

  const previewImport = () => run(async () => {
    const res = await post('/finance/imports/preview', { import_type: type, file_name: file!.name, csv: file!.csv, xlsx_base64: file!.xlsx_base64, header_row: headerRow, column_map: map, head_map: type === 'consolidated' ? headMap : undefined });
    setBatchId(res.batchId);
  });

  const fields = (templates.data?.[type] ?? []) as string[];
  const b = batch.data;
  return (
    <div className="space-y-6">
      <PageHeader title="Import Historical Sheets" subtitle="Upload → map columns → preview & validate → fix unmatched Tour Codes → commit. Nothing is discarded; imported lines are marked as historical." />
      {templates.error && <ErrorBox error={templates.error} />}
      <Card title="1 · File and import type">
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <Field label="Import type"><Select value={type} onChange={(e) => { setType(e.target.value as any); setMap({}); setHeadMap({}); setBatchId(null); }}>
            <option value="hotel">Hotel reconciliation sheet</option><option value="restaurant">Restaurant reconciliation sheet</option><option value="consolidated">Consolidated tour expenses</option>
          </Select></Field>
          <Field label="Header row number"><Input type="number" min={1} value={headerRow} onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 1); setHeaderRow(v); if (file?.csv) setHeaders(parseHeader(file.csv, v)); }} /></Field>
          <label className="sm:col-span-2 text-xs">
            <span className="font-semibold text-slate-600 block mb-1">Spreadsheet (.csv or .xlsx)</span>
            <input type="file" accept=".csv,.xlsx,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} className="text-xs" />
          </label>
        </div>
        {file?.xlsx_base64 && !headers.length && <div className="mt-3 flex items-center gap-2 text-xs"><Btn small disabled={busy} onClick={() => run(async () => {
          const r = await post('/finance/imports/headers', { xlsx_base64: file.xlsx_base64, header_row: headerRow });
          setHeaders(r.headers); autoMap(r.headers);
        })}>Read column headers</Btn><span className="text-slate-500">Excel headers are read on the server.</span></div>}
      </Card>

      {headers.length > 0 && (
        <Card title="2 · Map columns" right={<Btn small onClick={() => autoMap(headers)}>Auto-match by name</Btn>}>
          <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {fields.map((fld) => (
              <Field key={fld} label={FIELD_LABELS[fld] ?? label(fld)} required={['tour_code', 'hotel_name', 'restaurant_name', 'check_in', 'check_out', 'date'].includes(fld) && !(type === 'consolidated' && fld === 'date')}>
                <Select value={map[fld] ?? ''} onChange={(e) => { const m = { ...map }; if (e.target.value) m[fld] = e.target.value; else delete m[fld]; setMap(m); }}>
                  <option value="">— not in sheet —</option>{headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </Field>
            ))}
          </div>
          {type === 'consolidated' && (
            <>
              <div className="text-[11px] font-semibold text-slate-600 mt-4 mb-2">Expense head columns (blank cells are not treated as zero)</div>
              <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(templates.data?.consolidated_heads ?? []).map((h: Rec) => (
                  <Field key={h.code} label={h.original_label}>
                    <Select value={headMap[h.code] ?? ''} onChange={(e) => { const m = { ...headMap }; if (e.target.value) m[h.code] = e.target.value; else delete m[h.code]; setHeadMap(m); }}>
                      <option value="">—</option>{headers.map((x) => <option key={x} value={x}>{x}</option>)}
                    </Select>
                  </Field>
                ))}
              </div>
            </>
          )}
          <div className="mt-4 flex justify-end"><Btn variant="primary" disabled={busy || !map.tour_code} onClick={previewImport}><FileUp className="w-3.5 h-3.5" /> Preview & validate</Btn></div>
        </Card>
      )}
      <ErrorBox error={error} />

      {b && (
        <Card title={`3 · Preview · batch #${b.batch.id} (${b.batch.status})`} right={b.batch.status === 'previewed' && <Btn variant="primary" disabled={busy} onClick={() => run(async () => { await post(`/finance/imports/${b.batch.id}/commit`); batch.reload(); })}>Commit valid rows</Btn>} pad={false}>
          <div className="px-5 py-3 flex flex-wrap gap-2 text-xs border-b border-slate-100">
            {Object.entries(b.batch.summary ?? {}).map(([k, v]) => <Badge key={k} tone={k === 'valid' || k === 'cost_items_created' ? 'green' : k === 'invalid' || k === 'duplicate' ? 'red' : k === 'unmatched' ? 'amber' : 'slate'}>{label(k)}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</Badge>)}
          </div>
          <Table isEmpty={!b.rows.length} head={<><Th>Row</Th><Th>Status</Th><Th>Tour Code</Th><Th>Main values</Th><Th>Problems</Th><Th /></>}>
            {b.rows.map((r: Rec) => (
              <tr key={r.id}>
                <Td>{r.row_number}</Td><Td><StatusBadge s={r.status} /></Td>
                <Td className="font-mono">{r.tour_code ?? r.tour_code_raw ?? '—'}</Td>
                <Td className="text-slate-600 max-w-[340px]">{summariseRow(r.mapped)}</Td>
                <Td className="text-red-800 max-w-[260px]">{(r.errors ?? []).join('; ')}</Td>
                <Td>{r.status === 'unmatched' && b.batch.status === 'previewed' && <Btn small onClick={() => setMapRow(r)}>Map to tour</Btn>}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      {mapRow && <MapRowModal batchId={b.batch.id} row={mapRow} onClose={() => setMapRow(null)} onSaved={batch.reload} />}
    </div>
  );
};

function parseHeader(csv: string, row: number) {
  const line = csv.replace(/^﻿/, '').split(/\r?\n/)[row - 1] ?? '';
  const out: string[] = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}
function summariseRow(m: Rec | null) {
  if (!m) return '';
  const parts = [m.hotel_name ?? m.restaurant_name, m.check_in ?? m.date, m.amount_lstt && `LSTT ${m.amount_lstt}`, (m.amount_hotel ?? m.amount_restaurant) && `Charged ${m.amount_hotel ?? m.amount_restaurant}`, m.heads && Object.entries(m.heads).map(([k, v]) => `${k} ${v}`).join(', '), m.remarks];
  return parts.filter(Boolean).join(' · ');
}

const MapRowModal: React.FC<{ batchId: string; row: Rec; onClose: () => void; onSaved: () => void }> = ({ batchId, row, onClose, onSaved }) => {
  const tours = useLoad(() => get<any[]>('/tours'), []);
  const [code, setCode] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal title={`Map row ${row.row_number} to an existing tour`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-600">Sheet value: <b className="font-mono">{row.tour_code_raw || '(blank)'}</b>. Rows are only mapped to existing Tour Codes; imports never create tours.</p>
        <Field label="Tour Code"><Select value={code} onChange={(e) => setCode(e.target.value)}><option value="">Select…</option>{(tours.data ?? []).map((t) => <option key={t.tour_code} value={t.tour_code}>{t.tour_code} · {t.client_name} · {t.start_date}</option>)}</Select></Field>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!code || busy} onClick={() => run(async () => { await post(`/finance/imports/${batchId}/rows/${row.id}/map`, { tour_code: code }); onSaved(); onClose(); })}>Map row</Btn></div>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------------ Masters & settings
export const FinanceMastersView: React.FC = () => {
  const { can } = useFinanceUser();
  const heads = useLoad(() => get<any[]>('/finance/expense-heads'), []);
  const cats = useLoad(() => get<any[]>('/finance/expense-categories'), []);
  const settings = useLoad(() => get<any[]>('/finance/settings'), []);
  const [edit, setEdit] = useState<Rec | null>(null);
  const [setting, setSetting] = useState<Rec | null>(null);
  const manage = can('master.manage');
  return (
    <div className="space-y-6">
      <PageHeader title="Expense Heads & Finance Settings" subtitle="Sheet labels are preserved as the original label. Heads marked unconfirmed still need the client to confirm their meaning.">
        {manage && <Btn variant="primary" onClick={() => setEdit({ code: '', display_name: '', category_code: 'other_commercial', cost_nature: 'supplier', requires_approval: true, active: true, _new: true })}>New expense head</Btn>}
      </PageHeader>
      <Card pad={false} title="Finance settings" right={<span className="text-[11px] text-slate-400">Provisional settings need finance approval</span>}>
        {!settings.data ? <Loading /> : (
          <Table head={<><Th>Setting</Th><Th>Value</Th><Th>Status</Th><Th>Description</Th><Th /></>}>
            {settings.data.map((s) => (
              <tr key={s.key}><Td className="font-mono">{s.key}</Td><Td className="font-semibold">{String(typeof s.value === 'string' ? s.value : JSON.stringify(s.value))}</Td>
                <Td>{s.confirmed ? <Badge tone="green">Confirmed</Badge> : <Badge tone="amber">Provisional</Badge>}</Td><Td className="text-slate-500 max-w-[420px]">{s.description}</Td>
                <Td>{can('settings.manage') && <Btn small onClick={() => setSetting(s)}>Change</Btn>}</Td></tr>
            ))}
          </Table>
        )}
      </Card>
      <Card pad={false} title={`Expense heads (${heads.data?.length ?? 0})`}>
        {!heads.data ? <Loading /> : (
          <Table head={<><Th>Code</Th><Th>Display name</Th><Th>Original sheet label</Th><Th>Category</Th><Th>Nature</Th><Th>Approval</Th><Th>Reporting group</Th><Th>Status</Th><Th /></>}>
            {heads.data.map((h) => (
              <tr key={h.id} className={h.active ? '' : 'opacity-60'}>
                <Td className="font-mono">{h.code}</Td><Td className="font-semibold">{h.display_name}</Td><Td className="font-mono">{h.original_label ?? '—'}</Td>
                <Td>{cats.data?.find((c) => c.code === h.category_code)?.name ?? h.category_code}</Td><Td>{label(h.cost_nature)}</Td>
                <Td>{h.requires_approval ? 'Required' : 'No'}</Td><Td>{h.reporting_group ?? '—'}</Td>
                <Td className="space-x-1">{h.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}{h.needs_confirmation && <Badge tone="amber">Unconfirmed</Badge>}</Td>
                <Td>{manage && <Btn small onClick={() => setEdit(h)}>Edit</Btn>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {edit && <HeadModal head={edit} cats={cats.data ?? []} onClose={() => setEdit(null)} onSaved={heads.reload} />}
      {setting && <SettingModal s={setting} onClose={() => setSetting(null)} onSaved={settings.reload} />}
    </div>
  );
};

const HeadModal: React.FC<{ head: Rec; cats: Rec[]; onClose: () => void; onSaved: () => void }> = ({ head, cats, onClose, onSaved }) => {
  const [f, setF] = useState({ ...head });
  const { busy, error, run } = useAction();
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <Modal title={head._new ? 'New expense head' : `Edit ${head.code}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Code" required><Input value={f.code} onChange={set('code')} disabled={!head._new} /></Field>
          <Field label="Display name" required><Input value={f.display_name} onChange={set('display_name')} /></Field>
          <Field label="Category"><Select value={f.category_code} onChange={set('category_code')}>{cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></Field>
          <Field label="Nature"><Select value={f.cost_nature} onChange={set('cost_nature')}><option value="supplier">Supplier-based (payable)</option><option value="internal">Internal cost</option></Select></Field>
          <Field label="Default tax %"><Input inputMode="decimal" value={f.default_tax_pct ?? ''} onChange={set('default_tax_pct')} /></Field>
          <Field label="Reporting group"><Input value={f.reporting_group ?? ''} onChange={set('reporting_group')} /></Field>
        </div>
        {head.original_label && <p className="text-[11px] text-slate-500">Original sheet label <b className="font-mono">{head.original_label}</b> is kept and cannot be changed.</p>}
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.requires_approval} onChange={set('requires_approval')} /> Requires approval</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.active} onChange={set('active')} /> Active</label>
          {!head._new && <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.needs_confirmation} onChange={set('needs_confirmation')} /> Meaning still unconfirmed</label>}
        </div>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy} onClick={() => run(async () => {
          const body = { display_name: f.display_name, category_code: f.category_code, cost_nature: f.cost_nature, requires_approval: !!f.requires_approval, default_tax_pct: f.default_tax_pct || null, reporting_group: f.reporting_group || null, active: !!f.active };
          if (head._new) await post('/finance/expense-heads', { code: f.code, ...body });
          else await patch(`/finance/expense-heads/${head.id}`, { ...body, needs_confirmation: !!f.needs_confirmation });
          onSaved(); onClose();
        })}>Save</Btn></div>
      </div>
    </Modal>
  );
};

const SETTING_OPTIONS: Record<string, string[]> = {
  revenue_recognition_basis: ['confirmed_price', 'tax_invoiced'], default_hotel_foc_rule: ['none', 'deduct_single', 'deduct_double'],
  default_restaurant_foc_rule: ['none', 'deduct'], overhead_allocation_method: ['none'],
};
const SettingModal: React.FC<{ s: Rec; onClose: () => void; onSaved: () => void }> = ({ s, onClose, onSaved }) => {
  const [value, setValue] = useState(String(s.value));
  const [confirmed, setConfirmed] = useState(!!s.confirmed);
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  const opts = SETTING_OPTIONS[s.key];
  return (
    <Modal title={`Change ${s.key}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">{s.description}</p>
        <Field label="Value">{opts ? <Select value={value} onChange={(e) => setValue(e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</Select> : <Input value={value} onChange={(e) => setValue(e.target.value)} />}</Field>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> Approved by the finance team (mark as confirmed)</label>
        <Field label="Reason" required><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy} onClick={() => run(async () => { await put(`/finance/settings/${s.key}`, { value, confirmed, reason }); onSaved(); onClose(); })}>Save</Btn></div>
      </div>
    </Modal>
  );
};
