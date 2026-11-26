/**
 * Database access layer.
 *
 * Production: real PostgreSQL via DATABASE_URL (node-postgres pool).
 * Development / tests: when DATABASE_URL is not set, an embedded PostgreSQL
 * (PGlite) is used — same SQL dialect, no credentials needed. PGLITE_DIR
 * selects a folder for persistence; "memory" keeps it in RAM (tests).
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

export interface Queryable {
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface Db extends Queryable {
  /** Runs fn inside BEGIN/COMMIT; rolls back on any thrown error. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  kind: 'postgres' | 'pglite';
}

// NUMERIC must come back as string (never float); BIGINT as string too.
pg.types.setTypeParser(1700, (v) => v);
pg.types.setTypeParser(20, (v) => v);
// DATE stays 'YYYY-MM-DD' (no timezone shifting).
pg.types.setTypeParser(1082, (v) => v);

export function createPostgresDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 10 });
  return {
    kind: 'postgres',
    query: (text, params) => pool.query(text, params as any[]) as any,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (t, p) => client.query(t, p as any[]) as any });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

export async function createPgliteDb(dir?: string): Promise<Db> {
  const parsers = { 1700: (v: string) => v, 20: (v: string) => v, 1082: (v: string) => v };
  // PGlite creates only the last folder level; make sure the parents exist on a fresh checkout.
  if (dir && dir !== 'memory') mkdirSync(dirname(dir), { recursive: true });
  const lite = dir && dir !== 'memory' ? new PGlite(dir, { parsers }) : new PGlite({ parsers });
  await lite.waitReady;
  // Serialise transactions: PGlite is single-connection.
  let chain: Promise<unknown> = Promise.resolve();
  const wrap = (q: { query: PGlite['query'] }): Queryable => ({
    query: async (text, params) => {
      const r = await q.query(text, params as any[]);
      return { rows: r.rows.map(normaliseRow) as any[] };
    },
  });
  const base = wrap(lite);
  return {
    kind: 'pglite',
    query: (text, params) => {
      const run = chain.then(() => base.query(text, params));
      chain = run.catch(() => {});
      return run as any;
    },
    tx(fn) {
      const run = chain.then(() => lite.transaction((t) => fn(wrap(t as any))));
      chain = run.catch(() => {});
      return run as any;
    },
    close: () => lite.close(),
  };
}

/** PGlite returns NUMERIC as string already, but BIGINT/COUNT as bigint — normalise to string. */
function normaliseRow(row: any) {
  for (const k of Object.keys(row)) {
    if (typeof row[k] === 'bigint') row[k] = row[k].toString();
  }
  return row;
}

export async function createDbFromEnv(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) return createPostgresDb(url);
  return createPgliteDb(process.env.PGLITE_DIR ?? 'server/.data/pglite');
}
