/** Loads rows for the calculation engine, batched across many tours. */
import type { Queryable } from '../db/client.ts';
import { computeTourPnl, type FinanceSettings, type TourPnl, type TourPnlInput } from './engine.ts';

export async function loadSettings(q: Queryable): Promise<FinanceSettings & Record<string, unknown>> {
  const rows = (await q.query<{ key: string; value: any }>('SELECT key, value FROM finance_settings')).rows;
  const m = Object.fromEntries(rows.map((r) => [r.key, typeof r.value === 'string' ? safeJson(r.value) : r.value]));
  return {
    ...m,
    revenueRecognitionBasis: m.revenue_recognition_basis === 'tax_invoiced' ? 'tax_invoiced' : 'confirmed_price',
    lowMarginThresholdPct: String(m.low_margin_threshold_pct ?? '10'),
  };
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

const DETAIL_TABLES: Record<string, string> = {
  hotel: 'hotel_stay_details', restaurant: 'restaurant_details', transport: 'transport_details',
  guide_dsa: 'guide_details', guide_imprest: 'guide_details',
};

export async function loadCostItems(q: Queryable, where: string, params: unknown[]) {
  const items = (await q.query<any>(
    `SELECT ci.*, to_char(ci.service_date,'YYYY-MM-DD') AS service_date, to_char(ci.service_end_date,'YYYY-MM-DD') AS service_end_date,
            eh.code AS head_code, eh.display_name AS head_name, eh.original_label AS head_original_label, s.name AS supplier_name
     FROM cost_items ci LEFT JOIN expense_heads eh ON eh.id = ci.expense_head_id LEFT JOIN suppliers s ON s.id = ci.supplier_id
     WHERE ${where} ORDER BY ci.service_date NULLS LAST, ci.id`,
    params,
  )).rows;
  for (const table of new Set(Object.values(DETAIL_TABLES))) {
    const ids = items.filter((i) => DETAIL_TABLES[i.kind] === table).map((i) => i.id);
    if (!ids.length) continue;
    const det = (await q.query<any>(`SELECT * FROM ${table} WHERE cost_item_id = ANY($1::bigint[])`, [ids])).rows;
    const byId = new Map(det.map((d) => [String(d.cost_item_id), normaliseDates(d)]));
    for (const i of items) if (DETAIL_TABLES[i.kind] === table) i.detail = byId.get(String(i.id)) ?? null;
  }
  return items.map((i) => ({ ...i, id: String(i.id) }));
}

function normaliseDates(d: any) {
  for (const k of Object.keys(d)) if (d[k] instanceof Date) d[k] = d[k].toISOString().substring(0, 10);
  return d;
}

const TOUR_COLS = `t.*, to_char(t.start_date,'YYYY-MM-DD') AS start_date, to_char(t.end_date,'YYYY-MM-DD') AS end_date`;

export async function loadTours(q: Queryable, tourCodes?: string[]) {
  const r = tourCodes
    ? await q.query<any>(`SELECT ${TOUR_COLS} FROM tours t WHERE t.tour_code = ANY($1::text[]) ORDER BY t.start_date DESC`, [tourCodes])
    : await q.query<any>(`SELECT ${TOUR_COLS} FROM tours t ORDER BY t.start_date DESC`);
  return r.rows.map(({ legacy_snapshot, ...t }) => t);
}

/** Computes P&L for many tours with a fixed number of queries. */
export async function computeTours(q: Queryable, tourCodes?: string[], today = new Date().toISOString().substring(0, 10)): Promise<TourPnl[]> {
  const tours = await loadTours(q, tourCodes);
  if (!tours.length) return [];
  const codes = tours.map((t) => t.tour_code);
  const [settings, categories, items] = await Promise.all([
    loadSettings(q),
    q.query<any>('SELECT code, name, sort_order FROM expense_categories').then((r) => r.rows),
    loadCostItems(q, 'ci.tour_code = ANY($1::text[])', [codes]),
  ]);
  const billIds = (await q.query<{ bill_id: string }>('SELECT DISTINCT bill_id FROM vendor_bill_lines WHERE tour_code = ANY($1::text[])', [codes])).rows.map((r) => r.bill_id);
  const [bills, billLines, billAdj, allocs, invoices, credits, receipts, revAdj, recon, finStatus] = await Promise.all([
    q.query<any>(`SELECT id::text, supplier_id, supplier_name, invoice_number, to_char(invoice_date,'YYYY-MM-DD') invoice_date, to_char(due_date,'YYYY-MM-DD') due_date, total_amount, status FROM vendor_bills WHERE id = ANY($1::bigint[])`, [billIds]),
    q.query<any>('SELECT id::text, bill_id::text, cost_item_id::text, tour_code, amount FROM vendor_bill_lines WHERE bill_id = ANY($1::bigint[])', [billIds]),
    q.query<any>('SELECT bill_id::text, type, amount FROM vendor_bill_adjustments WHERE bill_id = ANY($1::bigint[])', [billIds]),
    q.query<any>('SELECT payment_id::text, bill_id::text, tour_code, amount FROM supplier_payment_allocations WHERE bill_id = ANY($1::bigint[]) OR (bill_id IS NULL AND tour_code = ANY($2::text[]))', [billIds, codes]),
    q.query<any>(`SELECT id::text, tour_code, invoice_type, taxable_value, gst_amount, total_amount, status, to_char(due_date,'YYYY-MM-DD') due_date FROM client_invoices WHERE tour_code = ANY($1::text[])`, [codes]),
    q.query<any>('SELECT tour_code, taxable_value, gst_amount FROM client_credit_notes WHERE tour_code = ANY($1::text[])', [codes]),
    q.query<any>('SELECT tour_code, receipt_type, amount, verified FROM client_receipts WHERE tour_code = ANY($1::text[])', [codes]),
    q.query<any>('SELECT tour_code, type, amount, status FROM revenue_adjustments WHERE tour_code = ANY($1::text[])', [codes]),
    q.query<any>('SELECT id::text, cost_item_id::text, tour_code, status, variance, approved_adjustment FROM reconciliation_cases WHERE tour_code = ANY($1::text[])', [codes]),
    q.query<any>(`SELECT tour_code, status, closed_at FROM tour_financial_status WHERE tour_code = ANY($1::text[])`, [codes]),
  ]);
  const by = <T extends { tour_code: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) (m.get(r.tour_code) ?? m.set(r.tour_code, []).get(r.tour_code)!).push(r);
    return m;
  };
  const itemsBy = by(items as any[]);
  const invBy = by(invoices.rows), crBy = by(credits.rows), recBy = by(receipts.rows), adjBy = by(revAdj.rows), reconBy = by(recon.rows);
  const finBy = new Map(finStatus.rows.map((r) => [r.tour_code, r]));
  const billLineRows = billLines.rows;

  return tours.map((tour) => {
    const myBillIds = new Set(billLineRows.filter((l) => l.tour_code === tour.tour_code).map((l) => l.bill_id));
    const input: TourPnlInput = {
      tour,
      items: (itemsBy.get(tour.tour_code) ?? []) as any,
      bills: bills.rows.filter((b) => myBillIds.has(b.id)),
      billLines: billLineRows.filter((l) => myBillIds.has(l.bill_id)),
      billAdjustments: billAdj.rows.filter((a) => myBillIds.has(a.bill_id)),
      paymentAllocations: allocs.rows.filter((a) => (a.bill_id && myBillIds.has(a.bill_id)) || (!a.bill_id && a.tour_code === tour.tour_code)),
      invoices: invBy.get(tour.tour_code) ?? [],
      creditNotes: crBy.get(tour.tour_code) ?? [],
      receipts: recBy.get(tour.tour_code) ?? [],
      revenueAdjustments: adjBy.get(tour.tour_code) ?? [],
      recon: reconBy.get(tour.tour_code) ?? [],
      categories,
      financialStatusRow: finBy.get(tour.tour_code) ?? null,
      settings,
      today,
    };
    return computeTourPnl(input);
  });
}

export async function computeTour(q: Queryable, tourCode: string) {
  return (await computeTours(q, [tourCode]))[0] ?? null;
}

export async function isTourClosed(q: Queryable, tourCode: string): Promise<boolean> {
  const r = await q.query<any>('SELECT status FROM tour_financial_status WHERE tour_code = $1', [tourCode]);
  return r.rows[0]?.status === 'financially_closed';
}
