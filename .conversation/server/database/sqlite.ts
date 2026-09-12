import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance: DatabaseSync | null = null;

export function getDatabasePath(): string {
  const customPath = process.env.DATABASE_PATH || process.env.SQLITE_DB_PATH;
  if (customPath) return customPath;
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'shabaautos.db');
}

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = getDatabasePath();
    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
  }
  return dbInstance;
}

export function initializeDatabaseSchema(db: DatabaseSync): void {
  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name)
  );

  if (!applied.has('001_initial_normalized_schema')) {
    db.exec(`
      -- 1. Users & Roles
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('customer', 'staff', 'admin')),
        status TEXT NOT NULL CHECK(status IN ('active', 'suspended', 'pending')),
        avatar_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

      -- 2. Dealerships & Sellers
      CREATE TABLE IF NOT EXISTS sellers (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        dealership_name TEXT,
        verified INTEGER NOT NULL DEFAULT 0,
        rating REAL NOT NULL DEFAULT 5.0,
        reviews_count INTEGER NOT NULL DEFAULT 0,
        location TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        joined_year TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 3. Vehicles
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        trim TEXT,
        price_ngn INTEGER NOT NULL,
        price_usd INTEGER,
        mileage INTEGER NOT NULL,
        mileage_unit TEXT NOT NULL DEFAULT 'km',
        transmission TEXT NOT NULL CHECK(transmission IN ('Automatic', 'Manual')),
        fuel_type TEXT NOT NULL CHECK(fuel_type IN ('Petrol', 'Diesel', 'Hybrid', 'Electric')),
        location TEXT NOT NULL,
        city TEXT,
        state TEXT,
        verified INTEGER NOT NULL DEFAULT 0,
        clean_title INTEGER NOT NULL DEFAULT 1,
        condition TEXT NOT NULL,
        body_type TEXT NOT NULL,
        engine TEXT NOT NULL,
        drive_type TEXT NOT NULL,
        color TEXT NOT NULL,
        seats INTEGER NOT NULL DEFAULT 5,
        stock_id TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        features_json TEXT NOT NULL DEFAULT '[]',
        inspection_passed INTEGER NOT NULL DEFAULT 1,
        seller_id TEXT REFERENCES sellers(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'reserved', 'sold', 'delisted')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- MANDATORY INDEXES on vehicles
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
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        caption TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);

      -- 5. Saved Vehicles
      CREATE TABLE IF NOT EXISTS saved_vehicles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        notes TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, vehicle_id)
      );
      CREATE INDEX IF NOT EXISTS idx_saved_vehicles_user_id ON saved_vehicles(user_id);

      -- 6. Saved Searches
      CREATE TABLE IF NOT EXISTS saved_searches (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        criteria_json TEXT NOT NULL,
        notify_email INTEGER NOT NULL DEFAULT 0,
        notify_sms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 7. Comparison Lists
      CREATE TABLE IF NOT EXISTS comparison_lists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT 'My Comparison',
        vehicle_ids_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 8. Offers
      CREATE TABLE IF NOT EXISTS offers (
        id TEXT PRIMARY KEY,
        car_id TEXT NOT NULL,
        car_name TEXT NOT NULL,
        user_id TEXT,
        buyer_name TEXT NOT NULL,
        buyer_phone TEXT NOT NULL,
        buyer_email TEXT,
        offer_amount_ngn INTEGER NOT NULL,
        vehicle_listing_price_ngn INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL CHECK(status IN ('Pending Review', 'Accepted', 'Countered', 'Declined')),
        counter_amount_ngn INTEGER,
        staff_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_offers_car_id ON offers(car_id);
      CREATE INDEX IF NOT EXISTS idx_offers_buyer_phone ON offers(buyer_phone);

      -- 9. Inspections
      CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        car_id TEXT NOT NULL,
        car_name TEXT NOT NULL,
        user_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        scheduled_date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        hub_location TEXT NOT NULL,
        inspection_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
        inspector_notes TEXT,
        report_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_inspections_car_id ON inspections(car_id);
      CREATE INDEX IF NOT EXISTS idx_inspections_customer_phone ON inspections(customer_phone);

      -- 10. Rental Vehicles
      CREATE TABLE IF NOT EXISTS rental_vehicles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price_per_day_ngn INTEGER NOT NULL,
        transmission TEXT NOT NULL,
        fuel TEXT NOT NULL,
        seats INTEGER NOT NULL DEFAULT 5,
        image_url TEXT NOT NULL,
        available INTEGER NOT NULL DEFAULT 1,
        rating REAL NOT NULL DEFAULT 4.9,
        plate_number TEXT,
        location TEXT NOT NULL DEFAULT 'Lagos',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 11. Rental Availability Blocks
      CREATE TABLE IF NOT EXISTS rental_availability_blocks (
        id TEXT PRIMARY KEY,
        rental_vehicle_id TEXT NOT NULL REFERENCES rental_vehicles(id) ON DELETE CASCADE,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT NOT NULL CHECK(reason IN ('maintenance', 'booked', 'held')),
        rental_booking_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rental_blocks_vehicle_dates ON rental_availability_blocks(rental_vehicle_id, start_date, end_date);

      -- 12. Rental Bookings
      CREATE TABLE IF NOT EXISTS rental_bookings (
        id TEXT PRIMARY KEY,
        car_id TEXT NOT NULL,
        car_name TEXT NOT NULL,
        user_id TEXT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        pickup_date TEXT NOT NULL,
        return_date TEXT NOT NULL,
        pickup_location TEXT NOT NULL,
        days INTEGER NOT NULL,
        daily_rate_ngn INTEGER NOT NULL,
        with_chauffeur INTEGER NOT NULL DEFAULT 0,
        with_insurance INTEGER NOT NULL DEFAULT 0,
        chauffeur_fee_ngn INTEGER NOT NULL DEFAULT 0,
        insurance_fee_ngn INTEGER NOT NULL DEFAULT 0,
        total_ngn INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Active Reservation', 'Completed', 'Cancelled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 13. Import Requests
      CREATE TABLE IF NOT EXISTS import_requests (
        id TEXT PRIMARY KEY,
        tracking_id TEXT NOT NULL UNIQUE,
        user_id TEXT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER,
        year_min TEXT,
        year_max TEXT,
        budget_range TEXT,
        estimated_budget_usd INTEGER,
        vin TEXT,
        vehicle_type TEXT,
        fuel_type TEXT,
        transmission TEXT,
        drive_type TEXT,
        mileage_pref TEXT,
        features_json TEXT NOT NULL DEFAULT '[]',
        delivery_city TEXT NOT NULL DEFAULT 'Lagos',
        destination_port TEXT NOT NULL DEFAULT 'Tin Can Island Container Terminal, Lagos',
        origin_port TEXT NOT NULL DEFAULT 'Port of Newark, NJ, USA',
        additional_notes TEXT,
        status TEXT NOT NULL CHECK(status IN ('Sourcing Started', 'Inspection Passed', 'Shipped from USA', 'Port Arrival', 'Customs Clearance', 'Delivered', 'Cancelled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_import_requests_tracking_id ON import_requests(tracking_id);
      CREATE INDEX IF NOT EXISTS idx_import_requests_vin ON import_requests(vin);

      -- 14. Import Cost Estimates
      CREATE TABLE IF NOT EXISTS import_cost_estimates (
        id TEXT PRIMARY KEY,
        import_request_id TEXT REFERENCES import_requests(id) ON DELETE CASCADE,
        auction_price_usd INTEGER NOT NULL,
        vehicle_year INTEGER NOT NULL,
        usd_to_ngn_rate REAL NOT NULL,
        ocean_freight_usd INTEGER NOT NULL,
        inland_towing_usd INTEGER NOT NULL,
        cif_value_usd INTEGER NOT NULL,
        cif_value_ngn INTEGER NOT NULL,
        duty_rate REAL NOT NULL,
        levy_rate REAL NOT NULL,
        import_duty_ngn INTEGER NOT NULL,
        nac_levy_ngn INTEGER NOT NULL,
        vat_ngn INTEGER NOT NULL,
        terminal_charges_ngn INTEGER NOT NULL,
        clearing_agency_fee_ngn INTEGER NOT NULL,
        total_customs_clearance_ngn INTEGER NOT NULL,
        vehicle_landed_cost_ngn INTEGER NOT NULL,
        savings_vs_local_market_ngn INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      -- 15. Shipment Milestones
      CREATE TABLE IF NOT EXISTS shipment_milestones (
        id TEXT PRIMARY KEY,
        tracking_id TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        scheduled_date TEXT NOT NULL,
        completed_date TEXT,
        is_completed INTEGER NOT NULL DEFAULT 0,
        is_current INTEGER NOT NULL DEFAULT 0,
        location TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_milestones_tracking_id ON shipment_milestones(tracking_id);

      -- 16. Tracking Events
      CREATE TABLE IF NOT EXISTS tracking_events (
        id TEXT PRIMARY KEY,
        tracking_id TEXT NOT NULL,
        event_timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        location TEXT NOT NULL,
        vessel_name TEXT,
        container_no TEXT,
        details TEXT,
        recorded_by TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking_id ON tracking_events(tracking_id);

      -- 17. Sell Submissions
      CREATE TABLE IF NOT EXISTS sell_submissions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        seller_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        trim TEXT,
        mileage INTEGER NOT NULL,
        condition TEXT NOT NULL,
        issues TEXT,
        location TEXT NOT NULL,
        asking_price_ngn INTEGER NOT NULL,
        estimated_value_ngn INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Under Review', 'Inspection Scheduled', 'Offer Extended', 'Purchased', 'Rejected')),
        inspector_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 18. Valuation History
      CREATE TABLE IF NOT EXISTS valuation_history (
        id TEXT PRIMARY KEY,
        sell_submission_id TEXT REFERENCES sell_submissions(id) ON DELETE CASCADE,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        mileage INTEGER NOT NULL,
        condition TEXT NOT NULL,
        algorithm_version TEXT NOT NULL,
        base_value_ngn INTEGER NOT NULL,
        mileage_factor REAL NOT NULL,
        condition_factor REAL NOT NULL,
        final_valuation_ngn INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      -- 19. Concierge Requests
      CREATE TABLE IF NOT EXISTS concierge_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        desired_make TEXT NOT NULL,
        desired_model TEXT NOT NULL,
        body_type TEXT,
        year_range TEXT NOT NULL,
        budget_range TEXT,
        max_budget_ngn INTEGER NOT NULL,
        preferred_condition TEXT NOT NULL,
        fuel_type TEXT,
        transmission TEXT,
        color_pref TEXT,
        interior_pref TEXT,
        notes TEXT,
        status TEXT NOT NULL CHECK(status IN ('Request Received', 'Agent Assigned', 'Options Presented', 'Fulfilled', 'Closed')),
        assigned_agent_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 20. Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        recipient_phone TEXT,
        recipient_email TEXT,
        channel TEXT NOT NULL CHECK(channel IN ('sms', 'email', 'in_app')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('queued', 'sent', 'failed', 'read')),
        related_entity_type TEXT,
        related_entity_id TEXT,
        created_at TEXT NOT NULL,
        sent_at TEXT
      );

      -- 21. Audit Logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        changes_json TEXT,
        created_at TEXT NOT NULL
      );

      -- 22. External API Cache
      CREATE TABLE IF NOT EXISTS external_api_cache (
        cache_key TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        request_url TEXT,
        response_data_json TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON external_api_cache(expires_at);

      -- 23. AI Usage Records
      CREATE TABLE IF NOT EXISTS ai_usage_records (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        prompt_type TEXT NOT NULL,
        model_name TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        latency_ms INTEGER,
        status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
        metadata_json TEXT,
        created_at TEXT NOT NULL
      );
    `);

    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
      '001_initial_normalized_schema',
      new Date().toISOString()
    );
  }

  if (!applied.has('002_clerk_auth_support')) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN clerk_id TEXT;`);
    } catch {}
    try {
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);`);
    } catch {}
    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
      '002_clerk_auth_support',
      new Date().toISOString()
    );
  }
}
