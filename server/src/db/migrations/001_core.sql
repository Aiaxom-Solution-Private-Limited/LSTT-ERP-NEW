-- 001: Core ERP entities moved from browser localStorage into PostgreSQL.
-- Additive only. Money columns are NUMERIC(14,2); never floating point.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,            -- existing Employee.id e.g. EMP-101
  login_id      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  department    TEXT NOT NULL CHECK (department IN ('sales','backend','operations','accounts','executive')),
  role_title    TEXT,
  is_manager    BOOLEAN NOT NULL DEFAULT FALSE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE agents (
  id                  TEXT PRIMARY KEY,      -- AGT-101
  company_name        TEXT NOT NULL,
  contact_person      TEXT,
  city                TEXT,
  gst_number          TEXT,
  credit_allowed      BOOLEAN NOT NULL DEFAULT FALSE,
  credit_limit        NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_days         INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE suppliers (
  id                 TEXT PRIMARY KEY,       -- SUP-xxx
  name               TEXT NOT NULL,
  category           TEXT NOT NULL,
  destination        TEXT,
  contact_person     TEXT,
  phone              TEXT,
  email              TEXT,
  credit_days        INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX suppliers_name_idx ON suppliers (lower(name));

CREATE TABLE fleet_vehicles (
  id                  TEXT PRIMARY KEY,      -- FLT-01
  registration_number TEXT NOT NULL UNIQUE,
  model               TEXT,
  category            TEXT,
  seating_capacity    INTEGER,
  internal_daily_rate NUMERIC(14,2) NOT NULL DEFAULT 0
);

-- Tour Code is the central identifier. Generated server-side from a
-- per-year sequence so codes never collide (the prototype used count+1).
CREATE TABLE tour_code_sequences (
  year       INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL
);

CREATE TABLE tours (
  tour_code               TEXT PRIMARY KEY,  -- LST-2026-00001
  enquiry_id              TEXT,
  booking_id              TEXT,
  quotation_code          TEXT,
  quotation_version       INTEGER,
  trip_id                 TEXT,
  client_name             TEXT NOT NULL,
  agent_id                TEXT REFERENCES agents(id),
  destination             TEXT NOT NULL,
  package_name            TEXT,
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  nights                  INTEGER,
  days                    INTEGER,
  adults                  INTEGER NOT NULL DEFAULT 0,
  children                INTEGER NOT NULL DEFAULT 0,
  infants                 INTEGER NOT NULL DEFAULT 0,
  room_count              INTEGER,
  salesperson_name        TEXT,
  salesperson_id          TEXT REFERENCES users(id),
  operations_lead_name    TEXT,
  operations_lead_id      TEXT REFERENCES users(id),
  status                  TEXT NOT NULL,     -- operational status (existing TourStatus values)
  transport_source        TEXT,
  -- Commercials, kept distinct:
  quoted_amount           NUMERIC(14,2),     -- quotation selling price before confirmation edits (excl. GST)
  confirmed_selling_price NUMERIC(14,2) NOT NULL, -- agreed package price excl. GST
  gst_amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
  estimated_cost_baseline NUMERIC(14,2),     -- quotation's totalDirectCost, for reference only
  -- Raw copy of the prototype record, retained for traceability (never used in calculations)
  legacy_snapshot         JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tours_dates_idx ON tours (start_date, end_date);
CREATE INDEX tours_destination_idx ON tours (destination);
