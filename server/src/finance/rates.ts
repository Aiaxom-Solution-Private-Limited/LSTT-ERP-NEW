/**
 * Expected-amount calculators. Each returns the amount plus a breakdown so the
 * UI and audit trail can show exactly how a figure was produced.
 *
 * NOTE: These rules are configurable, not assumed universal. The hotel formula
 * in particular must be verified against the client's hotel sheet before it is
 * relied on for historical comparison (see docs/TOUR_FINANCE.md, "Open questions").
 */
import { adjustPct, fmt, mul, toPaise, type Paise } from '../lib/money.ts';

export interface HotelRateInput {
  nights: number;
  dbl_rooms: number;
  sng_rooms: number;
  extra_beds: number;
  cwb: number;
  cnb: number;
  foc_rooms: string | number;
  dbl_rate: string | number;
  sng_rate: string | number;
  eb_rate: string | number;
  cwb_rate: string | number;
  cnb_rate: string | number;
  tea_coffee: string | number;
  tea_coffee_basis: 'lump_sum' | 'per_pax_per_night' | 'per_night';
  rate_adjustment_pct: string | number;
  foc_rule: 'none' | 'deduct_single' | 'deduct_double';
}

export interface CalcResult {
  amount: Paise;
  breakdown: Record<string, string | number>;
  rule: string;
}

/**
 * Per-room-per-night model:
 *   per night = Dbl×DBL.Rate + Sng×SNG.Rate + EB×EB RATE + CWB×CWB rate + CNB×CNB rate
 *               − FOC deduction (only if foc_rule says so)
 *   rooms total = per night × nights, then rate adjustment % (seasonal / special)
 *   + tea/coffee per its basis (not subject to the room-rate adjustment)
 * Rates are assumed to already reflect the meal plan (rates are per meal-plan contract).
 */
export function hotelExpected(h: HotelRateInput): CalcResult {
  const dbl = mul(toPaise(h.dbl_rate), h.dbl_rooms);
  const sng = mul(toPaise(h.sng_rate), h.sng_rooms);
  const eb = mul(toPaise(h.eb_rate), h.extra_beds);
  const cwb = mul(toPaise(h.cwb_rate), h.cwb);
  const cnb = mul(toPaise(h.cnb_rate), h.cnb);
  let focDeduction = 0n;
  if (h.foc_rule === 'deduct_single') focDeduction = mul(toPaise(h.sng_rate), String(h.foc_rooms));
  if (h.foc_rule === 'deduct_double') focDeduction = mul(toPaise(h.dbl_rate), String(h.foc_rooms));
  const perNight = dbl + sng + eb + cwb + cnb - focDeduction;
  const roomsGross = mul(perNight, h.nights);
  const rooms = adjustPct(roomsGross, String(h.rate_adjustment_pct || 0));
  const pax = h.dbl_rooms * 2 + h.sng_rooms + h.extra_beds + h.cwb + h.cnb;
  const tc = toPaise(h.tea_coffee);
  const teaCoffee =
    h.tea_coffee_basis === 'lump_sum' ? tc : h.tea_coffee_basis === 'per_night' ? mul(tc, h.nights) : mul(mul(tc, pax), h.nights);
  return {
    amount: rooms + teaCoffee,
    rule: `hotel.per_room_per_night/foc:${h.foc_rule}/tea:${h.tea_coffee_basis}`,
    breakdown: {
      dbl: fmt(dbl), sng: fmt(sng), eb: fmt(eb), cwb: fmt(cwb), cnb: fmt(cnb),
      foc_deduction: fmt(focDeduction), per_night: fmt(perNight), nights: h.nights,
      rooms_before_adjustment: fmt(roomsGross), rate_adjustment_pct: String(h.rate_adjustment_pct || 0),
      rooms_after_adjustment: fmt(rooms), tea_coffee: fmt(teaCoffee), pax_for_tea_coffee: pax,
    },
  };
}

export interface RestaurantRateInput {
  pax: number;
  foc_qty: number;
  rate_per_pax: string | number;
  foc_rule: 'none' | 'deduct';
}

/** Expected = applicable pax × rate. FOC is NOT deducted unless foc_rule = 'deduct'. */
export function restaurantExpected(r: RestaurantRateInput): CalcResult {
  const qty = r.foc_rule === 'deduct' ? Math.max(0, r.pax - r.foc_qty) : r.pax;
  const amount = mul(toPaise(r.rate_per_pax), qty);
  return {
    amount,
    rule: `restaurant.pax_x_rate/foc:${r.foc_rule}`,
    breakdown: { pax: r.pax, foc_qty: r.foc_qty, applicable_qty: qty, rate: fmt(toPaise(r.rate_per_pax)), amount: fmt(amount) },
  };
}

/** per_day / per_trip / per_km: quantity × rate. fixed / custom: rate is the agreed amount. */
export function transportExpected(rateBasis: string, unitRate: string | number | null, quantity: string | number | null): CalcResult | null {
  if (unitRate === null || unitRate === undefined || unitRate === '') return null;
  const rate = toPaise(unitRate);
  if (rateBasis === 'fixed' || rateBasis === 'custom') {
    return { amount: rate, rule: `transport.${rateBasis}`, breakdown: { agreed: fmt(rate) } };
  }
  if (quantity === null || quantity === undefined || quantity === '') return null;
  const amount = mul(rate, String(quantity));
  return { amount, rule: `transport.${rateBasis}`, breakdown: { rate: fmt(rate), quantity: String(quantity), amount: fmt(amount) } };
}

export function transportActual(d: {
  actual_base_amount: string | null; driver_allowance: string; fuel: string; toll: string; parking: string; other_charges: string;
}): Paise | null {
  if (d.actual_base_amount === null || d.actual_base_amount === undefined) return null;
  return toPaise(d.actual_base_amount) + toPaise(d.driver_allowance) + toPaise(d.fuel) + toPaise(d.toll) + toPaise(d.parking) + toPaise(d.other_charges);
}

export function dsaExpected(days: string | number | null, rate: string | number | null): CalcResult | null {
  if (days === null || rate === null || days === undefined || rate === undefined) return null;
  const amount = mul(toPaise(rate), String(days));
  return { amount, rule: 'guide.days_x_dsa_rate', breakdown: { days: String(days), dsa_rate: fmt(toPaise(rate)), amount: fmt(amount) } };
}

/**
 * Imprest: the advance is a cash float, not a cost.
 * Cost = voucher-supported expense + separately approved additional expense.
 * Settlement = advanced − supported: positive → guide must return; negative → company owes guide.
 */
export function imprestPosition(g: {
  imprest_advanced: string; imprest_supported_expense: string | null; imprest_returned: string; additional_approved: string;
}) {
  const advanced = toPaise(g.imprest_advanced);
  const supported = g.imprest_supported_expense === null ? null : toPaise(g.imprest_supported_expense);
  const returned = toPaise(g.imprest_returned);
  const additional = toPaise(g.additional_approved);
  const cost = supported === null ? null : supported + additional;
  const toBeReturned = supported === null ? null : advanced - supported; // may be negative
  const unsettled = toBeReturned === null ? null : toBeReturned - returned;
  return {
    advanced, supported, returned, additional, cost,
    /** >0: guide still holds this much of the advance; <0: company owes guide this much (before additional). */
    balanceWithGuide: unsettled,
  };
}

export function quantityRate(quantity: string | number | null, unitRate: string | number | null): CalcResult | null {
  if (quantity === null || unitRate === null || quantity === undefined || unitRate === undefined || quantity === '' || unitRate === '') return null;
  const amount = mul(toPaise(unitRate), String(quantity));
  return { amount, rule: 'quantity_x_rate', breakdown: { quantity: String(quantity), rate: fmt(toPaise(unitRate)), amount: fmt(amount) } };
}
