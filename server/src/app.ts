import express from 'express';
import { z } from 'zod';
import type { Db } from './db/client.ts';
import { authRoutes, requireAuth } from './auth/middleware.ts';
import { ah, badRequest, forbidden } from './lib/http.ts';
import { errorHandler } from './lib/http.ts';
import { financeRoutes } from './finance/routes.ts';
import { audit, need, nextTourCode } from './finance/service.ts';

export function createApp(db: Db, opts: { uploadDir: string }) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => (req.path.startsWith('/finance/documents') && req.method === 'POST' ? next() : express.json({ limit: '25mb' })(req, res, next)));

  app.get('/api/health', ah(async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true, db: db.kind });
  }));
  app.use('/api/auth', authRoutes(db));
  app.use('/api', requireAuth(db));

  app.get('/api/me', (req, res) => res.json({ ...req.user, permissions: [...req.user!.permissions] }));

  // Tours: existing Tour Codes are the backbone of the finance module.
  app.get('/api/tours', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    res.json((await db.query(`SELECT tour_code, client_name, destination, to_char(start_date,'YYYY-MM-DD') start_date, to_char(end_date,'YYYY-MM-DD') end_date, status, salesperson_name, operations_lead_name FROM tours ORDER BY start_date DESC`)).rows);
  }));

  /** Confirmed booking → Tour Code (server-generated). Used by Sales on confirmation. */
  app.post('/api/tours', ah(async (req, res) => {
    if (!['sales', 'executive', 'accounts'].includes(req.user!.department)) throw forbidden('Only Sales, Accounts or Management can confirm a tour');
    const b = z.object({
      enquiry_id: z.string().nullish(), quotation_code: z.string().nullish(), quotation_version: z.number().int().nullish(),
      client_name: z.string().min(1), agent_id: z.string().nullish(), destination: z.string().min(1), package_name: z.string().nullish(),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      adults: z.number().int().min(0), children: z.number().int().min(0).default(0), infants: z.number().int().min(0).default(0), room_count: z.number().int().nullish(),
      salesperson_name: z.string().nullish(), operations_lead_name: z.string().nullish(),
      quoted_amount: z.string().nullish(), confirmed_selling_price: z.string().regex(/^\d+(\.\d{1,2})?$/), gst_amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    }).parse(req.body);
    if (b.end_date < b.start_date) throw badRequest('end_date before start_date');
    const out = await db.tx(async (q) => {
      const code = await nextTourCode(q, Number(b.start_date.substring(0, 4)) || new Date().getFullYear());
      const nights = Math.round((Date.parse(b.end_date) - Date.parse(b.start_date)) / 86_400_000);
      await q.query(
        `INSERT INTO tours (tour_code, booking_id, enquiry_id, quotation_code, quotation_version, client_name, agent_id, destination, package_name, start_date, end_date,
           nights, days, adults, children, infants, room_count, salesperson_name, operations_lead_name, status, quoted_amount, confirmed_selling_price, gst_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'confirmed',$20,$21,$22)`,
        [code, code.replace('LST-', 'BKG-'), b.enquiry_id ?? null, b.quotation_code ?? null, b.quotation_version ?? null, b.client_name, b.agent_id ?? null, b.destination,
         b.package_name ?? null, b.start_date, b.end_date, nights, nights + 1, b.adults, b.children, b.infants, b.room_count ?? null,
         b.salesperson_name ?? req.user!.name, b.operations_lead_name ?? null, b.quoted_amount ?? null, b.confirmed_selling_price, b.gst_amount],
      );
      await audit(q, req.user!, { tour_code: code, entity_type: 'tour', entity_id: code, action: 'create', after: b });
      return { tour_code: code };
    });
    res.status(201).json(out);
  }));

  app.get('/api/suppliers', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    res.json((await db.query('SELECT * FROM suppliers ORDER BY name')).rows);
  }));
  app.get('/api/fleet', ah(async (req, res) => {
    need(req.user!, 'finance.view');
    res.json((await db.query('SELECT * FROM fleet_vehicles ORDER BY id')).rows);
  }));

  app.use('/api/finance', financeRoutes(db, opts));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
