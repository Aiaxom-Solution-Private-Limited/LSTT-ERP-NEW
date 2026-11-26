/**
 * Historical spreadsheet import: upload → map columns → preview/validate →
 * manual mapping of unmatched Tour Codes → commit. Nothing is discarded:
 * every source row is stored verbatim in import_rows with its status/errors.
 * Imported cost lines carry source='import' and a content hash in legacy_ref
 * so re-importing the same sheet cannot create duplicates.
 */
import { Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import type { Db, Queryable } from '../db/client.ts';
import { ah, badRequest, conflict, notFound } from '../lib/http.ts';
import { parseCsv } from '../lib/csv.ts';
import { fmt, toPaise } from '../lib/money.ts';
import { hotelExpected, restaurantExpected } from './rates.ts';
import { audit, need } from './service.ts';

export const TEMPLATES = {
  hotel: ['tour_code', 'client_name', 'city', 'hotel_name', 'check_in', 'check_out', 'nights', 'dbl', 'sng', 'eb', 'foc', 'meal_plan', 'sng_rate', 'dbl_rate', 'eb_rate', 'cwb', 'cnb', 'cwb_rate', 'cnb_rate', 'tea_coffee', 'amount_lstt', 'amount_hotel', 'dispute_amount', 'remarks'],
  restaurant: ['restaurant_name', 'tour_code', 'date', 'pax', 'foc', 'rate', 'amount_lstt', 'amount_restaurant', 'dispute_amount', 'remarks'],
  // consolidated: tour_code (+ optional date/client) and one column per expense head code
  consolidated: ['tour_code', 'date', 'client_name'],
} as const;
type ImportType = keyof typeof TEMPLATES;

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

/** Dates: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YY, DD.MM.YYYY, 5-Nov-2026. Day-first (Indian convention). */
export function parseDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s);
  if (m) return ymd(year(+m[3]), +m[2], +m[1]);
  m = /^(\d{1,2})[\s\-]([A-Za-z]{3,4})[\s\-,]*(\d{2,4})$/.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) return ymd(year(+m[3]), MONTHS[m[2].toLowerCase()], +m[1]);
  return null;
}
const year = (y: number) => (y < 100 ? 2000 + y : y);
function ymd(y: number, mo: number, d: number) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().substring(0, 10);
}

/** Amounts: "₹ 1,23,500", "1500.5", "(250)" → string; blank → null (blank is NOT zero). */
export function parseAmount(v: string): { value: string | null; error?: string } {
  const s = v.replace(/[₹,\s]|Rs\.?|INR/gi, '');
  if (!s || s === '-') return { value: null };
  const neg = /^\(.*\)$/.test(s);
  const core = s.replace(/[()]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(core)) return { value: null, error: `not an amount: "${v}"` };
  return { value: fmt(toPaise((neg ? '-' : '') + core)) };
}
const parseInt0 = (v: string | undefined) => {
  const s = (v ?? '').trim();
  if (!s) return { value: 0, blank: true };
  const n = Number(s.match(/^\d+/)?.[0]);
  return Number.isFinite(n) ? { value: n, blank: false } : { value: 0, blank: false, error: `not a number: "${v}"` };
};

async function readTable(body: { csv?: string; xlsx_base64?: string; sheet?: string }): Promise<string[][]> {
  if (body.csv) return parseCsv(body.csv);
  if (body.xlsx_base64) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(body.xlsx_base64, 'base64') as any);
    const ws = body.sheet ? wb.getWorksheet(body.sheet) : wb.worksheets[0];
    if (!ws) throw badRequest('Worksheet not found');
    const out: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const vals = (row.values as any[]).slice(1).map((c) => {
        if (c === null || c === undefined) return '';
        if (c instanceof Date) return c.toISOString().substring(0, 10);
        if (typeof c === 'object') return String(c.result ?? c.text ?? c.richText?.map((r: any) => r.text).join('') ?? '');
        return String(c);
      });
      out.push(vals);
    });
    return out;
  }
  throw badRequest('Provide csv text or xlsx_base64');
}

interface Validated { status: 'valid' | 'invalid' | 'duplicate' | 'unmatched'; mapped: Record<string, any>; errors: string[]; signature: string; tourCodeRaw: string | null }

function validateRow(type: ImportType, rec: Record<string, string>, headMap: Record<string, string>): Omit<Validated, 'status'> & { invalid: boolean } {
  const errors: string[] = [];
  const m: Record<string, any> = {};
  const amt = (k: string) => {
    const r = parseAmount(rec[k] ?? '');
    if (r.error) errors.push(`${k}: ${r.error}`);
    return r.value;
  };
  const dt = (k: string, required: boolean) => {
    const raw = rec[k] ?? '';
    const d = parseDate(raw);
    if (!d && (required || raw.trim())) errors.push(`${k}: invalid or missing date "${raw}"`);
    return d;
  };
  const int = (k: string) => {
    const r = parseInt0(rec[k]);
    if (r.error) errors.push(`${k}: ${r.error}`);
    return r.value;
  };
  m.tour_code = (rec.tour_code ?? '').trim() || null;
  m.remarks = rec.remarks?.trim() || null;
  if (type === 'hotel') {
    m.hotel_name = rec.hotel_name?.trim();
    if (!m.hotel_name) errors.push('hotel_name missing');
    m.client_name = rec.client_name?.trim() || null; m.city = rec.city?.trim() || null;
    m.check_in = dt('check_in', true); m.check_out = dt('check_out', true);
    m.nights = rec.nights?.trim() ? int('nights') : m.check_in && m.check_out ? Math.round((Date.parse(m.check_out) - Date.parse(m.check_in)) / 86_400_000) : null;
    m.dbl = int('dbl'); m.sng = int('sng'); m.eb = int('eb'); m.cwb = int('cwb'); m.cnb = int('cnb');
    m.foc = rec.foc?.trim() || null; m.meal_plan = rec.meal_plan?.trim() || null;
    for (const k of ['sng_rate', 'dbl_rate', 'eb_rate', 'cwb_rate', 'cnb_rate', 'tea_coffee', 'amount_lstt', 'amount_hotel', 'dispute_amount']) m[k] = amt(k);
    if (m.amount_lstt === null && m.amount_hotel === null) errors.push('neither Amount (LSTT) nor Amount (Hotel) present');
  } else if (type === 'restaurant') {
    m.restaurant_name = rec.restaurant_name?.trim();
    if (!m.restaurant_name) errors.push('restaurant_name missing');
    m.date = dt('date', true); m.pax = int('pax'); m.foc = rec.foc?.trim() || null;
    for (const k of ['rate', 'amount_lstt', 'amount_restaurant', 'dispute_amount']) m[k] = amt(k);
    if (m.amount_lstt === null && m.amount_restaurant === null) errors.push('neither Amount LSTT nor Restaurant amount present');
  } else {
    m.date = dt('date', false); m.client_name = rec.client_name?.trim() || null;
    m.heads = {} as Record<string, string>;
    for (const [code, col] of Object.entries(headMap)) {
      const r = parseAmount(rec[`head:${code}`] ?? '');
      if (r.error) errors.push(`${col}: ${r.error}`);
      else if (r.value !== null) m.heads[code] = r.value; // blank cells are simply not recorded
    }
    if (!Object.keys(m.heads).length) errors.push('no expense amounts in row');
  }
  if (!m.tour_code) errors.push('Tour Code missing');
  const signature = createHash('sha256').update(JSON.stringify([type, m])).digest('hex').substring(0, 32);
  return { mapped: m, errors, signature, tourCodeRaw: m.tour_code, invalid: errors.some((e) => e !== 'Tour Code missing') };
}

export function importRoutes(db: Db) {
  const r = Router();

  r.get('/templates', ah(async (req, res) => {
    need(req.user!, 'import.run');
    const heads = (await db.query<any>('SELECT code, original_label FROM expense_heads WHERE original_label IS NOT NULL AND active ORDER BY id')).rows;
    res.json({ ...TEMPLATES, consolidated_heads: heads });
  }));

  /** Returns the header cells of an uploaded sheet so the user can map columns. */
  r.post('/headers', ah(async (req, res) => {
    need(req.user!, 'import.run');
    const b = z.object({ csv: z.string().optional(), xlsx_base64: z.string().optional(), sheet: z.string().optional(), header_row: z.number().int().min(1).default(1) }).parse(req.body);
    const table = await readTable(b);
    res.json({ headers: (table[b.header_row - 1] ?? []).map((h) => h.trim()).filter(Boolean), rowCount: Math.max(0, table.length - b.header_row) });
  }));

  r.post('/preview', ah(async (req, res) => {
    need(req.user!, 'import.run');
    const b = z.object({
      import_type: z.enum(['hotel', 'restaurant', 'consolidated']), file_name: z.string().min(1),
      csv: z.string().optional(), xlsx_base64: z.string().optional(), sheet: z.string().optional(),
      header_row: z.number().int().min(1).default(1),
      column_map: z.record(z.string()),              // system field → spreadsheet header
      head_map: z.record(z.string()).optional(),     // consolidated only: expense head code → header
    }).parse(req.body);
    const table = await readTable(b);
    const headers = (table[b.header_row - 1] ?? []).map((h) => h.trim());
    const idx = (header: string) => {
      const i = headers.findIndex((h) => h.toLowerCase() === header.trim().toLowerCase());
      if (i < 0) throw badRequest(`Column "${header}" not found. Headers: ${headers.join(' | ')}`);
      return i;
    };
    const colIdx = Object.fromEntries(Object.entries(b.column_map).map(([f, h]) => [f, idx(h)]));
    const headIdx = Object.fromEntries(Object.entries(b.head_map ?? {}).map(([code, h]) => [`head:${code}`, idx(h)]));
    if (b.import_type === 'consolidated') {
      const known = new Set((await db.query<any>('SELECT code FROM expense_heads')).rows.map((x) => x.code));
      for (const code of Object.keys(b.head_map ?? {})) if (!known.has(code)) throw badRequest(`Unknown expense head ${code}`);
    }
    const tours = new Set((await db.query<any>('SELECT tour_code FROM tours')).rows.map((x) => x.tour_code.toUpperCase()));
    const already = new Set((await db.query<any>(`SELECT legacy_ref FROM cost_items WHERE source = 'import'`)).rows.map((x) => x.legacy_ref.split(':')[1]));

    const out = await db.tx(async (q) => {
      const batch = await q.query<{ id: string }>('INSERT INTO import_batches (import_type, file_name, column_map, created_by) VALUES ($1,$2,$3,$4) RETURNING id::text', [b.import_type, b.file_name, JSON.stringify({ columns: b.column_map, heads: b.head_map ?? {}, header_row: b.header_row }), req.user!.id]);
      const seen = new Set<string>();
      const counts: Record<string, number> = { valid: 0, invalid: 0, duplicate: 0, unmatched: 0, blank_skipped: 0 };
      const rows = table.slice(b.header_row);
      for (let n = 0; n < rows.length; n++) {
        const cells = rows[n];
        if (cells.every((c) => !c?.trim())) { counts.blank_skipped++; continue; }
        const raw = Object.fromEntries(headers.map((h, i) => [h || `col${i + 1}`, cells[i] ?? '']));
        const rec: Record<string, string> = {};
        for (const [f, i] of Object.entries({ ...colIdx, ...headIdx })) rec[f] = cells[i as number] ?? '';
        const v = validateRow(b.import_type, rec, b.head_map ?? {});
        let status: Validated['status'];
        if (v.invalid) status = 'invalid';
        else if (seen.has(v.signature) || already.has(v.signature)) { status = 'duplicate'; v.errors.push(already.has(v.signature) ? 'already imported earlier' : 'identical to an earlier row in this file'); }
        else if (!v.tourCodeRaw || !tours.has(v.tourCodeRaw.toUpperCase())) { status = 'unmatched'; if (v.tourCodeRaw) v.errors.push(`Tour Code ${v.tourCodeRaw} not found`); }
        else status = 'valid';
        seen.add(v.signature);
        counts[status]++;
        await q.query('INSERT INTO import_rows (batch_id, row_number, raw, mapped, tour_code_raw, tour_code, status, errors) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [
          batch.rows[0].id, n + b.header_row + 1, JSON.stringify(raw), JSON.stringify({ ...v.mapped, _signature: v.signature }), v.tourCodeRaw,
          status === 'valid' ? v.tourCodeRaw!.toUpperCase() : null, status, JSON.stringify(v.errors),
        ]);
      }
      await q.query('UPDATE import_batches SET summary = $2 WHERE id = $1', [batch.rows[0].id, JSON.stringify(counts)]);
      return { batchId: batch.rows[0].id, summary: counts };
    });
    res.status(201).json(out);
  }));

  r.get('/:id', ah(async (req, res) => {
    need(req.user!, 'import.run');
    const batch = (await db.query('SELECT * FROM import_batches WHERE id = $1', [req.params.id])).rows[0];
    if (!batch) throw notFound();
    const rows = (await db.query('SELECT * FROM import_rows WHERE batch_id = $1 ORDER BY row_number', [req.params.id])).rows;
    res.json({ batch, rows });
  }));

  /** Exception queue: manually map an unmatched row to an existing Tour Code (never creates tours). */
  r.post('/:id/rows/:rowId/map', ah(async (req, res) => {
    need(req.user!, 'import.run');
    const b = z.object({ tour_code: z.string().min(1) }).parse(req.body);
    await db.tx(async (q) => {
      const row = (await q.query<any>('SELECT * FROM import_rows WHERE id = $1 AND batch_id = $2', [req.params.rowId, req.params.id])).rows[0];
      if (!row) throw notFound();
      if (row.status !== 'unmatched') throw conflict(`Row is ${row.status}, not unmatched`);
      const t = await q.query('SELECT 1 FROM tours WHERE tour_code = $1', [b.tour_code]);
      if (!t.rows.length) throw badRequest(`Tour Code ${b.tour_code} does not exist`);
      await q.query(`UPDATE import_rows SET tour_code = $2, status = 'valid', errors = errors || $3::jsonb WHERE id = $1`, [row.id, b.tour_code, JSON.stringify([`manually mapped from "${row.tour_code_raw ?? ''}" to ${b.tour_code}`])]);
      await audit(q, req.user!, { tour_code: b.tour_code, entity_type: 'import_row', entity_id: String(row.id), action: 'manual_map', before: { tour_code_raw: row.tour_code_raw }, after: b });
    });
    res.json({ ok: true });
  }));

  r.post('/:id/commit', ah(async (req, res) => {
    need(req.user!, 'import.run');
    const result = await db.tx(async (q) => {
      const batch = (await q.query<any>('SELECT * FROM import_batches WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
      if (!batch) throw notFound();
      if (batch.status !== 'previewed') throw conflict(`Batch is ${batch.status}`);
      const rows = (await q.query<any>(`SELECT * FROM import_rows WHERE batch_id = $1 AND status = 'valid' ORDER BY row_number`, [batch.id])).rows;
      let created = 0;
      for (const row of rows) {
        const ids = await commitRow(q, batch.import_type, row, req.user!.id);
        created += ids.length;
        await q.query(`UPDATE import_rows SET status = 'imported', cost_item_id = $2 WHERE id = $1`, [row.id, ids[0] ?? null]);
      }
      const left = (await q.query<any>(`SELECT status, count(*)::int AS n FROM import_rows WHERE batch_id = $1 GROUP BY status`, [batch.id])).rows;
      const summary = { ...(batch.summary ?? {}), committed_rows: rows.length, cost_items_created: created, remaining: Object.fromEntries(left.map((x) => [x.status, x.n])) };
      await q.query(`UPDATE import_batches SET status = 'committed', committed_at = now(), summary = $2 WHERE id = $1`, [batch.id, JSON.stringify(summary)]);
      await audit(q, req.user!, { entity_type: 'import_batch', entity_id: batch.id, action: 'commit', after: summary });
      return summary;
    });
    res.json(result);
  }));

  return r;
}

async function commitRow(q: Queryable, type: ImportType, row: any, userId: string): Promise<string[]> {
  const m = row.mapped;
  const sig = m._signature;
  const insert = async (c: Record<string, any>) => {
    const r = await q.query<{ id: string }>(
      `INSERT INTO cost_items (tour_code, kind, category_code, expense_head_id, description, payee_name, cost_nature, service_date, service_end_date,
         expected_amount, expected_calc, actual_amount, status, remarks, source, import_row_id, legacy_ref, created_by, updated_by)
       VALUES ($1,$2,$3,(SELECT id FROM expense_heads WHERE code = $4),$5,$6,
               coalesce((SELECT cost_nature FROM expense_heads WHERE code = $4),'supplier'),$7,$8,$9,$10,$11,$12,$13,'import',$14,$15,$16,$16)
       RETURNING id::text`,
      [row.tour_code, c.kind, c.category, c.head, c.description ?? null, c.payee ?? null, c.service_date ?? null, c.service_end_date ?? null,
       c.expected ?? null, JSON.stringify(c.calc ?? { rule: 'import' }), c.actual ?? null, c.actual !== null && c.actual !== undefined ? 'bill_received' : 'booked',
       c.remarks ?? null, row.id, `IMP:${sig}${c.suffix ? ':' + c.suffix : ''}`, userId],
    );
    return r.rows[0].id;
  };
  if (type === 'hotel') {
    // Sheet's "Amount (LSTT)" is kept as the expected amount; the system's own calculation is stored alongside for comparison.
    const detail = { nights: m.nights ?? 0, dbl_rooms: m.dbl, sng_rooms: m.sng, extra_beds: m.eb, cwb: m.cwb, cnb: m.cnb, foc_rooms: 0, dbl_rate: m.dbl_rate ?? '0', sng_rate: m.sng_rate ?? '0', eb_rate: m.eb_rate ?? '0', cwb_rate: m.cwb_rate ?? '0', cnb_rate: m.cnb_rate ?? '0', tea_coffee: m.tea_coffee ?? '0', tea_coffee_basis: 'lump_sum' as const, rate_adjustment_pct: '0', foc_rule: 'none' as const };
    const sys = hotelExpected(detail);
    const id = await insert({
      kind: 'hotel', category: 'hotels', head: 'HOTEL', description: `${m.hotel_name}${m.city ? ', ' + m.city : ''}`, payee: m.hotel_name,
      service_date: m.check_in, service_end_date: m.check_out, expected: m.amount_lstt, actual: m.amount_hotel, remarks: m.remarks,
      calc: { rule: 'import', source_column: 'Amount (LSTT)', system_check: { amount: fmt(sys.amount), breakdown: sys.breakdown, matches_sheet: m.amount_lstt !== null && fmt(sys.amount) === m.amount_lstt } },
    });
    await q.query(
      `INSERT INTO hotel_stay_details (cost_item_id, hotel_name, city, check_in, check_out, nights, dbl_rooms, sng_rooms, extra_beds, foc, cwb, cnb, meal_plan,
         dbl_rate, sng_rate, eb_rate, cwb_rate, cnb_rate, tea_coffee, dispute_amount, hotel_remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [id, m.hotel_name, m.city, m.check_in, m.check_out, m.nights ?? 0, m.dbl, m.sng, m.eb, m.foc, m.cwb, m.cnb, m.meal_plan, m.dbl_rate ?? 0, m.sng_rate ?? 0, m.eb_rate ?? 0, m.cwb_rate ?? 0, m.cnb_rate ?? 0, m.tea_coffee ?? 0, m.dispute_amount, m.remarks],
    );
    return [id];
  }
  if (type === 'restaurant') {
    const sys = m.rate !== null ? restaurantExpected({ pax: m.pax, foc_qty: 0, rate_per_pax: m.rate, foc_rule: 'none' }) : null;
    const id = await insert({
      kind: 'restaurant', category: 'restaurants', head: 'RESTAURANT', description: m.restaurant_name, payee: m.restaurant_name,
      service_date: m.date, expected: m.amount_lstt, actual: m.amount_restaurant, remarks: m.remarks,
      calc: { rule: 'import', source_column: 'Amount LSTT', system_check: sys && { amount: fmt(sys.amount), matches_sheet: fmt(sys.amount) === m.amount_lstt } },
    });
    const focNum = parseInt(String(m.foc ?? '').match(/\d+/)?.[0] ?? '0', 10);
    await q.query('INSERT INTO restaurant_details (cost_item_id, restaurant_name, pax, foc_qty, foc_description, rate_per_pax, dispute_amount) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, m.restaurant_name, m.pax, focNum, m.foc, m.rate ?? 0, m.dispute_amount]);
    return [id];
  }
  // consolidated: one cost line per non-blank head cell, recorded as the actual amount
  const ids: string[] = [];
  for (const [code, amount] of Object.entries<string>(m.heads)) {
    const head = (await q.query<any>('SELECT category_code, original_label FROM expense_heads WHERE code = $1', [code])).rows[0];
    // NOTE: whether the sheet's GUIDE IMPREST column is the advance or the spent amount is unconfirmed; it is imported as recorded cost.
    ids.push(await insert({ kind: 'general', category: head.category_code, head: code, description: `${head.original_label ?? code} (consolidated sheet)`, service_date: m.date, actual: amount, remarks: m.remarks, suffix: code }));
  }
  return ids;
}
