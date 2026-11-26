/**
 * The single authoritative Tour P&L calculation. Pure: takes rows, returns
 * figures. The frontend never recomputes these numbers; it displays them.
 *
 * Key rules
 *  - Expected, actual and verified cost are separate; four profitability views
 *    are produced and never mixed into one total.
 *  - Payments reduce payables only. They never add cost.
 *  - An imprest advance is not cost; only voucher-supported expense is.
 *  - GST collected is not revenue.
 */
import { fmt, fmtOrNull, pct, sum, toPaise, toPaiseOrNull, type Paise } from '../lib/money.ts';
import { imprestPosition, transportActual } from './rates.ts';

export type CostStatus =
  | 'estimated' | 'booked' | 'service_completed' | 'bill_pending' | 'bill_received'
  | 'under_verification' | 'approved' | 'disputed' | 'cancelled';

export interface TourRow {
  tour_code: string; client_name: string; destination: string; start_date: string; end_date: string;
  status: string; confirmed_selling_price: string; gst_amount: string; quoted_amount: string | null;
  [k: string]: unknown;
}
export interface CostItemRow {
  id: string; tour_code: string | null; kind: string; category_code: string; expense_head_id: number | null;
  description: string | null; supplier_id: string | null; payee_name: string | null; cost_nature: string;
  service_date: string | null; service_end_date: string | null;
  expected_amount: string | null; expected_override_amount: string | null; expected_override_reason: string | null;
  actual_amount: string | null; verified_amount: string | null; status: CostStatus; bill_reference: string | null;
  source: string; remarks: string | null;
  detail?: Record<string, any> | null; // kind-specific row (hotel_stay_details etc.)
  [k: string]: unknown;
}
export interface BillRow { id: string; supplier_id: string | null; supplier_name: string; invoice_number: string; invoice_date: string; due_date: string | null; total_amount: string; status: string; }
export interface BillLineRow { id: string; bill_id: string; cost_item_id: string | null; tour_code: string | null; amount: string; }
export interface BillAdjRow { bill_id: string; type: 'credit_note' | 'debit_note'; amount: string; }
export interface PaymentAllocRow { payment_id: string; bill_id: string | null; tour_code: string | null; amount: string; }
export interface InvoiceRow { id: string; invoice_type: 'proforma' | 'tax_invoice'; taxable_value: string; gst_amount: string; total_amount: string; status: string; due_date: string | null; }
export interface CreditNoteRow { taxable_value: string; gst_amount: string; }
export interface ReceiptRow { receipt_type: 'advance' | 'part' | 'final' | 'refund'; amount: string; verified: boolean; }
export interface RevenueAdjRow { type: string; amount: string; status: string; }
export interface ReconRow { id: string; cost_item_id: string; status: string; variance: string | null; approved_adjustment: string | null; }
export interface CategoryRow { code: string; name: string; sort_order: number; }

export interface FinanceSettings {
  revenueRecognitionBasis: 'confirmed_price' | 'tax_invoiced';
  lowMarginThresholdPct: string;
}

export interface TourPnlInput {
  tour: TourRow;
  items: CostItemRow[];
  bills: BillRow[];            // every bill with at least one line on this tour
  billLines: BillLineRow[];    // ALL lines of those bills (needed for multi-tour pro-rating)
  billAdjustments: BillAdjRow[];
  paymentAllocations: PaymentAllocRow[]; // allocations to those bills + direct tour advances
  invoices: InvoiceRow[];
  creditNotes: CreditNoteRow[];
  receipts: ReceiptRow[];
  revenueAdjustments: RevenueAdjRow[];
  recon: ReconRow[];
  categories: CategoryRow[];
  financialStatusRow: { status: string; closed_at: string | null } | null;
  settings: FinanceSettings;
  today: string; // YYYY-MM-DD
}

const COMMITTED: CostStatus[] = ['booked', 'service_completed', 'bill_pending', 'bill_received', 'under_verification', 'approved', 'disputed'];
const OPEN_RECON = ['open', 'under_review'];

export function itemActual(it: CostItemRow): Paise | null {
  if (it.kind === 'guide_imprest' && it.detail) return imprestPosition(it.detail as any).cost;
  if (it.kind === 'transport' && it.detail && it.detail.actual_base_amount !== null && it.detail.actual_base_amount !== undefined) {
    return transportActual(it.detail as any);
  }
  return toPaiseOrNull(it.actual_amount);
}

export function itemExpected(it: CostItemRow): Paise | null {
  return toPaiseOrNull(it.expected_override_amount) ?? toPaiseOrNull(it.expected_amount);
}

export type ReconState =
  | 'cancelled' | 'not_due' | 'bill_not_received' | 'pending_verification' | 'disputed'
  | 'resolved' | 'no_difference' | 'charged_extra' | 'charged_less' | 'no_expected_amount';

export function reconState(it: CostItemRow, actual: Paise | null, expected: Paise | null, cases: ReconRow[], today: string): ReconState {
  if (it.status === 'cancelled' && actual === null) return 'cancelled';
  if (cases.some((c) => OPEN_RECON.includes(c.status)) || it.status === 'disputed') return 'disputed';
  if (cases.some((c) => ['approved', 'resolved', 'rejected'].includes(c.status))) return 'resolved';
  if (actual === null) {
    const serviceOver = (it.service_end_date ?? it.service_date ?? '9999-12-31') < today;
    return serviceOver || ['service_completed', 'bill_pending'].includes(it.status) ? 'bill_not_received' : 'not_due';
  }
  if (['bill_received', 'under_verification'].includes(it.status)) return 'pending_verification';
  if (expected === null) return 'no_expected_amount';
  if (actual === expected) return 'no_difference';
  return actual > expected ? 'charged_extra' : 'charged_less';
}

export interface Warning { code: string; severity: 'info' | 'warning' | 'critical'; message: string; costItemId?: string; billId?: string; }

export function computeTourPnl(input: TourPnlInput) {
  const { tour, settings, today } = input;
  const warnings: Warning[] = [];

  // ---------- Supplier bills: tour share, adjustments, payments ----------
  const linesByBill = groupBy(input.billLines, (l) => l.bill_id);
  const adjByBill = groupBy(input.billAdjustments, (a) => a.bill_id);
  const allocByBill = groupBy(input.paymentAllocations.filter((a) => a.bill_id), (a) => a.bill_id!);
  const billSummaries = input.bills.map((b) => {
    const lines = linesByBill.get(b.id) ?? [];
    const total = toPaise(b.total_amount);
    const linesTotal = sum(lines.map((l) => toPaise(l.amount)));
    const tourShare = sum(lines.filter((l) => l.tour_code === tour.tour_code).map((l) => toPaise(l.amount)));
    const adjustments = sum((adjByBill.get(b.id) ?? []).map((a) => (a.type === 'debit_note' ? 1n : -1n) * toPaise(a.amount)));
    const net = total + adjustments;
    const paid = sum((allocByBill.get(b.id) ?? []).map((a) => toPaise(a.amount)));
    const ratio = (x: Paise) => (linesTotal === 0n ? 0n : (x * tourShare) / linesTotal); // pro-rata for multi-tour bills
    const live = !['cancelled', 'rejected'].includes(b.status);
    if (live && linesTotal !== total) {
      warnings.push({ code: 'bill_lines_mismatch', severity: 'warning', billId: b.id, message: `Bill ${b.invoice_number} (${b.supplier_name}) total ${fmt(total)} ≠ allocated lines ${fmt(linesTotal)}.` });
    }
    return {
      id: b.id, supplierName: b.supplier_name, invoiceNumber: b.invoice_number, invoiceDate: b.invoice_date, dueDate: b.due_date,
      status: b.status, live, multiTour: lines.some((l) => l.tour_code !== tour.tour_code),
      total, net, paid, outstanding: net - paid,
      tourShare, tourShareNet: ratio(net), tourSharePaid: ratio(paid),
    };
  });
  const directAdvances = sum(input.paymentAllocations.filter((a) => !a.bill_id && a.tour_code === tour.tour_code).map((a) => toPaise(a.amount)));
  const billedLive = billSummaries.filter((b) => b.live);
  const approvedBills = billSummaries.filter((b) => b.status === 'approved');
  const totalSupplierBills = sum(billedLive.map((b) => b.tourShareNet));
  const approvedBillAmount = sum(approvedBills.map((b) => b.tourShareNet));
  const paymentsOnBills = sum(billedLive.map((b) => b.tourSharePaid));
  const supplierPayments = paymentsOnBills + directAdvances;
  const supplierOutstanding = approvedBillAmount - paymentsOnBills - directAdvances;

  // Item → billed amount & payment state
  const billLineByItem = groupBy(input.billLines.filter((l) => l.cost_item_id), (l) => l.cost_item_id!);
  const billById = new Map(billSummaries.map((b) => [b.id, b]));

  // ---------- Cost items ----------
  const reconByItem = groupBy(input.recon, (r) => r.cost_item_id);
  const items = input.items.map((it) => {
    const expected = itemExpected(it);
    const actual = itemActual(it);
    const verified = toPaiseOrNull(it.verified_amount);
    const cases = reconByItem.get(it.id) ?? [];
    const lines = (billLineByItem.get(it.id) ?? []).filter((l) => billById.get(l.bill_id)?.live);
    const billed = lines.length ? sum(lines.map((l) => toPaise(l.amount))) : null;
    const linkedBills = [...new Set(lines.map((l) => l.bill_id))].map((id) => billById.get(id)!).filter(Boolean);
    const paymentState = linkedBills.length === 0 ? 'no_bill'
      : linkedBills.every((b) => b.outstanding <= 0n) ? 'paid'
      : linkedBills.some((b) => b.paid > 0n) ? 'partially_paid' : 'unpaid';
    const state = reconState(it, actual, expected, cases, today);
    const variance = actual !== null && expected !== null ? actual - expected : null;

    // warnings
    if (it.status !== 'cancelled') {
      if (variance !== null && variance > 0n) warnings.push({ code: 'actual_over_expected', severity: 'warning', costItemId: it.id, message: `${label(it)}: actual ${fmt(actual!)} exceeds expected ${fmt(expected!)} by ${fmt(variance)}.` });
      if (billed !== null && expected !== null && billed > expected) warnings.push({ code: 'bill_over_agreed', severity: 'warning', costItemId: it.id, message: `${label(it)}: billed ${fmt(billed)} exceeds agreed ${fmt(expected)}.` });
      if (state === 'bill_not_received' && (it.kind === 'hotel' || it.kind === 'restaurant')) warnings.push({ code: `missing_${it.kind}_bill`, severity: 'warning', costItemId: it.id, message: `${label(it)}: service date passed, no bill/actual amount recorded.` });
      if (state === 'disputed') warnings.push({ code: 'unreconciled_discrepancy', severity: 'warning', costItemId: it.id, message: `${label(it)}: discrepancy under dispute.` });
      if (expected === null && actual === null) warnings.push({ code: 'missing_cost_data', severity: 'info', costItemId: it.id, message: `${label(it)}: no expected or actual amount.` });
    }
    return {
      ...it,
      expected: fmtOrNull(expected), actual: fmtOrNull(actual), verified: fmtOrNull(verified),
      variance: fmtOrNull(variance), variancePct: variance !== null && expected !== null ? pct(variance, expected) : null,
      billed: fmtOrNull(billed), paymentState, reconState: state,
      overridden: it.expected_override_amount !== null,
      _p: { expected, actual, verified },
    };
  });

  // Duplicate expense heuristic: same kind + supplier/payee + date + amount
  const dupKey = (i: (typeof items)[number]) => [i.kind, i.supplier_id ?? i.payee_name ?? '', i.service_date ?? '', i.actual ?? i.expected ?? ''].join('|');
  const seen = new Map<string, string>();
  for (const i of items) {
    if (i.status === 'cancelled' || (!i.actual && !i.expected)) continue;
    const k = dupKey(i);
    if (seen.has(k)) warnings.push({ code: 'possible_duplicate_expense', severity: 'warning', costItemId: i.id, message: `${label(i)} looks like a duplicate of cost item #${seen.get(k)}.` });
    else seen.set(k, i.id);
  }

  const live = items.filter((i) => i.status !== 'cancelled');
  const cost = {
    estimated: sum(live.map((i) => i._p.expected ?? 0n)),
    committed: sum(live.filter((i) => COMMITTED.includes(i.status)).map((i) => i._p.expected ?? 0n)),
    actual: sum(items.map((i) => i._p.actual ?? 0n)), // cancelled items count only if a charge was recorded
    verified: sum(items.map((i) => i._p.verified ?? 0n)),
    // best estimate of final cost: actual where known, otherwise expected
    forecast: sum(live.map((i) => i._p.actual ?? i._p.expected ?? 0n)) + sum(items.filter((i) => i.status === 'cancelled').map((i) => i._p.actual ?? 0n)),
  };

  // ---------- Categories ----------
  const categories = input.categories
    .slice().sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => {
      const its = items.filter((i) => i.category_code === c.code);
      const exp = sum(its.filter((i) => i.status !== 'cancelled').map((i) => i._p.expected ?? 0n));
      const act = sum(its.map((i) => i._p.actual ?? 0n));
      const ver = sum(its.map((i) => i._p.verified ?? 0n));
      // Variance only over lines where both amounts exist, so unbilled lines don't show as savings.
      const both = its.filter((i) => i.status !== 'cancelled' && i._p.actual !== null && i._p.expected !== null);
      const variance = sum(both.map((i) => i._p.actual! - i._p.expected!));
      return { code: c.code, name: c.name, expected: fmt(exp), actual: fmt(act), verified: fmt(ver), variance: fmt(variance), itemCount: its.length, items: its.map(stripPrivate) };
    })
    .filter((c) => c.itemCount > 0);

  // ---------- Revenue ----------
  const confirmed = toPaise(tour.confirmed_selling_price);
  const approvedAdj = input.revenueAdjustments.filter((a) => a.status === 'approved');
  const signOf = (t: string) => (t === 'discount' || t === 'commercial_adjustment_minus' ? -1n : 1n);
  const additionalRevenue = sum(approvedAdj.filter((a) => signOf(a.type) > 0n).map((a) => toPaise(a.amount)));
  const revenueReductions = sum(approvedAdj.filter((a) => signOf(a.type) < 0n).map((a) => toPaise(a.amount)));
  const pendingAdjustments = input.revenueAdjustments.filter((a) => a.status === 'pending');
  if (pendingAdjustments.length) warnings.push({ code: 'unapproved_adjustment', severity: 'info', message: `${pendingAdjustments.length} revenue adjustment(s) awaiting approval (not included in revenue).` });

  const taxInvoices = input.invoices.filter((i) => i.invoice_type === 'tax_invoice' && i.status === 'issued');
  const proformas = input.invoices.filter((i) => i.invoice_type === 'proforma' && i.status === 'issued');
  const creditTaxable = sum(input.creditNotes.map((c) => toPaise(c.taxable_value)));
  const creditTotal = sum(input.creditNotes.map((c) => toPaise(c.taxable_value) + toPaise(c.gst_amount)));
  const invoicedTaxable = sum(taxInvoices.map((i) => toPaise(i.taxable_value))) - creditTaxable;
  const invoicedTotal = sum(taxInvoices.map((i) => toPaise(i.total_amount))) - creditTotal;

  const finalAgreedPrice = confirmed + additionalRevenue - revenueReductions; // excl. GST
  const recognised = settings.revenueRecognitionBasis === 'tax_invoiced' ? invoicedTaxable : finalAgreedPrice;

  const receiptsIn = input.receipts.filter((r) => r.receipt_type !== 'refund');
  const refunds = input.receipts.filter((r) => r.receipt_type === 'refund');
  const collectedVerified = sum(receiptsIn.filter((r) => r.verified).map((r) => toPaise(r.amount))) - sum(refunds.filter((r) => r.verified).map((r) => toPaise(r.amount)));
  const collectedUnverified = sum(receiptsIn.filter((r) => !r.verified).map((r) => toPaise(r.amount))) - sum(refunds.filter((r) => !r.verified).map((r) => toPaise(r.amount)));

  // Receivable: tax invoices once they exist; otherwise the agreed contract value incl. GST.
  const contractValueInclGst = finalAgreedPrice + toPaise(tour.gst_amount);
  const receivableBasis = taxInvoices.length ? 'tax_invoices' : 'agreed_contract_value_incl_gst';
  if (!taxInvoices.length && approvedAdj.length) warnings.push({ code: 'gst_on_adjustments_unknown', severity: 'info', message: 'No tax invoice yet: GST on approved revenue adjustments is not included in the receivable estimate.' });
  const receivable = taxInvoices.length ? invoicedTotal : contractValueInclGst;
  const clientOutstanding = receivable - collectedVerified;

  // ---------- Profit (four views, never mixed) ----------
  const view = (c: Paise) => ({ cost: fmt(c), profit: fmt(recognised - c), marginPct: pct(recognised - c, recognised) });
  const profitability = {
    estimated: view(cost.estimated),
    committed: view(cost.committed),
    actual: view(cost.actual),
    verified: view(cost.verified),
    forecast: view(cost.forecast),
  };

  // ---------- Tour-level warnings ----------
  if (items.length === 0) warnings.push({ code: 'no_cost_data', severity: 'critical', message: 'No cost lines recorded for this tour.' });
  if (recognised - cost.forecast < 0n) warnings.push({ code: 'negative_profit', severity: 'critical', message: `Forecast loss of ${fmt(cost.forecast - recognised)}.` });
  else {
    const m = pct(recognised - cost.forecast, recognised);
    if (m !== null && toPaise(m) < toPaise(settings.lowMarginThresholdPct)) warnings.push({ code: 'low_margin', severity: 'warning', message: `Forecast margin ${m}% is below threshold ${settings.lowMarginThresholdPct}%.` });
  }
  if (tour.status === 'cancelled' && cost.actual > 0n) warnings.push({ code: 'cancelled_with_costs', severity: 'warning', message: `Tour cancelled with ${fmt(cost.actual)} of recorded cost.` });

  // ---------- Financial status (derived unless closed) ----------
  const derived = deriveFinancialStatus(items, input.recon);
  const closed = input.financialStatusRow?.status === 'financially_closed';
  const financialStatus = closed ? 'financially_closed' : derived;

  const checklist = closureChecklist(items, input.recon, {
    supplierOutstanding, clientOutstanding, taxInvoiceCount: taxInvoices.length, collectedUnverified,
  });

  return {
    tour,
    financialStatus,
    derivedFinancialStatus: derived,
    calculationBasis: {
      revenueRecognition: settings.revenueRecognitionBasis,
      receivable: receivableBasis,
      gstExcludedFromRevenue: true,
      netProfit: 'No overhead allocation configured: net profit equals gross profit.',
    },
    revenue: {
      quotedAmount: tour.quoted_amount,
      confirmedSellingPrice: fmt(confirmed),
      approvedAdditionalRevenue: fmt(additionalRevenue),
      approvedReductions: fmt(revenueReductions),
      finalAgreedPrice: fmt(finalAgreedPrice),
      gstOnContract: tour.gst_amount,
      recognisedRevenue: fmt(recognised),
      proformaTotal: fmt(sum(proformas.map((p) => toPaise(p.total_amount)))),
      invoicedTaxable: fmt(invoicedTaxable),
      invoicedTotal: fmt(invoicedTotal),
      creditNotes: fmt(creditTotal),
      receivable: fmt(receivable),
      collected: fmt(collectedVerified),
      collectedUnverified: fmt(collectedUnverified),
      clientOutstanding: fmt(clientOutstanding),
      pendingAdjustments: pendingAdjustments.length,
    },
    costs: Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, fmt(v)])),
    supplier: {
      totalBills: fmt(totalSupplierBills),
      approvedBills: fmt(approvedBillAmount),
      paymentsOnBills: fmt(paymentsOnBills),
      advancesWithoutBill: fmt(directAdvances),
      totalPayments: fmt(supplierPayments),
      outstanding: fmt(supplierOutstanding),
      committedNotBilled: fmt(sum(live.filter((i) => COMMITTED.includes(i.status) && i.billed === null && i.cost_nature === 'supplier').map((i) => i._p.expected ?? 0n))),
      bills: billSummaries.map((b) => ({ ...b, total: fmt(b.total), net: fmt(b.net), paid: fmt(b.paid), outstanding: fmt(b.outstanding), tourShare: fmt(b.tourShare), tourShareNet: fmt(b.tourShareNet), tourSharePaid: fmt(b.tourSharePaid) })),
    },
    profitability,
    grossProfit: profitability.actual.profit,
    grossMarginPct: profitability.actual.marginPct,
    netProfit: profitability.actual.profit,
    categories,
    items: items.map(stripPrivate),
    warnings,
    closureChecklist: checklist,
    // raw paise for portfolio aggregation (not serialised to clients)
    _totals: { recognised, receivable, collectedVerified, clientOutstanding, invoicedTotal, costEstimated: cost.estimated, costActual: cost.actual, costVerified: cost.verified, costForecast: cost.forecast, totalSupplierBills, supplierPayments, supplierOutstanding },
  };
}

export type TourPnl = ReturnType<typeof computeTourPnl>;

function deriveFinancialStatus(items: { status: CostStatus; _p: { actual: Paise | null; verified: Paise | null } }[], recon: ReconRow[]) {
  const live = items.filter((i) => i.status !== 'cancelled');
  if (live.length === 0) return 'costing_pending';
  if (recon.some((r) => OPEN_RECON.includes(r.status)) || live.some((i) => i.status === 'disputed')) return 'reconciliation_pending';
  if (live.every((i) => i._p.verified !== null)) return 'financially_verified';
  if (live.some((i) => i._p.actual === null)) {
    return live.some((i) => ['service_completed', 'bill_pending'].includes(i.status)) ? 'bills_pending' : 'expenses_in_progress';
  }
  return 'accounts_verification';
}

function closureChecklist(
  items: { kind: string; status: CostStatus; reconState: ReconState; _p: { actual: Paise | null; verified: Paise | null } }[],
  recon: ReconRow[],
  f: { supplierOutstanding: Paise; clientOutstanding: Paise; taxInvoiceCount: number; collectedUnverified: Paise },
) {
  const live = items.filter((i) => i.status !== 'cancelled');
  const kindDone = (kinds: string[]) => {
    const k = live.filter((i) => kinds.includes(i.kind));
    return { present: k.length > 0, complete: k.every((i) => i._p.actual !== null) };
  };
  const row = (key: string, label: string, ok: boolean, detail?: string) => ({ key, label, ok, detail });
  const h = kindDone(['hotel']), r = kindDone(['restaurant']), t = kindDone(['transport']), g = kindDone(['guide_dsa', 'guide_imprest']), o = kindDone(['activity', 'general']);
  const openRecon = recon.filter((x) => OPEN_RECON.includes(x.status)).length;
  return [
    row('hotels', 'All hotel expenses recorded', h.complete, h.present ? undefined : 'No hotel lines (confirm none were used)'),
    row('restaurants', 'All restaurant expenses recorded', r.complete, r.present ? undefined : 'No restaurant lines'),
    row('transport', 'Transportation expenses recorded', t.complete, t.present ? undefined : 'No transport lines'),
    row('guides', 'Guide DSA and imprest reconciled', g.complete),
    row('other', 'Other commercial expenses recorded', o.complete),
    row('verified', 'All cost lines verified by Accounts', live.every((i) => i._p.verified !== null)),
    row('supplier_balances', 'Outstanding vendor balances reviewed', f.supplierOutstanding <= 0n, f.supplierOutstanding > 0n ? `${fmt(f.supplierOutstanding)} still payable` : undefined),
    row('client_invoices', 'Client tax invoice issued', f.taxInvoiceCount > 0),
    row('client_collections', 'Client collections reconciled', f.clientOutstanding <= 0n && f.collectedUnverified === 0n,
      f.clientOutstanding > 0n ? `${fmt(f.clientOutstanding)} receivable` : f.collectedUnverified !== 0n ? `${fmt(f.collectedUnverified)} unverified receipts` : undefined),
    row('disputes', 'Disputes resolved or accepted', openRecon === 0, openRecon ? `${openRecon} open` : undefined),
  ];
}

function stripPrivate<T extends { _p: unknown }>(i: T): Omit<T, '_p'> {
  const { _p, ...rest } = i;
  return rest;
}

function label(i: { kind: string; description?: string | null; id: string; detail?: any }) {
  const name = i.detail?.hotel_name ?? i.detail?.restaurant_name ?? i.detail?.guide_name ?? i.description ?? i.kind;
  return `#${i.id} ${name}`;
}

function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const arr = m.get(k);
    if (arr) arr.push(x);
    else m.set(k, [x]);
  }
  return m;
}

