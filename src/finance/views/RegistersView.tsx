/** Cross-tour registers: expenses, reconciliation/variance, vendor bills & payments, client collections. */
import React, { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { billAction, download, fmtDate, get, inr, label, post } from '../api';
import { useFinanceUser } from '../FinanceAuth';
import { CostItemForm, KINDS } from '../CostItemForm';
import { BillForm, DocumentsModal, PaymentForm, ReasonModal, ReceiptForm } from '../actions';
import { Badge, Btn, Card, ErrorBox, Field, Input, Loading, Modal, Money, PageHeader, Select, StatusBadge, Table, Td, TextArea, Th, useAction, useLoad } from '../ui';

type Rec = Record<string, any>;
const TourLink: React.FC<{ code: string | null; onOpen: (c: string) => void }> = ({ code, onOpen }) =>
  code ? <button className="font-mono text-emerald-700 hover:underline whitespace-nowrap" onClick={() => onOpen(code)}>{code}</button> : <Badge tone="amber">Unallocated</Badge>;

// ------------------------------------------------------------------ Expense register
export const ExpenseRegisterView: React.FC<{ onOpenTour: (c: string) => void }> = ({ onOpenTour }) => {
  const { can } = useFinanceUser();
  const [f, setF] = useState({ tourCode: '', kind: '', category: '', status: '', unallocated: false });
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v).map(([k, v]) => [k, String(v)])).toString();
  const items = useLoad(() => get<any[]>(`/finance/cost-items${qs ? `?${qs}` : ''}`), [qs]);
  const cats = useLoad(() => get<any[]>('/finance/expense-categories'), []);
  const [modal, setModal] = useState<Rec | null>(null);
  const totals = useMemo(() => (items.data ?? []).reduce((a, i) => ({ e: a.e + Number(i.expected_override_amount ?? i.expected_amount ?? 0), x: a.x + Number(i.actual_amount ?? 0) }), { e: 0, x: 0 }), [items.data]);
  return (
    <div className="space-y-6">
      <PageHeader title="Expense Register" subtitle="Every cost line across all tours, including company-level expenses that are not allocated to a tour.">
        {can('cost.write') && <Btn variant="primary" onClick={() => setModal({ t: 'new' })}><Plus className="w-3.5 h-3.5" /> Add expense</Btn>}
      </PageHeader>
      <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
        <Field label="Tour Code"><Input value={f.tourCode} onChange={(e) => setF({ ...f, tourCode: e.target.value.trim() })} placeholder="Exact code" /></Field>
        <Field label="Line type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="">All</option>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></Field>
        <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">All</option>{(cats.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All</option>{['estimated', 'booked', 'service_completed', 'bill_pending', 'bill_received', 'under_verification', 'approved', 'disputed', 'cancelled'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></Field>
        <label className="flex items-center gap-2 text-xs pb-2"><input type="checkbox" checked={f.unallocated} onChange={(e) => setF({ ...f, unallocated: e.target.checked })} /> Unallocated only</label>
      </div>
      {items.error && <ErrorBox error={items.error} />}
      <Card pad={false} title={`${items.data?.length ?? 0} lines`} right={<span className="text-xs text-slate-500 tabular-nums">Expected {inr(totals.e.toFixed(2))} · Actual {inr(totals.x.toFixed(2))}</span>}>
        {!items.data ? <Loading /> : (
          <Table isEmpty={!items.data.length} head={<><Th>Tour</Th><Th>Line</Th><Th>Head</Th><Th>Date</Th><Th>Supplier / payee</Th><Th right>Expected</Th><Th right>Actual</Th><Th right>Verified</Th><Th>Status</Th><Th>Source</Th><Th /></>}>
            {items.data.map((i) => (
              <tr key={i.id}>
                <Td><TourLink code={i.tour_code} onOpen={onOpenTour} /></Td>
                <Td><div className="font-semibold">{i.detail?.hotel_name ?? i.detail?.restaurant_name ?? i.detail?.guide_name ?? i.description ?? label(i.kind)}</div><div className="text-slate-400">#{i.id} · {label(i.kind)}</div></Td>
                <Td>{i.head_name ?? '—'}{i.head_original_label && i.head_original_label !== i.head_name && <div className="text-slate-400">{i.head_original_label}</div>}</Td>
                <Td className="whitespace-nowrap">{fmtDate(i.service_date)}</Td>
                <Td>{i.supplier_name ?? i.payee_name ?? (i.cost_nature === 'internal' ? 'Internal' : '—')}</Td>
                <Td right><Money v={i.expected_override_amount ?? i.expected_amount} /></Td>
                <Td right><Money v={i.actual_amount} /></Td>
                <Td right><Money v={i.verified_amount} /></Td>
                <Td><StatusBadge s={i.status} /></Td>
                <Td>{i.source === 'import' ? <Badge tone="blue">Historical import</Badge> : <span className="text-slate-400">Live</span>}</Td>
                <Td className="whitespace-nowrap">
                  {can('cost.write') && <Btn small onClick={() => setModal({ t: 'edit', item: i })}>Edit</Btn>}
                  <Btn small variant="ghost" onClick={() => setModal({ t: 'docs', item: i })}>Docs</Btn>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {modal?.t === 'new' && <CostItemForm tourCode={f.tourCode || null} onClose={() => setModal(null)} onSaved={items.reload} />}
      {modal?.t === 'edit' && <CostItemForm item={modal.item} onClose={() => setModal(null)} onSaved={items.reload} />}
      {modal?.t === 'docs' && <DocumentsModal entityType="cost_item" entityId={modal.item.id} title={`line #${modal.item.id}`} canUpload={can('bill.write')} onClose={() => setModal(null)} />}
    </div>
  );
};

// ------------------------------------------------------------------ Reconciliation / variance register
export const ReconciliationView: React.FC<{ onOpenTour: (c: string) => void; initialKind?: 'all' | 'hotel' | 'restaurant' }> = ({ onOpenTour, initialKind = 'all' }) => {
  const { can } = useFinanceUser();
  const [kind, setKind] = useState(initialKind);
  const [status, setStatus] = useState('');
  const cases = useLoad(() => get<any[]>(`/finance/reconciliation${status ? `?status=${status}` : ''}`), [status]);
  // Lines with a variance or missing bill but no case yet
  const lines = useLoad(() => get<any[]>(`/finance/tours`).then(async (tours) => {
    const out: Rec[] = [];
    for (const t of tours.filter((x) => x.warningCount > 0)) {
      const p = await get(`/finance/tours/${encodeURIComponent(t.tour.tour_code)}`);
      for (const i of p.items) if (['charged_extra', 'charged_less', 'bill_not_received', 'pending_verification'].includes(i.reconState)) out.push({ ...i, tour_code: t.tour.tour_code });
    }
    return out;
  }), []);
  const [modal, setModal] = useState<Rec | null>(null);
  const filt = (r: Rec) => kind === 'all' || r.kind === kind;
  return (
    <div className="space-y-6">
      <PageHeader title={kind === 'hotel' ? 'Hotel Reconciliation' : kind === 'restaurant' ? 'Restaurant Reconciliation' : 'Pending Reconciliation & Variance Register'} subtitle="Expected (agreed) vs actual (charged). Both amounts are always kept; resolved cases stay in the register.">
        <div className="inline-flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(['all', 'hotel', 'restaurant'] as const).map((k) => <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${kind === k ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{k === 'all' ? 'All' : label(k) + 's'}</button>)}
        </div>
        <Btn onClick={() => download(`/finance/reports/${kind === 'restaurant' ? 'restaurant-reconciliation' : kind === 'hotel' ? 'hotel-reconciliation' : 'variance'}?format=csv`, `${kind}-reconciliation.csv`)}><Download className="w-3.5 h-3.5" /> Export</Btn>
      </PageHeader>

      <Card pad={false} title="Lines needing reconciliation" right={<span className="text-[11px] text-slate-400">Variance or missing bill, no case opened yet</span>}>
        {!lines.data ? <Loading /> : (
          <Table isEmpty={!lines.data.filter(filt).length} empty="Nothing pending" head={<><Th>Tour</Th><Th>Line</Th><Th>Date</Th><Th right>Expected</Th><Th right>Actual</Th><Th right>Variance</Th><Th>State</Th><Th>Remarks</Th></>}>
            {lines.data.filter(filt).map((i) => (
              <tr key={i.id}>
                <Td><TourLink code={i.tour_code} onOpen={onOpenTour} /></Td>
                <Td className="font-semibold">{i.detail?.hotel_name ?? i.detail?.restaurant_name ?? i.description ?? label(i.kind)}<div className="text-slate-400 font-normal">#{i.id} · {label(i.kind)}</div></Td>
                <Td className="whitespace-nowrap">{fmtDate(i.service_date)}</Td>
                <Td right><Money v={i.expected} /></Td><Td right><Money v={i.actual} /></Td><Td right><Money v={i.variance} signed /></Td>
                <Td><StatusBadge s={i.reconState} /></Td>
                <Td className="text-slate-600">{i.detail?.hotel_remarks ?? i.remarks ?? ''}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card pad={false} title="Discrepancy cases" right={<Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-40"><option value="">All statuses</option>{['open', 'under_review', 'approved', 'rejected', 'resolved'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>}>
        {cases.error && <div className="p-4"><ErrorBox error={cases.error} /></div>}
        {!cases.data ? <Loading /> : (
          <Table isEmpty={!cases.data.filter(filt).length} empty="No cases" head={<><Th>Tour</Th><Th>Category</Th><Th>Supplier</Th><Th right>Expected</Th><Th right>Actual</Th><Th right>Variance</Th><Th right>%</Th><Th>Reason</Th><Th>Status</Th><Th right>Agreed amount</Th><Th>Resolved</Th><Th /></>}>
            {cases.data.filter(filt).map((c) => (
              <tr key={c.id}>
                <Td><TourLink code={c.tour_code} onOpen={onOpenTour} /></Td>
                <Td>{label(c.category_code)}</Td>
                <Td>{c.hotel_name ?? c.restaurant_name ?? c.supplier ?? '—'}</Td>
                <Td right><Money v={c.expected_snapshot} /></Td><Td right><Money v={c.actual_snapshot} /></Td><Td right><Money v={c.variance} signed /></Td>
                <Td right className="tabular-nums">{c.variance_pct ?? '—'}</Td>
                <Td className="max-w-[200px]"><div className="font-semibold">{c.reason}</div>{c.remarks && <div className="text-slate-500">{c.remarks}</div>}</Td>
                <Td><StatusBadge s={c.status} /></Td>
                <Td right><Money v={c.approved_adjustment} /></Td>
                <Td className="whitespace-nowrap">{c.resolved_at ? fmtDate(c.resolved_at) : '—'}</Td>
                <Td className="whitespace-nowrap">
                  {['open', 'under_review'].includes(c.status) && (can('recon.resolve') || can('recon.write')) && <Btn small onClick={() => setModal(c)}>Update</Btn>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {modal && <ResolveModal c={modal} canResolve={can('recon.resolve')} onClose={() => setModal(null)} onSaved={() => { cases.reload(); lines.reload(); }} />}
    </div>
  );
};

const ResolveModal: React.FC<{ c: Rec; canResolve: boolean; onClose: () => void; onSaved: () => void }> = ({ c, canResolve, onClose, onSaved }) => {
  const opts = canResolve ? ['under_review', 'approved', 'resolved', 'rejected'] : ['under_review'];
  const [status, setStatus] = useState(opts[0]);
  const [adj, setAdj] = useState(c.actual_snapshot ?? '');
  const [remarks, setRemarks] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal title={`Discrepancy #${c.id} · ${c.tour_code}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-600">Expected {inr(c.expected_snapshot)} · Actual {inr(c.actual_snapshot)} · Variance {inr(c.variance)}. The agreed rate is not changed by resolving a case.</p>
        <Field label="New status"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{opts.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></Field>
        {['approved', 'resolved'].includes(status) && <Field label="Agreed final cost" hint="Becomes the verified cost when Accounts approves the line"><Input inputMode="decimal" value={adj} onChange={(e) => setAdj(e.target.value)} /></Field>}
        <Field label="Remarks"><TextArea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={busy} onClick={() => run(async () => { await (await import('../api')).patch(`/finance/reconciliation/${c.id}`, { status, approved_adjustment: ['approved', 'resolved'].includes(status) && adj ? adj : null, remarks: remarks || null }); onSaved(); onClose(); })}>Save</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------------ Vendor bills & supplier payments
export const VendorBillsView: React.FC<{ onOpenTour: (c: string) => void }> = ({ onOpenTour }) => {
  const { can } = useFinanceUser();
  const [status, setStatus] = useState('');
  const bills = useLoad(() => get<any[]>(`/finance/vendor-bills${status ? `?status=${status}` : ''}`), [status]);
  const [modal, setModal] = useState<Rec | null>(null);
  const out = (b: Rec) => (Number(b.total_amount) + Number(b.adjustments) - Number(b.paid)).toFixed(2);
  return (
    <div className="space-y-6">
      <PageHeader title="Vendor Bills & Supplier Payments" subtitle="Bill received → verified → approved → paid. A bill is not a payment; a payment never adds cost.">
        <Btn onClick={() => download('/finance/reports/vendor-payables?format=csv', 'vendor-payables.csv')}><Download className="w-3.5 h-3.5" /> Payables report</Btn>
        {can('payment.write') && <Btn onClick={() => setModal({ t: 'advance' })}>Record advance</Btn>}
        {can('bill.write') && <Btn variant="primary" onClick={() => setModal({ t: 'bill' })}><Plus className="w-3.5 h-3.5" /> Record bill</Btn>}
      </PageHeader>
      <Card pad={false} title={`${bills.data?.length ?? 0} bills`} right={<Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-44"><option value="">All statuses</option>{['received', 'under_verification', 'approved', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>}>
        {bills.error && <div className="p-4"><ErrorBox error={bills.error} /></div>}
        {!bills.data ? <Loading /> : (
          <Table isEmpty={!bills.data.length} head={<><Th>Supplier</Th><Th>Invoice</Th><Th>Tour Codes</Th><Th>Date / due</Th><Th right>Total</Th><Th right>Adj.</Th><Th right>Paid</Th><Th right>Outstanding</Th><Th>Status</Th><Th /></>}>
            {bills.data.map((b) => {
              const tours = [...new Set((b.lines ?? []).map((l: Rec) => l.tour_code))] as string[];
              const overdue = b.due_date && b.due_date < new Date().toISOString().substring(0, 10) && Number(out(b)) > 0 && b.status === 'approved';
              return (
                <tr key={b.id}>
                  <Td className="font-semibold">{b.supplier_name}</Td>
                  <Td className="font-mono">{b.invoice_number}</Td>
                  <Td>{tours.map((t) => <div key={t}><TourLink code={t} onOpen={onOpenTour} /></div>)}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(b.invoice_date)}<br /><span className={overdue ? 'text-red-700 font-semibold' : 'text-slate-500'}>due {fmtDate(b.due_date)}{overdue ? ' · overdue' : ''}</span></Td>
                  <Td right><Money v={b.total_amount} /></Td><Td right><Money v={b.adjustments} signed /></Td><Td right><Money v={b.paid} /></Td><Td right><Money v={out(b)} strong /></Td>
                  <Td><StatusBadge s={b.status} /></Td>
                  <Td className="whitespace-nowrap space-x-1">
                    <Btn small variant="ghost" onClick={() => setModal({ t: 'docs', b })}>Docs</Btn>
                    {b.status === 'received' && can('bill.write') && <Btn small onClick={() => setModal({ t: 'status', b, s: 'under_verification' })}>Verify</Btn>}
                    {['received', 'under_verification'].includes(b.status) && can('bill.approve') && <Btn small variant="primary" onClick={() => setModal({ t: 'status', b, s: 'approved' })}>Approve</Btn>}
                    {['received', 'under_verification'].includes(b.status) && can('bill.approve') && <Btn small variant="danger" onClick={() => setModal({ t: 'status', b, s: 'rejected' })}>Reject</Btn>}
                    {b.status === 'approved' && Number(out(b)) > 0 && can('payment.write') && <Btn small variant="primary" onClick={() => setModal({ t: 'pay', b })}>Pay</Btn>}
                    {b.status === 'approved' && can('bill.approve') && <Btn small onClick={() => setModal({ t: 'note', b })}>Credit/Debit note</Btn>}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
      {modal?.t === 'bill' && <BillForm onClose={() => setModal(null)} onSaved={bills.reload} />}
      {modal?.t === 'advance' && <PaymentForm onClose={() => setModal(null)} onSaved={bills.reload} />}
      {modal?.t === 'pay' && <PaymentForm bill={{ ...modal.b, id: String(modal.b.id) }} onClose={() => setModal(null)} onSaved={bills.reload} />}
      {modal?.t === 'docs' && <DocumentsModal entityType="vendor_bill" entityId={String(modal.b.id)} title={modal.b.invoice_number} canUpload={can('bill.write')} onClose={() => setModal(null)} />}
      {modal?.t === 'status' && <ReasonModal title={`${billAction(modal.s)} · ${modal.b.invoice_number}`} label={billAction(modal.s)} danger={modal.s === 'rejected'} required={modal.s === 'rejected'} onClose={() => setModal(null)} onSubmit={async (reason) => { await post(`/finance/vendor-bills/${modal.b.id}/status`, { status: modal.s, reason: reason || null }); bills.reload(); }} />}
      {modal?.t === 'note' && <BillNoteModal bill={modal.b} onClose={() => setModal(null)} onSaved={bills.reload} />}
    </div>
  );
};

const BillNoteModal: React.FC<{ bill: Rec; onClose: () => void; onSaved: () => void }> = ({ bill, onClose, onSaved }) => {
  const [f, setF] = useState({ type: 'credit_note', amount: '', note_date: new Date().toISOString().substring(0, 10), reason: '' });
  const { busy, error, run } = useAction();
  return (
    <Modal title={`Credit / debit note · ${bill.invoice_number}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="credit_note">Credit note (reduces bill)</option><option value="debit_note">Debit note (increases bill)</option></Select></Field>
          <Field label="Amount" required><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Date" required><Input type="date" value={f.note_date} onChange={(e) => setF({ ...f, note_date: e.target.value })} /></Field>
        </div>
        <Field label="Reason" required><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy} onClick={() => run(async () => { await post(`/finance/vendor-bills/${bill.id}/adjustments`, f); onSaved(); onClose(); })}>Save</Btn></div>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------------ Client revenue & collections
export const CollectionsView: React.FC<{ onOpenTour: (c: string) => void }> = ({ onOpenTour }) => {
  const { can } = useFinanceUser();
  const rows = useLoad(() => get<any[]>('/finance/reports/client-receivables'), []);
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const list = (rows.data ?? []).filter((r) => !onlyOpen || Number(r.outstanding) !== 0);
  const total = list.reduce((a, r) => a + Number(r.outstanding), 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Client Revenue & Collections" subtitle="Receivable is based on tax invoices once issued; before that, on the agreed contract value including GST.">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Outstanding only</label>
        <Btn onClick={() => download('/finance/reports/client-receivables?format=csv', 'client-receivables.csv')}><Download className="w-3.5 h-3.5" /> Export</Btn>
      </PageHeader>
      {rows.error && <ErrorBox error={rows.error} />}
      <Card pad={false} title={`${list.length} tours`} right={<span className="text-xs tabular-nums text-slate-600">Total outstanding {inr(total.toFixed(2))}</span>}>
        {!rows.data ? <Loading /> : (
          <Table isEmpty={!list.length} empty="Nothing outstanding" head={<><Th>Client</Th><Th>Tour</Th><Th>Basis</Th><Th right>Tax-invoiced</Th><Th right>Receivable</Th><Th right>Collected</Th><Th right>Outstanding</Th><Th /></>}>
            {list.map((r) => (
              <tr key={r.tour_code}>
                <Td className="font-semibold max-w-[220px] truncate" >{r.client}</Td>
                <Td><TourLink code={r.tour_code} onOpen={onOpenTour} /></Td>
                <Td className="text-slate-500">{label(r.receivable_basis)}</Td>
                <Td right><Money v={r.invoice_amount} /></Td><Td right><Money v={r.receivable} /></Td><Td right><Money v={r.collected} /></Td>
                <Td right><span className={Number(r.outstanding) > 0 ? 'text-red-700 font-bold' : ''}><Money v={r.outstanding} /></span></Td>
                <Td>{can('receipt.write') && <Btn small onClick={() => setReceiptFor(r.tour_code)}>Record receipt</Btn>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {receiptFor && <ReceiptForm tourCode={receiptFor} onClose={() => setReceiptFor(null)} onSaved={rows.reload} />}
    </div>
  );
};
