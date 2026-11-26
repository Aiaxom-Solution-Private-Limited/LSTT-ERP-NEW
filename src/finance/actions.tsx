/** Modal forms for financial actions. Every one posts to the server, which validates and audits. */
import React, { useState } from 'react';
import { Paperclip, Plus, Trash2 } from 'lucide-react';
import { get, inr, openDocument, post, today, uploadDocument, fmtDate } from './api';
import { Btn, ErrorBox, Field, Input, Modal, Select, TextArea, useAction, useLoad } from './ui';

type Rec = Record<string, any>;
const n = (v: string) => (v.trim() === '' ? null : v.trim());

const Footer: React.FC<{ onClose: () => void; busy: boolean; label: string; onSubmit: () => void; danger?: boolean }> = ({ onClose, busy, label, onSubmit, danger }) => (
  <div className="flex justify-end gap-2 pt-2">
    <Btn onClick={onClose}>Cancel</Btn>
    <Btn variant={danger ? 'danger' : 'primary'} onClick={onSubmit} disabled={busy}>{busy ? 'Saving…' : label}</Btn>
  </div>
);

export const NEXT_STATUS: Record<string, string[]> = {
  estimated: ['booked', 'cancelled'],
  booked: ['service_completed', 'bill_pending', 'bill_received', 'cancelled'],
  service_completed: ['bill_pending', 'bill_received', 'cancelled'],
  bill_pending: ['bill_received', 'cancelled'],
  bill_received: ['under_verification', 'approved', 'cancelled'],
  under_verification: ['approved', 'bill_received'],
  disputed: [],
  approved: ['under_verification'],
  cancelled: ['estimated'],
};
const VERIFY = ['approved', 'under_verification'];

export const StatusModal: React.FC<{ item: Rec; can: (p: string) => boolean; onClose: () => void; onSaved: () => void }> = ({ item, can, onClose, onSaved }) => {
  const options = (NEXT_STATUS[item.status] ?? []).filter((s) => (VERIFY.includes(s) || item.status === 'approved' ? can('cost.verify') : can('cost.write')));
  const [to, setTo] = useState(options[0] ?? '');
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal title={`Change status · line #${item.id}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-600">Current status: <b>{item.status.replace(/_/g, ' ')}</b>. Approving sets the verified cost used in final profitability. A disputed line is resolved from the reconciliation register.</p>
        {options.length ? (
          <Field label="Move to"><Select value={to} onChange={(e) => setTo(e.target.value)}>{options.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</Select></Field>
        ) : <p className="text-xs text-amber-800">No status change is available to you from here.</p>}
        <Field label="Reason / note"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <ErrorBox error={error} />
        {options.length > 0 && <Footer onClose={onClose} busy={busy} label="Update status" onSubmit={() => run(async () => { await post(`/finance/cost-items/${item.id}/status`, { status: to, reason: n(reason) }); onSaved(); onClose(); })} />}
      </div>
    </Modal>
  );
};

export const DisputeModal: React.FC<{ item: Rec; onClose: () => void; onSaved: () => void }> = ({ item, onClose, onSaved }) => {
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const { busy, error, run } = useAction();
  const presets = ['HOTEL CHARGED ALL DBL', 'HOTEL CHARGED EXTRA BED', 'THERE WAS NO CNB', 'OFF SEASON RATE 20% MINUS', 'SPECIAL RATE', 'HOTEL CHARGED BTJS RATES', 'BILL NOT SENT BY HOTEL', 'Pax count differs', 'Rate differs from agreement'];
  return (
    <Modal title={`Open discrepancy · line #${item.id}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><span className="text-slate-500 block">Expected</span><b className="tabular-nums">{inr(item.expected)}</b></div>
          <div><span className="text-slate-500 block">Actual</span><b className="tabular-nums">{inr(item.actual)}</b></div>
          <div><span className="text-slate-500 block">Variance</span><b className="tabular-nums">{inr(item.variance)}</b></div>
        </div>
        <Field label="Reason" required>
          <Input list="dispute-reasons" value={reason} onChange={(e) => setReason(e.target.value)} />
          <datalist id="dispute-reasons">{presets.map((p) => <option key={p} value={p} />)}</datalist>
        </Field>
        <Field label="Remarks"><TextArea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <p className="text-[11px] text-slate-500">The agreed rate and the supplier's amount are both kept. The case stays in the variance register after it is resolved.</p>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label="Open case" onSubmit={() => run(async () => { await post(`/finance/cost-items/${item.id}/reconciliation`, { reason, remarks: n(remarks) }); onSaved(); onClose(); })} />
      </div>
    </Modal>
  );
};

export const OverrideModal: React.FC<{ item: Rec; onClose: () => void; onSaved: () => void }> = ({ item, onClose, onSaved }) => {
  const [amount, setAmount] = useState(item.expected_override_amount ?? '');
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal title={`Override expected amount · line #${item.id}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-600">Calculated expected amount: <b className="tabular-nums">{inr(item.expected_amount)}</b>. The calculated figure is kept alongside the override.</p>
        <Field label="Override amount" hint="Leave blank to remove the override"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Reason" required><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. SPECIAL RATE negotiated" /></Field>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label="Save override" onSubmit={() => run(async () => { await post(`/finance/cost-items/${item.id}/override`, { amount: n(String(amount)), reason }); onSaved(); onClose(); })} />
      </div>
    </Modal>
  );
};

export const DocumentsModal: React.FC<{ entityType: string; entityId: string; title: string; canUpload: boolean; onClose: () => void }> = ({ entityType, entityId, title, canUpload, onClose }) => {
  const docs = useLoad(() => get<any[]>(`/finance/documents?entityType=${entityType}&entityId=${entityId}`), [entityType, entityId]);
  const { busy, error, run } = useAction();
  return (
    <Modal title={`Documents · ${title}`} onClose={onClose}>
      <div className="space-y-3">
        <ul className="divide-y divide-slate-100 text-xs">
          {(docs.data ?? []).map((d) => (
            <li key={d.id} className="py-2 flex justify-between gap-2">
              <button className="text-emerald-700 hover:underline flex items-center gap-1.5 truncate" onClick={() => openDocument(d.id, d.file_name)}><Paperclip className="w-3.5 h-3.5" />{d.file_name}</button>
              <span className="text-slate-400 whitespace-nowrap">{fmtDate(d.uploaded_at)}</span>
            </li>
          ))}
          {docs.data && !docs.data.length && <li className="py-3 text-slate-400">No documents attached.</li>}
        </ul>
        {canUpload && (
          <label className="block text-xs">
            <span className="font-semibold text-slate-600">Attach bill or receipt (PDF, JPG, PNG, WebP; up to 15 MB)</span>
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} className="block mt-1 text-xs"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) run(async () => { await uploadDocument(entityType, entityId, file); docs.reload(); }); e.target.value = ''; }} />
          </label>
        )}
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
};

/** Vendor bill with lines: one bill can be split across cost lines and Tour Codes. */
export const BillForm: React.FC<{ tourCode?: string; costItems?: Rec[]; onClose: () => void; onSaved: () => void }> = ({ tourCode, costItems = [], onClose, onSaved }) => {
  const suppliers = useLoad(() => get<any[]>('/suppliers'), []);
  const [f, setF] = useState({ supplier_id: '', supplier_name: '', invoice_number: '', invoice_date: today(), due_date: '', taxable_value: '', tax_amount: '', total_amount: '', remarks: '' });
  const [lines, setLines] = useState<Rec[]>([{ cost_item_id: '', tour_code: tourCode ?? '', amount: '' }]);
  const { busy, error, run } = useAction();
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  const linesTotal = lines.reduce((a, l) => a + Math.round(Number(l.amount || 0) * 100), 0);
  const total = Math.round(Number(f.total_amount || 0) * 100);
  return (
    <Modal title="Record supplier bill" onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-4 gap-3">
          <Field label="Supplier"><Select value={f.supplier_id} onChange={(e) => { const s = suppliers.data?.find((x) => x.id === e.target.value); setF({ ...f, supplier_id: e.target.value, supplier_name: s?.name ?? f.supplier_name }); }}>
            <option value="">— not in master —</option>{(suppliers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select></Field>
          <Field label="Supplier name" required><Input value={f.supplier_name} onChange={set('supplier_name')} /></Field>
          <Field label="Invoice number" required><Input value={f.invoice_number} onChange={set('invoice_number')} /></Field>
          <Field label="Invoice date" required><Input type="date" value={f.invoice_date} onChange={set('invoice_date')} /></Field>
          <Field label="Due date"><Input type="date" value={f.due_date} onChange={set('due_date')} /></Field>
          <Field label="Taxable value"><Input inputMode="decimal" value={f.taxable_value} onChange={set('taxable_value')} /></Field>
          <Field label="Tax amount"><Input inputMode="decimal" value={f.tax_amount} onChange={set('tax_amount')} /></Field>
          <Field label="Total invoice amount" required><Input inputMode="decimal" value={f.total_amount} onChange={set('total_amount')} /></Field>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-600 mb-1">Allocate to cost lines / Tour Codes</div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                {costItems.length > 0 ? (
                  <Select className="col-span-7" value={l.cost_item_id} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, cost_item_id: e.target.value } : x)))}>
                    <option value="">Tour-level (no specific line)</option>
                    {costItems.filter((c) => c.status !== 'cancelled').map((c) => <option key={c.id} value={c.id}>#{c.id} {c.detail?.hotel_name ?? c.detail?.restaurant_name ?? c.detail?.guide_name ?? c.description ?? c.kind} · expected {inr(c.expected)}</option>)}
                  </Select>
                ) : (
                  <Input className="col-span-7" placeholder="Tour Code (e.g. LST-2026-00001)" value={l.tour_code} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, tour_code: e.target.value } : x)))} />
                )}
                <Input className="col-span-4" inputMode="decimal" placeholder="Amount" value={l.amount} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                <button aria-label="Remove line" className="col-span-1 text-slate-400 hover:text-red-600 disabled:opacity-30" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <Btn small variant="ghost" onClick={() => setLines([...lines, { cost_item_id: '', tour_code: tourCode ?? '', amount: '' }])}><Plus className="w-3.5 h-3.5" /> Add line</Btn>
            <span className={`text-xs tabular-nums ${linesTotal === total ? 'text-emerald-700' : 'text-amber-800'}`}>Allocated {inr((linesTotal / 100).toFixed(2))} of {inr((total / 100).toFixed(2))}</span>
          </div>
        </div>
        <Field label="Remarks"><Input value={f.remarks} onChange={set('remarks')} /></Field>
        <p className="text-[11px] text-slate-500">A bill is not a payment. When a line has no actual amount yet, the billed amount is recorded as its actual and the line moves to "bill received".</p>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label="Save bill" onSubmit={() => run(async () => {
          await post('/finance/vendor-bills', {
            supplier_id: n(f.supplier_id), supplier_name: f.supplier_name, invoice_number: f.invoice_number, invoice_date: f.invoice_date, due_date: n(f.due_date),
            ...(f.taxable_value ? { taxable_value: f.taxable_value, tax_amount: f.tax_amount || '0' } : {}), total_amount: f.total_amount, remarks: n(f.remarks),
            lines: lines.map((l) => ({ cost_item_id: n(l.cost_item_id ?? ''), tour_code: n(l.tour_code ?? '') ?? tourCode ?? null, amount: l.amount })),
          });
          onSaved(); onClose();
        })} />
      </div>
    </Modal>
  );
};

export const PaymentForm: React.FC<{ bill?: Rec; tourCode?: string; onClose: () => void; onSaved: () => void }> = ({ bill, tourCode, onClose, onSaved }) => {
  const outstanding = bill ? (Number(bill.total_amount) + Number(bill.adjustments ?? 0) - Number(bill.paid ?? 0)).toFixed(2) : '';
  const [f, setF] = useState({ supplier_name: bill?.supplier_name ?? '', paid_date: today(), amount: outstanding, payment_mode: 'Bank Transfer (NEFT/RTGS)', reference: '', notes: '', tour_code: tourCode ?? '' });
  const { busy, error, run } = useAction();
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={bill ? `Pay bill ${bill.invoice_number}` : 'Record supplier advance'} onClose={onClose}>
      <div className="space-y-3">
        {bill ? <p className="text-xs text-slate-600">Outstanding on this bill: <b className="tabular-nums">{inr(outstanding)}</b>. Partial payments are allowed.</p>
          : <p className="text-xs text-slate-600">An advance is held against the Tour Code until the supplier's bill arrives. It reduces the payable, never adds cost.</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Supplier" required><Input value={f.supplier_name} onChange={set('supplier_name')} disabled={!!bill} /></Field>
          {!bill && <Field label="Tour Code" required><Input value={f.tour_code} onChange={set('tour_code')} /></Field>}
          <Field label="Paid on" required><Input type="date" value={f.paid_date} onChange={set('paid_date')} /></Field>
          <Field label="Amount" required><Input inputMode="decimal" value={f.amount} onChange={set('amount')} /></Field>
          <Field label="Mode"><Select value={f.payment_mode} onChange={set('payment_mode')}>{['Bank Transfer (NEFT/RTGS)', 'UPI', 'Cheque', 'Cash'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
          <Field label="Reference"><Input value={f.reference} onChange={set('reference')} /></Field>
        </div>
        <Field label="Notes"><Input value={f.notes} onChange={set('notes')} /></Field>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label="Record payment" onSubmit={() => run(async () => {
          await post('/finance/supplier-payments', {
            supplier_id: bill?.supplier_id ?? null, supplier_name: f.supplier_name, paid_date: f.paid_date, amount: f.amount, payment_mode: f.payment_mode, reference: n(f.reference), notes: n(f.notes),
            allocations: [bill ? { bill_id: bill.id, amount: f.amount } : { tour_code: f.tour_code, amount: f.amount }],
          });
          onSaved(); onClose();
        })} />
      </div>
    </Modal>
  );
};

export const ReceiptForm: React.FC<{ tourCode: string; onClose: () => void; onSaved: () => void }> = ({ tourCode, onClose, onSaved }) => {
  const [f, setF] = useState({ receipt_type: 'part', amount: '', received_date: today(), payment_mode: 'Bank Transfer (NEFT/RTGS)', reference: '', receipt_number: '', verified: false, notes: '' });
  const { busy, error, run } = useAction();
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <Modal title={`Record client receipt · ${tourCode}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.receipt_type} onChange={set('receipt_type')}><option value="advance">Advance</option><option value="part">Part payment</option><option value="final">Final payment</option><option value="refund">Refund to client</option></Select></Field>
          <Field label="Amount" required><Input inputMode="decimal" value={f.amount} onChange={set('amount')} /></Field>
          <Field label="Date" required><Input type="date" value={f.received_date} onChange={set('received_date')} /></Field>
          <Field label="Mode"><Select value={f.payment_mode} onChange={set('payment_mode')}>{['Bank Transfer (NEFT/RTGS)', 'UPI', 'Credit Card', 'Cheque', 'Cash'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
          <Field label="Transaction reference"><Input value={f.reference} onChange={set('reference')} /></Field>
          <Field label="Receipt number"><Input value={f.receipt_number} onChange={set('receipt_number')} /></Field>
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.verified} onChange={set('verified')} /> Verified against bank statement</label>
        <Field label="Notes"><Input value={f.notes} onChange={set('notes')} /></Field>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label="Record receipt" onSubmit={() => run(async () => { await post('/finance/client-receipts', { tour_code: tourCode, ...f, reference: n(f.reference), receipt_number: n(f.receipt_number), notes: n(f.notes) }); onSaved(); onClose(); })} />
      </div>
    </Modal>
  );
};

export const InvoiceForm: React.FC<{ tourCode: string; defaultTaxable?: string; defaultGst?: string; onClose: () => void; onSaved: () => void }> = ({ tourCode, defaultTaxable = '', defaultGst = '', onClose, onSaved }) => {
  const [f, setF] = useState({ invoice_type: 'tax_invoice', invoice_number: '', invoice_date: today(), due_date: '', taxable_value: defaultTaxable, gst_amount: defaultGst });
  const { busy, error, run } = useAction();
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={`Issue client invoice · ${tourCode}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.invoice_type} onChange={set('invoice_type')}><option value="tax_invoice">Tax invoice</option><option value="proforma">Proforma (not counted as invoiced)</option></Select></Field>
          <Field label="Invoice number" required><Input value={f.invoice_number} onChange={set('invoice_number')} /></Field>
          <Field label="Invoice date" required><Input type="date" value={f.invoice_date} onChange={set('invoice_date')} /></Field>
          <Field label="Collection due date"><Input type="date" value={f.due_date} onChange={set('due_date')} /></Field>
          <Field label="Taxable value" required><Input inputMode="decimal" value={f.taxable_value} onChange={set('taxable_value')} /></Field>
          <Field label="GST" required><Input inputMode="decimal" value={f.gst_amount} onChange={set('gst_amount')} /></Field>
        </div>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label="Issue invoice" onSubmit={() => run(async () => { await post('/finance/client-invoices', { tour_code: tourCode, ...f, due_date: n(f.due_date) }); onSaved(); onClose(); })} />
      </div>
    </Modal>
  );
};

export const CreditNoteForm: React.FC<{ tourCode: string; invoices: Rec[]; onClose: () => void; onSaved: () => void }> = ({ tourCode, invoices, onClose, onSaved }) => {
  const [f, setF] = useState({ invoice_id: '', note_number: '', note_date: today(), taxable_value: '', gst_amount: '0', reason: '' });
  const { busy, error, run } = useAction();
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={`Client credit note · ${tourCode}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Against invoice"><Select value={f.invoice_id} onChange={set('invoice_id')}><option value="">—</option>{invoices.filter((i) => i.invoice_type === 'tax_invoice').map((i) => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}</Select></Field>
          <Field label="Credit note number" required><Input value={f.note_number} onChange={set('note_number')} /></Field>
          <Field label="Date" required><Input type="date" value={f.note_date} onChange={set('note_date')} /></Field>
          <Field label="Taxable value" required><Input inputMode="decimal" value={f.taxable_value} onChange={set('taxable_value')} /></Field>
          <Field label="GST"><Input inputMode="decimal" value={f.gst_amount} onChange={set('gst_amount')} /></Field>
        </div>
        <Field label="Reason" required><Input value={f.reason} onChange={set('reason')} /></Field>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label="Save credit note" onSubmit={() => run(async () => { await post('/finance/client-credit-notes', { tour_code: tourCode, ...f, invoice_id: n(f.invoice_id) }); onSaved(); onClose(); })} />
      </div>
    </Modal>
  );
};

export const AdjustmentForm: React.FC<{ tourCode: string; onClose: () => void; onSaved: () => void }> = ({ tourCode, onClose, onSaved }) => {
  const [f, setF] = useState({ type: 'additional_service', amount: '', description: '' });
  const { busy, error, run } = useAction();
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={`Request revenue adjustment · ${tourCode}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.type} onChange={set('type')}>
            <option value="additional_service">Additional service (+)</option><option value="discount">Discount (−)</option>
            <option value="commercial_adjustment_plus">Commercial adjustment (+)</option><option value="commercial_adjustment_minus">Commercial adjustment (−)</option>
          </Select></Field>
          <Field label="Amount (excl. GST)" required><Input inputMode="decimal" value={f.amount} onChange={set('amount')} /></Field>
        </div>
        <Field label="Description" required><Input value={f.description} onChange={set('description')} /></Field>
        <p className="text-[11px] text-slate-500">Counts towards revenue only after approval by Accounts management or Management.</p>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label="Submit request" onSubmit={() => run(async () => { await post('/finance/revenue-adjustments', { tour_code: tourCode, ...f }); onSaved(); onClose(); })} />
      </div>
    </Modal>
  );
};

export const ReasonModal: React.FC<{ title: string; text?: string; label: string; danger?: boolean; extra?: React.ReactNode; onSubmit: (reason: string) => Promise<unknown>; onClose: () => void; required?: boolean }> = ({ title, text, label, danger, extra, onSubmit, onClose, required = true }) => {
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        {text && <p className="text-xs text-slate-600">{text}</p>}
        {extra}
        <Field label="Reason / notes" required={required}><TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <ErrorBox error={error} />
        <Footer onClose={onClose} busy={busy} label={label} danger={danger} onSubmit={() => run(async () => { await onSubmit(reason); onClose(); })} />
      </div>
    </Modal>
  );
};
