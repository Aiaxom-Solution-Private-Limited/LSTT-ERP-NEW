import React, { useMemo, useState } from 'react';
import { get, patch, post } from './api';
import { Btn, ErrorBox, Field, Input, Modal, Select, TextArea, useAction, useLoad } from './ui';

export const KINDS: { value: string; label: string }[] = [
  { value: 'hotel', label: 'Hotel stay' },
  { value: 'restaurant', label: 'Restaurant / meal' },
  { value: 'transport', label: 'Transport / vehicle' },
  { value: 'guide_dsa', label: 'Guide DSA' },
  { value: 'guide_imprest', label: 'Guide imprest' },
  { value: 'activity', label: 'Activity / SDF / permit / rafting / cultural' },
  { value: 'general', label: 'General expense' },
];

type Rec = Record<string, any>;
const s = (v: any) => (v === null || v === undefined ? '' : String(v));
/** Empty inputs are sent as null (blank is not zero). */
const n = (v: string) => (v.trim() === '' ? null : v.trim());

export const CostItemForm: React.FC<{ tourCode?: string | null; item?: Rec | null; onClose: () => void; onSaved: () => void }> = ({ tourCode, item, onClose, onSaved }) => {
  const editing = !!item;
  const [kind, setKind] = useState<string>(item?.kind ?? 'hotel');
  const [f, setF] = useState<Rec>(() => ({
    tour_code: item?.tour_code ?? tourCode ?? '',
    is_unallocated: item?.is_unallocated ?? false,
    expense_head_code: item?.head_code ?? '',
    description: s(item?.description), supplier_id: s(item?.supplier_id), payee_name: s(item?.payee_name),
    service_date: s(item?.service_date), service_end_date: s(item?.service_end_date), destination: s(item?.destination),
    quantity: s(item?.quantity), unit_rate: s(item?.unit_rate), expected_amount: s(item?.expected_amount),
    actual_amount: s(item?.actual_amount), tax_amount: item ? s(item.tax_amount) : '', status: item?.status ?? 'booked',
    bill_reference: s(item?.bill_reference), payment_mode: s(item?.payment_mode), remarks: s(item?.remarks), reason: '',
  }));
  const [d, setD] = useState<Rec>(() => Object.fromEntries(Object.entries(item?.detail ?? {}).filter(([k]) => k !== 'cost_item_id').map(([k, v]) => [k, v === null ? '' : v])));
  const heads = useLoad(() => get<any[]>('/finance/expense-heads'), []);
  const suppliers = useLoad(() => get<any[]>('/suppliers'), []);
  const tours = useLoad(() => get<any[]>('/tours'), []);
  const fleet = useLoad(() => get<any[]>('/fleet'), []);
  const { busy, error, run } = useAction();
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const [detailDirty, setDetailDirty] = useState(false);
  const setDet = (k: string) => (e: React.ChangeEvent<any>) => { setDetailDirty(true); setD({ ...d, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }); };
  const closedOrApproved = item?.status === 'approved';

  const headOptions = useMemo(() => (heads.data ?? []).filter((h) => h.active || h.code === f.expense_head_code), [heads.data, f.expense_head_code]);
  const isCalculated = ['hotel', 'restaurant', 'guide_dsa'].includes(kind) || (kind === 'transport') || (['activity', 'general'].includes(kind) && f.quantity && f.unit_rate);

  const detailPayload = (): Rec | undefined => {
    const pick = (keys: string[], numeric: string[] = []) => {
      const o: Rec = {};
      for (const k of keys) {
        const v = d[k];
        if (v === undefined) continue;
        if (typeof v === 'boolean') o[k] = v;
        else if (numeric.includes(k)) o[k] = s(v).trim() === '' ? (k.endsWith('_rate') || ['tea_coffee', 'rate_adjustment_pct', 'foc_rooms'].includes(k) ? '0' : 0) : Number(v);
        else o[k] = s(v).trim() === '' ? null : v;
      }
      return o;
    };
    switch (kind) {
      case 'hotel': return pick(['hotel_name', 'city', 'check_in', 'check_out', 'dbl_rooms', 'sng_rooms', 'extra_beds', 'foc', 'foc_rooms', 'cwb', 'cnb', 'meal_plan', 'dbl_rate', 'sng_rate', 'eb_rate', 'cwb_rate', 'cnb_rate', 'tea_coffee', 'tea_coffee_basis', 'rate_adjustment_pct', 'foc_rule', 'booking_reference', 'hotel_remarks'], ['dbl_rooms', 'sng_rooms', 'extra_beds', 'cwb', 'cnb']);
      case 'restaurant': return pick(['restaurant_name', 'pax', 'foc_qty', 'foc_description', 'rate_per_pax', 'foc_rule', 'meal_type'], ['pax', 'foc_qty']);
      case 'transport': return pick(['vehicle_type', 'registration', 'vehicle_id', 'is_company_owned', 'route', 'service_type', 'rate_basis', 'actual_base_amount', 'driver_allowance', 'fuel', 'toll', 'parking', 'other_charges']);
      case 'guide_dsa': return pick(['guide_name', 'days', 'dsa_rate']);
      case 'guide_imprest': return pick(['guide_name', 'imprest_advanced', 'imprest_supported_expense', 'imprest_returned', 'additional_approved']);
      default: return undefined;
    }
  };

  const submit = () => run(async () => {
    const detail = detailPayload();
    const common: Rec = {
      expense_head_code: n(f.expense_head_code), description: n(f.description), supplier_id: n(f.supplier_id), payee_name: n(f.payee_name),
      service_date: n(f.service_date), service_end_date: n(f.service_end_date), destination: n(f.destination), quantity: n(f.quantity), unit_rate: n(f.unit_rate),
      bill_reference: n(f.bill_reference), payment_mode: n(f.payment_mode), remarks: n(f.remarks), reason: n(f.reason),
      ...(detail ? { detail } : {}),
    };
    const amountFields: Rec = {};
    if (!['transport', 'guide_imprest'].includes(kind)) amountFields.actual_amount = n(f.actual_amount);
    if (!isCalculated) amountFields.expected_amount = n(f.expected_amount);
    if (f.tax_amount !== '') amountFields.tax_amount = n(f.tax_amount);
    if (editing) {
      const body: Rec = { ...common, ...amountFields };
      delete body.expense_head_code;
      // send only changed keys so approved lines are not re-opened needlessly
      for (const k of Object.keys(body)) if (k !== 'reason' && k !== 'detail' && s(body[k]) === s(item![k])) delete body[k];
      if (!detailDirty) delete body.detail;
      await patch(`/finance/cost-items/${item!.id}`, body);
    } else {
      await post('/finance/cost-items', {
        ...common, ...amountFields, kind, status: f.status,
        tour_code: f.is_unallocated ? null : n(f.tour_code), is_unallocated: !!f.is_unallocated,
      });
    }
    onSaved();
    onClose();
  });

  return (
    <Modal title={editing ? `Edit cost line #${item!.id}` : 'Add cost line'} onClose={onClose} wide>
      <div className="space-y-4">
        {closedOrApproved && <div className="text-xs p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">This line is approved. Changing an amount sends it back to Accounts verification and needs a reason.</div>}
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Line type" required>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} disabled={editing}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select>
          </Field>
          {!editing && (
            <Field label="Tour Code" required={!f.is_unallocated} hint={f.is_unallocated ? 'Company-level expense: not included in any tour P&L' : undefined}>
              <Select value={f.tour_code} onChange={set('tour_code')} disabled={f.is_unallocated || !!tourCode}>
                <option value="">Select…</option>
                {(tours.data ?? []).map((t) => <option key={t.tour_code} value={t.tour_code}>{t.tour_code} · {t.client_name}</option>)}
              </Select>
            </Field>
          )}
          {!editing && !tourCode && (
            <label className="flex items-center gap-2 text-xs text-slate-700 sm:mt-6"><input type="checkbox" checked={f.is_unallocated} onChange={set('is_unallocated')} /> Unallocated company-level expense</label>
          )}
          <Field label="Expense head" hint="Original sheet labels are preserved">
            <Select value={f.expense_head_code} onChange={set('expense_head_code')} disabled={editing}>
              <option value="">Default for line type</option>
              {headOptions.map((h) => <option key={h.code} value={h.code}>{h.display_name}{h.original_label && h.original_label !== h.display_name ? ` (${h.original_label})` : ''}{h.needs_confirmation ? ' · unconfirmed' : ''}</option>)}
            </Select>
          </Field>
          {!editing && (
            <Field label="Starting status">
              <Select value={f.status} onChange={set('status')}>
                {['estimated', 'booked', 'service_completed', 'bill_pending', 'bill_received'].map((x) => <option key={x} value={x}>{x.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Supplier">
            <Select value={f.supplier_id} onChange={set('supplier_id')}>
              <option value="">— none / internal —</option>
              {(suppliers.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.category})</option>)}
            </Select>
          </Field>
          <Field label="Payee / vendor name" hint="If not in supplier master"><Input value={f.payee_name} onChange={set('payee_name')} /></Field>
        </div>

        {kind === 'hotel' && (
          <fieldset className="border border-slate-200 rounded-lg p-3">
            <legend className="text-[11px] font-semibold text-slate-500 px-1">Hotel stay (sheet columns preserved)</legend>
            <div className="grid sm:grid-cols-4 gap-3">
              <Field label="Hotel name" required className="sm:col-span-2"><Input value={s(d.hotel_name)} onChange={setDet('hotel_name')} /></Field>
              <Field label="City / destination"><Input value={s(d.city)} onChange={setDet('city')} /></Field>
              <Field label="Meal plan"><Select value={s(d.meal_plan)} onChange={setDet('meal_plan')}><option value="">—</option>{['EP', 'CP', 'MAP', 'AP'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
              <Field label="Check-in" required><Input type="date" value={s(d.check_in)} onChange={setDet('check_in')} /></Field>
              <Field label="Check-out" required><Input type="date" value={s(d.check_out)} onChange={setDet('check_out')} /></Field>
              <Field label="Booking reference"><Input value={s(d.booking_reference)} onChange={setDet('booking_reference')} /></Field>
              <Field label="FOC (as recorded)"><Input value={s(d.foc)} onChange={setDet('foc')} placeholder="e.g. 1 SGL" /></Field>
              <Field label="Dbl rooms"><Input inputMode="numeric" value={s(d.dbl_rooms)} onChange={setDet('dbl_rooms')} /></Field>
              <Field label="DBL.Rate"><Input inputMode="decimal" value={s(d.dbl_rate)} onChange={setDet('dbl_rate')} /></Field>
              <Field label="Sng rooms"><Input inputMode="numeric" value={s(d.sng_rooms)} onChange={setDet('sng_rooms')} /></Field>
              <Field label="SNG.Rate"><Input inputMode="decimal" value={s(d.sng_rate)} onChange={setDet('sng_rate')} /></Field>
              <Field label="Extra beds (EB)"><Input inputMode="numeric" value={s(d.extra_beds)} onChange={setDet('extra_beds')} /></Field>
              <Field label="EB RATE"><Input inputMode="decimal" value={s(d.eb_rate)} onChange={setDet('eb_rate')} /></Field>
              <Field label="CWB (count)"><Input inputMode="numeric" value={s(d.cwb)} onChange={setDet('cwb')} /></Field>
              <Field label="CWB rate"><Input inputMode="decimal" value={s(d.cwb_rate)} onChange={setDet('cwb_rate')} /></Field>
              <Field label="CNB (count)"><Input inputMode="numeric" value={s(d.cnb)} onChange={setDet('cnb')} /></Field>
              <Field label="CNB rate"><Input inputMode="decimal" value={s(d.cnb_rate)} onChange={setDet('cnb_rate')} /></Field>
              <Field label="Tea/coffee"><Input inputMode="decimal" value={s(d.tea_coffee)} onChange={setDet('tea_coffee')} /></Field>
              <Field label="Tea/coffee basis"><Select value={s(d.tea_coffee_basis) || 'lump_sum'} onChange={setDet('tea_coffee_basis')}><option value="lump_sum">Lump sum</option><option value="per_night">Per night</option><option value="per_pax_per_night">Per pax per night</option></Select></Field>
              <Field label="Rate adjustment %" hint="e.g. −20 off season"><Input inputMode="decimal" value={s(d.rate_adjustment_pct)} onChange={setDet('rate_adjustment_pct')} /></Field>
              <Field label="FOC treatment"><Select value={s(d.foc_rule) || 'none'} onChange={setDet('foc_rule')}><option value="none">Not deducted</option><option value="deduct_single">Deduct single rate</option><option value="deduct_double">Deduct double rate</option></Select></Field>
              <Field label="FOC rooms to deduct"><Input inputMode="decimal" value={s(d.foc_rooms)} onChange={setDet('foc_rooms')} /></Field>
              <Field label="Remarks (lets See)" className="sm:col-span-3"><Input value={s(d.hotel_remarks)} onChange={setDet('hotel_remarks')} placeholder="e.g. HOTEL CHARGED ALL DBL" /></Field>
            </div>
          </fieldset>
        )}

        {kind === 'restaurant' && (
          <fieldset className="border border-slate-200 rounded-lg p-3">
            <legend className="text-[11px] font-semibold text-slate-500 px-1">Restaurant</legend>
            <div className="grid sm:grid-cols-4 gap-3">
              <Field label="Restaurant" required className="sm:col-span-2"><Input value={s(d.restaurant_name)} onChange={setDet('restaurant_name')} /></Field>
              <Field label="Meal"><Select value={s(d.meal_type)} onChange={setDet('meal_type')}><option value="">—</option>{['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
              <Field label="Pax" required><Input inputMode="numeric" value={s(d.pax)} onChange={setDet('pax')} /></Field>
              <Field label="Rate per pax"><Input inputMode="decimal" value={s(d.rate_per_pax)} onChange={setDet('rate_per_pax')} /></Field>
              <Field label="FOC qty"><Input inputMode="numeric" value={s(d.foc_qty)} onChange={setDet('foc_qty')} /></Field>
              <Field label="FOC description"><Input value={s(d.foc_description)} onChange={setDet('foc_description')} /></Field>
              <Field label="FOC treatment"><Select value={s(d.foc_rule) || 'none'} onChange={setDet('foc_rule')}><option value="none">Recorded only (not deducted)</option><option value="deduct">Deduct from pax</option></Select></Field>
            </div>
          </fieldset>
        )}

        {kind === 'transport' && (
          <fieldset className="border border-slate-200 rounded-lg p-3">
            <legend className="text-[11px] font-semibold text-slate-500 px-1">Transport</legend>
            <div className="grid sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 sm:col-span-4"><input type="checkbox" checked={!!d.is_company_owned} onChange={setDet('is_company_owned')} /> Company-owned vehicle (internal operating cost, not a supplier payable)</label>
              {d.is_company_owned ? (
                <Field label="Fleet vehicle"><Select value={s(d.vehicle_id)} onChange={setDet('vehicle_id')}><option value="">—</option>{(fleet.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.registration_number} · {v.model}</option>)}</Select></Field>
              ) : (
                <Field label="Registration"><Input value={s(d.registration)} onChange={setDet('registration')} /></Field>
              )}
              <Field label="Vehicle type"><Input value={s(d.vehicle_type)} onChange={setDet('vehicle_type')} placeholder="SUV / Tempo / Coach" /></Field>
              <Field label="Service"><Select value={s(d.service_type)} onChange={setDet('service_type')}><option value="">—</option>{['Airport transfer', 'Intercity transfer', 'Local sightseeing', 'Full tour', 'Additional vehicle'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
              <Field label="Route"><Input value={s(d.route)} onChange={setDet('route')} /></Field>
              <Field label="Rate basis" required><Select value={s(d.rate_basis) || ''} onChange={setDet('rate_basis')}><option value="">Select…</option><option value="per_day">Per day</option><option value="per_trip">Per trip</option><option value="per_km">Per km</option><option value="fixed">Fixed package</option><option value="custom">Custom negotiated</option></Select></Field>
              <Field label={d.rate_basis === 'fixed' || d.rate_basis === 'custom' ? 'Agreed amount' : 'Rate'}><Input inputMode="decimal" value={f.unit_rate} onChange={set('unit_rate')} /></Field>
              {!['fixed', 'custom'].includes(d.rate_basis) && <Field label={d.rate_basis === 'per_km' ? 'Kilometres' : d.rate_basis === 'per_trip' ? 'Trips' : 'Days'}><Input inputMode="decimal" value={f.quantity} onChange={set('quantity')} /></Field>}
              <Field label="Actual base amount" hint="Leave blank until known"><Input inputMode="decimal" value={s(d.actual_base_amount)} onChange={setDet('actual_base_amount')} /></Field>
              <Field label="Driver allowance"><Input inputMode="decimal" value={s(d.driver_allowance)} onChange={setDet('driver_allowance')} /></Field>
              <Field label="Fuel"><Input inputMode="decimal" value={s(d.fuel)} onChange={setDet('fuel')} /></Field>
              <Field label="Toll"><Input inputMode="decimal" value={s(d.toll)} onChange={setDet('toll')} /></Field>
              <Field label="Parking"><Input inputMode="decimal" value={s(d.parking)} onChange={setDet('parking')} /></Field>
              <Field label="Other charges"><Input inputMode="decimal" value={s(d.other_charges)} onChange={setDet('other_charges')} /></Field>
            </div>
          </fieldset>
        )}

        {kind === 'guide_dsa' && (
          <fieldset className="border border-slate-200 rounded-lg p-3">
            <legend className="text-[11px] font-semibold text-slate-500 px-1">Guide DSA</legend>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Guide name" required><Input value={s(d.guide_name)} onChange={setDet('guide_name')} /></Field>
              <Field label="Days"><Input inputMode="decimal" value={s(d.days)} onChange={setDet('days')} /></Field>
              <Field label="DSA rate per day"><Input inputMode="decimal" value={s(d.dsa_rate)} onChange={setDet('dsa_rate')} /></Field>
            </div>
          </fieldset>
        )}

        {kind === 'guide_imprest' && (
          <fieldset className="border border-slate-200 rounded-lg p-3">
            <legend className="text-[11px] font-semibold text-slate-500 px-1">Guide imprest. The advance is not a cost; only voucher-supported expense is.</legend>
            <div className="grid sm:grid-cols-5 gap-3">
              <Field label="Guide name" required><Input value={s(d.guide_name)} onChange={setDet('guide_name')} /></Field>
              <Field label="Advanced"><Input inputMode="decimal" value={s(d.imprest_advanced)} onChange={setDet('imprest_advanced')} /></Field>
              <Field label="Supported by vouchers" hint="Blank until settled"><Input inputMode="decimal" value={s(d.imprest_supported_expense)} onChange={setDet('imprest_supported_expense')} /></Field>
              <Field label="Returned"><Input inputMode="decimal" value={s(d.imprest_returned)} onChange={setDet('imprest_returned')} /></Field>
              <Field label="Additional approved"><Input inputMode="decimal" value={s(d.additional_approved)} onChange={setDet('additional_approved')} /></Field>
            </div>
          </fieldset>
        )}

        <div className="grid sm:grid-cols-4 gap-3">
          <Field label="Service date"><Input type="date" value={f.service_date} onChange={set('service_date')} /></Field>
          <Field label="Service end date"><Input type="date" value={f.service_end_date} onChange={set('service_end_date')} /></Field>
          {['activity', 'general'].includes(kind) && <>
            <Field label="Quantity"><Input inputMode="decimal" value={f.quantity} onChange={set('quantity')} /></Field>
            <Field label="Rate"><Input inputMode="decimal" value={f.unit_rate} onChange={set('unit_rate')} /></Field>
          </>}
          {!isCalculated && <Field label="Expected amount" hint="Agreed / estimated"><Input inputMode="decimal" value={f.expected_amount} onChange={set('expected_amount')} /></Field>}
          {!['transport', 'guide_imprest'].includes(kind) && <Field label="Actual amount" hint="Amount charged (incl. tax)"><Input inputMode="decimal" value={f.actual_amount} onChange={set('actual_amount')} /></Field>}
          <Field label="Tax included"><Input inputMode="decimal" value={f.tax_amount} onChange={set('tax_amount')} /></Field>
          <Field label="Bill / reference no."><Input value={f.bill_reference} onChange={set('bill_reference')} /></Field>
          <Field label="Payment mode"><Input value={f.payment_mode} onChange={set('payment_mode')} placeholder="Cash / NEFT / UPI" /></Field>
          <Field label="Description" className="sm:col-span-2"><Input value={f.description} onChange={set('description')} /></Field>
          <Field label="Remarks" className="sm:col-span-4"><TextArea rows={2} value={f.remarks} onChange={set('remarks')} /></Field>
          <Field label="Reason for change" className="sm:col-span-4" hint="Required for approved lines and financially closed tours"><Input value={f.reason} onChange={set('reason')} /></Field>
        </div>
        {isCalculated && <p className="text-[11px] text-slate-500">The expected amount is calculated by the server from the rates above. Accounts can override it with a reason.</p>}
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add line'}</Btn>
        </div>
      </div>
    </Modal>
  );
};
