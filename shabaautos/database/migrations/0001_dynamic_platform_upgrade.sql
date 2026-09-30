-- ============================================================================
-- SHABAAUTOS DYNAMIC PLATFORM UPGRADE MIGRATION  (PostgreSQL / Neon)
-- File: database/migrations/XXXX_dynamic_platform_upgrade.sql
-- Purpose: Convert remaining static/placeholder functionality into a fully
--          database-backed, Cloudinary-managed, production-ready platform.
-- Style:   Additive only. No data loss. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VEHICLE IMAGES — carry full Cloudinary metadata so assets are managed by
--    public_id (destroy/replace), chosen as primary, and ordered.
-- ----------------------------------------------------------------------------
ALTER TABLE vehicle_images
  ADD COLUMN IF NOT EXISTS public_id   TEXT,
  ADD COLUMN IF NOT EXISTS asset_id    TEXT,
  ADD COLUMN IF NOT EXISTS width       INTEGER,
  ADD COLUMN IF NOT EXISTS height      INTEGER,
  ADD COLUMN IF NOT EXISTS format      TEXT,
  ADD COLUMN IF NOT EXISTS is_primary  BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehicle_images_public_id ON vehicle_images(public_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_primary ON vehicle_images(vehicle_id, is_primary);

-- ----------------------------------------------------------------------------
-- 2. ORDER / REQUEST STATUS HISTORY — every status change is recorded so the
--    platform never silently overwrites history (tracking, offers, imports,
--    rentals, sell submissions, concierge).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
  id            VARCHAR(64) PRIMARY KEY,
  resource_type VARCHAR(64) NOT NULL,          -- 'import' | 'offer' | 'rental' | 'sell' | 'concierge' | 'inspection'
  resource_id   VARCHAR(64) NOT NULL,
  from_status   VARCHAR(64),
  to_status     VARCHAR(64) NOT NULL,
  note          TEXT,
  changed_by    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_resource
  ON order_status_history(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created
  ON order_status_history(created_at);

-- ----------------------------------------------------------------------------
-- 3. SITE SETTINGS — admin-editable business configuration used by the import
--    estimator, rental pricing, fees, and other calculation engines.
--    Every rate row records effective date, jurisdiction, source reference and
--    the admin who updated it (audit-friendly).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  id              VARCHAR(64) PRIMARY KEY,
  setting_key     VARCHAR(128) NOT NULL,
  setting_value   TEXT NOT NULL,
  value_type      VARCHAR(16) NOT NULL DEFAULT 'string',  -- string|number|json
  label           VARCHAR(255),
  description     TEXT,
  effective_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  jurisdiction    VARCHAR(64) DEFAULT 'NG',
  source_ref      VARCHAR(255),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  updated_by      VARCHAR(64),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_key_active
  ON site_settings(setting_key) WHERE is_active = true;

-- Pre-load the default import-estimation and rental fee configuration.
-- (Seeded as foundation rows; admins edit through the settings UI.)
INSERT INTO site_settings (id, setting_key, setting_value, value_type, label, description, jurisdiction, source_ref)
VALUES
  ('set_import_usd_ngn',        'import.usd_to_ngn',       '1500',  'number', 'USD → NGN rate',                'Bank-rate reference used by the import estimator.', 'NG', 'config:internal-ref'),
  ('set_import_freight_default','import.freight_default_usd','1800', 'number', 'Freight (default origin)',      'Ocean freight for non-Houston origins (USD).',       'US', 'config:internal-ref'),
  ('set_import_freight_houston','import.freight_houston_usd','1950', 'number', 'Freight (Houston origin)',      'Ocean freight from Houston, TX (USD).',               'US', 'config:internal-ref'),
  ('set_import_towing',         'import.inland_towing_usd', '450',  'number', 'Inland towing (USD)',            'US inland towing/trucking to port.',                  'US', 'config:internal-ref'),
  ('set_import_terminal',       'import.terminal_charges_ngn','380000','number','Terminal charges (₦)',          'Lagos port terminal/handling charges.',               'NG', 'config:internal-ref'),
  ('set_import_clearing',       'import.clearing_fee_ngn',  '450000','number', 'Clearing agency fee (₦)',       'Customs clearing agency fee.',                        'NG', 'config:internal-ref'),
  ('set_import_duty',           'import.duty_rate',         '0.35',  'number', 'Import duty rate (combustion)', 'CIF rate applied for non-electric vehicles.',         'NG', 'config:internal-ref'),
  ('set_import_duty_ev',        'import.duty_rate_ev',      '0.10',  'number', 'Import duty rate (electric)',   'CIF rate applied for electric vehicles.',             'NG', 'config:internal-ref'),
  ('set_import_levy',           'import.levy_rate',         '0.15',  'number', 'NAC levy rate (combustion)',    'Nigerian Automotive Council levy.',                   'NG', 'config:internal-ref'),
  ('set_import_levy_ev',        'import.levy_rate_ev',      '0.05',  'number', 'NAC levy rate (electric)',      'Nigerian Automotive Council levy (EV).',              'NG', 'config:internal-ref'),
  ('set_import_vat',            'import.vat_rate',          '0.075', 'number', 'VAT rate',                      'Value-Added Tax on CIF+duty+levy.',                   'NG', 'config:internal-ref'),
  ('set_rental_chauffeur_day',  'rental.chauffeur_fee_day', '25000', 'number', 'Chauffeur fee per day (₦)',     'Optional chauffeur add-on per rental day.',           'NG', 'config:internal-ref'),
  ('set_rental_insurance_day',  'rental.insurance_fee_day', '10000', 'number', 'Insurance fee per day (₦)',     'Optional insurance add-on per rental day.',           'NG', 'config:internal-ref')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. ACTIVITY / ANALYTICS EVENTS — privacy-conscious first-party tracking.
--    No fabricated visitor counts: only real captured events.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_events (
  id            VARCHAR(64) PRIMARY KEY,
  event_type    VARCHAR(64) NOT NULL,   -- page_view | vehicle_view | search | filter | submit_request | ...
  user_id       VARCHAR(64),
  session_id    VARCHAR(128),
  entity_type   VARCHAR(64),
  entity_id     VARCHAR(64),
  path          TEXT,
  referrer      TEXT,
  search_query  TEXT,
  filters_json  JSONB,
  ip_hash       VARCHAR(64),            -- one-way hash, stored only when privacy-approved
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_type_created ON activity_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_events_vehicle ON activity_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_user ON activity_events(user_id, created_at);

-- ----------------------------------------------------------------------------
-- 5. SELL SUBMISSIONS — customer photos (Cloudinary) + admin review workflow.
--    A submission is NOT published until an admin approves it.
-- ----------------------------------------------------------------------------
ALTER TABLE sell_submissions
  ADD COLUMN IF NOT EXISTS photo_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected','needs_info')),
  ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_sell_submissions_review ON sell_submissions(review_status, created_at);

-- ----------------------------------------------------------------------------
-- 6. INSPECTIONS — extend into real report records (inspector, status, notes).
--    (Existing table already holds booking + report_url; add report fields.)
-- ----------------------------------------------------------------------------
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS report_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS report_published BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 7. PERFORMANCE INDEXES for the most frequent query patterns.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel ON vehicles(fuel_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_transmission ON vehicles(transmission);
CREATE INDEX IF NOT EXISTS idx_import_requests_status ON import_requests(status);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_user ON rental_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_concierge_status ON concierge_requests(status);

-- ----------------------------------------------------------------------------
-- 8. IMPORT REQUESTS — admin internal notes + structured contact block helper.
-- ----------------------------------------------------------------------------
ALTER TABLE import_requests
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS origin_country VARCHAR(64) NOT NULL DEFAULT 'USA';

-- Done.