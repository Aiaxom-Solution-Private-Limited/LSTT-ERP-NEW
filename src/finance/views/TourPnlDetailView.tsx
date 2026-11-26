import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, FileText, Lock, Plus, Unlock } from 'lucide-react';
import { billAction, fmtDate, get, inr, label, pctText, post } from '../api';
import { useFinanceUser } from '../FinanceAuth';
import { CostItemForm } from '../CostItemForm';
import { AdjustmentForm, BillForm, CreditNoteForm, DisputeModal, DocumentsModal, InvoiceForm, OverrideModal, PaymentForm, ReasonModal, ReceiptForm, StatusModal } from '../actions';
import { Badge, Btn, Card, ErrorBox, Kpi, Loading, Money, StatusBadge, Table, Td, Th, useLoad, WarningList } from '../ui';

type Rec = Record<string, any>;
type ModalState =
  | { t: 'cost'; item?: Rec } | { t: 'status'; item: Rec } | { t: 'dispute'; item: Rec } | { t: 'override'; item: Rec } | { t: 'docs'; type: string; id: string; title: string }
  | { t: 'bill' } | { t: 'pay'; bill?: Rec } | { t: 'receipt' } | { t: 'invoice' } | { t: 'credit' } | { t: 'adjust' } | { t: 'close' } | { t: 'reopen' } | { t: 'verifyReceipt'; id: string }
  | { t: 'decide'; adj: Rec; decision: 'approved' | 'rejected' } | { t: 'billStatus'; bill: Rec; status: string } | null;

const TABS = ['expenses', 'revenue', 'bills', 'closure', 'audit'] as const;
const itemName = (i: Rec) => i.detail?.hotel_name ?? i.detail?.restaurant_name ?? i.detail?.guide_name ?? i.description ?? i.head_name ?? label(i.kind);

export const TourPnlDetailView: React.FC<{ tourCode: string; onBack: () => void }> = ({ tourCode, onBack }) => {
  const { can } = useFinanceUser();
  const pnl = useLoad(() => get(`/finance/tours/${encodeURIComponent(tourCode)}`), [tourCode]);
  const canCosts = can('finance.view_costs');
  const tx = useLoad(() => (canCosts ? get(`/finance/tours/${encodeURIComponent(tourCode)}/transactions`) : Promise.resolve(null)), [tourCode, canCosts]);
  const [tab, setTab] = useState<(typeof TABS)[number]>('expenses');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const reload = () => { pnl.reload(); tx.reload(); };
  const close = () => setModal(null);

  if (pnl.error) return <div className="space-y-4"><Btn onClick={onBack}><ArrowLeft className="w-3.5 h-3.5" /> Back</Btn><ErrorBox error={pnl.error} /></div>;
  if (!pnl.data) return <Loading />;
  const p = pnl.data;
  const t = p.tour;
  const closed = p.financialStatus === 'financially_closed';
  const r = p.revenue, c = p.costs, s = p.supplier;

  const jumpToItem = (id: string) => {
    const item = p.items.find((i: Rec) => i.id === id);
    if (item) { setTab('expenses'); setOpen((o) => ({ ...o, [item.category_code]: true })); setHighlight(id); setTimeout(() => document.getElementById(`ci-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-xs text-emerald-700 hover:underline flex items-center gap-1 mb-2"><ArrowLeft className="w-3.5 h-3.5" /> All tours</button>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            <span className="font-mono">{t.tour_code}</span>
            <StatusBadge s={p.financialStatus} />
            <Badge tone="slate">Tour: {label(t.status)}</Badge>
            {closed && <Badge tone="green"><Lock className="w-3 h-3" /> Locked</Badge>}
          </h2>
          <p className="text-sm text-slate-600 mt-1">{t.client_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('cost.write') && !closed && <Btn variant="primary" onClick={() => setModal({ t: 'cost' })}><Plus className="w-3.5 h-3.5" /> Add cost line</Btn>}
          {can('bill.write') && !closed && <Btn onClick={() => setModal({ t: 'bill' })}>Record supplier bill</Btn>}
          {can('receipt.write') && !closed && <Btn onClick={() => setModal({ t: 'receipt' })}>Record client receipt</Btn>}
        </div>
      </div>

      {/* Tour information (from existing booking record) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
        {[
          ['Destination', t.destination], ['Start', fmtDate(t.start_date)], ['End', fmtDate(t.end_date)],
          ['Passengers', `${t.adults} A${t.children ? ` · ${t.children} C` : ''}${t.infants ? ` · ${t.infants} I` : ''}`], ['Rooms', t.room_count ?? '—'],
          ['Salesperson', t.salesperson_name ?? '—'], ['Operations', t.operations_lead_name ?? '—'], ['Trip / booking ID', t.trip_id ?? t.booking_id ?? '—'],
        ].map(([k, v]) => <div key={k as string}><span className="text-slate-500 block">{k}</span><span className="font-semibold text-slate-900">{v}</span></div>)}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <Kpi label="Package selling price" value={inr(r.confirmedSellingPrice)} hint={r.quotedAmount ? `Quoted ${inr(r.quotedAmount)}` : 'Excl. GST'} />
        <Kpi label="Approved additions" value={inr(r.approvedAdditionalRevenue)} hint={`Discounts −${inr(r.approvedReductions)}`} />
        <Kpi label="Total tour revenue" value={inr(r.recognisedRevenue)} hint={`Basis: ${label(p.calculationBasis.revenueRecognition)}`} />
        <Kpi label="Client invoiced" value={inr(r.invoicedTotal)} hint={`Proforma ${inr(r.proformaTotal)}`} />
        <Kpi label="Client collected" value={inr(r.collected)} hint={Number(r.collectedUnverified) ? `${inr(r.collectedUnverified)} unverified` : 'Verified receipts'} />
        <Kpi label="Client outstanding" value={inr(r.clientOutstanding)} tone={Number(r.clientOutstanding) > 0 ? 'bad' : 'default'} hint={label(p.calculationBasis.receivable)} />
        <Kpi label="Gross profit" value={inr(p.grossProfit)} tone={Number(p.grossProfit) < 0 ? 'bad' : 'good'} hint={`Margin ${pctText(p.grossMarginPct)} · actual cost`} />
        <Kpi label="Estimated cost" value={inr(c.estimated)} />
        <Kpi label="Actual cost" value={inr(c.actual)} />
        {canCosts && <>
          <Kpi label="Supplier bills" value={inr(s.totalBills)} hint={`Approved ${inr(s.approvedBills)}`} />
          <Kpi label="Supplier payments" value={inr(s.totalPayments)} hint={Number(s.advancesWithoutBill) ? `incl. ${inr(s.advancesWithoutBill)} advances` : undefined} />
          <Kpi label="Supplier outstanding" value={inr(s.outstanding)} tone={Number(s.outstanding) > 0 ? 'bad' : 'default'} hint={Number(s.outstanding) < 0 ? 'Negative: advances paid ahead of approved bills' : Number(s.committedNotBilled) ? `${inr(s.committedNotBilled)} committed, not billed` : undefined} />
        </>}
        <Kpi label="Verified cost" value={inr(c.verified)} hint="Approved by Accounts" />
        <Kpi label="Net profit" value={inr(p.netProfit)} hint="No overhead allocated" />
      </div>

      {/* Profitability views */}
      <Card title="Profitability by cost basis" right={<span className="text-[11px] text-slate-400">GST excluded from revenue · each view uses one cost basis only</span>} pad={false}>
        <Table head={<><Th>View</Th><Th>What the cost includes</Th><Th right>Revenue</Th><Th right>Cost</Th><Th right>Profit</Th><Th right>Margin</Th></>}>
          {[
            ['estimated', 'Estimated', 'Expected amounts of all active lines'],
            ['committed', 'Committed', 'Expected amounts of booked / confirmed lines'],
            ['actual', 'Actual', 'Amounts actually charged or incurred so far'],
            ['verified', 'Final verified', 'Amounts approved by Accounts'],
            ['forecast', 'Forecast', 'Actual where known, otherwise expected'],
          ].map(([k, name, desc]) => (
            <tr key={k}>
              <Td className="font-semibold text-slate-900">{name}</Td><Td className="text-slate-500">{desc}</Td>
              <Td right><Money v={r.recognisedRevenue} /></Td><Td right><Money v={p.profitability[k].cost} /></Td>
              <Td right><span className={Number(p.profitability[k].profit) < 0 ? 'text-red-700 font-bold' : 'font-bold text-slate-900'}><Money v={p.profitability[k].profit} /></span></Td>
              <Td right className="tabular-nums">{pctText(p.profitability[k].marginPct)}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      {p.warnings.length > 0 && <Card title={`Warnings (${p.warnings.length})`}><WarningList warnings={p.warnings} onSelect={canCosts ? jumpToItem : undefined} /></Card>}

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
        {TABS.filter((x) => canCosts || x === 'expenses' || x === 'revenue').map((x) => (
          <button key={x} onClick={() => setTab(x)} className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${tab === x ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {{ expenses: 'Expense breakdown', revenue: 'Revenue & collections', bills: 'Supplier bills & payments', closure: 'Closure', audit: 'Audit history' }[x]}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <Card pad={false} title="Expense breakdown by category" right={<span className="text-[11px] text-slate-400">Click a category to see its lines</span>}>
          <Table isEmpty={!p.categories.length} empty="No cost lines recorded for this tour yet" head={<><Th /><Th>Category</Th><Th right>Lines</Th><Th right>Expected</Th><Th right>Actual</Th><Th right>Variance</Th><Th right>Verified</Th></>}>
            {p.categories.map((cat: Rec) => (
              <React.Fragment key={cat.code}>
                <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpen((o) => ({ ...o, [cat.code]: !o[cat.code] }))}>
                  <Td className="w-6">{open[cat.code] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}</Td>
                  <Td className="font-semibold text-slate-900">{cat.name}</Td>
                  <Td right>{cat.itemCount}</Td>
                  <Td right><Money v={cat.expected} /></Td><Td right><Money v={cat.actual} strong /></Td>
                  <Td right><Money v={cat.variance} signed /></Td><Td right><Money v={cat.verified} /></Td>
                </tr>
                {open[cat.code] && canCosts && (
                  <tr><td colSpan={7} className="bg-slate-50/60 px-3 py-2" style={{ maxWidth: 0 }}>
                    <ItemsTable items={cat.items} highlight={highlight} closed={closed} can={can} onAction={setModal} />
                  </td></tr>
                )}
              </React.Fragment>
            ))}
            {p.categories.length > 0 && (
              <tr className="bg-slate-50 font-bold">
                <Td /><Td>Total</Td><Td right>{p.items.length || p.categories.reduce((a: number, x: Rec) => a + x.itemCount, 0)}</Td>
                <Td right><Money v={c.estimated} /></Td><Td right><Money v={c.actual} /></Td><Td right>{''}</Td><Td right><Money v={c.verified} /></Td>
              </tr>
            )}
          </Table>
        </Card>
      )}

      {tab === 'revenue' && (
        <RevenueTab p={p} tx={tx.data} can={can} closed={closed} onAction={setModal} />
      )}

      {tab === 'bills' && canCosts && (
        <Card pad={false} title="Supplier bills linked to this tour" right={<div className="flex gap-2">
          {can('payment.write') && !closed && <Btn small onClick={() => setModal({ t: 'pay' })}>Record advance</Btn>}
          {can('bill.write') && !closed && <Btn small variant="primary" onClick={() => setModal({ t: 'bill' })}>Record bill</Btn>}
        </div>}>
          <Table isEmpty={!s.bills.length} empty="No supplier bills recorded" head={<><Th>Supplier</Th><Th>Invoice</Th><Th>Date / due</Th><Th right>Bill total</Th><Th right>This tour's share</Th><Th right>Paid (share)</Th><Th right>Outstanding (bill)</Th><Th>Status</Th><Th /></>}>
            {s.bills.map((b: Rec) => {
              const full = (tx.data?.bills ?? []).find((x: Rec) => String(x.id) === b.id);
              return (
                <tr key={b.id}>
                  <Td className="font-semibold">{b.supplierName}</Td>
                  <Td className="font-mono">{b.invoiceNumber}{b.multiTour && <div><Badge tone="blue">Multi-tour</Badge></div>}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(b.invoiceDate)}<br /><span className="text-slate-500">due {fmtDate(b.dueDate)}</span></Td>
                  <Td right><Money v={b.net} /></Td><Td right><Money v={b.tourShareNet} /></Td><Td right><Money v={b.tourSharePaid} /></Td><Td right><Money v={b.outstanding} strong /></Td>
                  <Td><StatusBadge s={b.status} /></Td>
                  <Td className="whitespace-nowrap space-x-1">
                    <Btn small variant="ghost" onClick={() => setModal({ t: 'docs', type: 'vendor_bill', id: b.id, title: b.invoiceNumber })}><FileText className="w-3 h-3" /></Btn>
                    {!closed && b.status === 'received' && can('bill.write') && <Btn small onClick={() => setModal({ t: 'billStatus', bill: b, status: 'under_verification' })}>Verify</Btn>}
                    {!closed && ['received', 'under_verification'].includes(b.status) && can('bill.approve') && <Btn small variant="primary" onClick={() => setModal({ t: 'billStatus', bill: b, status: 'approved' })}>Approve</Btn>}
                    {!closed && b.status === 'approved' && Number(b.outstanding) > 0 && can('payment.write') && full && <Btn small variant="primary" onClick={() => setModal({ t: 'pay', bill: { ...full, id: String(full.id), paid: b.paid, adjustments: (Number(b.net) - Number(b.total)).toFixed(2) } })}>Pay</Btn>}
                  </Td>
                </tr>
              );
            })}
          </Table>
          {tx.data && tx.data.payments.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="px-4 pt-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Supplier payments</div>
              <Table head={<><Th>Date</Th><Th>Supplier</Th><Th>Applied to</Th><Th>Mode / ref</Th><Th right>Allocated</Th></>}>
                {tx.data.payments.map((x: Rec, i: number) => (
                  <tr key={i}><Td>{fmtDate(x.paid_date)}</Td><Td>{x.supplier_name}</Td><Td>{x.bill_id ? `Bill #${x.bill_id}` : 'Advance (no bill yet)'}</Td><Td className="text-slate-500">{x.payment_mode ?? '—'} {x.reference ?? ''}</Td><Td right><Money v={x.allocated} /></Td></tr>
                ))}
              </Table>
            </div>
          )}
        </Card>
      )}

      {tab === 'closure' && canCosts && (
        <Card title="Financial closure checklist" right={
          closed ? (can('finance.post_closure') && <Btn small onClick={() => setModal({ t: 'reopen' })}><Unlock className="w-3.5 h-3.5" /> Reopen</Btn>)
            : can('tour.close') && <Btn small variant="primary" onClick={() => setModal({ t: 'close' })}><Lock className="w-3.5 h-3.5" /> Close financial records</Btn>
        }>
          <ul className="space-y-2 text-xs">
            {p.closureChecklist.map((x: Rec) => (
              <li key={x.key} className="flex items-start gap-2">
                <Badge tone={x.ok ? 'green' : 'amber'}>{x.ok ? 'Done' : 'Open'}</Badge>
                <span className="text-slate-800">{x.label}{x.detail && <span className="text-slate-500">: {x.detail}</span>}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500 mt-4">A tour can be operationally completed while its financial records stay open. After closure, changes need post-closure permission and a reason, and are recorded in the audit history.</p>
        </Card>
      )}

      {tab === 'audit' && canCosts && <AuditTab tourCode={tourCode} />}

      {/* Modals */}
      {modal?.t === 'cost' && <CostItemForm tourCode={tourCode} item={modal.item} onClose={close} onSaved={reload} />}
      {modal?.t === 'status' && <StatusModal item={modal.item} can={can} onClose={close} onSaved={reload} />}
      {modal?.t === 'dispute' && <DisputeModal item={modal.item} onClose={close} onSaved={reload} />}
      {modal?.t === 'override' && <OverrideModal item={modal.item} onClose={close} onSaved={reload} />}
      {modal?.t === 'docs' && <DocumentsModal entityType={modal.type} entityId={modal.id} title={modal.title} canUpload={can('bill.write') && !closed} onClose={close} />}
      {modal?.t === 'bill' && <BillForm tourCode={tourCode} costItems={p.items} onClose={close} onSaved={reload} />}
      {modal?.t === 'pay' && <PaymentForm bill={modal.bill} tourCode={tourCode} onClose={close} onSaved={reload} />}
      {modal?.t === 'receipt' && <ReceiptForm tourCode={tourCode} onClose={close} onSaved={reload} />}
      {modal?.t === 'invoice' && <InvoiceForm tourCode={tourCode} defaultTaxable={r.finalAgreedPrice} defaultGst={r.gstOnContract} onClose={close} onSaved={reload} />}
      {modal?.t === 'credit' && <CreditNoteForm tourCode={tourCode} invoices={tx.data?.invoices ?? []} onClose={close} onSaved={reload} />}
      {modal?.t === 'adjust' && <AdjustmentForm tourCode={tourCode} onClose={close} onSaved={reload} />}
      {modal?.t === 'verifyReceipt' && <ReasonModal title="Verify client receipt" text="Confirm the amount has been received in the bank." label="Mark verified" required={false} onClose={close} onSubmit={async (reason) => { await post(`/finance/client-receipts/${modal.id}/verify`, { reason }); reload(); }} />}
      {modal?.t === 'decide' && <ReasonModal title={`${modal.decision === 'approved' ? 'Approve' : 'Reject'} revenue adjustment`} text={`${label(modal.adj.type)} of ${inr(modal.adj.amount)}: ${modal.adj.description}`} label={modal.decision === 'approved' ? 'Approve' : 'Reject'} danger={modal.decision === 'rejected'} required={false} onClose={close} onSubmit={async (note) => { await post(`/finance/revenue-adjustments/${modal.adj.id}/decision`, { decision: modal.decision, note }); reload(); }} />}
      {modal?.t === 'billStatus' && <ReasonModal title={`${billAction(modal.status)} · bill ${modal.bill.invoiceNumber}`} label={billAction(modal.status)} required={false} onClose={close} onSubmit={async (reason) => { await post(`/finance/vendor-bills/${modal.bill.id}/status`, { status: modal.status, reason }); reload(); }} />}
      {modal?.t === 'close' && <CloseModal checklist={p.closureChecklist} onClose={close} onSubmit={async (notes, accept) => { await post(`/finance/tours/${tourCode}/close`, { notes, accept_outstanding: accept }); reload(); }} />}
      {modal?.t === 'reopen' && <ReasonModal title="Reopen financial records" text="Reopening allows edits again. The closure snapshot remains in the audit history." label="Reopen" danger onClose={close} onSubmit={async (reason) => { await post(`/finance/tours/${tourCode}/reopen`, { reason }); reload(); }} />}
    </div>
  );
};

const ItemsTable: React.FC<{ items: Rec[]; highlight: string | null; closed: boolean; can: (p: string) => boolean; onAction: (m: ModalState) => void }> = ({ items, highlight, closed, can, onAction }) => (
  <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
    <table className="w-full min-w-[1100px] text-[11px]">
      <thead className="text-slate-500 border-b border-slate-200"><tr>
        <Th>Line</Th><Th>Service</Th><Th>Supplier / payee</Th><Th>Details</Th><Th right>Expected</Th><Th right>Actual</Th><Th right>Variance</Th><Th right>Verified</Th><Th>Status</Th><Th>Reconciliation</Th><Th>Payment</Th><Th />
      </tr></thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((i) => (
          <tr key={i.id} id={`ci-${i.id}`} className={highlight === i.id ? 'bg-amber-50' : ''}>
            <Td className="whitespace-nowrap">
              <div className="font-semibold text-slate-900">{itemName(i)}</div>
              <div className="text-slate-400">#{i.id}{i.head_original_label ? ` · ${i.head_original_label}` : ''}{i.source === 'import' ? ' · imported' : ''}</div>
            </Td>
            <Td className="whitespace-nowrap">{fmtDate(i.service_date)}{i.service_end_date && i.service_end_date !== i.service_date ? <><br />→ {fmtDate(i.service_end_date)}</> : null}</Td>
            <Td>{i.supplier_name ?? i.payee_name ?? <span className="text-slate-400">{i.cost_nature === 'internal' ? 'Internal' : '—'}</span>}</Td>
            <Td className="text-slate-600 max-w-[220px]"><LineDetail i={i} /></Td>
            <Td right><Money v={i.expected} />{i.overridden && <div><Badge tone="amber">Override</Badge></div>}</Td>
            <Td right><Money v={i.actual} /></Td>
            <Td right><Money v={i.variance} signed /></Td>
            <Td right><Money v={i.verified} /></Td>
            <Td><StatusBadge s={i.status} /></Td>
            <Td><StatusBadge s={i.reconState} /></Td>
            <Td><StatusBadge s={i.paymentState} /></Td>
            <Td className="whitespace-nowrap">
              {!closed || can('finance.post_closure') ? (
                <div className="flex gap-1">
                  {can('cost.write') && <Btn small onClick={() => onAction({ t: 'cost', item: i })}>Edit</Btn>}
                  {(can('cost.write') || can('cost.verify')) && i.status !== 'disputed' && <Btn small onClick={() => onAction({ t: 'status', item: i })}>Status</Btn>}
                  {can('recon.write') && i.status !== 'disputed' && i.actual && i.reconState !== 'no_difference' && <Btn small variant="danger" onClick={() => onAction({ t: 'dispute', item: i })}>Dispute</Btn>}
                  {can('cost.override_expected') && <Btn small variant="ghost" onClick={() => onAction({ t: 'override', item: i })}>Override</Btn>}
                  <Btn small variant="ghost" aria-label="Documents" onClick={() => onAction({ t: 'docs', type: 'cost_item', id: i.id, title: `line #${i.id}` })}><FileText className="w-3 h-3" /></Btn>
                </div>
              ) : <Lock className="w-3.5 h-3.5 text-slate-400" />}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const LineDetail: React.FC<{ i: Rec }> = ({ i }) => {
  const d = i.detail;
  if (i.kind === 'hotel' && i.expected_calc?.rule === 'migrated_agreed_amount') return <>{d?.nights ?? '?'}N · room breakdown not captured (migrated booking; expected = agreed amount)</>;
  if (i.kind === 'hotel' && d) return <>{d.city && `${d.city} · `}{d.nights}N · Dbl {d.dbl_rooms} / Sng {d.sng_rooms}{d.extra_beds ? ` / EB ${d.extra_beds}` : ''}{d.cwb ? ` / CWB ${d.cwb}` : ''}{d.cnb ? ` / CNB ${d.cnb}` : ''}{d.foc ? ` · FOC ${d.foc}` : ''}{d.meal_plan ? ` · ${d.meal_plan}` : ''}{Number(d.rate_adjustment_pct) ? ` · ${d.rate_adjustment_pct}%` : ''}{d.hotel_remarks && <div className="text-amber-800">{d.hotel_remarks}</div>}</>;
  if (i.kind === 'restaurant' && d) return <>{d.pax} pax × {inr(d.rate_per_pax)}{d.foc_qty ? ` · FOC ${d.foc_qty} (${d.foc_rule === 'deduct' ? 'deducted' : 'not deducted'})` : ''}</>;
  if (i.kind === 'transport' && d) return <>{d.is_company_owned ? 'Company vehicle' : 'Hired'} · {label(d.rate_basis)}{i.quantity ? ` × ${Number(i.quantity)}` : ''}{d.route ? ` · ${d.route}` : ''}</>;
  if (i.kind === 'guide_dsa' && d) return <>{Number(d.days)} days × {inr(d.dsa_rate)}</>;
  if (i.kind === 'guide_imprest' && d) {
    const bal = d.imprest_supported_expense === null ? null : Number(d.imprest_advanced) - Number(d.imprest_supported_expense) - Number(d.imprest_returned);
    return <>Advanced {inr(d.imprest_advanced)} · supported {inr(d.imprest_supported_expense)} · returned {inr(d.imprest_returned)}{bal !== null && bal !== 0 && <div className={bal > 0 ? 'text-amber-800' : 'text-red-700'}>{bal > 0 ? `Guide still holds ${inr(bal.toFixed(2))}` : `Company owes guide ${inr((-bal).toFixed(2))}`}</div>}</>;
  }
  return <>{i.quantity && i.unit_rate ? `${Number(i.quantity)} × ${inr(i.unit_rate)}` : ''}{i.remarks && <div className="text-slate-500">{i.remarks}</div>}</>;
};

const RevenueTab: React.FC<{ p: Rec; tx: Rec | null; can: (x: string) => boolean; closed: boolean; onAction: (m: ModalState) => void }> = ({ p, tx, can, closed, onAction }) => {
  const r = p.revenue;
  const rows: [string, string, string][] = [
    ['Quoted amount', r.quotedAmount, 'From the accepted quotation (excl. GST)'],
    ['Confirmed selling price', r.confirmedSellingPrice, 'Agreed package price (excl. GST)'],
    ['Approved additional revenue', r.approvedAdditionalRevenue, 'Approved extras / changes'],
    ['Approved discounts & reductions', r.approvedReductions ? `-${r.approvedReductions}` : null as any, 'Approved after confirmation'],
    ['Final agreed price', r.finalAgreedPrice, 'Excl. GST'],
    ['Recognised revenue', r.recognisedRevenue, `Basis: ${label(p.calculationBasis.revenueRecognition)} (provisional setting)`],
    ['GST on contract', r.gstOnContract, 'Collected for the government, not revenue'],
    ['Tax-invoiced', r.invoicedTotal, 'Tax invoices less credit notes, incl. GST'],
    ['Credit notes', r.creditNotes, ''],
    ['Receivable', r.receivable, label(p.calculationBasis.receivable)],
    ['Collected (verified)', r.collected, 'Receipts less refunds'],
    ['Client outstanding', r.clientOutstanding, 'Receivable − collected'],
  ];
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Revenue position" pad={false}>
        <Table head={<><Th>Figure</Th><Th right>Amount</Th><Th>Meaning</Th></>}>
          {rows.map(([k, v, m]) => <tr key={k}><Td className="font-semibold text-slate-800">{k}</Td><Td right><Money v={v} /></Td><Td className="text-slate-500">{m}</Td></tr>)}
        </Table>
      </Card>
      <div className="space-y-4">
        <Card title="Revenue adjustments" right={can('revenue.request') && !closed && <Btn small onClick={() => onAction({ t: 'adjust' })}>Request</Btn>} pad={false}>
          <Table isEmpty={!tx?.revenueAdjustments?.length} empty={tx ? 'None' : 'Detail hidden for your role'} head={<><Th>Type</Th><Th>Description</Th><Th right>Amount</Th><Th>Status</Th><Th /></>}>
            {(tx?.revenueAdjustments ?? []).map((a: Rec) => (
              <tr key={a.id}><Td>{label(a.type)}</Td><Td>{a.description}</Td><Td right><Money v={a.amount} /></Td><Td><StatusBadge s={a.status} /></Td>
                <Td className="whitespace-nowrap">{a.status === 'pending' && can('revenue.approve') && !closed && <><Btn small variant="primary" onClick={() => onAction({ t: 'decide', adj: a, decision: 'approved' })}>Approve</Btn> <Btn small variant="danger" onClick={() => onAction({ t: 'decide', adj: a, decision: 'rejected' })}>Reject</Btn></>}</Td></tr>
            ))}
          </Table>
        </Card>
        <Card title="Client invoices & credit notes" right={can('receipt.write') && !closed && <div className="flex gap-1"><Btn small onClick={() => onAction({ t: 'credit' })}>Credit note</Btn><Btn small variant="primary" onClick={() => onAction({ t: 'invoice' })}>Issue invoice</Btn></div>} pad={false}>
          <Table isEmpty={!tx?.invoices?.length && !tx?.creditNotes?.length} empty={tx ? 'No invoices yet' : 'Detail hidden for your role'} head={<><Th>Number</Th><Th>Type</Th><Th>Date / due</Th><Th right>Taxable</Th><Th right>GST</Th><Th right>Total</Th></>}>
            {(tx?.invoices ?? []).map((i: Rec) => <tr key={`i${i.id}`}><Td className="font-mono">{i.invoice_number}</Td><Td>{i.invoice_type === 'proforma' ? 'Proforma' : 'Tax invoice'}{i.status === 'cancelled' && ' (cancelled)'}</Td><Td>{fmtDate(i.invoice_date)}<br /><span className="text-slate-500">due {fmtDate(i.due_date)}</span></Td><Td right><Money v={i.taxable_value} /></Td><Td right><Money v={i.gst_amount} /></Td><Td right><Money v={i.total_amount} /></Td></tr>)}
            {(tx?.creditNotes ?? []).map((c: Rec) => <tr key={`c${c.id}`}><Td className="font-mono">{c.note_number}</Td><Td>Credit note: {c.reason}</Td><Td>{fmtDate(c.note_date)}</Td><Td right><Money v={`-${c.taxable_value}`} /></Td><Td right><Money v={`-${c.gst_amount}`} /></Td><Td right>{''}</Td></tr>)}
          </Table>
        </Card>
        <Card title="Client receipts" right={can('receipt.write') && !closed && <Btn small variant="primary" onClick={() => onAction({ t: 'receipt' })}>Record receipt</Btn>} pad={false}>
          <Table isEmpty={!tx?.receipts?.length} empty={tx ? 'No receipts' : 'Detail hidden for your role'} head={<><Th>Date</Th><Th>Type</Th><Th>Mode / ref</Th><Th right>Amount</Th><Th>Verified</Th></>}>
            {(tx?.receipts ?? []).map((x: Rec) => (
              <tr key={x.id}><Td>{fmtDate(x.received_date)}</Td><Td>{label(x.receipt_type)}</Td><Td className="text-slate-500">{x.payment_mode ?? '—'} {x.reference ?? ''}</Td>
                <Td right><Money v={x.receipt_type === 'refund' ? `-${x.amount}` : x.amount} /></Td>
                <Td>{x.verified ? <Badge tone="green">Verified</Badge> : can('receipt.write') && !closed ? <Btn small onClick={() => onAction({ t: 'verifyReceipt', id: String(x.id) })}>Verify</Btn> : <Badge tone="amber">Unverified</Badge>}</Td></tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
};

const AuditTab: React.FC<{ tourCode: string }> = ({ tourCode }) => {
  const { data, error } = useLoad(() => get<any[]>(`/finance/tours/${encodeURIComponent(tourCode)}/audit`), [tourCode]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <Card pad={false} title="Audit history" right={<span className="text-[11px] text-slate-400">Every financial change, newest first</span>}>
      <Table isEmpty={!data.length} empty="No changes recorded" head={<><Th>When</Th><Th>Who</Th><Th>Record</Th><Th>Action</Th><Th>Reason</Th></>}>
        {data.map((a) => (
          <tr key={a.id}><Td className="whitespace-nowrap">{new Date(a.at).toLocaleString('en-IN')}</Td><Td>{a.user_name ?? 'System'}</Td><Td>{label(a.entity_type)} #{a.entity_id}</Td><Td className="font-mono">{a.action}</Td><Td className="text-slate-600">{a.reason ?? ''}</Td></tr>
        ))}
      </Table>
    </Card>
  );
};

const CloseModal: React.FC<{ checklist: Rec[]; onClose: () => void; onSubmit: (notes: string, accept: boolean) => Promise<unknown> }> = ({ checklist, onClose, onSubmit }) => {
  const open = checklist.filter((c) => !c.ok);
  const [accept, setAccept] = useState(false);
  return (
    <ReasonModal title="Close financial records" label="Close tour" onClose={onClose} required={open.length > 0}
      text={open.length ? `${open.length} checklist item(s) are still open. Closing anyway accepts them as outstanding and needs notes.` : 'All checklist items are complete. After closing, records are locked.'}
      extra={open.length > 0 && (
        <>
          <ul className="text-xs list-disc ml-4 text-amber-900">{open.map((c) => <li key={c.key}>{c.label}{c.detail ? `: ${c.detail}` : ''}</li>)}</ul>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} /> Accept these as explicitly outstanding</label>
        </>
      )}
      onSubmit={(notes) => onSubmit(notes, accept)} />
  );
};
