/**
 * Seeds master data and migrates the prototype's records (src/data/initialData.ts)
 * into PostgreSQL. Idempotent: every insert is ON CONFLICT DO NOTHING / keyed by legacy_ref.
 */
import type { Db, Queryable } from './client.ts';
import { hashPassword } from '../auth/passwords.ts';
import {
  INITIAL_EMPLOYEES, INITIAL_AGENTS, INITIAL_SUPPLIERS, INITIAL_FLEET, INITIAL_CONFIRMED_TOURS, INITIAL_QUOTATIONS,
  INITIAL_SUPPLIER_BOOKINGS, INITIAL_SUPPLIER_PAYMENTS, INITIAL_RECEIPTS, INITIAL_EXPENSES, INITIAL_PROFORMA_INVOICES,
} from '../../../src/data/initialData.ts';

export const CATEGORIES: [code: string, name: string, order: number][] = [
  ['hotels', 'Hotels', 10],
  ['restaurants', 'Restaurants and meals', 20],
  ['transport', 'Transportation', 30],
  ['guide_dsa', 'Guide DSA', 40],
  ['guide_imprest', 'Guide imprest', 50],
  ['entry_fees_sdf', 'Entry fees and SDF', 60],
  ['rafting', 'Rafting', 70],
  ['cultural', 'Cultural activities', 80],
  ['other_commercial', 'Other commercial expenses', 90],
  ['miscellaneous', 'Miscellaneous expenses', 100],
];

/**
 * Expense heads. The consolidated sheet's labels are preserved verbatim in
 * original_label. Heads marked needsConfirmation are best guesses that the
 * client must confirm (see docs/TOUR_FINANCE.md).
 */
export const HEADS: { code: string; name: string; label?: string; cat: string; nature: 'supplier' | 'internal'; confirm?: boolean }[] = [
  { code: 'HOTEL', name: 'Hotel accommodation', cat: 'hotels', nature: 'supplier' },
  { code: 'RESTAURANT', name: 'Restaurant / meals', cat: 'restaurants', nature: 'supplier' },
  { code: 'VEHICLE_OWN', name: 'Company vehicle (internal cost)', cat: 'transport', nature: 'internal' },
  { code: 'VEHICLE_HIRE', name: 'Hired vehicle', cat: 'transport', nature: 'supplier' },
  // --- consolidated sheet headings, verbatim ---
  { code: 'SKKY', name: 'SKKY', label: 'SKKY', cat: 'other_commercial', nature: 'supplier', confirm: true },
  { code: 'L-EDELWS', name: 'L-EDELWS', label: 'L-EDELWS', cat: 'restaurants', nature: 'supplier', confirm: true },
  { code: 'L-LEMON T', name: 'L-LEMON T', label: 'L-LEMON T', cat: 'restaurants', nature: 'supplier', confirm: true },
  { code: 'LOBESA', name: 'LOBESA', label: 'LOBESA', cat: 'other_commercial', nature: 'supplier', confirm: true },
  { code: 'DHT', name: 'DHT', label: 'DHT', cat: 'other_commercial', nature: 'supplier', confirm: true },
  { code: 'SANGA', name: 'SANGA', label: 'SANGA', cat: 'other_commercial', nature: 'supplier', confirm: true },
  { code: 'LM', name: 'LM', label: 'LM', cat: 'other_commercial', nature: 'supplier', confirm: true },
  { code: 'L-TNG', name: 'L-TNG', label: 'L-TNG', cat: 'restaurants', nature: 'supplier', confirm: true },
  { code: 'SAM', name: 'SAM', label: 'SAM', cat: 'other_commercial', nature: 'supplier', confirm: true },
  { code: 'GUIDE DSA', name: 'Guide DSA', label: 'GUIDE DSA', cat: 'guide_dsa', nature: 'internal' },
  { code: 'IND.VEHICLE', name: 'Indian vehicle', label: 'IND.VEHICLE', cat: 'transport', nature: 'supplier', confirm: true },
  { code: 'BHTN-VEHICLE', name: 'Bhutan vehicle', label: 'BHTN-VEHICLE', cat: 'transport', nature: 'supplier', confirm: true },
  { code: 'SOURAV', name: 'SOURAV', label: 'SOURAV', cat: 'other_commercial', nature: 'supplier', confirm: true },
  { code: 'GUIDE IMPREST', name: 'Guide imprest', label: 'GUIDE IMPREST', cat: 'guide_imprest', nature: 'internal' },
  { code: 'EXPENSES', name: 'Expenses', label: 'EXPENSES', cat: 'miscellaneous', nature: 'internal', confirm: true },
  { code: 'SDF', name: 'SDF (Sustainable Development Fee)', label: 'SDF', cat: 'entry_fees_sdf', nature: 'supplier' },
  { code: 'RAFTING', name: 'Rafting', label: 'RAFTING', cat: 'rafting', nature: 'supplier' },
  { code: 'CULTURAL', name: 'Cultural programme', label: 'CULTURAL', cat: 'cultural', nature: 'supplier' },
  // --- prototype on-ground expense categories ---
  { code: 'DRIVER_FUEL', name: 'Driver fuel', label: 'Driver Fuel', cat: 'transport', nature: 'internal' },
  { code: 'TOLL_PARKING', name: 'Toll & parking', label: 'Toll & Parking', cat: 'transport', nature: 'internal' },
  { code: 'ENTRY_PERMITS', name: 'Entry permits', label: 'Entry Permits', cat: 'entry_fees_sdf', nature: 'supplier' },
  { code: 'LOCAL_PURCHASES', name: 'Local purchases', label: 'Local Purchases', cat: 'miscellaneous', nature: 'internal' },
  { code: 'EMERGENCY_REPAIR', name: 'Emergency repair', label: 'Emergency Repair', cat: 'transport', nature: 'internal' },
  { code: 'GUIDE_TIP', name: 'Guide tip', label: 'Guide Tip', cat: 'miscellaneous', nature: 'internal' },
  { code: 'OTHER', name: 'Other', label: 'Other', cat: 'miscellaneous', nature: 'internal' },
  { code: 'ACTIVITY', name: 'Activity / sightseeing', cat: 'other_commercial', nature: 'supplier' },
];

export const SETTINGS: [key: string, value: unknown, description: string][] = [
  ['revenue_recognition_basis', 'confirmed_price', "Recognised revenue = 'confirmed_price' (confirmed selling price excl. GST + approved adjustments) or 'tax_invoiced' (taxable value of tax invoices less credit notes). PROVISIONAL — finance team to approve."],
  ['low_margin_threshold_pct', '10', 'Tours whose forecast margin is below this % are flagged. PROVISIONAL.'],
  ['default_hotel_foc_rule', 'none', "FOC treatment for new hotel lines: 'none' | 'deduct_single' | 'deduct_double'. PROVISIONAL — verify against hotel contracts."],
  ['default_restaurant_foc_rule', 'none', "FOC treatment for new restaurant lines: 'none' | 'deduct'. Sample shows FOC recorded separately from pax × rate."],
  ['overhead_allocation_method', 'none', 'Company overhead is not allocated to tours. Net profit = gross profit until a method is approved.'],
];

const BOOKING_KIND: Record<string, [kind: string, cat: string, head: string]> = {
  Hotel: ['hotel', 'hotels', 'HOTEL'],
  Transport: ['transport', 'transport', 'VEHICLE_HIRE'],
  Activity: ['activity', 'other_commercial', 'ACTIVITY'],
  Guide: ['guide_dsa', 'guide_dsa', 'GUIDE DSA'],
  Permit: ['activity', 'entry_fees_sdf', 'ENTRY_PERMITS'],
};
const BOOKING_STATUS: Record<string, string> = {
  enquiry: 'estimated', availability_confirmed: 'estimated', booked_confirmed: 'booked',
  partially_paid: 'booked', fully_paid: 'booked', cancelled: 'cancelled',
};
const EXPENSE_HEAD: Record<string, string> = {
  'Driver Fuel': 'DRIVER_FUEL', 'Toll & Parking': 'TOLL_PARKING', 'Entry Permits': 'ENTRY_PERMITS', 'Local Purchases': 'LOCAL_PURCHASES',
  'Emergency Repair': 'EMERGENCY_REPAIR', 'Guide Tip': 'GUIDE_TIP', Other: 'OTHER',
};

export async function seedMasters(q: Queryable) {
  for (const [code, name, order] of CATEGORIES) {
    await q.query('INSERT INTO expense_categories (code, name, sort_order) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING', [code, name, order]);
  }
  for (const h of HEADS) {
    await q.query(
      `INSERT INTO expense_heads (code, display_name, original_label, category_code, cost_nature, needs_confirmation)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (code) DO NOTHING`,
      [h.code, h.name, h.label ?? null, h.cat, h.nature, !!h.confirm],
    );
  }
  for (const [key, value, description] of SETTINGS) {
    await q.query('INSERT INTO finance_settings (key, value, description) VALUES ($1,$2,$3) ON CONFLICT (key) DO NOTHING', [key, JSON.stringify(value), description]);
  }
}

export async function seedPrototypeData(q: Queryable, opts: { userPassword?: string } = {}) {
  const pw = opts.userPassword ? await hashPassword(opts.userPassword) : null;
  for (const e of INITIAL_EMPLOYEES) {
    await q.query(
      `INSERT INTO users (id, login_id, name, email, phone, department, role_title, is_manager, active, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [e.id, e.loginId, e.name, e.email, e.phone, e.department, e.roleTitle, e.isManager, e.active, pw],
    );
  }
  for (const a of INITIAL_AGENTS) {
    await q.query(
      `INSERT INTO agents (id, company_name, contact_person, city, gst_number, credit_allowed, credit_limit, credit_days, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [a.id, a.companyName, a.contactPerson, a.city, a.gstNumber ?? null, a.creditAllowed, a.creditLimit, a.creditDays, a.status],
    );
  }
  for (const s of INITIAL_SUPPLIERS) {
    await q.query(
      `INSERT INTO suppliers (id, name, category, destination, contact_person, phone, email, credit_days, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.category, s.destination, s.contactPerson, s.phone, s.email, s.creditDaysAllowed, s.status],
    );
  }
  for (const f of INITIAL_FLEET) {
    await q.query(
      `INSERT INTO fleet_vehicles (id, registration_number, model, category, seating_capacity, internal_daily_rate)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [f.id, f.registrationNumber, f.model, f.category, f.seatingCapacity, f.internalDailyRate],
    );
  }

  const userByName = new Map(INITIAL_EMPLOYEES.map((e) => [e.name, e.id]));
  let maxSeq = 0;
  for (const t of INITIAL_CONFIRMED_TOURS) {
    const quote = INITIAL_QUOTATIONS.find((qq) => qq.revisions.some((r) => r.versionCode === t.quotationCode));
    const rev = quote?.revisions.find((r) => r.versionCode === t.quotationCode);
    await q.query(
      `INSERT INTO tours (tour_code, enquiry_id, booking_id, quotation_code, quotation_version, client_name, agent_id, destination,
         package_name, start_date, end_date, nights, days, adults, children, infants, salesperson_name, salesperson_id,
         operations_lead_name, operations_lead_id, status, transport_source, quoted_amount, confirmed_selling_price, gst_amount,
         estimated_cost_baseline, legacy_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
       ON CONFLICT (tour_code) DO NOTHING`,
      [t.tourCode, t.enquiryId, t.bookingId, t.quotationCode, t.quotationVersion, t.clientName, t.agentId ?? null, t.destination,
       t.packageName, t.startDate, t.endDate, t.nights, t.days, t.adults, t.children, t.infants, t.assignedSalesperson,
       userByName.get(t.assignedSalesperson) ?? null, t.assignedOperationsLead, userByName.get(t.assignedOperationsLead) ?? null,
       t.status, t.transportSource, rev?.subtotalSellingPrice ?? null, t.sellingPrice, t.gstAmount, t.totalEstimatedCost,
       JSON.stringify(stripHeavy(t))],
    );
    const m = /^LST-(\d{4})-(\d+)$/.exec(t.tourCode);
    if (m) maxSeq = Math.max(maxSeq, Number(m[2]));

    // Own-fleet transport baseline (internal cost, not a supplier payable)
    if (t.estimatedOwnFleetCost > 0) {
      await insertCostItem(q, {
        legacy_ref: `FLEET-${t.tourCode}`, tour_code: t.tourCode, kind: 'transport', category_code: 'transport', head: 'VEHICLE_OWN',
        description: `Company vehicle ${t.allocatedVehicleId ?? ''} (quotation baseline)`.trim(), cost_nature: 'internal',
        service_date: t.startDate, service_end_date: t.endDate, expected_amount: t.estimatedOwnFleetCost,
        status: ['completed', 'reconciled', 'closed'].includes(t.status) ? 'service_completed' : 'booked',
        expected_calc: { rule: 'migrated_quotation_baseline' },
        transport: { vehicle_id: t.allocatedVehicleId ?? null, is_company_owned: true, rate_basis: 'per_day' },
      });
    }
  }
  if (maxSeq > 0) {
    await q.query(
      `INSERT INTO tour_code_sequences (year, last_value) VALUES (2026, $1)
       ON CONFLICT (year) DO UPDATE SET last_value = GREATEST(tour_code_sequences.last_value, EXCLUDED.last_value)`,
      [maxSeq],
    );
  }

  for (const b of INITIAL_SUPPLIER_BOOKINGS) {
    const [kind, cat, head] = BOOKING_KIND[b.category] ?? ['general', 'miscellaneous', 'OTHER'];
    await insertCostItem(q, {
      legacy_ref: b.id, tour_code: b.tourCode, kind, category_code: cat, head, description: b.details,
      supplier_id: b.supplierId, payee_name: b.supplierName, cost_nature: 'supplier',
      service_date: b.checkInDate ?? b.dueDate, service_end_date: b.checkOutDate ?? null, destination: b.destination,
      expected_amount: b.agreedAmount, status: BOOKING_STATUS[b.status] ?? 'estimated',
      expected_calc: { rule: 'migrated_agreed_amount', note: 'Room/rate breakdown not captured by the prototype' },
      bill_reference: b.confirmationReference ?? null,
      hotel: kind === 'hotel' ? { hotel_name: b.supplierName, check_in: b.checkInDate ?? b.dueDate, check_out: b.checkOutDate ?? b.checkInDate ?? b.dueDate } : undefined,
    });
  }

  // Paid supplier vouchers become payments held against the tour (no supplier bill existed in the prototype).
  for (const p of INITIAL_SUPPLIER_PAYMENTS) {
    if (p.status !== 'paid') continue;
    const r = await q.query<{ id: string }>(
      `INSERT INTO supplier_payments (supplier_id, supplier_name, paid_date, amount, payment_mode, reference, notes, legacy_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (legacy_ref) DO NOTHING RETURNING id`,
      [p.supplierId, p.supplierName, p.paidDate ?? p.dueBy, p.amount, p.paymentMode ?? null, p.bankReference ?? null,
       `Migrated ${p.paymentType} voucher ${p.id} (booking ${p.supplierBookingId})`, p.id],
    );
    if (r.rows[0]) {
      await q.query('INSERT INTO supplier_payment_allocations (payment_id, tour_code, amount) VALUES ($1,$2,$3)', [r.rows[0].id, p.tourCode, p.amount]);
    }
  }

  const seenTour = new Set<string>();
  for (const r of [...INITIAL_RECEIPTS].sort((a, b) => a.receivedDate.localeCompare(b.receivedDate))) {
    const type = seenTour.has(r.tourCode) ? 'part' : 'advance';
    seenTour.add(r.tourCode);
    await q.query(
      `INSERT INTO client_receipts (tour_code, receipt_type, amount, received_date, payment_mode, reference, receipt_number, verified, notes, legacy_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (legacy_ref) DO NOTHING`,
      [r.tourCode, type, r.amount, r.receivedDate, r.paymentMode, r.transactionReference, r.receiptNumber, r.verified, r.notes ?? null, r.id],
    );
  }

  for (const e of INITIAL_EXPENSES) {
    const head = EXPENSE_HEAD[e.category] ?? 'OTHER';
    const h = HEADS.find((x) => x.code === head)!;
    await insertCostItem(q, {
      legacy_ref: e.id, tour_code: e.tourCode, kind: 'general', category_code: h.cat, head, description: e.description,
      payee_name: e.spentBy, cost_nature: h.nature, service_date: e.spentDate, actual_amount: e.amount,
      // prototype "approved" was an operational approval; Accounts has not verified it in this module yet
      status: e.status === 'pending' ? 'bill_pending' : 'bill_received',
      remarks: `Migrated on-ground expense (${e.status}${e.billAttached ? ', bill attached' : ', no bill'})`,
    });
  }

  for (const p of INITIAL_PROFORMA_INVOICES) {
    if (!p.tourCode) continue;
    await q.query(
      `INSERT INTO client_invoices (tour_code, invoice_type, invoice_number, invoice_date, due_date, taxable_value, gst_amount, total_amount, status, legacy_ref)
       VALUES ($1,'proforma',$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (legacy_ref) DO NOTHING`,
      [p.tourCode, p.id, (p.issuedAt || '').substring(0, 10) || p.paymentDueDate, p.paymentDueDate, p.totalAgreedSellingPrice,
       p.gstAmount, p.totalAgreedSellingPrice + p.gstAmount, p.status === 'cancelled' ? 'cancelled' : 'issued', p.id],
    );
  }
}

interface SeedCostItem {
  legacy_ref: string; tour_code: string; kind: string; category_code: string; head: string; description?: string | null;
  supplier_id?: string | null; payee_name?: string | null; cost_nature: string; service_date?: string | null;
  service_end_date?: string | null; destination?: string | null; expected_amount?: number | null; actual_amount?: number | null;
  status: string; expected_calc?: unknown; bill_reference?: string | null; remarks?: string | null;
  hotel?: { hotel_name: string; check_in: string; check_out: string };
  transport?: { vehicle_id: string | null; is_company_owned: boolean; rate_basis: string };
}

async function insertCostItem(q: Queryable, c: SeedCostItem) {
  const r = await q.query<{ id: string }>(
    `INSERT INTO cost_items (legacy_ref, tour_code, kind, category_code, expense_head_id, description, supplier_id, payee_name,
       cost_nature, service_date, service_end_date, destination, expected_amount, actual_amount, status, expected_calc, bill_reference, remarks)
     VALUES ($1,$2,$3,$4,(SELECT id FROM expense_heads WHERE code=$5),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (legacy_ref) WHERE legacy_ref IS NOT NULL DO NOTHING RETURNING id`,
    [c.legacy_ref, c.tour_code, c.kind, c.category_code, c.head, c.description ?? null, c.supplier_id ?? null, c.payee_name ?? null,
     c.cost_nature, c.service_date ?? null, c.service_end_date ?? null, c.destination ?? null, c.expected_amount ?? null,
     c.actual_amount ?? null, c.status, c.expected_calc ? JSON.stringify(c.expected_calc) : null, c.bill_reference ?? null, c.remarks ?? null],
  );
  const id = r.rows[0]?.id;
  if (!id) return;
  if (c.hotel) {
    const nights = Math.max(0, Math.round((Date.parse(c.hotel.check_out) - Date.parse(c.hotel.check_in)) / 86_400_000));
    await q.query('INSERT INTO hotel_stay_details (cost_item_id, hotel_name, check_in, check_out, nights) VALUES ($1,$2,$3,$4,$5)', [id, c.hotel.hotel_name, c.hotel.check_in, c.hotel.check_out, nights]);
  }
  if (c.transport) {
    await q.query('INSERT INTO transport_details (cost_item_id, vehicle_id, is_company_owned, rate_basis) VALUES ($1,$2,$3,$4)', [id, c.transport.vehicle_id, c.transport.is_company_owned, c.transport.rate_basis]);
  }
}

function stripHeavy(t: Record<string, any>) {
  const { itinerary, inclusions, exclusions, travellers, ...rest } = t;
  return rest;
}

export async function seedAll(db: Db, opts: { userPassword?: string; withPrototypeData?: boolean } = {}) {
  await db.tx(async (q) => {
    await seedMasters(q);
    if (opts.withPrototypeData !== false) await seedPrototypeData(q, opts);
  });
}
