/**
 * Financial write operations. Every function runs inside a DB transaction,
 * checks permissions, respects financial closure, and writes an audit entry.
 */
import type { Queryable } from '../db/client.ts';
import type { AuthUser } from '../auth/middleware.ts';
import type { Permission } from '../auth/permissions.ts';
import { badRequest, conflict, forbidden, notFound } from '../lib/http.ts';
import { fmt, sum, toPaise } from '../lib/money.ts';
import { dsaExpected, hotelExpected, quantityRate, restaurantExpected, transportExpected, type CalcResult } from './rates.ts';
import { computeTour, isTourClosed, loadCostItems } from './repository.ts';
import { itemActual } from './engine.ts';

export const need = (u: AuthUser, ...ps: Permission[]) => {
  for (const p of ps) if (!u.permissions.has(p)) throw forbidden(`Missing permission: ${p}`);
};

export async function audit(q: Queryable, u: AuthUser | null, e: { tour_code?: string | null; entity_type: string; entity_id: string; action: string; before?: unknown; after?: unknown; reason?: string | null }) {
  await q.query(
    'INSERT INTO financial_audit_log (user_id, tour_code, entity_type, entity_id, action, before, after, reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [u?.id ?? null, e.tour_code ?? null, e.entity_type, e.entity_id, e.action, e.before === undefined ? null : JSON.stringify(e.before), e.after === undefined ? null : JSON.stringify(e.after), e.reason ?? null],
  );
}

/** After financial closure, edits need finance.post_closure and a reason. */
export async function assertWritable(q: Queryable, u: AuthUser, tourCode: string | null | undefined, reason?: string | null) {
  if (!tourCode) return;
  const t = await q.query('SELECT 1 FROM tours WHERE tour_code = $1', [tourCode]);
  if (!t.rows.length) throw badRequest(`Unknown Tour Code ${tourCode}`);
  if (await isTourClosed(q, tourCode)) {
    if (!u.permissions.has('finance.post_closure')) throw forbidden(`Tour ${tourCode} is financially closed. Post-closure changes need finance.post_closure.`);
    if (!reason || !reason.trim()) throw badRequest(`Tour ${tourCode} is financially closed: a reason is required for this change.`);
  }
}

// ---------------------------------------------------------------- cost items

const KIND_CATEGORY: Record<string, string> = {
  hotel: 'hotels', restaurant: 'restaurants', transport: 'transport', guide_dsa: 'guide_dsa', guide_imprest: 'guide_imprest',
};

export interface CostItemInput {
  tour_code?: string | null; is_unallocated?: boolean; kind: string; category_code?: string; expense_head_code?: string | null;
  description?: string | null; supplier_id?: string | null; payee_name?: string | null; cost_nature?: 'supplier' | 'internal';
  service_date?: string | null; service_end_date?: string | null; destination?: string | null;
  quantity?: string | null; unit_rate?: string | null; expected_amount?: string | null; actual_amount?: string | null;
  tax_amount?: string | null; status?: string; bill_reference?: string | null; payment_mode?: string | null; remarks?: string | null;
  detail?: Record<string, any> | null; reason?: string | null;
}

function computeExpected(kind: string, base: { quantity?: any; unit_rate?: any }, d: Record<string, any> | null): CalcResult | null {
  if (!d && (kind === 'hotel' || kind === 'restaurant')) return null;
  switch (kind) {
    case 'hotel': return hotelExpected(d as any);
    case 'restaurant': return restaurantExpected(d as any);
    case 'transport': return transportExpected(d?.rate_basis ?? 'custom', base.unit_rate ?? null, base.quantity ?? null);
    case 'guide_dsa': return dsaExpected(d?.days ?? null, d?.dsa_rate ?? null);
    default: return quantityRate(base.quantity ?? null, base.unit_rate ?? null);
  }
}

const DETAIL_COLUMNS: Record<string, { table: string; cols: string[] }> = {
  hotel: { table: 'hotel_stay_details', cols: ['hotel_name', 'city', 'check_in', 'check_out', 'nights', 'dbl_rooms', 'sng_rooms', 'extra_beds', 'foc', 'foc_rooms', 'cwb', 'cnb', 'meal_plan', 'dbl_rate', 'sng_rate', 'eb_rate', 'cwb_rate', 'cnb_rate', 'tea_coffee', 'tea_coffee_basis', 'rate_adjustment_pct', 'foc_rule', 'booking_reference', 'dispute_amount', 'hotel_remarks'] },
  restaurant: { table: 'restaurant_details', cols: ['restaurant_name', 'pax', 'foc_qty', 'foc_description', 'rate_per_pax', 'foc_rule', 'meal_type', 'dispute_amount'] },
  transport: { table: 'transport_details', cols: ['vehicle_type', 'registration', 'vehicle_id', 'is_company_owned', 'route', 'service_type', 'rate_basis', 'actual_base_amount', 'driver_allowance', 'fuel', 'toll', 'parking', 'other_charges'] },
  guide_dsa: { table: 'guide_details', cols: ['guide_name', 'days', 'dsa_rate'] },
  guide_imprest: { table: 'guide_details', cols: ['guide_name', 'imprest_advanced', 'imprest_supported_expense', 'imprest_returned', 'additional_approved'] },
};

const HOTEL_DEFAULTS = { dbl_rooms: 0, sng_rooms: 0, extra_beds: 0, foc_rooms: 0, cwb: 0, cnb: 0, dbl_rate: '0', sng_rate: '0', eb_rate: '0', cwb_rate: '0', cnb_rate: '0', tea_coffee: '0', tea_coffee_basis: 'lump_sum', rate_adjustment_pct: '0', foc_rule: 'none' };
const DETAIL_DEFAULTS: Record<string, Record<string, any>> = {
  hotel: HOTEL_DEFAULTS,
  restaurant: { foc_qty: 0, foc_rule: 'none' },
  transport: { is_company_owned: false, driver_allowance: '0', fuel: '0', toll: '0', parking: '0', other_charges: '0' },
  guide_imprest: { imprest_advanced: '0', imprest_returned: '0', additional_approved: '0' },
};

function normaliseDetail(kind: string, d: Record<string, any> | null | undefined, defaults: Record<string, any>) {
  if (!DETAIL_COLUMNS[kind]) return null;
  if (!d) throw badRequest(`${kind} lines need detail fields`);
  const merged = { ...(DETAIL_DEFAULTS[kind] ?? {}), ...defaults, ...d };
  if (kind === 'hotel') {
    if (!merged.hotel_name || !merged.check_in || !merged.check_out) throw badRequest('Hotel lines need hotel_name, check_in and check_out');
    const nights = Math.round((Date.parse(merged.check_out) - Date.parse(merged.check_in)) / 86_400_000);
    if (!(nights >= 0)) throw badRequest('check_out must be on or after check_in');
    merged.nights = d.nights ?? nights;
  }
  if (kind === 'restaurant' && (!merged.restaurant_name || merged.pax === undefined)) throw badRequest('Restaurant lines need restaurant_name and pax');
  if (kind === 'transport' && !merged.rate_basis) throw badRequest('Transport lines need rate_basis');
  if ((kind === 'guide_dsa' || kind === 'guide_imprest') && !merged.guide_name) throw badRequest('Guide lines need guide_name');
  const out: Record<string, any> = {};
  for (const c of DETAIL_COLUMNS[kind].cols) out[c] = merged[c] ?? null;
  return out;
}

async function writeDetail(q: Queryable, kind: string, id: string, detail: Record<string, any> | null, isNew: boolean) {
  const spec = DETAIL_COLUMNS[kind];
  if (!spec || !detail) return;
  const cols = Object.keys(detail);
  if (isNew) {
    await q.query(`INSERT INTO ${spec.table} (cost_item_id, ${cols.join(',')}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(',')})`, [id, ...cols.map((c) => detail[c])]);
  } else {
    await q.query(`UPDATE ${spec.table} SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE cost_item_id = $1`, [id, ...cols.map((c) => detail[c])]);
  }
}

async function getItem(q: Queryable, id: string) {
  const [it] = await loadCostItems(q, 'ci.id = $1', [id]);
  if (!it) throw notFound(`Cost item ${id} not found`);
  return it;
}

export async function createCostItem(q: Queryable, u: AuthUser, input: CostItemInput) {
  need(u, 'cost.write');
  if (!input.tour_code && !input.is_unallocated) throw badRequest('Every expense needs a Tour Code unless it is explicitly marked as an unallocated company-level expense.');
  await assertWritable(q, u, input.tour_code, input.reason);
  if (input.status && !['estimated', 'booked', 'service_completed', 'bill_pending', 'bill_received'].includes(input.status)) {
    throw badRequest(`New cost lines cannot start in status ${input.status}`);
  }

  const head = input.expense_head_code
    ? (await q.query<any>('SELECT id, category_code, cost_nature, active FROM expense_heads WHERE code = $1', [input.expense_head_code])).rows[0]
    : null;
  if (input.expense_head_code && !head) throw badRequest(`Unknown expense head ${input.expense_head_code}`);
  if (head && !head.active) throw badRequest(`Expense head ${input.expense_head_code} is inactive`);
  const category = input.category_code ?? head?.category_code ?? KIND_CATEGORY[input.kind];
  if (!category) throw badRequest('category_code or expense_head_code is required');

  const settings = Object.fromEntries((await q.query<any>('SELECT key, value FROM finance_settings')).rows.map((r) => [r.key, r.value]));
  const detailDefaults = input.kind === 'hotel' ? { foc_rule: settings.default_hotel_foc_rule ?? 'none' } : input.kind === 'restaurant' ? { foc_rule: settings.default_restaurant_foc_rule ?? 'none' } : {};
  const detail = normaliseDetail(input.kind, input.detail, detailDefaults);
  const isCompanyVehicle = input.kind === 'transport' && detail?.is_company_owned;
  const costNature = input.cost_nature ?? (isCompanyVehicle ? 'internal' : head?.cost_nature ?? (input.kind.startsWith('guide') ? 'internal' : 'supplier'));
  if (isCompanyVehicle && costNature !== 'internal') throw badRequest('A company-owned vehicle is an internal cost, not a supplier payable.');

  const calc = computeExpected(input.kind, input, detail);
  const expected = calc ? fmt(calc.amount) : input.expected_amount ?? null;
  const serviceDate = input.service_date ?? detail?.check_in ?? null;
  const serviceEnd = input.service_end_date ?? detail?.check_out ?? null;

  const r = await q.query<{ id: string }>(
    `INSERT INTO cost_items (tour_code, is_unallocated, kind, category_code, expense_head_id, description, supplier_id, payee_name, cost_nature,
       service_date, service_end_date, destination, quantity, unit_rate, expected_amount, expected_calc, actual_amount, tax_amount, status,
       bill_reference, payment_mode, remarks, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$23) RETURNING id::text`,
    [input.tour_code ?? null, !!input.is_unallocated, input.kind, category, head?.id ?? null, input.description ?? null, input.supplier_id ?? null,
     input.payee_name ?? null, costNature, serviceDate, serviceEnd, input.destination ?? null, input.quantity ?? null, input.unit_rate ?? null,
     expected, calc ? calcJson(calc) : JSON.stringify({ rule: 'manual_expected' }), input.actual_amount ?? null, input.tax_amount ?? '0',
     input.status ?? 'estimated', input.bill_reference ?? null, input.payment_mode ?? null, input.remarks ?? null, u.id],
  );
  const id = r.rows[0].id;
  await writeDetail(q, input.kind, id, detail, true);
  await syncTransportActual(q, input.kind, id);
  const after = await getItem(q, id);
  await audit(q, u, { tour_code: input.tour_code, entity_type: 'cost_item', entity_id: id, action: 'create', after, reason: input.reason });
  return after;
}

/** Transport actual = base + allowance + fuel + toll + parking + other; kept in cost_items.actual_amount for reporting. */
async function syncTransportActual(q: Queryable, kind: string, id: string) {
  if (kind !== 'transport' && kind !== 'guide_imprest') return;
  const it = await getItem(q, id);
  const actual = itemActual(it as any);
  await q.query('UPDATE cost_items SET actual_amount = $2 WHERE id = $1', [id, actual === null ? null : fmt(actual)]);
}

const EDITABLE = ['description', 'supplier_id', 'payee_name', 'service_date', 'service_end_date', 'destination', 'quantity', 'unit_rate', 'expected_amount', 'actual_amount', 'tax_amount', 'bill_reference', 'payment_mode', 'remarks', 'category_code'] as const;

export async function updateCostItem(q: Queryable, u: AuthUser, id: string, patch: Partial<CostItemInput>) {
  need(u, 'cost.write');
  const before = await getItem(q, id);
  await assertWritable(q, u, before.tour_code, patch.reason);
  const amountsChanging = ['expected_amount', 'actual_amount', 'tax_amount', 'quantity', 'unit_rate'].some((k) => k in patch) || !!patch.detail;
  if (before.status === 'approved' && amountsChanging) {
    // Changing a verified amount sends the line back to verification.
    need(u, 'cost.verify');
    if (!patch.reason) throw badRequest('Changing an approved cost line requires a reason.');
  }
  const calculated = before.expected_calc && !['manual_expected', 'migrated_agreed_amount', 'migrated_quotation_baseline', 'import'].includes(before.expected_calc.rule);
  if ('expected_amount' in patch && calculated) {
    throw badRequest('Expected amount is calculated from agreed rates. Change the rates, or use an authorised override.');
  }

  const sets: string[] = [];
  const vals: unknown[] = [id];
  for (const k of EDITABLE) {
    if (k in patch) { vals.push((patch as any)[k] ?? null); sets.push(`${k} = $${vals.length}`); }
  }
  let detail = null;
  if (patch.detail && DETAIL_COLUMNS[before.kind]) {
    const merged = { ...(before.detail ?? {}), ...patch.detail };
    if (before.kind === 'hotel' && (patch.detail.check_in || patch.detail.check_out) && patch.detail.nights === undefined) delete merged.nights;
    detail = normaliseDetail(before.kind, merged, {});
  }
  const calc = computeExpected(before.kind, { quantity: patch.quantity ?? before.quantity, unit_rate: patch.unit_rate ?? before.unit_rate }, detail ?? before.detail ?? null);
  const ratesChanged = !!detail || 'quantity' in patch || 'unit_rate' in patch;
  if (calc && ratesChanged) {
    vals.push(fmt(calc.amount)); sets.push(`expected_amount = $${vals.length}`);
    vals.push(calcJson(calc)); sets.push(`expected_calc = $${vals.length}`);
  }
  if (before.status === 'approved' && amountsChanging) {
    sets.push(`status = 'under_verification'`, 'verified_amount = NULL', 'approved_by = NULL', 'approved_at = NULL');
  }
  vals.push(u.id); sets.push(`updated_by = $${vals.length}`, 'updated_at = now()');
  await q.query(`UPDATE cost_items SET ${sets.join(', ')} WHERE id = $1`, vals);
  if (detail) await writeDetail(q, before.kind, id, detail, !before.detail);
  await syncTransportActual(q, before.kind, id);
  const after = await getItem(q, id);
  await audit(q, u, { tour_code: before.tour_code, entity_type: 'cost_item', entity_id: id, action: 'update', before, after, reason: patch.reason });
  return after;
}

export async function overrideExpected(q: Queryable, u: AuthUser, id: string, amount: string | null, reason: string) {
  need(u, 'cost.override_expected');
  if (!reason?.trim()) throw badRequest('An override needs a reason.');
  const before = await getItem(q, id);
  await assertWritable(q, u, before.tour_code, reason);
  await q.query('UPDATE cost_items SET expected_override_amount = $2, expected_override_reason = $3, updated_by = $4, updated_at = now() WHERE id = $1', [id, amount, amount === null ? null : reason, u.id]);
  const after = await getItem(q, id);
  await audit(q, u, { tour_code: before.tour_code, entity_type: 'cost_item', entity_id: id, action: amount === null ? 'override_removed' : 'override_expected', before: { expected_amount: before.expected_amount, override: before.expected_override_amount }, after: { override: amount }, reason });
  return after;
}

const TRANSITIONS: Record<string, string[]> = {
  estimated: ['booked', 'cancelled'],
  booked: ['service_completed', 'bill_pending', 'bill_received', 'cancelled'],
  service_completed: ['bill_pending', 'bill_received', 'cancelled'],
  bill_pending: ['bill_received', 'cancelled'],
  bill_received: ['under_verification', 'approved', 'disputed', 'cancelled'],
  under_verification: ['approved', 'disputed', 'bill_received'],
  disputed: ['under_verification'],
  approved: ['under_verification'],
  cancelled: ['estimated'],
};

export async function transitionCostItem(q: Queryable, u: AuthUser, id: string, to: string, reason?: string | null) {
  const before = await getItem(q, id);
  await assertWritable(q, u, before.tour_code, reason);
  if (!TRANSITIONS[before.status]?.includes(to)) throw badRequest(`Cannot move a cost line from ${before.status} to ${to}`);
  if (['approved', 'under_verification'].includes(to) || before.status === 'approved') need(u, 'cost.verify');
  else need(u, 'cost.write');
  if (to === 'disputed') throw badRequest('Open a reconciliation case to dispute a cost line.');

  let verified: string | null = null;
  if (to === 'approved') {
    const actual = itemActual(before as any);
    if (actual === null) throw badRequest('Record the actual amount before approving.');
    const open = await q.query('SELECT 1 FROM reconciliation_cases WHERE cost_item_id = $1 AND status IN (\'open\',\'under_review\')', [id]);
    if (open.rows.length) throw conflict('Resolve the open discrepancy before approving.');
    const adj = await q.query<any>(`SELECT approved_adjustment FROM reconciliation_cases WHERE cost_item_id = $1 AND status IN ('approved','resolved') AND approved_adjustment IS NOT NULL ORDER BY resolved_at DESC NULLS LAST, id DESC LIMIT 1`, [id]);
    verified = adj.rows[0]?.approved_adjustment ?? fmt(actual);
  }
  await q.query(
    `UPDATE cost_items SET status = $2, verified_amount = $3, approved_by = $4, approved_at = CASE WHEN $2 = 'approved' THEN now() ELSE NULL END, updated_by = $5, updated_at = now() WHERE id = $1`,
    [id, to, to === 'approved' ? verified : null, to === 'approved' ? u.id : null, u.id],
  );
  const after = await getItem(q, id);
  await audit(q, u, { tour_code: before.tour_code, entity_type: 'cost_item', entity_id: id, action: `status:${before.status}->${to}`, before: { status: before.status, verified_amount: before.verified_amount }, after: { status: to, verified_amount: verified }, reason });
  return after;
}

// ---------------------------------------------------------------- reconciliation

export async function openReconCase(q: Queryable, u: AuthUser, costItemId: string, b: { reason: string; remarks?: string; assigned_to?: string | null; document_id?: string | null }) {
  need(u, 'recon.write');
  const it = await getItem(q, costItemId);
  await assertWritable(q, u, it.tour_code, b.reason);
  const existing = await q.query('SELECT id FROM reconciliation_cases WHERE cost_item_id = $1 AND status IN (\'open\',\'under_review\')', [costItemId]);
  if (existing.rows.length) throw conflict('This cost line already has an open discrepancy case.');
  const expected = toPaise(it.expected_override_amount ?? it.expected_amount);
  const actualP = itemActual(it as any);
  const r = await q.query<{ id: string }>(
    `INSERT INTO reconciliation_cases (cost_item_id, tour_code, expected_snapshot, actual_snapshot, variance, reason, remarks, document_id, assigned_to, opened_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text`,
    [costItemId, it.tour_code, fmt(expected), actualP === null ? null : fmt(actualP), actualP === null ? null : fmt(actualP - expected), b.reason, b.remarks ?? null, b.document_id ?? null, b.assigned_to ?? null, u.id],
  );
  if (it.status !== 'cancelled') await q.query(`UPDATE cost_items SET status = 'disputed', verified_amount = NULL, updated_at = now() WHERE id = $1`, [costItemId]);
  await audit(q, u, { tour_code: it.tour_code, entity_type: 'reconciliation_case', entity_id: r.rows[0].id, action: 'open', after: b, reason: b.reason });
  return r.rows[0];
}

export async function updateReconCase(q: Queryable, u: AuthUser, id: string, b: { status: string; approved_adjustment?: string | null; remarks?: string | null; assigned_to?: string | null }) {
  const before = (await q.query<any>('SELECT * FROM reconciliation_cases WHERE id = $1', [id])).rows[0];
  if (!before) throw notFound('Case not found');
  const final = ['approved', 'rejected', 'resolved'].includes(b.status);
  need(u, final ? 'recon.resolve' : 'recon.write');
  await assertWritable(q, u, before.tour_code, b.remarks);
  if (['approved', 'rejected', 'resolved'].includes(before.status)) throw conflict('This case is already closed. Open a new case if needed; history is kept.');
  await q.query(
    `UPDATE reconciliation_cases SET status = $2, approved_adjustment = COALESCE($3, approved_adjustment), remarks = COALESCE($4, remarks),
       assigned_to = COALESCE($5, assigned_to), resolved_by = CASE WHEN $6 THEN $7 ELSE resolved_by END, resolved_at = CASE WHEN $6 THEN now() ELSE resolved_at END
     WHERE id = $1`,
    [id, b.status, b.approved_adjustment ?? null, b.remarks ?? null, b.assigned_to ?? null, final, u.id],
  );
  if (final) await q.query(`UPDATE cost_items SET status = 'under_verification', updated_at = now() WHERE id = $1 AND status = 'disputed'`, [before.cost_item_id]);
  await audit(q, u, { tour_code: before.tour_code, entity_type: 'reconciliation_case', entity_id: id, action: `status:${before.status}->${b.status}`, before, after: b, reason: b.remarks });
}

// ---------------------------------------------------------------- vendor bills & payments

export interface BillInput {
  supplier_id?: string | null; supplier_name: string; invoice_number: string; invoice_date: string; due_date?: string | null;
  taxable_value?: string; tax_amount?: string; total_amount: string; remarks?: string | null; reason?: string | null;
  lines: { cost_item_id?: string | null; tour_code?: string | null; amount: string; description?: string | null }[];
}

export async function createBill(q: Queryable, u: AuthUser, b: BillInput) {
  need(u, 'bill.write');
  if (!b.lines?.length) throw badRequest('A bill needs at least one line allocating it to a cost line or Tour Code.');
  const linesTotal = sum(b.lines.map((l) => toPaise(l.amount)));
  if (linesTotal !== toPaise(b.total_amount)) throw badRequest(`Bill lines (${fmt(linesTotal)}) must add up to the bill total (${fmt(toPaise(b.total_amount))}).`);
  if (b.taxable_value !== undefined && b.tax_amount !== undefined && toPaise(b.taxable_value) + toPaise(b.tax_amount) !== toPaise(b.total_amount)) {
    throw badRequest('Taxable value + tax must equal the bill total.');
  }
  const dup = await q.query<any>(`SELECT id FROM vendor_bills WHERE lower(coalesce(supplier_id, supplier_name)) = lower(coalesce($1, $2)) AND lower(invoice_number) = lower($3) AND status <> 'cancelled'`, [b.supplier_id ?? null, b.supplier_name, b.invoice_number]);
  if (dup.rows.length) throw conflict(`Duplicate bill: ${b.supplier_name} invoice ${b.invoice_number} already exists (bill #${dup.rows[0].id}).`);

  // resolve each line's tour, check writability
  const resolved = [];
  for (const l of b.lines) {
    let tour = l.tour_code ?? null;
    if (l.cost_item_id) {
      const it = await getItem(q, l.cost_item_id);
      if (tour && tour !== it.tour_code) throw badRequest(`Line tour_code ${tour} does not match cost line #${it.id} (${it.tour_code}).`);
      tour = it.tour_code;
    }
    if (!tour) throw badRequest('Each bill line needs a cost_item_id or tour_code.');
    await assertWritable(q, u, tour, b.reason);
    resolved.push({ ...l, tour_code: tour });
  }
  const r = await q.query<{ id: string }>(
    `INSERT INTO vendor_bills (supplier_id, supplier_name, invoice_number, invoice_date, due_date, taxable_value, tax_amount, total_amount, remarks, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text`,
    [b.supplier_id ?? null, b.supplier_name, b.invoice_number, b.invoice_date, b.due_date ?? null, b.taxable_value ?? b.total_amount, b.tax_amount ?? '0', b.total_amount, b.remarks ?? null, u.id],
  );
  const billId = r.rows[0].id;
  for (const l of resolved) {
    await q.query('INSERT INTO vendor_bill_lines (bill_id, cost_item_id, tour_code, amount, description) VALUES ($1,$2,$3,$4,$5)', [billId, l.cost_item_id ?? null, l.tour_code, l.amount, l.description ?? null]);
    if (l.cost_item_id) {
      // Bill received: advance status, and record the billed amount as actual if none was entered.
      await q.query(
        `UPDATE cost_items SET status = CASE WHEN status IN ('estimated','booked','service_completed','bill_pending') THEN 'bill_received' ELSE status END,
           actual_amount = COALESCE(actual_amount, $2), bill_reference = COALESCE(bill_reference, $3), updated_at = now() WHERE id = $1`,
        [l.cost_item_id, l.amount, b.invoice_number],
      );
    }
  }
  await audit(q, u, { entity_type: 'vendor_bill', entity_id: billId, action: 'create', after: b, tour_code: resolved[0].tour_code, reason: b.reason });
  return { id: billId };
}

export async function setBillStatus(q: Queryable, u: AuthUser, id: string, status: 'under_verification' | 'approved' | 'rejected' | 'cancelled', reason?: string | null) {
  need(u, status === 'under_verification' ? 'bill.write' : 'bill.approve');
  const before = (await q.query<any>('SELECT * FROM vendor_bills WHERE id = $1', [id])).rows[0];
  if (!before) throw notFound('Bill not found');
  const tours = (await q.query<any>('SELECT DISTINCT tour_code FROM vendor_bill_lines WHERE bill_id = $1', [id])).rows.map((r) => r.tour_code);
  for (const t of tours) await assertWritable(q, u, t, reason);
  if (status === 'cancelled' || status === 'rejected') {
    const paid = await q.query<any>('SELECT COALESCE(SUM(amount),0) s FROM supplier_payment_allocations WHERE bill_id = $1', [id]);
    if (toPaise(paid.rows[0].s) > 0n) throw conflict('Payments are allocated to this bill. Reallocate them before cancelling or rejecting.');
    if (!reason) throw badRequest('A reason is required.');
  }
  await q.query('UPDATE vendor_bills SET status = $2, approved_by = CASE WHEN $2 = \'approved\' THEN $3 ELSE approved_by END, approved_at = CASE WHEN $2 = \'approved\' THEN now() ELSE approved_at END WHERE id = $1', [id, status, u.id]);
  await audit(q, u, { entity_type: 'vendor_bill', entity_id: id, action: `status:${before.status}->${status}`, tour_code: tours[0] ?? null, reason });
}

export async function addBillAdjustment(q: Queryable, u: AuthUser, billId: string, b: { type: 'credit_note' | 'debit_note'; amount: string; note_date: string; reason: string }) {
  need(u, 'bill.approve');
  if (!b.reason?.trim()) throw badRequest('Reason required');
  const tours = (await q.query<any>('SELECT DISTINCT tour_code FROM vendor_bill_lines WHERE bill_id = $1', [billId])).rows.map((r) => r.tour_code);
  if (!tours.length) throw notFound('Bill not found');
  for (const t of tours) await assertWritable(q, u, t, b.reason);
  const r = await q.query<{ id: string }>('INSERT INTO vendor_bill_adjustments (bill_id, type, amount, note_date, reason, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::text', [billId, b.type, b.amount, b.note_date, b.reason, u.id]);
  await audit(q, u, { entity_type: 'vendor_bill_adjustment', entity_id: r.rows[0].id, action: 'create', after: { billId, ...b }, tour_code: tours[0], reason: b.reason });
  return r.rows[0];
}

export async function recordSupplierPayment(q: Queryable, u: AuthUser, b: {
  supplier_id?: string | null; supplier_name: string; paid_date: string; amount: string; payment_mode?: string | null; reference?: string | null; notes?: string | null; reason?: string | null;
  allocations: { bill_id?: string | null; tour_code?: string | null; amount: string }[];
}) {
  need(u, 'payment.write');
  if (!b.allocations?.length) throw badRequest('Allocate the payment to at least one bill or Tour Code (advance).');
  const allocTotal = sum(b.allocations.map((a) => toPaise(a.amount)));
  if (allocTotal !== toPaise(b.amount)) throw badRequest(`Allocations (${fmt(allocTotal)}) must equal the payment amount (${fmt(toPaise(b.amount))}).`);
  for (const a of b.allocations) {
    if (a.bill_id) {
      const bill = (await q.query<any>('SELECT * FROM vendor_bills WHERE id = $1', [a.bill_id])).rows[0];
      if (!bill) throw badRequest(`Bill ${a.bill_id} not found`);
      if (bill.status !== 'approved') throw badRequest(`Bill ${bill.invoice_number} is not approved; pay it as an advance against the Tour Code instead.`);
      const paid = toPaise((await q.query<any>('SELECT COALESCE(SUM(amount),0) s FROM supplier_payment_allocations WHERE bill_id = $1', [a.bill_id])).rows[0].s);
      const adj = (await q.query<any>('SELECT type, amount FROM vendor_bill_adjustments WHERE bill_id = $1', [a.bill_id])).rows;
      const net = toPaise(bill.total_amount) + sum(adj.map((x) => (x.type === 'debit_note' ? 1n : -1n) * toPaise(x.amount)));
      if (paid + toPaise(a.amount) > net) throw badRequest(`Payment would exceed outstanding on bill ${bill.invoice_number} (outstanding ${fmt(net - paid)}).`);
      const tours = (await q.query<any>('SELECT DISTINCT tour_code FROM vendor_bill_lines WHERE bill_id = $1', [a.bill_id])).rows;
      for (const t of tours) await assertWritable(q, u, t.tour_code, b.reason);
    } else if (a.tour_code) {
      await assertWritable(q, u, a.tour_code, b.reason);
    } else throw badRequest('Each allocation needs bill_id or tour_code');
  }
  const r = await q.query<{ id: string }>(
    'INSERT INTO supplier_payments (supplier_id, supplier_name, paid_date, amount, payment_mode, reference, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text',
    [b.supplier_id ?? null, b.supplier_name, b.paid_date, b.amount, b.payment_mode ?? null, b.reference ?? null, b.notes ?? null, u.id],
  );
  for (const a of b.allocations) {
    await q.query('INSERT INTO supplier_payment_allocations (payment_id, bill_id, tour_code, amount) VALUES ($1,$2,$3,$4)', [r.rows[0].id, a.bill_id ?? null, a.bill_id ? null : a.tour_code, a.amount]);
  }
  await audit(q, u, { entity_type: 'supplier_payment', entity_id: r.rows[0].id, action: 'create', after: b, tour_code: b.allocations.find((a) => a.tour_code)?.tour_code ?? null, reason: b.reason });
  return r.rows[0];
}

// ---------------------------------------------------------------- client side

export async function createClientInvoice(q: Queryable, u: AuthUser, b: { tour_code: string; invoice_type: 'proforma' | 'tax_invoice'; invoice_number: string; invoice_date: string; due_date?: string | null; taxable_value: string; gst_amount: string; reason?: string | null }) {
  need(u, 'receipt.write');
  await assertWritable(q, u, b.tour_code, b.reason);
  const total = fmt(toPaise(b.taxable_value) + toPaise(b.gst_amount));
  const r = await q.query<{ id: string }>(
    'INSERT INTO client_invoices (tour_code, invoice_type, invoice_number, invoice_date, due_date, taxable_value, gst_amount, total_amount, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id::text',
    [b.tour_code, b.invoice_type, b.invoice_number, b.invoice_date, b.due_date ?? null, b.taxable_value, b.gst_amount, total, u.id],
  );
  await audit(q, u, { tour_code: b.tour_code, entity_type: 'client_invoice', entity_id: r.rows[0].id, action: 'create', after: b, reason: b.reason });
  return r.rows[0];
}

export async function createCreditNote(q: Queryable, u: AuthUser, b: { tour_code: string; invoice_id?: string | null; note_number: string; note_date: string; taxable_value: string; gst_amount: string; reason: string }) {
  need(u, 'receipt.write');
  await assertWritable(q, u, b.tour_code, b.reason);
  const r = await q.query<{ id: string }>(
    'INSERT INTO client_credit_notes (tour_code, invoice_id, note_number, note_date, taxable_value, gst_amount, reason, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text',
    [b.tour_code, b.invoice_id ?? null, b.note_number, b.note_date, b.taxable_value, b.gst_amount, b.reason, u.id],
  );
  await audit(q, u, { tour_code: b.tour_code, entity_type: 'client_credit_note', entity_id: r.rows[0].id, action: 'create', after: b, reason: b.reason });
  return r.rows[0];
}

export async function recordClientReceipt(q: Queryable, u: AuthUser, b: { tour_code: string; receipt_type: 'advance' | 'part' | 'final' | 'refund'; amount: string; received_date: string; payment_mode?: string | null; reference?: string | null; receipt_number?: string | null; verified?: boolean; notes?: string | null; reason?: string | null }) {
  need(u, 'receipt.write');
  await assertWritable(q, u, b.tour_code, b.reason);
  const r = await q.query<{ id: string }>(
    'INSERT INTO client_receipts (tour_code, receipt_type, amount, received_date, payment_mode, reference, receipt_number, verified, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text',
    [b.tour_code, b.receipt_type, b.amount, b.received_date, b.payment_mode ?? null, b.reference ?? null, b.receipt_number ?? null, !!b.verified, b.notes ?? null, u.id],
  );
  await audit(q, u, { tour_code: b.tour_code, entity_type: 'client_receipt', entity_id: r.rows[0].id, action: 'create', after: b, reason: b.reason });
  return r.rows[0];
}

export async function verifyClientReceipt(q: Queryable, u: AuthUser, id: string, reason?: string | null) {
  need(u, 'receipt.write');
  const before = (await q.query<any>('SELECT * FROM client_receipts WHERE id = $1', [id])).rows[0];
  if (!before) throw notFound('Receipt not found');
  await assertWritable(q, u, before.tour_code, reason);
  await q.query('UPDATE client_receipts SET verified = TRUE WHERE id = $1', [id]);
  await audit(q, u, { tour_code: before.tour_code, entity_type: 'client_receipt', entity_id: id, action: 'verify', reason });
}

export async function requestRevenueAdjustment(q: Queryable, u: AuthUser, b: { tour_code: string; type: string; amount: string; description: string; reason?: string | null }) {
  need(u, 'revenue.request');
  await assertWritable(q, u, b.tour_code, b.reason);
  const r = await q.query<{ id: string }>('INSERT INTO revenue_adjustments (tour_code, type, amount, description, requested_by) VALUES ($1,$2,$3,$4,$5) RETURNING id::text', [b.tour_code, b.type, b.amount, b.description, u.id]);
  await audit(q, u, { tour_code: b.tour_code, entity_type: 'revenue_adjustment', entity_id: r.rows[0].id, action: 'request', after: b, reason: b.reason });
  return r.rows[0];
}

export async function decideRevenueAdjustment(q: Queryable, u: AuthUser, id: string, decision: 'approved' | 'rejected', note?: string | null) {
  need(u, 'revenue.approve');
  const before = (await q.query<any>('SELECT * FROM revenue_adjustments WHERE id = $1', [id])).rows[0];
  if (!before) throw notFound('Adjustment not found');
  if (before.status !== 'pending') throw conflict('Already decided');
  if (before.requested_by === u.id && u.department !== 'executive') throw forbidden('You cannot approve your own adjustment request.');
  await assertWritable(q, u, before.tour_code, note);
  await q.query('UPDATE revenue_adjustments SET status = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1', [id, decision, u.id, note ?? null]);
  await audit(q, u, { tour_code: before.tour_code, entity_type: 'revenue_adjustment', entity_id: id, action: decision, before, reason: note });
}

// ---------------------------------------------------------------- closure

export async function closeTour(q: Queryable, u: AuthUser, tourCode: string, b: { notes: string; accept_outstanding?: boolean }) {
  need(u, 'tour.close');
  if (await isTourClosed(q, tourCode)) throw conflict('Tour is already financially closed.');
  const pnl = await computeTour(q, tourCode);
  if (!pnl) throw notFound('Tour not found');
  const failing = pnl.closureChecklist.filter((c) => !c.ok);
  if (failing.length && !b.accept_outstanding) throw conflict('Closure checklist is not complete. Resolve the items, or close with accept_outstanding=true and notes explaining why.', failing);
  if (failing.length && !b.notes?.trim()) throw badRequest('Notes are required when closing with outstanding checklist items.');
  await q.query(
    `INSERT INTO tour_financial_status (tour_code, status, checklist, closure_notes, closed_by, closed_at, updated_at)
     VALUES ($1,'financially_closed',$2,$3,$4,now(),now())
     ON CONFLICT (tour_code) DO UPDATE SET status = 'financially_closed', checklist = $2, closure_notes = $3, closed_by = $4, closed_at = now(), updated_at = now()`,
    [tourCode, JSON.stringify({ items: pnl.closureChecklist, snapshot: { revenue: pnl.revenue, costs: pnl.costs, profitability: pnl.profitability } }), b.notes, u.id],
  );
  await audit(q, u, { tour_code: tourCode, entity_type: 'tour', entity_id: tourCode, action: 'financial_close', after: { failing, notes: b.notes }, reason: b.notes });
}

export async function reopenTour(q: Queryable, u: AuthUser, tourCode: string, reason: string) {
  need(u, 'finance.post_closure');
  if (!reason?.trim()) throw badRequest('Reason required');
  if (!(await isTourClosed(q, tourCode))) throw conflict('Tour is not closed.');
  await q.query(`UPDATE tour_financial_status SET status = 'accounts_verification', updated_at = now() WHERE tour_code = $1`, [tourCode]);
  await audit(q, u, { tour_code: tourCode, entity_type: 'tour', entity_id: tourCode, action: 'financial_reopen', reason });
}

// ---------------------------------------------------------------- tours

/** Server-side Tour Code generation. Codes are LST-<year>-<5 digits>, never reused. */
export async function nextTourCode(q: Queryable, year: number): Promise<string> {
  const r = await q.query<{ last_value: number }>(
    `INSERT INTO tour_code_sequences (year, last_value) VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE SET last_value = tour_code_sequences.last_value + 1 RETURNING last_value`,
    [year],
  );
  return `LST-${year}-${String(r.rows[0].last_value).padStart(5, '0')}`;
}

function calcJson(c: CalcResult) {
  return JSON.stringify({ ...c, amount: fmt(c.amount) });
}
