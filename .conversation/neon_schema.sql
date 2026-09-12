-- ============================================================================
-- SHABAAUTOS POSTGRESQL / NEON DB INITIALIZATION SCHEMA
-- Run this SQL in your Neon DB SQL Editor (https://console.neon.tech)
-- ============================================================================

-- 1. Users & Roles
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK(role IN ('customer', 'staff', 'admin')),
  status VARCHAR(32) NOT NULL CHECK(status IN ('active', 'suspended', 'pending')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Dealerships & Verified Sellers
CREATE TABLE IF NOT EXISTS sellers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  dealership_name VARCHAR(255),
  verified BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  location VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255),
  joined_year VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Vehicle Showroom Inventory
CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) PRIMARY KEY,
  make VARCHAR(64) NOT NULL,
  model VARCHAR(64) NOT NULL,
  year INTEGER NOT NULL,
  trim VARCHAR(64),
  price_ngn BIGINT NOT NULL,
  price_usd BIGINT,
  mileage INTEGER NOT NULL,
  mileage_unit VARCHAR(16) NOT NULL DEFAULT 'km',
  transmission VARCHAR(32) NOT NULL CHECK(transmission IN ('Automatic', 'Manual')),
  fuel_type VARCHAR(32) NOT NULL CHECK(fuel_type IN ('Petrol', 'Diesel', 'Hybrid', 'Electric')),
  location VARCHAR(128) NOT NULL,
  city VARCHAR(64),
  state VARCHAR(64),
  verified BOOLEAN NOT NULL DEFAULT false,
  clean_title BOOLEAN NOT NULL DEFAULT true,
  condition VARCHAR(64) NOT NULL,
  body_type VARCHAR(64) NOT NULL,
  engine VARCHAR(128) NOT NULL,
  drive_type VARCHAR(32) NOT NULL,
  color VARCHAR(64) NOT NULL,
  seats INTEGER NOT NULL DEFAULT 5,
  stock_id VARCHAR(64) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  features_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  inspection_passed BOOLEAN NOT NULL DEFAULT true,
  seller_id VARCHAR(64) REFERENCES sellers(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'reserved', 'sold', 'delisted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast showroom queries & filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_condition ON vehicles(condition);
CREATE INDEX IF NOT EXISTS idx_vehicles_body_type ON vehicles(body_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_price_ngn ON vehicles(price_ngn);
CREATE INDEX IF NOT EXISTS idx_vehicles_city ON vehicles(city);
CREATE INDEX IF NOT EXISTS idx_vehicles_verified ON vehicles(verified);
CREATE INDEX IF NOT EXISTS idx_vehicles_stock_id ON vehicles(stock_id);

-- 4. Vehicle Images
CREATE TABLE IF NOT EXISTS vehicle_images (
  id VARCHAR(64) PRIMARY KEY,
  vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  caption VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);

-- 5. Saved Vehicles
CREATE TABLE IF NOT EXISTS saved_vehicles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_vehicles_user_id ON saved_vehicles(user_id);

-- 6. Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  criteria_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notify_email BOOLEAN NOT NULL DEFAULT false,
  notify_sms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Comparison Lists
CREATE TABLE IF NOT EXISTS comparison_lists (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'My Comparison',
  vehicle_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Price Offers & Counter-Offers
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(64) PRIMARY KEY,
  car_id VARCHAR(64) NOT NULL,
  car_name VARCHAR(255) NOT NULL,
  user_id VARCHAR(64),
  buyer_name VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(64) NOT NULL,
  buyer_email VARCHAR(255),
  offer_amount_ngn BIGINT NOT NULL,
  vehicle_listing_price_ngn BIGINT NOT NULL,
  payment_method VARCHAR(64) NOT NULL,
  notes TEXT,
  status VARCHAR(32) NOT NULL CHECK(status IN ('Pending Review', 'Accepted', 'Countered', 'Declined')),
  counter_amount_ngn BIGINT,
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_car_id ON offers(car_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_phone ON offers(buyer_phone);

-- 9. Physical & Hub Inspections
CREATE TABLE IF NOT EXISTS inspections (
  id VARCHAR(64) PRIMARY KEY,
  car_id VARCHAR(64) NOT NULL,
  car_name VARCHAR(255) NOT NULL,
  user_id VARCHAR(64),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(64) NOT NULL,
  customer_email VARCHAR(255),
  scheduled_date VARCHAR(64) NOT NULL,
  time_slot VARCHAR(64) NOT NULL,
  hub_location VARCHAR(255) NOT NULL,
  inspection_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK(status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  inspector_notes TEXT,
  report_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_car_id ON inspections(car_id);
CREATE INDEX IF NOT EXISTS idx_inspections_customer_phone ON inspections(customer_phone);

-- 10. Rental Fleet
CREATE TABLE IF NOT EXISTS rental_vehicles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  price_per_day_ngn BIGINT NOT NULL,
  transmission VARCHAR(32) NOT NULL,
  fuel VARCHAR(32) NOT NULL,
  seats INTEGER NOT NULL DEFAULT 5,
  image_url TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.9,
  plate_number VARCHAR(64),
  location VARCHAR(128) NOT NULL DEFAULT 'Lagos',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Rental Availability & Scheduling Blocks
CREATE TABLE IF NOT EXISTS rental_availability_blocks (
  id VARCHAR(64) PRIMARY KEY,
  rental_vehicle_id VARCHAR(64) NOT NULL REFERENCES rental_vehicles(id) ON DELETE CASCADE,
  start_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32) NOT NULL,
  reason VARCHAR(32) NOT NULL CHECK(reason IN ('maintenance', 'booked', 'held')),
  rental_booking_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rental_blocks_vehicle_dates ON rental_availability_blocks(rental_vehicle_id, start_date, end_date);

-- 12. Rental Bookings
CREATE TABLE IF NOT EXISTS rental_bookings (
  id VARCHAR(64) PRIMARY KEY,
  car_id VARCHAR(64) NOT NULL,
  car_name VARCHAR(255) NOT NULL,
  user_id VARCHAR(64),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255),
  pickup_date VARCHAR(32) NOT NULL,
  return_date VARCHAR(32) NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  days INTEGER NOT NULL,
  daily_rate_ngn BIGINT NOT NULL,
  with_chauffeur BOOLEAN NOT NULL DEFAULT false,
  with_insurance BOOLEAN NOT NULL DEFAULT false,
  chauffeur_fee_ngn BIGINT NOT NULL DEFAULT 0,
  insurance_fee_ngn BIGINT NOT NULL DEFAULT 0,
  total_ngn BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL CHECK(status IN ('Active Reservation', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Custom Import Sourcing Requests
CREATE TABLE IF NOT EXISTS import_requests (
  id VARCHAR(64) PRIMARY KEY,
  tracking_id VARCHAR(64) NOT NULL UNIQUE,
  user_id VARCHAR(64),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255),
  make VARCHAR(64) NOT NULL,
  model VARCHAR(64) NOT NULL,
  year INTEGER,
  year_min VARCHAR(16),
  year_max VARCHAR(16),
  budget_range VARCHAR(64),
  estimated_budget_usd BIGINT,
  vin VARCHAR(64),
  vehicle_type VARCHAR(64),
  fuel_type VARCHAR(32),
  transmission VARCHAR(32),
  drive_type VARCHAR(32),
  mileage_pref VARCHAR(64),
  features_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_city VARCHAR(64) NOT NULL DEFAULT 'Lagos',
  destination_port VARCHAR(255) NOT NULL DEFAULT 'Tin Can Island Container Terminal, Lagos',
  origin_port VARCHAR(255) NOT NULL DEFAULT 'Port of Newark, NJ, USA',
  additional_notes TEXT,
  status VARCHAR(64) NOT NULL CHECK(status IN ('Sourcing Started', 'Inspection Passed', 'Shipped from USA', 'Port Arrival', 'Customs Clearance', 'Delivered', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_requests_tracking_id ON import_requests(tracking_id);
CREATE INDEX IF NOT EXISTS idx_import_requests_vin ON import_requests(vin);

-- 14. Customs & Landed Cost Estimates
CREATE TABLE IF NOT EXISTS import_cost_estimates (
  id VARCHAR(64) PRIMARY KEY,
  import_request_id VARCHAR(64) REFERENCES import_requests(id) ON DELETE CASCADE,
  auction_price_usd BIGINT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  usd_to_ngn_rate NUMERIC(10, 2) NOT NULL,
  ocean_freight_usd BIGINT NOT NULL,
  inland_towing_usd BIGINT NOT NULL,
  cif_value_usd BIGINT NOT NULL,
  cif_value_ngn BIGINT NOT NULL,
  duty_rate NUMERIC(5, 2) NOT NULL,
  levy_rate NUMERIC(5, 2) NOT NULL,
  import_duty_ngn BIGINT NOT NULL,
  nac_levy_ngn BIGINT NOT NULL,
  vat_ngn BIGINT NOT NULL,
  terminal_charges_ngn BIGINT NOT NULL,
  clearing_agency_fee_ngn BIGINT NOT NULL,
  total_customs_clearance_ngn BIGINT NOT NULL,
  vehicle_landed_cost_ngn BIGINT NOT NULL,
  savings_vs_local_market_ngn BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Shipment Milestones
CREATE TABLE IF NOT EXISTS shipment_milestones (
  id VARCHAR(64) PRIMARY KEY,
  tracking_id VARCHAR(64) NOT NULL,
  step_order INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_date VARCHAR(64) NOT NULL,
  completed_date VARCHAR(64),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_current BOOLEAN NOT NULL DEFAULT false,
  location VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_tracking_id ON shipment_milestones(tracking_id);

-- 16. Container & Vessel Tracking Events
CREATE TABLE IF NOT EXISTS tracking_events (
  id VARCHAR(64) PRIMARY KEY,
  tracking_id VARCHAR(64) NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  status VARCHAR(128) NOT NULL,
  location VARCHAR(255) NOT NULL,
  vessel_name VARCHAR(128),
  container_no VARCHAR(128),
  details TEXT,
  recorded_by VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking_id ON tracking_events(tracking_id);

-- 17. Vehicle Sell & Appraisal Submissions
CREATE TABLE IF NOT EXISTS sell_submissions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  seller_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255),
  make VARCHAR(64) NOT NULL,
  model VARCHAR(64) NOT NULL,
  year INTEGER NOT NULL,
  trim VARCHAR(64),
  mileage INTEGER NOT NULL,
  condition VARCHAR(64) NOT NULL,
  issues TEXT,
  location VARCHAR(128) NOT NULL,
  asking_price_ngn BIGINT NOT NULL,
  estimated_value_ngn BIGINT NOT NULL,
  status VARCHAR(64) NOT NULL CHECK(status IN ('Under Review', 'Inspection Scheduled', 'Offer Extended', 'Purchased', 'Rejected')),
  inspector_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Valuation Algorithm Audit History
CREATE TABLE IF NOT EXISTS valuation_history (
  id VARCHAR(64) PRIMARY KEY,
  sell_submission_id VARCHAR(64) REFERENCES sell_submissions(id) ON DELETE CASCADE,
  make VARCHAR(64) NOT NULL,
  model VARCHAR(64) NOT NULL,
  year INTEGER NOT NULL,
  mileage INTEGER NOT NULL,
  condition VARCHAR(64) NOT NULL,
  algorithm_version VARCHAR(32) NOT NULL,
  base_value_ngn BIGINT NOT NULL,
  mileage_factor NUMERIC(6, 4) NOT NULL,
  condition_factor NUMERIC(6, 4) NOT NULL,
  final_valuation_ngn BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Car Concierge Requests
CREATE TABLE IF NOT EXISTS concierge_requests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255),
  desired_make VARCHAR(64) NOT NULL,
  desired_model VARCHAR(64) NOT NULL,
  body_type VARCHAR(64),
  year_range VARCHAR(64) NOT NULL,
  budget_range VARCHAR(64),
  max_budget_ngn BIGINT NOT NULL,
  preferred_condition VARCHAR(64) NOT NULL,
  fuel_type VARCHAR(32),
  transmission VARCHAR(32),
  color_pref VARCHAR(64),
  interior_pref VARCHAR(64),
  notes TEXT,
  status VARCHAR(64) NOT NULL CHECK(status IN ('Request Received', 'Agent Assigned', 'Options Presented', 'Fulfilled', 'Closed')),
  assigned_agent_name VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Automated Client Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  recipient_phone VARCHAR(64),
  recipient_email VARCHAR(255),
  channel VARCHAR(16) NOT NULL CHECK(channel IN ('sms', 'email', 'in_app')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(16) NOT NULL CHECK(status IN ('queued', 'sent', 'failed', 'read')),
  related_entity_type VARCHAR(64),
  related_entity_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 21. Regulatory & Operations Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_user_id VARCHAR(64),
  actor_role VARCHAR(32) NOT NULL,
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  changes_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. External API Cache (NHTSA & Wikipedia Grounding)
CREATE TABLE IF NOT EXISTS external_api_cache (
  cache_key VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(64) NOT NULL,
  request_url TEXT,
  response_data_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON external_api_cache(expires_at);

-- 23. AI Usage Records
CREATE TABLE IF NOT EXISTS ai_usage_records (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  prompt_type VARCHAR(64) NOT NULL,
  model_name VARCHAR(64) NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  status VARCHAR(16) NOT NULL CHECK(status IN ('success', 'failed')),
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
