/**
 * End-to-end API tests against an in-memory PostgreSQL (PGlite) seeded with
 * the prototype's real records. Covers the workflows across Sales, Operations
 * and Accounts, permission enforcement, closure locking and imports.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPgliteDb, type Db } from '../src/db/client.ts';
import { migrate } from '../src/db/migrate.ts';
import { seedAll } from '../src/db/seed.ts';
import { createApp } from '../src/app.ts';

const PW = 'test-only-password';
let db: Db;
let base: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;
const tokens: Record<string, string> = {};

async function call(who: string, method: string, path: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(tokens[who] ? { authorization: `Bearer ${tokens[who]}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = text;
  try { json = JSON.parse(text); } catch { /* csv */ }
  return { status: res.status, body: json };
}
const ok = async (who: string, method: string, path: string, body?: unknown) => {
  const r = await call(who, method, path, body);
  assert.ok(r.status < 300, `${method} ${path} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};

before(async () => {
  db = await createPgliteDb('memory');
  await migrate(db);
  await seedAll(db, { userPassword: PW });
  const app = createApp(db, { uploadDir: mkdtempSync(join(tmpdir(), 'dmc-up-')) });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const logins = (await db.query<any>('SELECT login_id, department, is_manager FROM users')).rows;
  const pick = (dept: string, mgr?: boolean) => logins.find((u) => u.department === dept && (mgr === undefined || u.is_manager === mgr))?.login_id;
  const roles: Record<string, string | undefined> = { sales: pick('sales'), ops: pick('operations'), accounts: pick('accounts'), exec: pick('executive'), backend: pick('backend') };
  for (const [k, login] of Object.entries(roles)) {
    assert.ok(login, `seed user for ${k}`);
    tokens[k] = (await ok(k, 'POST', '/auth/login', { loginId: login, password: PW })).token;
  }
});
after(async () => { server?.close(); await db?.close(); });

test('migrations are idempotent and prototype tours are migrated with their Tour Codes', async () => {
  assert.deepEqual(await migrate(db), []);
  const tours = await ok('accounts', 'GET', '/finance/tours');
  assert.ok(tours.length >= 3);
  assert.ok(tours.some((t: any) => t.tour.tour_code === 'LST-2026-00001'));
});

test('authentication and backend authorisation', async () => {
  assert.equal((await call('nobody', 'GET', '/finance/tours')).status, 401);
  assert.equal((await call('x', 'POST', '/auth/login', { loginId: 'ritu.sharma', password: 'wrong' })).status, 401);
  // Sales cannot create cost lines or approve bills
  const r = await call('sales', 'POST', '/finance/cost-items', { tour_code: 'LST-2026-00001', kind: 'general', expense_head_code: 'OTHER', expected_amount: '100' });
  assert.equal(r.status, 403);
  // Sales sees the P&L but not supplier detail
  const p = await ok('sales', 'GET', '/finance/tours/LST-2026-00001');
  assert.deepEqual(p.items, []);
  assert.ok(p.revenue.recognisedRevenue);
});

test('server-generated Tour Code continues after migrated codes', async () => {
  const t = await ok('sales', 'POST', '/tours', { client_name: 'Test Group', destination: 'Bhutan', start_date: '2026-12-01', end_date: '2026-12-06', adults: 10, confirmed_selling_price: '500000', gst_amount: '25000' });
  assert.match(t.tour_code, /^LST-2026-\d{5}$/);
  const n = Number(t.tour_code.slice(-5));
  assert.ok(n > 3);
  const t2 = await ok('sales', 'POST', '/tours', { client_name: 'Second', destination: 'Bhutan', start_date: '2026-12-10', end_date: '2026-12-12', adults: 2, confirmed_selling_price: '1000', gst_amount: '50' });
  assert.equal(Number(t2.tour_code.slice(-5)), n + 1);
});

test('full Bhutan tour: hotels in 3 cities, restaurants, transport, guide, SDF → consolidated P&L, reconciliation, bills, payments, closure', async () => {
  const { tour_code: T } = await ok('sales', 'POST', '/tours', { client_name: 'Phuentsholing–Thimphu–Paro Group', destination: 'Bhutan', start_date: '2026-10-01', end_date: '2026-10-06', adults: 10, room_count: 5, confirmed_selling_price: '500000', gst_amount: '25000' });

  // Operations records hotel stays in three cities (multi-hotel, multi-date)
  const hotel = (name: string, city: string, ci: string, co: string, extra: object = {}) => ok('ops', 'POST', '/finance/cost-items', {
    tour_code: T, kind: 'hotel', supplier_id: null, payee_name: name, status: 'booked',
    detail: { hotel_name: name, city, check_in: ci, check_out: co, dbl_rooms: 4, sng_rooms: 1, extra_beds: 1, meal_plan: 'MAP', dbl_rate: '5000', sng_rate: '4000', eb_rate: '1500', ...extra },
  });
  const h1 = await hotel('Hotel A', 'Phuentsholing', '2026-10-01', '2026-10-02');          // 1 night: 20000+4000+1500 = 25500
  const h2 = await hotel('Hotel B', 'Thimphu', '2026-10-02', '2026-10-04');                // 2 nights: 51000
  const h3 = await hotel('Hotel C', 'Paro', '2026-10-04', '2026-10-06', { rate_adjustment_pct: '-20' }); // 2 nights × 25500 × 0.8 = 40800
  assert.equal(h1.expected_amount, '25500.00');
  assert.equal(h2.expected_amount, '51000.00');
  assert.equal(h3.expected_amount, '40800.00');
  assert.equal(h3.detail.nights, 2);

  // Restaurant visits on different dates, FOC recorded but not deducted
  const r1 = await ok('ops', 'POST', '/finance/cost-items', { tour_code: T, kind: 'restaurant', service_date: '2026-10-02', status: 'booked', detail: { restaurant_name: 'EDELWEISS', pax: 11, foc_qty: 1, rate_per_pax: '500' } });
  const r2 = await ok('ops', 'POST', '/finance/cost-items', { tour_code: T, kind: 'restaurant', service_date: '2026-10-03', status: 'booked', detail: { restaurant_name: 'EDELWEISS', pax: 11, foc_qty: 1, rate_per_pax: '500' } });
  assert.equal(r1.expected_amount, '5500.00');

  // Company vehicle (internal) vs hired vehicle (supplier)
  const own = await ok('ops', 'POST', '/finance/cost-items', { tour_code: T, kind: 'transport', status: 'booked', quantity: '6', unit_rate: '3800', detail: { is_company_owned: true, rate_basis: 'per_day', vehicle_id: 'FLT-01' } });
  assert.equal(own.cost_nature, 'internal');
  assert.equal(own.expected_amount, '22800.00');
  const hireBad = await call('ops', 'POST', '/finance/cost-items', { tour_code: T, kind: 'transport', cost_nature: 'supplier', unit_rate: '1', detail: { is_company_owned: true, rate_basis: 'fixed' } });
  assert.equal(hireBad.status, 400);
  const hire = await ok('ops', 'POST', '/finance/cost-items', { tour_code: T, kind: 'transport', status: 'booked', expense_head_code: 'BHTN-VEHICLE', unit_rate: '30000', detail: { rate_basis: 'fixed', route: 'Phuentsholing–Thimphu–Paro' } });

  // Guide DSA + imprest
  const dsa = await ok('ops', 'POST', '/finance/cost-items', { tour_code: T, kind: 'guide_dsa', status: 'booked', detail: { guide_name: 'Karma', days: 6, dsa_rate: '1500' } });
  assert.equal(dsa.expected_amount, '9000.00');
  const imp = await ok('ops', 'POST', '/finance/cost-items', { tour_code: T, kind: 'guide_imprest', status: 'booked', expected_amount: '10000', detail: { guide_name: 'Karma', imprest_advanced: '10000' } });
  assert.equal(imp.actual_amount, null); // advance is not cost

  // SDF line (quantity × rate)
  const sdf = await ok('ops', 'POST', '/finance/cost-items', { tour_code: T, kind: 'activity', expense_head_code: 'SDF', status: 'booked', quantity: '10', unit_rate: '1200', service_date: '2026-10-01' });
  assert.equal(sdf.expected_amount, '12000.00');
  assert.equal(sdf.category_code, 'entry_fees_sdf');

  // Unallocated expense requires explicit flag
  assert.equal((await call('ops', 'POST', '/finance/cost-items', { kind: 'general', expense_head_code: 'OTHER', expected_amount: '50' })).status, 400);

  let p = await ok('accounts', 'GET', `/finance/tours/${T}`);
  assert.equal(p.costs.estimated, '212100.00'); // 25500+51000+40800+5500+5500+22800+30000+9000+10000+12000
  assert.equal(p.costs.actual, '0.00');
  assert.equal(p.revenue.recognisedRevenue, '500000.00');

  // Hotel C bill arrives higher (charged extra bed) → bill auto-fills actual, variance shows, dispute opened
  const billC = await ok('ops', 'POST', '/finance/vendor-bills', { supplier_name: 'Hotel C', invoice_number: 'HC-77', invoice_date: '2026-10-06', total_amount: '42000', lines: [{ cost_item_id: h3.id, amount: '42000' }] });
  // duplicate bill rejected
  assert.equal((await call('ops', 'POST', '/finance/vendor-bills', { supplier_name: 'hotel c', invoice_number: 'hc-77', invoice_date: '2026-10-06', total_amount: '42000', lines: [{ cost_item_id: h3.id, amount: '42000' }] })).status, 409);
  p = await ok('accounts', 'GET', `/finance/tours/${T}`);
  const h3row = p.items.find((i: any) => i.id === h3.id);
  assert.equal(h3row.actual, '42000.00');
  assert.equal(h3row.variance, '1200.00');
  assert.ok(p.warnings.some((w: any) => w.code === 'bill_over_agreed' && w.costItemId === h3.id));

  await ok('ops', 'POST', `/finance/cost-items/${h3.id}/reconciliation`, { reason: 'HOTEL CHARGED EXTRA BED', remarks: 'EB charged for 2 nights at 600 extra' });
  // ops cannot resolve
  const caseRow = (await ok('accounts', 'GET', '/finance/reconciliation?status=open')).find((c: any) => c.cost_item_id === h3.id);
  assert.equal(caseRow.variance, '1200.00');
  assert.equal((await call('ops', 'PATCH', `/finance/reconciliation/${caseRow.id}`, { status: 'approved', approved_adjustment: '41400' })).status, 403);
  // approving the line is blocked while disputed
  assert.equal((await call('accounts', 'POST', `/finance/cost-items/${h3.id}/status`, { status: 'approved' })).status, 400);
  await ok('accounts', 'PATCH', `/finance/reconciliation/${caseRow.id}`, { status: 'approved', approved_adjustment: '41400', remarks: 'Agreed with hotel: one night EB only' });
  const approved = await ok('accounts', 'POST', `/finance/cost-items/${h3.id}/status`, { status: 'approved' });
  assert.equal(approved.verified_amount, '41400.00');
  assert.equal(approved.expected_amount, '40800.00'); // agreed rate untouched
  assert.equal(approved.actual_amount, '42000.00');   // hotel's charge untouched
  // Accounts gets a credit note for the difference
  await ok('accounts', 'POST', `/finance/vendor-bills/${billC.id}/adjustments`, { type: 'credit_note', amount: '600', note_date: '2026-10-10', reason: 'EB overcharge' });

  // Actuals for the rest
  const setActual = async (id: string, a: object) => ok('accounts', 'PATCH', `/finance/cost-items/${id}`, a);
  await setActual(h1.id, { actual_amount: '25500' });
  await setActual(h2.id, { actual_amount: '51000' });
  await setActual(r1.id, { actual_amount: '5500' });
  await setActual(r2.id, { actual_amount: '6000', remarks: 'extra pax' });
  await ok('accounts', 'PATCH', `/finance/cost-items/${own.id}`, { detail: { actual_base_amount: '22800', toll: '450', parking: '200', driver_allowance: '1800' } });
  await setActual(hire.id, { actual_amount: '30000' });
  await setActual(dsa.id, { actual_amount: '9000' });
  await ok('accounts', 'PATCH', `/finance/cost-items/${imp.id}`, { detail: { imprest_supported_expense: '7200', imprest_returned: '2800' } });
  await setActual(sdf.id, { actual_amount: '12000' });

  p = await ok('accounts', 'GET', `/finance/tours/${T}`);
  // 25500+51000+42000+5500+6000+25250+30000+9000+7200+12000
  assert.equal(p.costs.actual, '213450.00');
  assert.equal(p.profitability.actual.profit, '286550.00');
  assert.equal(p.profitability.actual.marginPct, '57.31');
  const imprestRow = p.items.find((i: any) => i.id === imp.id);
  assert.equal(imprestRow.actual, '7200.00');

  // Approve every line
  for (const it of p.items.filter((i: any) => i.status !== 'approved')) {
    if (it.status === 'booked') await ok('accounts', 'POST', `/finance/cost-items/${it.id}/status`, { status: 'bill_received' });
    await ok('accounts', 'POST', `/finance/cost-items/${it.id}/status`, { status: 'approved' });
  }
  p = await ok('accounts', 'GET', `/finance/tours/${T}`);
  assert.equal(p.costs.verified, '212850.00'); // actual − 600 agreed reduction on Hotel C
  assert.equal(p.financialStatus, 'financially_verified');

  // Payments: Hotel C bill, approve then pay in two instalments; payment never changes cost
  assert.equal((await call('accounts', 'POST', '/finance/supplier-payments', { supplier_name: 'Hotel C', paid_date: '2026-10-11', amount: '1000', allocations: [{ bill_id: billC.id, amount: '1000' }] })).status, 400); // not approved
  await ok('accounts', 'POST', `/finance/vendor-bills/${billC.id}/status`, { status: 'approved' });
  await ok('accounts', 'POST', '/finance/supplier-payments', { supplier_name: 'Hotel C', paid_date: '2026-10-11', amount: '20000', allocations: [{ bill_id: billC.id, amount: '20000' }] });
  assert.equal((await call('accounts', 'POST', '/finance/supplier-payments', { supplier_name: 'Hotel C', paid_date: '2026-10-12', amount: '30000', allocations: [{ bill_id: billC.id, amount: '30000' }] })).status, 400); // overpay
  await ok('accounts', 'POST', '/finance/supplier-payments', { supplier_name: 'Hotel C', paid_date: '2026-10-12', amount: '21400', allocations: [{ bill_id: billC.id, amount: '21400' }] });
  const p2 = await ok('accounts', 'GET', `/finance/tours/${T}`);
  assert.equal(p2.costs.verified, p.costs.verified);
  assert.equal(p2.supplier.totalPayments, '41400.00');
  assert.equal(p2.supplier.outstanding, '0.00');

  // Client: discount after confirmation needs approval by someone else
  const adj = await ok('sales', 'POST', '/finance/revenue-adjustments', { tour_code: T, type: 'discount', amount: '10000', description: 'Goodwill discount' });
  assert.equal((await call('sales', 'POST', `/finance/revenue-adjustments/${adj.id}/decision`, { decision: 'approved' })).status, 403);
  await ok('exec', 'POST', `/finance/revenue-adjustments/${adj.id}/decision`, { decision: 'approved' });
  await ok('accounts', 'POST', '/finance/client-invoices', { tour_code: T, invoice_type: 'tax_invoice', invoice_number: `INV-${T}`, invoice_date: '2026-10-06', taxable_value: '490000', gst_amount: '24500' });
  await ok('accounts', 'POST', '/finance/client-receipts', { tour_code: T, receipt_type: 'advance', amount: '200000', received_date: '2026-09-01', verified: true });
  await ok('accounts', 'POST', '/finance/client-receipts', { tour_code: T, receipt_type: 'part', amount: '150000', received_date: '2026-09-20', verified: true });
  let p3 = await ok('accounts', 'GET', `/finance/tours/${T}`);
  assert.equal(p3.revenue.recognisedRevenue, '490000.00');
  assert.equal(p3.revenue.receivable, '514500.00');
  assert.equal(p3.revenue.clientOutstanding, '164500.00');

  // Closure is blocked while the client still owes money; then allowed after final receipt
  const closeTry = await call('accounts', 'POST', `/finance/tours/${T}/close`, { notes: '' });
  assert.equal(closeTry.status, 409);
  await ok('accounts', 'POST', '/finance/client-receipts', { tour_code: T, receipt_type: 'final', amount: '164500', received_date: '2026-10-08', verified: true });
  // hired vehicle, hotels etc. have no bills → supplier outstanding 0 but other checks still apply; accept with notes
  await ok('accounts', 'POST', `/finance/tours/${T}/close`, { notes: 'Bills for remaining vendors settled in cash; verified by Accounts.', accept_outstanding: true });
  p3 = await ok('accounts', 'GET', `/finance/tours/${T}`);
  assert.equal(p3.financialStatus, 'financially_closed');

  // After closure: edits blocked without permission + reason
  assert.equal((await call('ops', 'PATCH', `/finance/cost-items/${sdf.id}`, { remarks: 'late edit' })).status, 403);
  assert.equal((await call('exec', 'PATCH', `/finance/cost-items/${r2.id}`, { remarks: 'late edit' })).status, 400);
  await ok('exec', 'PATCH', `/finance/cost-items/${r2.id}`, { remarks: 'late edit', reason: 'Restaurant sent revised bill' });
  const audit = await ok('accounts', 'GET', `/finance/tours/${T}/audit`);
  assert.ok(audit.some((a: any) => a.action === 'financial_close'));
  assert.ok(audit.some((a: any) => a.reason === 'Restaurant sent revised bill'));
});

test('one vendor invoice across two Tour Codes, advance before bill', async () => {
  const a = (await ok('sales', 'POST', '/tours', { client_name: 'A', destination: 'Sikkim & Darjeeling', start_date: '2026-11-01', end_date: '2026-11-03', adults: 2, confirmed_selling_price: '60000', gst_amount: '3000' })).tour_code;
  const b = (await ok('sales', 'POST', '/tours', { client_name: 'B', destination: 'Sikkim & Darjeeling', start_date: '2026-11-02', end_date: '2026-11-04', adults: 2, confirmed_selling_price: '70000', gst_amount: '3500' })).tour_code;
  const ia = await ok('ops', 'POST', '/finance/cost-items', { tour_code: a, kind: 'transport', status: 'booked', unit_rate: '12000', detail: { rate_basis: 'fixed' } });
  const ib = await ok('ops', 'POST', '/finance/cost-items', { tour_code: b, kind: 'transport', status: 'booked', unit_rate: '18000', detail: { rate_basis: 'fixed' } });
  await ok('accounts', 'POST', '/finance/supplier-payments', { supplier_name: 'Teesta Travels', paid_date: '2026-10-25', amount: '5000', allocations: [{ tour_code: a, amount: '5000' }] });
  // lines must add up
  assert.equal((await call('ops', 'POST', '/finance/vendor-bills', { supplier_name: 'Teesta Travels', invoice_number: 'TT-1', invoice_date: '2026-11-05', total_amount: '30000', lines: [{ cost_item_id: ia.id, amount: '12000' }] })).status, 400);
  const bill = await ok('ops', 'POST', '/finance/vendor-bills', { supplier_name: 'Teesta Travels', invoice_number: 'TT-1', invoice_date: '2026-11-05', total_amount: '30000', lines: [{ cost_item_id: ia.id, amount: '12000' }, { cost_item_id: ib.id, amount: '18000' }] });
  await ok('accounts', 'POST', `/finance/vendor-bills/${bill.id}/status`, { status: 'approved' });
  await ok('accounts', 'POST', '/finance/supplier-payments', { supplier_name: 'Teesta Travels', paid_date: '2026-11-06', amount: '10000', allocations: [{ bill_id: bill.id, amount: '10000' }] });
  const pa = await ok('accounts', 'GET', `/finance/tours/${a}`);
  const pb = await ok('accounts', 'GET', `/finance/tours/${b}`);
  assert.equal(pa.costs.actual, '12000.00');
  assert.equal(pb.costs.actual, '18000.00');
  assert.equal(pa.supplier.totalBills, '12000.00');
  assert.equal(pa.supplier.paymentsOnBills, '4000.00');      // 40% of 10,000
  assert.equal(pa.supplier.advancesWithoutBill, '5000.00');
  assert.equal(pa.supplier.outstanding, '3000.00');          // 12000 − 4000 − 5000
  assert.equal(pb.supplier.outstanding, '12000.00');         // 18000 − 6000
});

test('expected amount override needs permission and reason; rates are not silently replaced', async () => {
  const it = await ok('ops', 'POST', '/finance/cost-items', { tour_code: 'LST-2026-00002', kind: 'hotel', status: 'booked', detail: { hotel_name: 'Override Test', check_in: '2026-11-01', check_out: '2026-11-02', dbl_rooms: 1, dbl_rate: '3000' } });
  assert.equal((await call('ops', 'PATCH', `/finance/cost-items/${it.id}`, { expected_amount: '1' })).status, 400);
  assert.equal((await call('accounts', 'POST', `/finance/cost-items/${it.id}/override`, { amount: '1000' })).status, 400);
  assert.equal((await call('sales', 'POST', `/finance/cost-items/${it.id}/override`, { amount: '2700', reason: 'SPECIAL RATE' })).status, 403);
  const o = await ok('accounts', 'POST', `/finance/cost-items/${it.id}/override`, { amount: '2700', reason: 'SPECIAL RATE' });
  assert.equal(o.expected_amount, '3000.00');
  assert.equal(o.expected_override_amount, '2700.00');
  const p = await ok('accounts', 'GET', '/finance/tours/LST-2026-00002');
  assert.equal(p.items.find((i: any) => i.id === it.id).expected, '2700.00');
});

test('reports and CSV export', async () => {
  const rows = await ok('accounts', 'GET', '/finance/reports/tour-pnl');
  assert.ok(rows.length > 0 && 'gross_profit' in rows[0]);
  const csv = await call('accounts', 'GET', '/finance/reports/hotel-reconciliation?format=csv');
  assert.equal(csv.status, 200);
  assert.match(String(csv.body), /hotel,tour_code,check_in/);
  assert.equal((await call('sales', 'GET', '/finance/reports/vendor-payables')).status, 403);
  const overview = await ok('exec', 'GET', '/finance/overview?from=2026-01-01&to=2026-12-31');
  assert.ok(overview.tourCount > 0);
  assert.ok(overview.charts.monthly.length > 0);
});

test('spreadsheet import: preview, exceptions, manual mapping, commit, no re-import duplicates', async () => {
  const csv = [
    'Tour Code,Restaurant,Date,No of Pax,FOC,Rate,Amount LSTT,Restaurant Amount,Dispute Amount,Remarks',
    'LST-2026-00001,EDELWEISS,05/11/2026,12,1,500,6000,6000,,',
    'LST-2026-00001,EDELWEISS,06/11/2026,12,1,500,6000,6500,500,extra pax',
    'LST-2026-00001,EDELWEISS,06/11/2026,12,1,500,6000,6500,500,extra pax',
    'OLD-77,EDELWEISS-RESTAURANT,07/11/2026,8,,500,4000,,,BILL NOT SENT',
    ',EDELWEISS,31/02/2026,8,,500,abc,,,',
    ',,,,,,,,,',
  ].join('\n');
  const column_map = { tour_code: 'Tour Code', restaurant_name: 'Restaurant', date: 'Date', pax: 'No of Pax', foc: 'FOC', rate: 'Rate', amount_lstt: 'Amount LSTT', amount_restaurant: 'Restaurant Amount', dispute_amount: 'Dispute Amount', remarks: 'Remarks' };
  const prev = await ok('accounts', 'POST', '/finance/imports/preview', { import_type: 'restaurant', file_name: 'restaurant.csv', csv, column_map });
  assert.deepEqual(prev.summary, { valid: 2, invalid: 1, duplicate: 1, unmatched: 1, blank_skipped: 1 });
  const detail = await ok('accounts', 'GET', `/finance/imports/${prev.batchId}`);
  const invalid = detail.rows.find((r: any) => r.status === 'invalid');
  assert.ok(invalid.errors.some((e: string) => e.includes('invalid or missing date')));
  assert.ok(invalid.errors.some((e: string) => e.includes('not an amount')));
  const unmatched = detail.rows.find((r: any) => r.status === 'unmatched');
  assert.equal((await call('accounts', 'POST', `/finance/imports/${prev.batchId}/rows/${unmatched.id}/map`, { tour_code: 'LST-2099-99999' })).status, 400); // never invents tours
  await ok('accounts', 'POST', `/finance/imports/${prev.batchId}/rows/${unmatched.id}/map`, { tour_code: 'LST-2026-00002' });
  const res = await ok('accounts', 'POST', `/finance/imports/${prev.batchId}/commit`);
  assert.equal(res.cost_items_created, 3);
  const items = await ok('accounts', 'GET', '/finance/cost-items?tourCode=LST-2026-00001&kind=restaurant');
  const imported = items.filter((i: any) => i.source === 'import');
  assert.equal(imported.length, 2);
  assert.ok(imported.every((i: any) => i.expected_calc.system_check.matches_sheet === true));
  const unbilled = (await ok('accounts', 'GET', '/finance/cost-items?tourCode=LST-2026-00002&kind=restaurant')).find((i: any) => i.source === 'import');
  assert.equal(unbilled.actual_amount, null); // blank restaurant amount stays blank, not zero
  // Re-importing the same file flags rows as duplicates
  const again = await ok('accounts', 'POST', '/finance/imports/preview', { import_type: 'restaurant', file_name: 'restaurant.csv', csv, column_map });
  assert.equal(again.summary.valid, 0);
  assert.ok(again.summary.duplicate >= 3);
});

test('consolidated sheet import maps each head column, blank cells are not zero', async () => {
  const csv = ['TOUR CODE,SKKY,GUIDE DSA,SDF,RAFTING', 'LST-2026-00003,1200,,4500,', 'LST-2026-00003,,3000,,0'].join('\n');
  const prev = await ok('accounts', 'POST', '/finance/imports/preview', {
    import_type: 'consolidated', file_name: 'consolidated.csv', csv, column_map: { tour_code: 'TOUR CODE' },
    head_map: { SKKY: 'SKKY', 'GUIDE DSA': 'GUIDE DSA', SDF: 'SDF', RAFTING: 'RAFTING' },
  });
  assert.equal(prev.summary.valid, 2);
  const out = await ok('accounts', 'POST', `/finance/imports/${prev.batchId}/commit`);
  assert.equal(out.cost_items_created, 4); // SKKY, SDF, GUIDE DSA, RAFTING(0 explicitly entered)
  const items = (await ok('accounts', 'GET', '/finance/cost-items?tourCode=LST-2026-00003')).filter((i: any) => i.source === 'import');
  assert.ok(items.some((i: any) => i.head_original_label === 'SKKY' && i.actual_amount === '1200.00'));
});

test('expense head master: create, rename, deactivate; original label preserved', async () => {
  assert.equal((await call('ops', 'POST', '/finance/expense-heads', { code: 'X', display_name: 'X', category_code: 'other_commercial', cost_nature: 'supplier' })).status, 403);
  const heads = await ok('backend', 'GET', '/finance/expense-heads');
  const skky = heads.find((h: any) => h.code === 'SKKY');
  const upd = await ok('backend', 'PATCH', `/finance/expense-heads/${skky.id}`, { display_name: 'SKKY (renamed)', active: false });
  assert.equal(upd.original_label, 'SKKY');
  assert.equal(upd.active, false);
  assert.equal((await call('ops', 'POST', '/finance/cost-items', { tour_code: 'LST-2026-00001', kind: 'general', expense_head_code: 'SKKY', expected_amount: '1' })).status, 400);
});
