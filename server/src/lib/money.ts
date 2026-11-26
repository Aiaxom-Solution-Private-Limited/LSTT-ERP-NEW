/**
 * Decimal-safe money. All amounts are handled as integer paise (BigInt) and
 * only formatted back to "1234.56" strings at the edges. No floats.
 * Rounding: half away from zero, to the paisa.
 */
export type Paise = bigint;

const DEC_RE = /^([+-])?(\d*)(?:\.(\d*))?$/;

/** Parses "1234", "1234.5", "-0.75", 1234 (integer number), null → 0n. */
export function toPaise(v: string | number | bigint | null | undefined): Paise {
  if (v === null || v === undefined || v === '') return 0n;
  if (typeof v === 'bigint') return v * 100n;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Invalid amount: ${v}`);
    v = numberToDecimalString(v);
  }
  return scaleDecimal(String(v).replace(/,/g, '').trim(), 2);
}

export function toPaiseOrNull(v: string | number | null | undefined): Paise | null {
  return v === null || v === undefined || v === '' ? null : toPaise(v);
}

/** Paise → "1234.56" */
export function fmt(p: Paise): string {
  const neg = p < 0n;
  const abs = neg ? -p : p;
  const s = `${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
  return neg ? `-${s}` : s;
}
export function fmtOrNull(p: Paise | null): string | null {
  return p === null ? null : fmt(p);
}

/** amount × quantity where quantity is a decimal ("2", "123.5", "0.333"). */
export function mul(p: Paise, qty: string | number | bigint): Paise {
  const q = typeof qty === 'bigint' ? qty.toString() : typeof qty === 'number' ? numberToDecimalString(qty) : qty;
  const { int, scale } = parseScaled(q);
  return divRound(p * int, 10n ** BigInt(scale));
}

/** Applies a percentage adjustment, e.g. pct = "-20" → 80% of p. */
export function adjustPct(p: Paise, pct: string | number): Paise {
  const { int, scale } = parseScaled(typeof pct === 'number' ? numberToDecimalString(pct) : pct);
  const denom = 100n * 10n ** BigInt(scale);
  return divRound(p * (denom + int), denom);
}

/** (num / den) × 100 rounded to 2 decimals, as string. Null when den <= 0. */
export function pct(num: Paise, den: Paise): string | null {
  if (den <= 0n) return null;
  const basisPoints = divRound(num * 10000n, den); // percentage × 100
  return fmt(basisPoints);
}

export const sum = (xs: Paise[]): Paise => xs.reduce((a, b) => a + b, 0n);
export const max0 = (p: Paise): Paise => (p < 0n ? 0n : p);

function divRound(n: bigint, d: bigint): bigint {
  const q = n / d;
  const r = n % d;
  if (r === 0n) return q;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice >= (d < 0n ? -d : d)) return q + ((n < 0n) !== (d < 0n) ? -1n : 1n);
  return q;
}

function parseScaled(s: string): { int: bigint; scale: number } {
  const m = DEC_RE.exec(s.trim());
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) throw new Error(`Invalid decimal: ${s}`);
  const frac = m[3] ?? '';
  const int = BigInt((m[2] || '0') + frac) * (m[1] === '-' ? -1n : 1n);
  return { int, scale: frac.length };
}

function scaleDecimal(s: string, places: number): bigint {
  const { int, scale } = parseScaled(s);
  if (scale <= places) return int * 10n ** BigInt(places - scale);
  return divRound(int, 10n ** BigInt(scale - places));
}

function numberToDecimalString(n: number): string {
  // Avoid exponent notation; numbers from JSON (e.g. 128000, 33.75) are exact enough at 6dp.
  return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(6);
}
