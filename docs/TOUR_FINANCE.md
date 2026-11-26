# Tour Financial Management: backend (Phase 1–2)

Status: the **backend, database, calculation engine, API and finance screens are built**.
The **three sample sheets have not been received**, so no calculation has been verified
against the client's real spreadsheet figures.

## 1. Starting point (assessment of the prototype)

The uploaded "Let's See DMC Operating System" was a frontend-only React/Vite prototype:

| Area | Prototype | Problem for finance |
|---|---|---|
| Storage | `localStorage` per browser, seeded from `src/data/initialData.ts` | No shared data, no transactions, no audit |
| Permissions | Department chosen on a splash screen; menu filtering only | Nothing enforced |
| Tour Code | `LST-2026-` + (tour count + 1) | Collides after deletes; year hard-coded |
| Profit | `actualGrossProfit = totalCollected − (payments + expenses)` | Treats **collections as revenue** and **payments as cost** |
| Reports | "Net Realised Gross Profit" shows *projected* profit; dashboard shows hard-coded "33.4%" | Misleading |
| Hotels | One `SupplierBookingRecord` per supplier with an agreed amount | No Dbl/Sng/EB/FOC/CWB/CNB, rates, hotel amount, dispute |
| Restaurants / guide DSA / imprest / vendor bills | Not present | Missing |
| Money | JS floats | Rounding errors |

The prototype UI is unchanged. Its existing records are migrated into PostgreSQL by the seed (section 4).

## 2. Architecture

```
server/
  src/db/            client.ts (pg / embedded PGlite), migrate.ts, migrations/*.sql, seed.ts
  src/auth/          scrypt passwords, bearer sessions, department permissions
  src/lib/           money.ts (BigInt paise, half-up rounding), csv.ts, http.ts
  src/finance/
    rates.ts         expected-amount calculators (hotel, restaurant, transport, DSA, imprest)
    engine.ts        THE P&L calculation (pure function), warnings, closure checklist
    repository.ts    batched loading of rows → engine
    service.ts       all writes: transactions, permission checks, closure lock, audit log
    routes.ts        REST API
    import.ts        spreadsheet import pipeline
  tests/             engine.test.ts (unit), api.test.ts (end-to-end on real Postgres via PGlite)
```

* **Database:** PostgreSQL. Set `DATABASE_URL` for a real server. Without it, an embedded PostgreSQL (PGlite) is used for development and tests.
* **Money:** `NUMERIC(14,2)` in the database and integer paise (`BigInt`) in code. No floating point anywhere in the calculations.
* **Totals are computed, not stored.** Every P&L figure is calculated from source rows on each request by `engine.ts`. Nothing can go stale. The only stored financial status is *closed*, together with a snapshot of the figures at closure.
* **Single tenant.** The ERP serves one company, so the tables have no tenant column.

Run:

```
npm install
npm run dev:api        # API on :4000 (migrates and seeds on first run)
npm run dev            # existing web app; /api is proxied to :4000
npm test               # 29 tests
npm run lint           # web + server type-check
```

## 3. Data model (migrations 001, 002)

* `tours`: the Tour Code is the primary key. It keeps quoted amount, confirmed selling price (excl. GST) and GST as separate columns. New codes come from `tour_code_sequences` (per year, never reused).
* `cost_items`: one row per costed service, linked to a Tour Code. A row without one is allowed only if `is_unallocated` is set (DB check constraint). Each row holds:
  * `expected_amount`, plus `expected_calc`, which records the formula and its breakdown
  * `expected_override_amount` with a mandatory reason (DB check constraint)
  * `actual_amount`
  * `verified_amount`, set by Accounts at approval
  * `status`: estimated → booked → service_completed → bill_pending → bill_received → under_verification → approved, plus disputed and cancelled
* Detail tables: `hotel_stay_details` (all hotel sheet columns), `restaurant_details`, `transport_details` (company-owned flag; fuel, toll, parking and allowance), `guide_details` (DSA, and imprest advanced/supported/returned).
* `expense_categories` and `expense_heads`: configurable master data. The sheet's labels are kept verbatim in `original_label`.
* `reconciliation_cases`: the variance and dispute register. Cases are never deleted. Resolution is a status change.
* `vendor_bills` and `vendor_bill_lines`: one bill can span several cost lines and Tour Codes. Duplicate bills are blocked by a unique index on supplier + invoice number. Credit and debit notes live in `vendor_bill_adjustments`.
* `supplier_payments` and `supplier_payment_allocations`: a payment is split across bills, or held against a Tour Code as an advance.
* Client side: `client_invoices` (proforma and tax invoice), `client_credit_notes`, `client_receipts` (advance/part/final/refund), `client_collection_schedule`, `revenue_adjustments` (pending → approved/rejected).
* `tour_financial_status` (closure), `financial_audit_log`, `documents` (bill uploads), `import_batches` and `import_rows`, `finance_settings`.

## 4. Prototype data migration (seed)

| Prototype record | Becomes |
|---|---|
| Employees, agents, suppliers, fleet | `users`, `agents`, `suppliers`, `fleet_vehicles` |
| ConfirmedTour | `tours`. Tour Codes preserved; the raw record is kept in `legacy_snapshot`. |
| SupplierBookingRecord | `cost_items` with expected = agreed amount (rule `migrated_agreed_amount`; no room breakdown existed) |
| Own-fleet estimate on a tour | internal transport `cost_items` line |
| SupplierPaymentVoucher (paid) | `supplier_payments`, allocated to the tour as an advance (the prototype had no bills) |
| Pending vouchers | not migrated: they were payment requests, not payments |
| CustomerReceipt | `client_receipts` (first receipt per tour = advance) |
| TourExpense | `cost_items` with actual amount, status `bill_received`. Not verified: the prototype's "approved" was operational, not Accounts verification. |
| ProformaInvoice | `client_invoices` of type proforma. These are **not** counted as invoiced revenue. |

## 5. Calculation rules (engine.ts)

* **Recognised revenue** depends on the setting `revenue_recognition_basis`. It is *provisional*, pending the finance team.
  * `confirmed_price` (default): confirmed selling price excl. GST, plus approved additions, minus approved discounts.
  * `tax_invoiced`: taxable value of tax invoices, minus credit notes.
* **GST is never revenue.**
* **Receivable:** tax invoices once they exist; before that, the agreed contract value including GST. The basis is returned with every result.
* **Collected:** verified receipts minus refunds. Unverified receipts are shown separately.
* **Cost views:** these are never mixed.
  * Estimated: expected amounts of all non-cancelled lines.
  * Committed: expected amounts of booked or later lines.
  * Actual: recorded actual amounts.
  * Verified: Accounts-approved amounts.
  * Forecast: actual where known, otherwise expected.
* **Profit and margin** are computed for each view. Margin is null when revenue ≤ 0.
* **Net profit = gross profit.** No overhead allocation method has been approved.
* **Payments** reduce the supplier outstanding only. Outstanding = approved bill share − payments on those bills − advances to the tour. Multi-tour bills are pro-rated by their lines.
* **Imprest:** cost = voucher-supported expense + approved additional expense. The advance is not cost. The balance with the guide is advanced − supported − returned.
* **Company vehicles** must be internal cost. The API rejects a company vehicle marked as a supplier payable.
* **Dispute resolution:** an approved case may set an agreed amount. That becomes the verified amount. The agreed rate (expected) and the supplier's charge (actual) are never overwritten.
* **Warnings:**
  * actual over expected
  * bill over agreed
  * missing hotel or restaurant bill after the service date
  * open disputes
  * possible duplicate expense
  * bill lines not matching the bill total
  * unapproved adjustments
  * no cost data
  * negative forecast profit
  * margin below the threshold
  * cancelled tour with costs
* **Financial status** is derived (costing_pending … financially_verified) until a tour is closed. Closure requires `tour.close` and a checklist. Open checklist items can be accepted only with notes. After closure, every write requires `finance.post_closure` and a reason, which is recorded in the audit log.

### Hotel expected amount (configurable, NOT yet verified against the sheet)

```
per night = Dbl×DBL.Rate + Sng×SNG.Rate + EB×EB RATE + CWB×CWB rate + CNB×CNB rate − FOC deduction (only if foc_rule ≠ none)
rooms     = per night × nights, then × (1 + rate_adjustment_pct/100)      e.g. −20 for "OFF SEASON RATE 20% MINUS"
total     = rooms + tea/coffee (lump sum | per night | per pax per night)
```

### Restaurant expected amount

`pax × rate`. FOC is recorded separately and only deducted if `foc_rule = deduct`, following the prompt's description of the sample.

## 6. Permissions (enforced in the API)

| Department | Can |
|---|---|
| Sales | View P&L (revenue side only; supplier detail hidden), request revenue adjustments |
| Operations | Record and edit cost lines, upload/record vendor bills, open discrepancy cases. Managers can also override expected amounts. |
| Accounts | Everything operational, plus verify/approve costs, approve bills, record payments, receipts, invoices and credit notes, resolve disputes, close tours, import. Managers can also approve revenue adjustments, make post-closure changes, and manage settings and masters. |
| Backend/admin | Expense heads/categories, settings, imports |
| Executive | All |

A user cannot approve their own revenue adjustment unless they are in Management.

## 7. API (all under `/api`, bearer token from `POST /api/auth/login`)

```
GET  /finance/overview?from&to&destination&client&salesperson&operations&status&financialStatus&tourCode
GET  /finance/tours                      list with headline figures
GET  /finance/tours/:code                full P&L, categories → items, bills, warnings, checklist
GET  /finance/tours/:code/transactions   bills, payments, invoices, receipts, adjustments, cases
GET  /finance/tours/:code/audit
POST /finance/tours/:code/close | /reopen
GET|POST /finance/cost-items   PATCH /finance/cost-items/:id
POST /finance/cost-items/:id/status | /override | /reconciliation
GET  /finance/reconciliation   PATCH /finance/reconciliation/:id
GET|POST /finance/vendor-bills   POST /finance/vendor-bills/:id/status | /adjustments
POST /finance/supplier-payments
POST /finance/client-invoices | /client-credit-notes | /client-receipts | /client-receipts/:id/verify
POST /finance/revenue-adjustments | /revenue-adjustments/:id/decision
GET|POST /finance/expense-heads  PATCH /finance/expense-heads/:id  GET|POST /finance/expense-categories
GET  /finance/settings   PUT /finance/settings/:key
POST /finance/documents?entityType&entityId&fileName  (raw body, PDF/JPEG/PNG/WebP ≤15 MB)
GET  /finance/reports/{tour-pnl|profitability|expense-categories|hotel-reconciliation|restaurant-reconciliation|vendor-payables|client-receivables|variance}[?format=csv]
GET  /finance/imports/templates   POST /finance/imports/preview   GET /finance/imports/:id
POST /finance/imports/:id/rows/:rowId/map   POST /finance/imports/:id/commit
POST /tours   (server-generated Tour Code)
```

## 8. Spreadsheet import

1. Upload CSV text or an `.xlsx` file (base64), with a column map. Consolidated imports also take a head map.
2. Every row is stored verbatim. Each gets a status: valid, invalid (with reasons), duplicate (within the file, or imported before, matched by content hash), or unmatched (Tour Code not found).
3. Unmatched rows go to an exception queue. They are mapped manually to an *existing* Tour Code; tours are never created by an import.
4. Commit creates cost lines with `source = 'import'`.
   * Hotel and restaurant: the sheet's "Amount (LSTT)" becomes the expected amount, and the hotel or restaurant amount becomes the actual. The system's own recalculation is stored alongside in `expected_calc.system_check`, with a `matches_sheet` flag. This is how the formulas will be checked once the real sheets arrive.
   * Consolidated: one cost line per non-blank head cell. **Blank cells are not zero.**

## 9. Tests: actual results

```
npm test   → tests 29, pass 29, fail 0
npm run lint → clean (web + server)
npm run build → web build OK
```

Covered:
* decimal money
* the prompt's ₹500,000 / ₹370,000 / ₹130,000 / 26% example
* GST and collections kept separate from revenue
* the four cost views
* payments never adding cost
* multi-tour invoices, credit notes and advances
* hotel room/night, EB, CWB/CNB, FOC rules and a −20% season adjustment
* restaurant FOC
* imprest
* transport rate bases and company-vehicle extras
* revenue adjustments, the invoiced revenue basis, and cancelled tours
* overrides, duplicates and negative profit
* a full three-city Bhutan tour through Operations → Accounts → closure → a post-closure edit
* permission denials
* duplicate-bill block
* imports, including invalid dates and amounts, the exception queue, no re-import, and blank-is-not-zero
* the expense-head master

**Not verified:** none of the hotel or restaurant formulas have been compared with the client's real sheet rows, because the sample files were not provided. Tests ran on embedded PostgreSQL 17 (PGlite), not on the installed PostgreSQL 18 server.

## 10. Open questions for the client (configurable, flagged, not invented)

1. **Sample sheets:** needed to verify the hotel and restaurant formulas and the column meanings.
2. **CWB / CNB:** are these columns counts or rates? The import treats them as counts, with optional separate rates.
3. **Tea/coffee:** is it charged as a lump sum, per night, or per pax per night?
4. **FOC treatment** for hotels (no deduction, a free single, or a free double share) and for restaurants.
5. **Is "Amount (LSTT)"** the company's expected amount, and "Amount (Hotel)" the hotel's bill? Is "Dispute amount" always Hotel − LSTT?
6. **Meaning of these consolidated-sheet heads:** SKKY, LOBESA, DHT, SANGA, LM, SAM, SOURAV, L-EDELWS, L-LEMON T, L-TNG and EXPENSES. They are mapped provisionally and flagged `needs_confirmation`.
7. **GUIDE IMPREST column:** in the consolidated sheet, is it the advance or the spent amount? It is currently imported as cost.
8. **Revenue recognition policy:** confirmed price or tax invoice.
9. **GST on post-confirmation adjustments.**
10. **Low-margin threshold.** Currently 10%, provisional.
11. **Overhead allocation:** none for now.
12. **Proformas:** confirm that proforma invoices must not count as invoiced revenue.

## 11. Finance screens (`src/finance/`)

A **Tour Financials** section is added to the existing sidebar for every department. Which items each department sees mirrors the API permissions; the API still enforces them. The module asks for a real sign-in (login ID + password), because the rest of the prototype has none.

| Screen | Purpose |
|---|---|
| Financial Overview | KPIs (revenue, invoiced, collected, outstanding both ways, estimated/actual/verified cost, gross/net profit, average margin); period presets (today, week, month, previous month, Indian FY, custom) and filters by Tour Code, client, destination, salesperson, operations exec, tour and financial status; charts (revenue vs cost by month, monthly profit, profit by tour, cost by category, top suppliers); outstanding lists; tours needing attention |
| Tour-wise P&L | Searchable, filterable list with CSV export |
| Tour P&L detail (`#/tour-financials/<TourCode>`) | Tour info from the booking; summary cards; five profitability views; warnings that jump to the line; expandable categories → each line with expected/actual/variance/verified, status, reconciliation and payment state; actions: add/edit line (hotel, restaurant, transport, guide DSA, imprest, activity, general), status changes, dispute, override, attach documents; tabs for revenue & collections (invoices, credit notes, receipts, adjustment approval), supplier bills & payments, closure checklist and close/reopen, audit history |
| Expense Register | All cost lines, including unallocated company expenses; filters; add/edit |
| Hotel / Restaurant / Pending Reconciliation | Lines with variance or missing bills, plus the discrepancy register with resolve/approve |
| Vendor Bills & Payments | Record bills split across Tour Codes, verify/approve/reject, partial payments, advances, credit/debit notes, attachments, payables export |
| Client Collections | Receivables by tour, record receipts, export |
| Financial Reports | Preview, Excel (CSV) export, and print-to-PDF for all 8 reports |
| Import Sheets | Upload CSV/XLSX, map columns (auto-match by name), preview with errors, map unmatched rows to existing tours, commit |
| Expense Heads & Settings | Expense head master (original sheet label locked), provisional finance settings |

The screens never calculate financial figures themselves; they display what the server returns. Money is formatted from the server's decimal strings in Indian digit grouping (₹1,23,456.00).

Verified by hand in the browser against a running API (Accounts manager login): overview and charts, deep link to a tour, adding a hotel line (server calculated 2N × (2×4500 + 1200) = ₹20,400), entering the hotel's actual amount, opening a dispute (variance +₹1,200 / 5.88% shown in the register), recording a supplier bill, approving it and part-paying it (paid ₹8,000, outstanding ₹10,000), and loading collections, reports, import and settings screens. There are no automated UI tests.

## 12. Not done yet

* **Moving the existing prototype screens off localStorage.** Sales confirmation, Operations bookings and Accounts vouchers still write to the browser, not the API. Until they call `/api/tours`, `/api/finance/cost-items` and the payment endpoints, new tours created in the old UI will not appear in finance.
* **PDF export.** CSV/Excel export is available.
* **Running against the installed PostgreSQL 18:** needs a `DATABASE_URL`.
