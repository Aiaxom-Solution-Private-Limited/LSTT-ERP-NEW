import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTourPnl, type CostItemRow, type TourPnlInput } from '../src/finance/engine.ts';
import { hotelExpected, restaurantExpected, imprestPosition, transportExpected } from '../src/finance/rates.ts';
import { toPaise, fmt, mul, adjustPct, pct } from '../src/lib/money.ts';

const CATS = [
  { code: 'hotels', name: 'Hotels', sort_order: 1 },
  { code: 'restaurants', name: 'Restaurants and meals', sort_order: 2 },
  { code: 'transport', name: 'Transportation', sort_order: 3 },
  { code: 'guide_dsa', name: 'Guide DSA', sort_order: 4 },
  { code: 'guide_imprest', name: 'Guide imprest', sort_order: 5 },
  { code: 'activities', name: 'Activities and permits', sort_order: 6 },
  { code: 'other', name: 'Other', sort_order: 9 },
];

let seq = 0;
function item(p: Partial<CostItemRow>): CostItemRow {
  return {
    id: String(++seq), tour_code: 'T1', kind: 'general', category_code: 'other', expense_head_id: null, description: null,
    supplier_id: null, payee_name: null, cost_nature: 'supplier', service_date: '2026-01-01', service_end_date: null,
    expected_amount: null, expected_override_amount: null, expected_override_reason: null, actual_amount: null,
    verified_amount: null, status: 'approved', bill_reference: null, source: 'live', remarks: null, detail: null, ...p,
  };
}

function input(p: Partial<TourPnlInput> = {}): TourPnlInput {
  return {
    tour: { tour_code: 'T1', client_name: 'C', destination: 'Bhutan', start_date: '2026-01-01', end_date: '2026-01-05', status: 'completed', confirmed_selling_price: '500000', gst_amount: '25000', quoted_amount: '500000' },
    items: [], bills: [], billLines: [], billAdjustments: [], paymentAllocations: [], invoices: [], creditNotes: [],
    receipts: [], revenueAdjustments: [], recon: [], categories: CATS, financialStatusRow: null,
    settings: { revenueRecognitionBasis: 'confirmed_price', lowMarginThresholdPct: '10' }, today: '2026-02-01', ...p,
  };
}

test('money: exact decimal arithmetic, half-up rounding', () => {
  assert.equal(fmt(toPaise('0.1') + toPaise('0.2')), '0.30');
  assert.equal(fmt(mul(toPaise('333.33'), '3')), '999.99');
  assert.equal(fmt(mul(toPaise('10'), '0.335')), '3.35');
  assert.equal(fmt(mul(toPaise('0.05'), '0.5')), '0.03'); // 0.025 → 0.03
  assert.equal(fmt(adjustPct(toPaise('5000'), '-20')), '4000.00'); // "OFF SEASON RATE 20% MINUS"
  assert.equal(pct(toPaise('130000'), toPaise('500000')), '26.00');
  assert.equal(pct(toPaise('1'), 0n), null);
  assert.equal(fmt(toPaise('-12.5')), '-12.50');
});

test('spec example: ₹500,000 revenue, ₹370,000 cost → ₹130,000 profit, 26% margin', () => {
  const r = computeTourPnl(input({
    items: [
      item({ category_code: 'hotels', kind: 'hotel', actual_amount: '180000', verified_amount: '180000' }),
      item({ category_code: 'restaurants', kind: 'restaurant', actual_amount: '35000', verified_amount: '35000' }),
      item({ category_code: 'transport', kind: 'transport', actual_amount: '90000', verified_amount: '90000' }),
      item({ category_code: 'guide_dsa', kind: 'guide_dsa', actual_amount: '25000', verified_amount: '25000' }),
      item({ category_code: 'activities', kind: 'activity', actual_amount: '30000', verified_amount: '30000' }),
      item({ category_code: 'other', kind: 'general', actual_amount: '10000', verified_amount: '10000' }),
    ],
  }));
  assert.equal(r.revenue.recognisedRevenue, '500000.00');
  assert.equal(r.costs.actual, '370000.00');
  assert.equal(r.costs.verified, '370000.00');
  assert.equal(r.profitability.verified.profit, '130000.00');
  assert.equal(r.profitability.verified.marginPct, '26.00');
  assert.equal(r.grossProfit, '130000.00');
});

test('GST is not revenue; receivable includes GST; collections tracked separately from revenue', () => {
  const r = computeTourPnl(input({ receipts: [{ receipt_type: 'advance', amount: '200000', verified: true }, { receipt_type: 'part', amount: '50000', verified: false }] }));
  assert.equal(r.revenue.recognisedRevenue, '500000.00');
  assert.equal(r.revenue.receivable, '525000.00');
  assert.equal(r.revenue.collected, '200000.00');
  assert.equal(r.revenue.collectedUnverified, '50000.00');
  assert.equal(r.revenue.clientOutstanding, '325000.00');
});

test('estimated, committed, actual and verified costs are never mixed', () => {
  const r = computeTourPnl(input({
    items: [
      item({ status: 'estimated', expected_amount: '1000' }),
      item({ status: 'booked', expected_amount: '2000' }),
      item({ status: 'bill_received', expected_amount: '3000', actual_amount: '3300' }),
      item({ status: 'approved', expected_amount: '4000', actual_amount: '3900', verified_amount: '3900' }),
      item({ status: 'cancelled', expected_amount: '5000' }),
    ],
  }));
  assert.equal(r.costs.estimated, '10000.00');  // excludes cancelled
  assert.equal(r.costs.committed, '9000.00');   // excludes estimated-only and cancelled
  assert.equal(r.costs.actual, '7200.00');
  assert.equal(r.costs.verified, '3900.00');
  assert.equal(r.costs.forecast, '10200.00'); // 1000 + 2000 + 3300 + 3900
});

test('payments reduce payables and never add cost', () => {
  const it = item({ id: 'h1', category_code: 'hotels', kind: 'hotel', expected_amount: '50000', actual_amount: '50000', verified_amount: '50000' });
  const base = {
    items: [it],
    bills: [{ id: 'b1', supplier_id: 'S1', supplier_name: 'Hotel A', invoice_number: 'INV-1', invoice_date: '2026-01-06', due_date: null, total_amount: '50000', status: 'approved' }],
    billLines: [{ id: 'l1', bill_id: 'b1', cost_item_id: 'h1', tour_code: 'T1', amount: '50000' }],
  };
  const before = computeTourPnl(input(base));
  const after = computeTourPnl(input({ ...base, paymentAllocations: [{ payment_id: 'p1', bill_id: 'b1', tour_code: null, amount: '20000' }, { payment_id: 'p2', bill_id: 'b1', tour_code: null, amount: '10000' }] }));
  assert.equal(before.costs.actual, after.costs.actual);
  assert.equal(before.supplier.outstanding, '50000.00');
  assert.equal(after.supplier.outstanding, '20000.00');
  assert.equal(after.supplier.totalPayments, '30000.00');
  assert.equal(after.items[0].paymentState, 'partially_paid');
});

test('one vendor invoice covering two Tour Codes is split by its lines', () => {
  const r = computeTourPnl(input({
    items: [item({ id: 'x', expected_amount: '30000', actual_amount: '30000' })],
    bills: [{ id: 'b', supplier_id: 'S', supplier_name: 'Transporter', invoice_number: 'T-9', invoice_date: '2026-01-10', due_date: null, total_amount: '100000', status: 'approved' }],
    billLines: [
      { id: 'a', bill_id: 'b', cost_item_id: 'x', tour_code: 'T1', amount: '30000' },
      { id: 'c', bill_id: 'b', cost_item_id: 'y', tour_code: 'T2', amount: '70000' },
    ],
    paymentAllocations: [{ payment_id: 'p', bill_id: 'b', tour_code: null, amount: '50000' }],
  }));
  assert.equal(r.supplier.totalBills, '30000.00');
  assert.equal(r.supplier.paymentsOnBills, '15000.00'); // 30% of 50,000
  assert.equal(r.supplier.outstanding, '15000.00');
});

test('credit note reduces bill outstanding', () => {
  const r = computeTourPnl(input({
    bills: [{ id: 'b', supplier_id: 'S', supplier_name: 'H', invoice_number: 'I', invoice_date: '2026-01-10', due_date: null, total_amount: '10000', status: 'approved' }],
    billLines: [{ id: 'a', bill_id: 'b', cost_item_id: null, tour_code: 'T1', amount: '10000' }],
    billAdjustments: [{ bill_id: 'b', type: 'credit_note', amount: '1500' }],
  }));
  assert.equal(r.supplier.outstanding, '8500.00');
});

test('hotel: room-wise and night-wise expected amount with EB and child rates', () => {
  const r = hotelExpected({
    nights: 2, dbl_rooms: 3, sng_rooms: 1, extra_beds: 1, cwb: 1, cnb: 1, foc_rooms: 0,
    dbl_rate: '4000', sng_rate: '3500', eb_rate: '1200', cwb_rate: '1000', cnb_rate: '500',
    tea_coffee: '0', tea_coffee_basis: 'lump_sum', rate_adjustment_pct: 0, foc_rule: 'none',
  });
  // per night: 12000 + 3500 + 1200 + 1000 + 500 = 18200; × 2 nights
  assert.equal(fmt(r.amount), '36400.00');
});

test('hotel: FOC is only deducted when the rule says so; seasonal −20% applies to rooms', () => {
  const base = { nights: 1, dbl_rooms: 2, sng_rooms: 1, extra_beds: 0, cwb: 0, cnb: 0, foc_rooms: 1, dbl_rate: '5000', sng_rate: '4000', eb_rate: '0', cwb_rate: '0', cnb_rate: '0', tea_coffee: '100', tea_coffee_basis: 'per_pax_per_night' as const, rate_adjustment_pct: 0, foc_rule: 'none' as const };
  assert.equal(fmt(hotelExpected(base).amount), '14500.00'); // 14000 + 5 pax × 100
  assert.equal(fmt(hotelExpected({ ...base, foc_rule: 'deduct_single' }).amount), '10500.00');
  assert.equal(fmt(hotelExpected({ ...base, rate_adjustment_pct: -20 }).amount), '11700.00'); // 11200 + 500
});

test('restaurant: pax × rate with FOC recorded separately (not deducted by default)', () => {
  assert.equal(fmt(restaurantExpected({ pax: 12, foc_qty: 1, rate_per_pax: '500', foc_rule: 'none' }).amount), '6000.00');
  assert.equal(fmt(restaurantExpected({ pax: 12, foc_qty: 1, rate_per_pax: '500', foc_rule: 'deduct' }).amount), '5500.00');
});

test('restaurant variance and reconciliation state', () => {
  const r = computeTourPnl(input({ items: [item({ kind: 'restaurant', category_code: 'restaurants', status: 'approved', expected_amount: '6000', actual_amount: '6500', verified_amount: '6500' })] }));
  assert.equal(r.items[0].variance, '500.00');
  assert.equal(r.items[0].reconState, 'charged_extra');
  assert.ok(r.warnings.some((w) => w.code === 'actual_over_expected'));
});

test('missing hotel bill after service date is flagged', () => {
  const r = computeTourPnl(input({ items: [item({ kind: 'hotel', category_code: 'hotels', status: 'booked', expected_amount: '9000', service_date: '2026-01-02', service_end_date: '2026-01-03' })] }));
  assert.equal(r.items[0].reconState, 'bill_not_received');
  assert.ok(r.warnings.some((w) => w.code === 'missing_hotel_bill'));
  assert.equal(r.financialStatus, 'expenses_in_progress');
});

test('guide imprest: advance is not cost; unspent money must be returned', () => {
  const pos = imprestPosition({ imprest_advanced: '10000', imprest_supported_expense: '7200', imprest_returned: '0', additional_approved: '0' });
  assert.equal(fmt(pos.cost!), '7200.00');
  assert.equal(fmt(pos.balanceWithGuide!), '2800.00');
  const returned = imprestPosition({ imprest_advanced: '10000', imprest_supported_expense: '7200', imprest_returned: '2800', additional_approved: '0' });
  assert.equal(fmt(returned.balanceWithGuide!), '0.00');
  const over = imprestPosition({ imprest_advanced: '5000', imprest_supported_expense: '6000', imprest_returned: '0', additional_approved: '0' });
  assert.equal(fmt(over.balanceWithGuide!), '-1000.00'); // company owes guide

  const r = computeTourPnl(input({ items: [item({ kind: 'guide_imprest', category_code: 'guide_imprest', actual_amount: null, detail: { imprest_advanced: '10000', imprest_supported_expense: null, imprest_returned: '0', additional_approved: '0' } })] }));
  assert.equal(r.costs.actual, '0.00'); // no vouchers yet → no cost, even though 10,000 advanced
});

test('transport: rate bases and company vehicle extras', () => {
  assert.equal(fmt(transportExpected('per_day', '3800', 6)!.amount), '22800.00');
  assert.equal(fmt(transportExpected('per_km', '18.5', '240')!.amount), '4440.00');
  assert.equal(fmt(transportExpected('fixed', '15000', null)!.amount), '15000.00');
  const r = computeTourPnl(input({ items: [item({ kind: 'transport', category_code: 'transport', cost_nature: 'internal', detail: { actual_base_amount: '22800', driver_allowance: '1800', fuel: '0', toll: '450', parking: '200', other_charges: '0' } })] }));
  assert.equal(r.costs.actual, '25250.00');
});

test('revenue: discount after confirmation and additional service only count once approved', () => {
  const r = computeTourPnl(input({ revenueAdjustments: [
    { type: 'discount', amount: '10000', status: 'approved' },
    { type: 'additional_service', amount: '8000', status: 'approved' },
    { type: 'additional_service', amount: '99999', status: 'pending' },
  ] }));
  assert.equal(r.revenue.finalAgreedPrice, '498000.00');
  assert.equal(r.revenue.recognisedRevenue, '498000.00');
  assert.equal(r.revenue.pendingAdjustments, 1);
});

test('revenue basis tax_invoiced uses taxable invoice value less credit notes', () => {
  const r = computeTourPnl(input({
    settings: { revenueRecognitionBasis: 'tax_invoiced', lowMarginThresholdPct: '10' },
    invoices: [{ id: '1', invoice_type: 'tax_invoice', taxable_value: '480000', gst_amount: '24000', total_amount: '504000', status: 'issued', due_date: null }, { id: '2', invoice_type: 'proforma', taxable_value: '500000', gst_amount: '25000', total_amount: '525000', status: 'issued', due_date: null }],
    creditNotes: [{ taxable_value: '10000', gst_amount: '500' }],
  }));
  assert.equal(r.revenue.recognisedRevenue, '470000.00');
  assert.equal(r.revenue.receivable, '493500.00');
  assert.equal(r.revenue.proformaTotal, '525000.00');
});

test('cancelled tour with cancellation charges keeps the charge as cost and warns', () => {
  const r = computeTourPnl(input({ tour: { ...input().tour, status: 'cancelled' }, items: [item({ status: 'cancelled', expected_amount: '20000', actual_amount: '5000' })] }));
  assert.equal(r.costs.estimated, '0.00');
  assert.equal(r.costs.actual, '5000.00');
  assert.ok(r.warnings.some((w) => w.code === 'cancelled_with_costs'));
});

test('negative profit and duplicate expense warnings', () => {
  const r = computeTourPnl(input({
    tour: { ...input().tour, confirmed_selling_price: '1000' },
    items: [item({ supplier_id: 'S', actual_amount: '800' }), item({ supplier_id: 'S', actual_amount: '800' })],
  }));
  assert.ok(r.warnings.some((w) => w.code === 'negative_profit'));
  assert.ok(r.warnings.some((w) => w.code === 'possible_duplicate_expense'));
});

test('override: expected override replaces calculated expected but both are kept', () => {
  const r = computeTourPnl(input({ items: [item({ expected_amount: '10000', expected_override_amount: '9000', expected_override_reason: 'SPECIAL RATE', actual_amount: '9000' })] }));
  assert.equal(r.items[0].expected, '9000.00');
  assert.equal(r.items[0].expected_amount, '10000');
  assert.equal(r.items[0].reconState, 'no_difference');
});
