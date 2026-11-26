import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { ah, forbidden, HttpError } from '../lib/http.ts';
import { hashToken, newToken, verifyPassword } from './passwords.ts';
import { permissionsFor, type Department, type Permission } from './permissions.ts';

export interface AuthUser {
  id: string; loginId: string; name: string; department: Department; isManager: boolean; permissions: Set<Permission>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

const SESSION_HOURS = 12;

export function requireAuth(db: Db) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (async () => {
      const header = req.header('authorization') ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) throw new HttpError(401, 'Not signed in');
      const r = await db.query<any>(
        `SELECT u.id, u.login_id, u.name, u.department, u.is_manager FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active`,
        [hashToken(token)],
      );
      const u = r.rows[0];
      if (!u) throw new HttpError(401, 'Session expired');
      req.user = { id: u.id, loginId: u.login_id, name: u.name, department: u.department, isManager: u.is_manager, permissions: permissionsFor(u.department, u.is_manager) };
    })().then(() => next(), next);
  };
}

export function can(req: Request, p: Permission): boolean {
  return !!req.user?.permissions.has(p);
}
export function need(req: Request, ...ps: Permission[]) {
  for (const p of ps) if (!can(req, p)) throw forbidden(`Missing permission: ${p}`);
}

export function authRoutes(db: Db) {
  const r = Router();
  r.post('/login', ah(async (req, res) => {
    const body = z.object({ loginId: z.string().min(1), password: z.string().min(1) }).parse(req.body);
    const u = (await db.query<any>('SELECT id, password_hash, active FROM users WHERE login_id = $1', [body.loginId])).rows[0];
    if (!u || !u.active || !(await verifyPassword(body.password, u.password_hash))) throw new HttpError(401, 'Invalid login ID or password');
    const token = newToken();
    await db.query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1,$2, now() + interval '${SESSION_HOURS} hours')`, [hashToken(token), u.id]);
    res.json({ token, expiresInHours: SESSION_HOURS });
  }));
  return r;
}
