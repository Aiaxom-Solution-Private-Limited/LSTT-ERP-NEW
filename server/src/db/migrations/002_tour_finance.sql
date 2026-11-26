-- 002: Tour Financial Management (P&L, costing, reconciliation, bills, payments).
-- Design rules enforced here:
--  * expected and actual amounts are separate columns; neither overwrites the other
--  * a payment never creates cost; cost lives only in cost_items
--  * every cost item belongs to a Tour Code unless explicitly flagged unallocated

CREATE TABLE expense_categories (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE expense_heads (
  id                SERIAL PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  original_label    TEXT,                    -- exact label from the client's sheet, preserved
  category_code     TEXT NOT NULL REFERENCES expense_categories(code),
  cost_nature       TEXT NOT NULL CHECK (cost_nature IN ('supplier','internal')),
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  default_tax_pct   NUMERIC(6,3),
  reporting_group   TEXT,
  needs_confirmation BOOLEAN NOT NULL DEFAULT FALSE, -- mapping not yet confirmed by client
  active            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE finance_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  confirmed   BOOLEAN NOT NULL DEFAULT FALSE,  -- FALSE = provisional, awaiting finance approval
  updated_by  TEXT REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id           BIGSERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   INTEGER,
  storage_path TEXT NOT NULL,
  uploaded_by  TEXT REFERENCES users(id),
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX documents_entity_idx ON documents (entity_type, entity_id);

-- One row per costed service (a hotel stay, a restaurant visit, a vehicle, a fee...).
CREATE TABLE cost_items (
  id                       BIGSERIAL PRIMARY KEY,
  tour_code                TEXT REFERENCES tours(tour_code),
  is_unallocated           BOOLEAN NOT NULL DEFAULT FALSE,  -- company-level expense, not a tour cost
  kind                     TEXT NOT NULL CHECK (kind IN ('hotel','restaurant','transport','guide_dsa','guide_imprest','activity','general')),
  category_code            TEXT NOT NULL REFERENCES expense_categories(code),
  expense_head_id          INTEGER REFERENCES expense_heads(id),
  description              TEXT,
  supplier_id              TEXT REFERENCES suppliers(id),
  payee_name               TEXT,
  cost_nature              TEXT NOT NULL CHECK (cost_nature IN ('supplier','internal')),
  service_date             DATE,
  service_end_date         DATE,
  destination              TEXT,
  quantity                 NUMERIC(14,3),
  unit_rate                NUMERIC(14,2),
  expected_amount          NUMERIC(14,2),   -- calculated from agreed rates
  expected_calc            JSONB,           -- calculation breakdown / rule used
  expected_override_amount NUMERIC(14,2),   -- authorised override (reason mandatory)
  expected_override_reason TEXT,
  actual_amount            NUMERIC(14,2),   -- what the supplier charged / cost incurred (incl. tax)
  tax_amount               NUMERIC(14,2) NOT NULL DEFAULT 0,
  verified_amount          NUMERIC(14,2),   -- set by Accounts at approval; final cost for P&L
  status                   TEXT NOT NULL DEFAULT 'estimated' CHECK (status IN (
                             'estimated','booked','service_completed','bill_pending','bill_received',
                             'under_verification','approved','disputed','cancelled')),
  bill_reference           TEXT,
  payment_mode             TEXT,
  remarks                  TEXT,
  source                   TEXT NOT NULL DEFAULT 'live' CHECK (source IN ('live','import')),
  import_row_id            BIGINT,
  legacy_ref               TEXT,            -- e.g. prototype SupplierBookingRecord / TourExpense id
  created_by               TEXT REFERENCES users(id),
  updated_by               TEXT REFERENCES users(id),
  approved_by              TEXT REFERENCES users(id),
  approved_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cost_items_tour_required CHECK (tour_code IS NOT NULL OR is_unallocated),
  CONSTRAINT cost_items_override_reason CHECK (expected_override_amount IS NULL OR length(trim(coalesce(expected_override_reason,''))) > 0)
);
CREATE INDEX cost_items_tour_idx ON cost_items (tour_code);
CREATE INDEX cost_items_supplier_idx ON cost_items (supplier_id);
CREATE INDEX cost_items_status_idx ON cost_items (status);
CREATE UNIQUE INDEX cost_items_legacy_ref_uq ON cost_items (legacy_ref) WHERE legacy_ref IS NOT NULL;

-- Hotel sheet fields preserved: Dbl, Sng, EB, FOC, Meal plan, SNG.Rate, DBL.Rate, EB RATE, CWB, CNB, Tea/coffee
CREATE TABLE hotel_stay_details (
  cost_item_id       BIGINT PRIMARY KEY REFERENCES cost_items(id) ON DELETE CASCADE,
  hotel_name         TEXT NOT NULL,
  city               TEXT,
  check_in           DATE NOT NULL,
  check_out          DATE NOT NULL,
  nights             INTEGER NOT NULL CHECK (nights >= 0),
  dbl_rooms          INTEGER NOT NULL DEFAULT 0,
  sng_rooms          INTEGER NOT NULL DEFAULT 0,
  extra_beds         INTEGER NOT NULL DEFAULT 0,
  foc                TEXT,               -- as recorded, e.g. "1" or "1 SGL"
  foc_rooms          NUMERIC(6,2) NOT NULL DEFAULT 0,
  cwb                INTEGER NOT NULL DEFAULT 0,
  cnb                INTEGER NOT NULL DEFAULT 0,
  meal_plan          TEXT,               -- EP/CP/MAP/AP
  dbl_rate           NUMERIC(14,2) NOT NULL DEFAULT 0,
  sng_rate           NUMERIC(14,2) NOT NULL DEFAULT 0,
  eb_rate            NUMERIC(14,2) NOT NULL DEFAULT 0,
  cwb_rate           NUMERIC(14,2) NOT NULL DEFAULT 0,
  cnb_rate           NUMERIC(14,2) NOT NULL DEFAULT 0,
  tea_coffee         NUMERIC(14,2) NOT NULL DEFAULT 0,
  tea_coffee_basis   TEXT NOT NULL DEFAULT 'lump_sum' CHECK (tea_coffee_basis IN ('lump_sum','per_pax_per_night','per_night')),
  rate_adjustment_pct NUMERIC(7,3) NOT NULL DEFAULT 0,   -- e.g. -20 for "OFF SEASON RATE 20% MINUS"
  foc_rule           TEXT NOT NULL DEFAULT 'none' CHECK (foc_rule IN ('none','deduct_single','deduct_double')),
  booking_reference  TEXT,
  dispute_amount     NUMERIC(14,2),      -- as recorded on the sheet (historical); live variance is computed
  hotel_remarks      TEXT                -- "Remarks (lets See)"
);

CREATE TABLE restaurant_details (
  cost_item_id     BIGINT PRIMARY KEY REFERENCES cost_items(id) ON DELETE CASCADE,
  restaurant_name  TEXT NOT NULL,
  pax              INTEGER NOT NULL CHECK (pax >= 0),
  foc_qty          INTEGER NOT NULL DEFAULT 0,
  foc_description  TEXT,
  rate_per_pax     NUMERIC(14,2) NOT NULL DEFAULT 0,
  foc_rule         TEXT NOT NULL DEFAULT 'none' CHECK (foc_rule IN ('none','deduct')),
  meal_type        TEXT,
  dispute_amount   NUMERIC(14,2)
);

CREATE TABLE transport_details (
  cost_item_id       BIGINT PRIMARY KEY REFERENCES cost_items(id) ON DELETE CASCADE,
  vehicle_type       TEXT,
  registration       TEXT,
  vehicle_id         TEXT REFERENCES fleet_vehicles(id),
  is_company_owned   BOOLEAN NOT NULL DEFAULT FALSE,
  route              TEXT,
  service_type       TEXT,               -- airport transfer, intercity, local sightseeing...
  rate_basis         TEXT NOT NULL CHECK (rate_basis IN ('per_day','per_trip','per_km','fixed','custom')),
  actual_base_amount NUMERIC(14,2),
  driver_allowance   NUMERIC(14,2) NOT NULL DEFAULT 0,
  fuel               NUMERIC(14,2) NOT NULL DEFAULT 0,
  toll               NUMERIC(14,2) NOT NULL DEFAULT 0,
  parking            NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_charges      NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE guide_details (
  cost_item_id              BIGINT PRIMARY KEY REFERENCES cost_items(id) ON DELETE CASCADE,
  guide_name                TEXT NOT NULL,
  -- DSA rows
  days                      NUMERIC(6,2),
  dsa_rate                  NUMERIC(14,2),
  -- Imprest rows: advance is NOT cost; only supported expense is.
  imprest_advanced          NUMERIC(14,2) NOT NULL DEFAULT 0,
  imprest_supported_expense NUMERIC(14,2),
  imprest_returned          NUMERIC(14,2) NOT NULL DEFAULT 0,
  additional_approved       NUMERIC(14,2) NOT NULL DEFAULT 0
);

-- Variance / dispute register. Rows are never deleted; resolution is a state.
CREATE TABLE reconciliation_cases (
  id                  BIGSERIAL PRIMARY KEY,
  cost_item_id        BIGINT NOT NULL REFERENCES cost_items(id),
  tour_code           TEXT REFERENCES tours(tour_code),
  expected_snapshot   NUMERIC(14,2),
  actual_snapshot     NUMERIC(14,2),
  variance            NUMERIC(14,2),
  reason              TEXT,
  remarks             TEXT,
  document_id         BIGINT REFERENCES documents(id),
  assigned_to         TEXT REFERENCES users(id),
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','approved','rejected','resolved')),
  approved_adjustment NUMERIC(14,2),   -- agreed final cost if different from actual
  opened_by           TEXT REFERENCES users(id),
  opened_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by         TEXT REFERENCES users(id),
  resolved_at         TIMESTAMPTZ
);
CREATE INDEX recon_cost_item_idx ON reconciliation_cases (cost_item_id);
CREATE INDEX recon_tour_idx ON reconciliation_cases (tour_code);

-- Supplier bills. One bill can cover several cost items / Tour Codes via lines.
CREATE TABLE vendor_bills (
  id             BIGSERIAL PRIMARY KEY,
  supplier_id    TEXT REFERENCES suppliers(id),
  supplier_name  TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date   DATE NOT NULL,
  due_date       DATE,
  taxable_value  NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount   NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  status         TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','under_verification','approved','rejected','cancelled')),
  remarks        TEXT,
  created_by     TEXT REFERENCES users(id),
  approved_by    TEXT REFERENCES users(id),
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Duplicate-bill prevention: same supplier + invoice number (case-insensitive), ignoring cancelled bills.
CREATE UNIQUE INDEX vendor_bills_dup_uq ON vendor_bills (lower(coalesce(supplier_id, supplier_name)), lower(invoice_number)) WHERE status <> 'cancelled';

CREATE TABLE vendor_bill_lines (
  id           BIGSERIAL PRIMARY KEY,
  bill_id      BIGINT NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  cost_item_id BIGINT REFERENCES cost_items(id),
  tour_code    TEXT REFERENCES tours(tour_code),
  amount       NUMERIC(14,2) NOT NULL,
  description  TEXT
);
CREATE INDEX vendor_bill_lines_bill_idx ON vendor_bill_lines (bill_id);
CREATE INDEX vendor_bill_lines_tour_idx ON vendor_bill_lines (tour_code);

CREATE TABLE vendor_bill_adjustments (
  id         BIGSERIAL PRIMARY KEY,
  bill_id    BIGINT NOT NULL REFERENCES vendor_bills(id),
  type       TEXT NOT NULL CHECK (type IN ('credit_note','debit_note')),
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  note_date  DATE NOT NULL,
  reason     TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_payments (
  id            BIGSERIAL PRIMARY KEY,
  supplier_id   TEXT REFERENCES suppliers(id),
  supplier_name TEXT NOT NULL,
  paid_date     DATE NOT NULL,
  amount        NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_mode  TEXT,
  reference     TEXT,
  notes         TEXT,
  legacy_ref    TEXT UNIQUE,
  created_by    TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A payment is split across bills; or held against a tour as an advance before the bill arrives.
CREATE TABLE supplier_payment_allocations (
  id         BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
  bill_id    BIGINT REFERENCES vendor_bills(id),
  tour_code  TEXT REFERENCES tours(tour_code),
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  CONSTRAINT alloc_target CHECK (bill_id IS NOT NULL OR tour_code IS NOT NULL)
);
CREATE INDEX spa_bill_idx ON supplier_payment_allocations (bill_id);
CREATE INDEX spa_tour_idx ON supplier_payment_allocations (tour_code);

-- Client side
CREATE TABLE client_invoices (
  id             BIGSERIAL PRIMARY KEY,
  tour_code      TEXT NOT NULL REFERENCES tours(tour_code),
  invoice_type   TEXT NOT NULL CHECK (invoice_type IN ('proforma','tax_invoice')),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date   DATE NOT NULL,
  due_date       DATE,
  taxable_value  NUMERIC(14,2) NOT NULL,
  gst_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount   NUMERIC(14,2) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','cancelled')),
  legacy_ref     TEXT UNIQUE,
  created_by     TEXT REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX client_invoices_tour_idx ON client_invoices (tour_code);

CREATE TABLE client_credit_notes (
  id            BIGSERIAL PRIMARY KEY,
  tour_code     TEXT NOT NULL REFERENCES tours(tour_code),
  invoice_id    BIGINT REFERENCES client_invoices(id),
  note_number   TEXT NOT NULL UNIQUE,
  note_date     DATE NOT NULL,
  taxable_value NUMERIC(14,2) NOT NULL CHECK (taxable_value >= 0),
  gst_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  reason        TEXT NOT NULL,
  created_by    TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE client_receipts (
  id             BIGSERIAL PRIMARY KEY,
  tour_code      TEXT NOT NULL REFERENCES tours(tour_code),
  receipt_type   TEXT NOT NULL CHECK (receipt_type IN ('advance','part','final','refund')),
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),  -- refunds are positive amounts of type 'refund'
  received_date  DATE NOT NULL,
  payment_mode   TEXT,
  reference      TEXT,
  receipt_number TEXT,
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  notes          TEXT,
  legacy_ref     TEXT UNIQUE,
  created_by     TEXT REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX client_receipts_tour_idx ON client_receipts (tour_code);

CREATE TABLE client_collection_schedule (
  id         BIGSERIAL PRIMARY KEY,
  tour_code  TEXT NOT NULL REFERENCES tours(tour_code),
  due_date   DATE NOT NULL,
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  note       TEXT
);

CREATE TABLE revenue_adjustments (
  id           BIGSERIAL PRIMARY KEY,
  tour_code    TEXT NOT NULL REFERENCES tours(tour_code),
  type         TEXT NOT NULL CHECK (type IN ('additional_service','discount','commercial_adjustment_plus','commercial_adjustment_minus')),
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),   -- sign comes from type
  description  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by TEXT REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by   TEXT REFERENCES users(id),
  decided_at   TIMESTAMPTZ,
  decision_note TEXT
);
CREATE INDEX revenue_adj_tour_idx ON revenue_adjustments (tour_code);

-- Financial status is separate from the operational tour status.
CREATE TABLE tour_financial_status (
  tour_code     TEXT PRIMARY KEY REFERENCES tours(tour_code),
  status        TEXT NOT NULL DEFAULT 'costing_pending' CHECK (status IN (
                  'costing_pending','expenses_in_progress','bills_pending','reconciliation_pending',
                  'accounts_verification','financially_verified','financially_closed')),
  checklist     JSONB,
  closure_notes TEXT,
  closed_by     TEXT REFERENCES users(id),
  closed_at     TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE financial_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     TEXT REFERENCES users(id),
  tour_code   TEXT,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  action      TEXT NOT NULL,
  before      JSONB,
  after       JSONB,
  reason      TEXT
);
CREATE INDEX audit_tour_idx ON financial_audit_log (tour_code);
CREATE INDEX audit_entity_idx ON financial_audit_log (entity_type, entity_id);

-- Historical spreadsheet import (staged; nothing silently discarded)
CREATE TABLE import_batches (
  id          BIGSERIAL PRIMARY KEY,
  import_type TEXT NOT NULL CHECK (import_type IN ('hotel','restaurant','consolidated')),
  file_name   TEXT NOT NULL,
  column_map  JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed','committed','discarded')),
  summary     JSONB,
  created_by  TEXT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ
);

CREATE TABLE import_rows (
  id            BIGSERIAL PRIMARY KEY,
  batch_id      BIGINT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number    INTEGER NOT NULL,
  raw           JSONB NOT NULL,          -- original cells, never modified
  mapped        JSONB,
  tour_code_raw TEXT,
  tour_code     TEXT REFERENCES tours(tour_code),
  status        TEXT NOT NULL CHECK (status IN ('valid','invalid','duplicate','unmatched','imported','skipped')),
  errors        JSONB,
  cost_item_id  BIGINT REFERENCES cost_items(id)
);
CREATE INDEX import_rows_batch_idx ON import_rows (batch_id);
