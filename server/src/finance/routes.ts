import { Router, raw } from 'express';
import { mkdirSync, writeFileSync, createReadStream, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { ah, badRequest, forbidden, notFound } from '../lib/http.ts';
import { fmt, pct, sum, toPaise } from '../lib/money.ts';
import { need } from './service.ts';
import * as svc from './service.ts';
import { computeTour, computeTours, loadCostItems } from './repository.ts';
import type { TourPnl } from './engine.ts';
import { importRoutes } from './import.ts';
import { toCsv } from '../lib/csv.ts';

const money = z.union([z.string(), z.number()]).transform((v) => String(v)).refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v.trim()), 'Amount must have at most 2 decimals');
const moneyPos = money.refine((v) => toPaise(v) >= 0n, 'Must not be negative');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const optStr = z.string().nullish();

/** Strip supplier detail for users without finance.view_costs (e.g. Sales). */
function forViewer(p: TourPnl, canSeeCosts: boolean) {
  const { _totals, ...rest } = p;
  if (canSeeCosts) return rest;
  return { ...rest, items: [], categories: rest.categories.map(({ items, ...c }) => c), supplier: { totalBills: rest.supplier.totalBills, totalPayments: rest.supplier.totalPayments, outstanding: rest.supplier.outstanding } };
}

function filterTours(all: TourPnl[], f: Record<string, any>) {
  return all.filter(({ tour: t, financialStatus }) => {
    if (f.from && t.end_date < f.from) return false;
    if (f.to && t.start_date > f.to) return false;
    if (f.tourCode && !t.tour_code.toLowerCase().includes(String(f.tourCode).toLowerCase())) return false;
    if (f.destination && t.destination !== f.destination) return false;
    if (f.client && !t.client_name.toLowerCase().includes(String(f.client).toLowerCase())) return false;
    if (f.salesperson && t.salesperson_name !== f.salesperson) return false;
    if (f.operations && t.operations_lead_name !== f.operations) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.financialStatus && financialStatus !== f.financialStatus) return false;
    return true;
  });
}

export function financeRoutes(db: Db, opts: { uploadDir: string }) {
  const r = Router();

  // ---------------- overview & tour P&L
  r.get('/overview', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    const tours = filterTours(await computeTours(db), req.query);
    const T = (k: keyof TourPnl['_totals']) => sum(tours.map((t) => t._totals[k]));
    const revenue = T('recognised'), actual = T('costActual');
    const profit = revenue - actual;
    const byMonth = new Map<string, { revenue: bigint; cost: bigint }>();
    const byCategory = new Map<string, { name: string; actual: bigint }>();
    const bySupplier = new Map<string, bigint>();
    for (const t of tours) {
      const m = t.tour.start_date.substring(0, 7);
      const e = byMonth.get(m) ?? { revenue: 0n, cost: 0n };
      e.revenue += t._totals.recognised; e.cost += t._totals.costActual; byMonth.set(m, e);
      for (const c of t.categories) {
        const x = byCategory.get(c.code) ?? { name: c.name, actual: 0n };
        x.actual += toPaise(c.actual); byCategory.set(c.code, x);
      }
      for (const it of t.items) if (it.actual && it.cost_nature === 'supplier') {
        const name = (it as any).supplier_name ?? it.payee_name ?? 'Unknown';
        bySupplier.set(name, (bySupplier.get(name) ?? 0n) + toPaise(it.actual));
      }
    }
    res.json({
      filters: req.query,
      tourCount: tours.length,
      totals: {
        revenue: fmt(revenue), invoiced: fmt(T('invoicedTotal')), collected: fmt(T('collectedVerified')), clientOutstanding: fmt(T('clientOutstanding')),
        estimatedCost: fmt(T('costEstimated')), actualCost: fmt(actual), verifiedCost: fmt(T('costVerified')),
        supplierBills: fmt(T('totalSupplierBills')), supplierPayments: fmt(T('supplierPayments')), supplierOutstanding: fmt(T('supplierOutstanding')),
        grossProfit: fmt(profit), netProfit: fmt(profit),
        averageProfitPerTour: tours.length ? fmt(profit / BigInt(tours.length)) : '0.00',
        averageMarginPct: pct(profit, revenue),
      },
      lossMakingTours: tours.filter((t) => t._totals.recognised - t._totals.costForecast < 0n).map((t) => t.tour.tour_code),
      pendingReconciliation: tours.filter((t) => t.financialStatus === 'reconciliation_pending').map((t) => t.tour.tour_code),
      incompleteExpenses: tours.filter((t) => ['costing_pending', 'expenses_in_progress', 'bills_pending'].includes(t.financialStatus)).map((t) => t.tour.tour_code),
      charts: {
        monthly: [...byMonth.entries()].sort().map(([month, v]) => ({ month, revenue: fmt(v.revenue), cost: fmt(v.cost), profit: fmt(v.revenue - v.cost) })),
        byTour: tours.map((t) => ({ tourCode: t.tour.tour_code, revenue: fmt(t._totals.recognised), actualCost: fmt(t._totals.costActual), profit: t.profitability.actual.profit })),
        expenseCategories: [...byCategory.entries()].map(([code, v]) => ({ code, name: v.name, actual: fmt(v.actual) })),
        suppliers: [...bySupplier.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1)).slice(0, 15).map(([name, v]) => ({ name, actual: fmt(v) })),
        clientOutstanding: tours.filter((t) => t._totals.clientOutstanding > 0n).map((t) => ({ tourCode: t.tour.tour_code, client: t.tour.client_name, outstanding: fmt(t._totals.clientOutstanding) })),
        supplierOutstanding: tours.filter((t) => t._totals.supplierOutstanding > 0n).map((t) => ({ tourCode: t.tour.tour_code, outstanding: fmt(t._totals.supplierOutstanding) })),
      },
    });
  }));

  r.get('/tours', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    const tours = filterTours(await computeTours(db), req.query);
    res.json(tours.map((t) => ({
      tour: t.tour, financialStatus: t.financialStatus, revenue: t.revenue.recognisedRevenue, collected: t.revenue.collected,
      clientOutstanding: t.revenue.clientOutstanding, estimatedCost: t.costs.estimated, actualCost: t.costs.actual, verifiedCost: t.costs.verified,
      grossProfit: t.grossProfit, marginPct: t.grossMarginPct, supplierOutstanding: t.supplier.outstanding,
      warningCount: t.warnings.filter((w) => w.severity !== 'info').length,
    })));
  }));

  r.get('/tours/:tourCode', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    const p = await computeTour(db, req.params.tourCode);
    if (!p) throw notFound('Tour not found');
    res.json(forViewer(p, req.user!.permissions.has('finance.view_costs')));
  }));

  r.get('/tours/:tourCode/audit', ah(async (req, res) => {
    need(req.user!, 'finance.view_costs');
    const rows = (await db.query('SELECT a.*, u.name AS user_name FROM financial_audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE a.tour_code = $1 ORDER BY a.at DESC LIMIT 500', [req.params.tourCode])).rows;
    res.json(rows);
  }));

  r.get('/tours/:tourCode/transactions', ah(async (req, res) => {
    need(req.user!, 'finance.view_costs');
    const t = req.params.tourCode;
    const [bills, payments, invoices, credits, receipts, adjustments, recon] = await Promise.all([
      db.query(`SELECT DISTINCT b.* FROM vendor_bills b JOIN vendor_bill_lines l ON l.bill_id = b.id WHERE l.tour_code = $1 ORDER BY b.invoice_date`, [t]),
      db.query(`SELECT p.*, a.bill_id, a.amount AS allocated FROM supplier_payments p JOIN supplier_payment_allocations a ON a.payment_id = p.id
                WHERE a.tour_code = $1 OR a.bill_id IN (SELECT bill_id FROM vendor_bill_lines WHERE tour_code = $1) ORDER BY p.paid_date`, [t]),
      db.query('SELECT * FROM client_invoices WHERE tour_code = $1 ORDER BY invoice_date', [t]),
      db.query('SELECT * FROM client_credit_notes WHERE tour_code = $1 ORDER BY note_date', [t]),
      db.query('SELECT * FROM client_receipts WHERE tour_code = $1 ORDER BY received_date', [t]),
      db.query('SELECT * FROM revenue_adjustments WHERE tour_code = $1 ORDER BY requested_at', [t]),
      db.query('SELECT * FROM reconciliation_cases WHERE tour_code = $1 ORDER BY opened_at', [t]),
    ]);
    res.json({ bills: bills.rows, payments: payments.rows, invoices: invoices.rows, creditNotes: credits.rows, receipts: receipts.rows, revenueAdjustments: adjustments.rows, reconciliation: recon.rows });
  }));

  // ---------------- cost items
  const detail = z.record(z.any()).nullish();
  const costItem = z.object({
    tour_code: optStr, is_unallocated: z.boolean().optional(),
    kind: z.enum(['hotel', 'restaurant', 'transport', 'guide_dsa', 'guide_imprest', 'activity', 'general']),
    category_code: z.string().optional(), expense_head_code: optStr, description: optStr, supplier_id: optStr, payee_name: optStr,
    cost_nature: z.enum(['supplier', 'internal']).optional(), service_date: date.nullish(), service_end_date: date.nullish(), destination: optStr,
    quantity: z.union([z.string(), z.number()]).transform(String).nullish(), unit_rate: moneyPos.nullish(), expected_amount: moneyPos.nullish(),
    actual_amount: moneyPos.nullish(), tax_amount: moneyPos.nullish(), status: z.string().optional(), bill_reference: optStr,
    payment_mode: optStr, remarks: optStr, detail, reason: optStr,
  });

  r.get('/cost-items', ah(async (req, res) => {
    need(req.user!, 'finance.view_costs');
    const conds: string[] = ['TRUE'];
    const vals: unknown[] = [];
    const add = (sql: string, v: unknown) => { vals.push(v); conds.push(sql.replace('?', `$${vals.length}`)); };
    if (req.query.tourCode) add('ci.tour_code = ?', req.query.tourCode);
    if (req.query.kind) add('ci.kind = ?', req.query.kind);
    if (req.query.category) add('ci.category_code = ?', req.query.category);
    if (req.query.status) add('ci.status = ?', req.query.status);
    if (req.query.unallocated === 'true') conds.push('ci.is_unallocated');
    res.json(await loadCostItems(db, conds.join(' AND '), vals));
  }));
  r.post('/cost-items', ah(async (req, res) => {
    const body = costItem.parse(req.body);
    res.status(201).json(await db.tx((q) => svc.createCostItem(q, req.user!, body as any)));
  }));
  r.patch('/cost-items/:id', ah(async (req, res) => {
    const body = costItem.partial().omit({ kind: true, tour_code: true, is_unallocated: true }).parse(req.body);
    res.json(await db.tx((q) => svc.updateCostItem(q, req.user!, req.params.id, body as any)));
  }));
  r.post('/cost-items/:id/override', ah(async (req, res) => {
    const b = z.object({ amount: moneyPos.nullable(), reason: z.string().min(3) }).parse(req.body);
    res.json(await db.tx((q) => svc.overrideExpected(q, req.user!, req.params.id, b.amount, b.reason)));
  }));
  r.post('/cost-items/:id/status', ah(async (req, res) => {
    const b = z.object({ status: z.string(), reason: optStr }).parse(req.body);
    res.json(await db.tx((q) => svc.transitionCostItem(q, req.user!, req.params.id, b.status, b.reason)));
  }));

  // ---------------- reconciliation register
  r.get('/reconciliation', ah(async (req, res) => {
    need(req.user!, 'finance.view_costs');
    const status = req.query.status as string | undefined;
    const rows = (await db.query(
      `SELECT rc.*, ci.kind, ci.category_code, coalesce(s.name, ci.payee_name) AS supplier, hs.hotel_name, rd.restaurant_name,
              CASE WHEN rc.expected_snapshot > 0 THEN round(rc.variance * 100 / rc.expected_snapshot, 2) END AS variance_pct
       FROM reconciliation_cases rc JOIN cost_items ci ON ci.id = rc.cost_item_id LEFT JOIN suppliers s ON s.id = ci.supplier_id
       LEFT JOIN hotel_stay_details hs ON hs.cost_item_id = ci.id LEFT JOIN restaurant_details rd ON rd.cost_item_id = ci.id
       WHERE ($1::text IS NULL OR rc.status = $1) ORDER BY rc.opened_at DESC`,
      [status ?? null],
    )).rows;
    res.json(rows);
  }));
  r.post('/cost-items/:id/reconciliation', ah(async (req, res) => {
    const b = z.object({ reason: z.string().min(2), remarks: optStr, assigned_to: optStr, document_id: optStr }).parse(req.body);
    res.status(201).json(await db.tx((q) => svc.openReconCase(q, req.user!, req.params.id, b as any)));
  }));
  r.patch('/reconciliation/:id', ah(async (req, res) => {
    const b = z.object({ status: z.enum(['open', 'under_review', 'approved', 'rejected', 'resolved']), approved_adjustment: moneyPos.nullish(), remarks: optStr, assigned_to: optStr }).parse(req.body);
    await db.tx((q) => svc.updateReconCase(q, req.user!, req.params.id, b as any));
    res.json({ ok: true });
  }));

  // ---------------- vendor bills & payments
  r.get('/vendor-bills', ah(async (req, res) => {
    need(req.user!, 'finance.view_costs');
    res.json((await db.query(
      `SELECT b.*, coalesce((SELECT sum(amount) FROM supplier_payment_allocations WHERE bill_id = b.id),0) AS paid,
              coalesce((SELECT sum(CASE type WHEN 'debit_note' THEN amount ELSE -amount END) FROM vendor_bill_adjustments WHERE bill_id = b.id),0) AS adjustments,
              (SELECT json_agg(json_build_object('cost_item_id', l.cost_item_id, 'tour_code', l.tour_code, 'amount', l.amount)) FROM vendor_bill_lines l WHERE l.bill_id = b.id) AS lines
       FROM vendor_bills b WHERE ($1::text IS NULL OR b.status = $1) ORDER BY b.invoice_date DESC`, [req.query.status ?? null])).rows);
  }));
  r.post('/vendor-bills', ah(async (req, res) => {
    const b = z.object({
      supplier_id: optStr, supplier_name: z.string().min(1), invoice_number: z.string().min(1), invoice_date: date, due_date: date.nullish(),
      taxable_value: moneyPos.optional(), tax_amount: moneyPos.optional(), total_amount: moneyPos, remarks: optStr, reason: optStr,
      lines: z.array(z.object({ cost_item_id: optStr, tour_code: optStr, amount: moneyPos, description: optStr })).min(1),
    }).parse(req.body);
    res.status(201).json(await db.tx((q) => svc.createBill(q, req.user!, b as any)));
  }));
  r.post('/vendor-bills/:id/status', ah(async (req, res) => {
    const b = z.object({ status: z.enum(['under_verification', 'approved', 'rejected', 'cancelled']), reason: optStr }).parse(req.body);
    await db.tx((q) => svc.setBillStatus(q, req.user!, req.params.id, b.status, b.reason));
    res.json({ ok: true });
  }));
  r.post('/vendor-bills/:id/adjustments', ah(async (req, res) => {
    const b = z.object({ type: z.enum(['credit_note', 'debit_note']), amount: moneyPos, note_date: date, reason: z.string().min(2) }).parse(req.body);
    res.status(201).json(await db.tx((q) => svc.addBillAdjustment(q, req.user!, req.params.id, b as any)));
  }));
  r.post('/supplier-payments', ah(async (req, res) => {
    const b = z.object({
      supplier_id: optStr, supplier_name: z.string().min(1), paid_date: date, amount: moneyPos, payment_mode: optStr, reference: optStr, notes: optStr, reason: optStr,
      allocations: z.array(z.object({ bill_id: optStr, tour_code: optStr, amount: moneyPos })).min(1),
    }).parse(req.body);
    res.status(201).json(await db.tx((q) => svc.recordSupplierPayment(q, req.user!, b as any)));
  }));

  // ---------------- client revenue & collections
  r.post('/client-invoices', ah(async (req, res) => {
    const b = z.object({ tour_code: z.string(), invoice_type: z.enum(['proforma', 'tax_invoice']), invoice_number: z.string().min(1), invoice_date: date, due_date: date.nullish(), taxable_value: moneyPos, gst_amount: moneyPos, reason: optStr }).parse(req.body);
    res.status(201).json(await db.tx((q) => svc.createClientInvoice(q, req.user!, b as any)));
  }));
  r.post('/client-credit-notes', ah(async (req, res) => {
    const b = z.object({ tour_code: z.string(), invoice_id: optStr, note_number: z.string().min(1), note_date: date, taxable_value: moneyPos, gst_amount: moneyPos, reason: z.string().min(2) }).parse(req.body);
    res.status(201).json(await db.tx((q) => svc.createCreditNote(q, req.user!, b as any)));
  }));
  r.post('/client-receipts', ah(async (req, res) => {
    const b = z.object({ tour_code: z.string(), receipt_type: z.enum(['advance', 'part', 'final', 'refund']), amount: moneyPos, received_date: date, payment_mode: optStr, reference: optStr, receipt_number: optStr, verified: z.boolean().optional(), notes: optStr, reason: optStr }).parse(req.body);
    res.status(201).json(await db.tx((q) => svc.recordClientReceipt(q, req.user!, b as any)));
  }));
  r.post('/client-receipts/:id/verify', ah(async (req, res) => {
    await db.tx((q) => svc.verifyClientReceipt(q, req.user!, req.params.id, req.body?.reason));
    res.json({ ok: true });
  }));
  r.post('/revenue-adjustments', ah(async (req, res) => {
    const b = z.object({ tour_code: z.string(), type: z.enum(['additional_service', 'discount', 'commercial_adjustment_plus', 'commercial_adjustment_minus']), amount: moneyPos, description: z.string().min(2), reason: optStr }).parse(req.body);
    res.status(201).json(await db.tx((q) => svc.requestRevenueAdjustment(q, req.user!, b)));
  }));
  r.post('/revenue-adjustments/:id/decision', ah(async (req, res) => {
    const b = z.object({ decision: z.enum(['approved', 'rejected']), note: optStr }).parse(req.body);
    await db.tx((q) => svc.decideRevenueAdjustment(q, req.user!, req.params.id, b.decision, b.note));
    res.json({ ok: true });
  }));

  // ---------------- closure
  r.post('/tours/:tourCode/close', ah(async (req, res) => {
    const b = z.object({ notes: z.string().default(''), accept_outstanding: z.boolean().optional() }).parse(req.body);
    await db.tx((q) => svc.closeTour(q, req.user!, req.params.tourCode, b));
    res.json({ ok: true });
  }));
  r.post('/tours/:tourCode/reopen', ah(async (req, res) => {
    const b = z.object({ reason: z.string().min(3) }).parse(req.body);
    await db.tx((q) => svc.reopenTour(q, req.user!, req.params.tourCode, b.reason));
    res.json({ ok: true });
  }));

  // ---------------- masters & settings
  r.get('/expense-categories', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    res.json((await db.query('SELECT * FROM expense_categories ORDER BY sort_order')).rows);
  }));
  r.post('/expense-categories', ah(async (req, res) => {
    need(req.user!, 'master.manage');
    const b = z.object({ code: z.string().regex(/^[a-z0-9_]+$/), name: z.string().min(1), sort_order: z.number().int().optional(), active: z.boolean().optional() }).parse(req.body);
    await db.tx(async (q) => {
      await q.query(`INSERT INTO expense_categories (code, name, sort_order, active) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO UPDATE SET name = $2, sort_order = $3, active = $4`, [b.code, b.name, b.sort_order ?? 100, b.active ?? true]);
      await svc.audit(q, req.user!, { entity_type: 'expense_category', entity_id: b.code, action: 'upsert', after: b });
    });
    res.json({ ok: true });
  }));
  r.get('/expense-heads', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    res.json((await db.query('SELECT * FROM expense_heads ORDER BY category_code, code')).rows);
  }));
  const head = z.object({ code: z.string().min(1), display_name: z.string().min(1), category_code: z.string(), cost_nature: z.enum(['supplier', 'internal']), requires_approval: z.boolean().optional(), default_tax_pct: z.string().nullish(), reporting_group: optStr, active: z.boolean().optional(), needs_confirmation: z.boolean().optional() });
  r.post('/expense-heads', ah(async (req, res) => {
    need(req.user!, 'master.manage');
    const b = head.parse(req.body);
    const out = await db.tx(async (q) => {
      const r2 = await q.query<any>(`INSERT INTO expense_heads (code, display_name, original_label, category_code, cost_nature, requires_approval, default_tax_pct, reporting_group, active)
        VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8) RETURNING *`, [b.code, b.display_name, b.category_code, b.cost_nature, b.requires_approval ?? true, b.default_tax_pct ?? null, b.reporting_group ?? null, b.active ?? true]);
      await svc.audit(q, req.user!, { entity_type: 'expense_head', entity_id: b.code, action: 'create', after: b });
      return r2.rows[0];
    });
    res.status(201).json(out);
  }));
  r.patch('/expense-heads/:id', ah(async (req, res) => {
    need(req.user!, 'master.manage');
    const b = head.partial().omit({ code: true }).parse(req.body); // code & original_label are immutable
    const out = await db.tx(async (q) => {
      const before = (await q.query<any>('SELECT * FROM expense_heads WHERE id = $1', [req.params.id])).rows[0];
      if (!before) throw notFound();
      const keys = Object.keys(b);
      if (!keys.length) return before;
      const r2 = await q.query<any>(`UPDATE expense_heads SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`, [req.params.id, ...keys.map((k) => (b as any)[k])]);
      await svc.audit(q, req.user!, { entity_type: 'expense_head', entity_id: before.code, action: 'update', before, after: r2.rows[0] });
      return r2.rows[0];
    });
    res.json(out);
  }));
  r.get('/settings', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    res.json((await db.query('SELECT * FROM finance_settings ORDER BY key')).rows);
  }));
  r.put('/settings/:key', ah(async (req, res) => {
    need(req.user!, 'settings.manage');
    const b = z.object({ value: z.any(), confirmed: z.boolean().optional(), reason: z.string().min(3) }).parse(req.body);
    const allowed: Record<string, (v: any) => boolean> = {
      revenue_recognition_basis: (v) => ['confirmed_price', 'tax_invoiced'].includes(v),
      low_margin_threshold_pct: (v) => /^\d+(\.\d+)?$/.test(String(v)),
      default_hotel_foc_rule: (v) => ['none', 'deduct_single', 'deduct_double'].includes(v),
      default_restaurant_foc_rule: (v) => ['none', 'deduct'].includes(v),
      overhead_allocation_method: (v) => v === 'none',
    };
    if (!allowed[req.params.key]) throw notFound('Unknown setting');
    if (!allowed[req.params.key](b.value)) throw badRequest('Invalid value');
    await db.tx(async (q) => {
      const before = (await q.query('SELECT * FROM finance_settings WHERE key = $1', [req.params.key])).rows[0];
      await q.query('UPDATE finance_settings SET value = $2, confirmed = $3, updated_by = $4, updated_at = now() WHERE key = $1', [req.params.key, JSON.stringify(b.value), b.confirmed ?? false, req.user!.id]);
      await svc.audit(q, req.user!, { entity_type: 'finance_setting', entity_id: req.params.key, action: 'update', before, after: b, reason: b.reason });
    });
    res.json({ ok: true });
  }));

  // ---------------- documents (bill uploads)
  mkdirSync(opts.uploadDir, { recursive: true });
  const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  r.post('/documents', raw({ type: () => true, limit: '15mb' }), ah(async (req, res) => {
    need(req.user!, 'bill.write');
    const entityType = String(req.query.entityType ?? ''), entityId = String(req.query.entityId ?? ''), fileName = basename(String(req.query.fileName ?? 'upload'));
    const mime = req.header('content-type') ?? '';
    if (!['cost_item', 'vendor_bill', 'reconciliation_case', 'client_receipt'].includes(entityType) || !entityId) throw badRequest('entityType and entityId required');
    if (!ALLOWED_MIME.includes(mime)) throw badRequest(`File type not allowed (${ALLOWED_MIME.join(', ')})`);
    const buf = req.body as Buffer;
    if (!Buffer.isBuffer(buf) || !buf.length) throw badRequest('Empty file');
    const stored = `${Date.now()}-${randomBytes(6).toString('hex')}${fileName.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? ''}`;
    writeFileSync(join(opts.uploadDir, stored), buf);
    const r2 = await db.query<any>('INSERT INTO documents (entity_type, entity_id, file_name, mime_type, size_bytes, storage_path, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id::text, file_name, mime_type, size_bytes', [entityType, entityId, fileName, mime, buf.length, stored, req.user!.id]);
    res.status(201).json(r2.rows[0]);
  }));
  r.get('/documents', ah(async (req, res) => {
    need(req.user!, 'finance.view_costs');
    res.json((await db.query('SELECT id::text, entity_type, entity_id, file_name, mime_type, size_bytes, uploaded_by, uploaded_at FROM documents WHERE entity_type = $1 AND entity_id = $2 ORDER BY uploaded_at', [req.query.entityType, req.query.entityId])).rows);
  }));
  r.get('/documents/:id/file', ah(async (req, res) => {
    need(req.user!, 'finance.view_costs');
    const d = (await db.query<any>('SELECT * FROM documents WHERE id = $1', [req.params.id])).rows[0];
    const path = d && join(opts.uploadDir, basename(d.storage_path));
    if (!d || !existsSync(path)) throw notFound();
    res.setHeader('content-type', d.mime_type);
    res.setHeader('content-disposition', `inline; filename="${d.file_name.replace(/"/g, '')}"`);
    createReadStream(path).pipe(res);
  }));

  // ---------------- reports (JSON or ?format=csv for Excel)
  const send = (req: any, res: any, name: string, rows: Record<string, unknown>[]) => {
    if (req.query.format === 'csv') {
      res.setHeader('content-type', 'text/csv; charset=utf-8');
      res.setHeader('content-disposition', `attachment; filename="${name}.csv"`);
      return res.send('﻿' + toCsv(rows));
    }
    res.json(rows);
  };
  r.get('/reports/:name', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    const costs = req.user!.permissions.has('finance.view_costs');
    const tours = filterTours(await computeTours(db), req.query);
    const name = req.params.name;
    const costReport = ['expense-categories', 'hotel-reconciliation', 'restaurant-reconciliation', 'vendor-payables', 'variance'];
    if (costReport.includes(name) && !costs) throw forbidden();
    let rows: Record<string, unknown>[];
    switch (name) {
      case 'tour-pnl':
      case 'profitability':
        rows = tours.map((t) => ({
          tour_code: t.tour.tour_code, client: t.tour.client_name, destination: t.tour.destination, start_date: t.tour.start_date,
          salesperson: t.tour.salesperson_name, operations: t.tour.operations_lead_name, revenue: t.revenue.recognisedRevenue,
          estimated_cost: t.costs.estimated, actual_cost: t.costs.actual, verified_cost: t.costs.verified,
          gross_profit: t.grossProfit, margin_pct: t.grossMarginPct, verified_profit: t.profitability.verified.profit, financial_status: t.financialStatus,
        }));
        break;
      case 'expense-categories': {
        const m = new Map<string, { name: string; expected: bigint; actual: bigint; verified: bigint; variance: bigint }>();
        for (const t of tours) for (const c of t.categories) {
          const x = m.get(c.code) ?? { name: c.name, expected: 0n, actual: 0n, verified: 0n, variance: 0n };
          x.expected += toPaise(c.expected); x.actual += toPaise(c.actual); x.verified += toPaise(c.verified); x.variance += toPaise(c.variance); m.set(c.code, x);
        }
        rows = [...m.entries()].map(([code, x]) => ({ category: x.name, code, expected: fmt(x.expected), actual: fmt(x.actual), variance_on_billed_lines: fmt(x.variance), verified: fmt(x.verified) }));
        break;
      }
      case 'hotel-reconciliation':
        rows = tours.flatMap((t) => t.items.filter((i) => i.kind === 'hotel').map((i) => ({
          hotel: i.detail?.hotel_name, tour_code: t.tour.tour_code, check_in: i.detail?.check_in, check_out: i.detail?.check_out, nights: i.detail?.nights,
          dbl: i.detail?.dbl_rooms, sng: i.detail?.sng_rooms, eb: i.detail?.extra_beds, foc: i.detail?.foc, cwb: i.detail?.cwb, cnb: i.detail?.cnb, meal_plan: i.detail?.meal_plan,
          expected: i.expected, actual: i.actual, variance: i.variance, status: i.reconState, remarks: i.detail?.hotel_remarks ?? i.remarks,
        })));
        break;
      case 'restaurant-reconciliation':
        rows = tours.flatMap((t) => t.items.filter((i) => i.kind === 'restaurant').map((i) => ({
          restaurant: i.detail?.restaurant_name, tour_code: t.tour.tour_code, date: i.service_date, pax: i.detail?.pax, foc: i.detail?.foc_qty,
          rate: i.detail?.rate_per_pax, expected: i.expected, actual: i.actual, variance: i.variance, status: i.reconState,
        })));
        break;
      case 'vendor-payables':
        rows = (await db.query<any>(
          `SELECT b.supplier_name AS vendor, b.invoice_number, string_agg(DISTINCT l.tour_code, ', ') AS tour_codes, b.total_amount AS bill_amount,
                  b.total_amount + coalesce((SELECT sum(CASE type WHEN 'debit_note' THEN amount ELSE -amount END) FROM vendor_bill_adjustments WHERE bill_id = b.id),0) AS net_amount,
                  coalesce((SELECT sum(amount) FROM supplier_payment_allocations WHERE bill_id = b.id),0) AS paid_amount, b.due_date, b.status
           FROM vendor_bills b JOIN vendor_bill_lines l ON l.bill_id = b.id WHERE b.status NOT IN ('cancelled','rejected')
           GROUP BY b.id ORDER BY b.due_date NULLS LAST`)).rows.map((x) => ({ ...x, outstanding_amount: fmt(toPaise(x.net_amount) - toPaise(x.paid_amount)) }));
        break;
      case 'client-receivables':
        rows = tours.map((t) => ({ client: t.tour.client_name, tour_code: t.tour.tour_code, receivable_basis: t.calculationBasis.receivable, invoice_amount: t.revenue.invoicedTotal, receivable: t.revenue.receivable, collected: t.revenue.collected, outstanding: t.revenue.clientOutstanding }));
        break;
      case 'variance':
        rows = (await db.query<any>(`SELECT rc.tour_code, ci.category_code, coalesce(s.name, ci.payee_name) AS supplier, rc.expected_snapshot AS expected, rc.actual_snapshot AS actual, rc.variance, rc.reason, rc.remarks, rc.status, rc.approved_adjustment, rc.resolved_at
           FROM reconciliation_cases rc JOIN cost_items ci ON ci.id = rc.cost_item_id LEFT JOIN suppliers s ON s.id = ci.supplier_id ORDER BY rc.opened_at DESC`)).rows;
        break;
      default:
        throw notFound('Unknown report');
    }
    send(req, res, name, rows);
  }));

  r.use('/imports', importRoutes(db));
  return r;
}
