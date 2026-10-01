import pg from 'pg';
import crypto from 'node:crypto';
import {
  User,
  Vehicle,
  VehicleImage,
  DealershipSeller,
  SavedSearch,
  ComparisonList,
  Offer,
  Inspection,
  RentalVehicle,
  RentalBooking,
  ImportRequest,
  ImportCostEstimate,
  ShipmentMilestone,
  TrackingEvent,
  SellSubmission,
  ValuationHistory,
  ConciergeRequest,
  NotificationRecord,
  AuditLog,
  ExternalApiCacheRecord,
  AiUsageRecord,
  OrderStatusHistory,
  SiteSetting,
  ActivityEvent,
} from '../models/types';
import {
  IDatabaseService,
  IUserRepository,
  IVehicleRepository,
  VehicleImageInput,
  IStatusHistoryRepository,
  ISettingsRepository,
  IActivityRepository,
  IOfferRepository,
  IInspectionRepository,
  IRentalRepository,
  IImportRepository,
  ISellRepository,
  IConciergeRepository,
  ISavedPreferencesRepository,
  IAuditRepository,
  ICacheRepository,
  IAiUsageRepository,
  INotificationRepository,
  VehicleFilterParams,
  VehicleFacets,
} from './interfaces';
import { initializePostgresSchema } from '../database/postgres';

function parseJson(val: any, fallback: any = []): any {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val || fallback;
}

function toIso(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

// -------------------------------------------------------------
// Users Repository
// -------------------------------------------------------------
export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: pg.Pool) {}

  private mapUser(r: any): User {
    return {
      id: r.id,
      clerkId: r.clerk_id || undefined,
      email: r.email,
      passwordHash: r.password_hash,
      fullName: r.full_name,
      phone: r.phone,
      role: r.role,
      status: r.status,
      avatarUrl: r.avatar_url || undefined,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async findById(id: string): Promise<User | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1 OR clerk_id = $1', [id]);
    return res.rows[0] ? this.mapUser(res.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0] ? this.mapUser(res.rows[0]) : null;
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE clerk_id = $1 OR id = $1', [clerkId]);
    return res.rows[0] ? this.mapUser(res.rows[0]) : null;
  }

  async upsertClerkUser(data: {
    clerkId: string;
    email: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
    role?: 'customer' | 'staff' | 'admin';
  }): Promise<User> {
    const existing = await this.findByClerkId(data.clerkId) || await this.findByEmail(data.email);
    const now = new Date().toISOString();

    if (existing) {
      const q = `
        UPDATE users
        SET clerk_id = $1, email = $2, full_name = $3, phone = COALESCE($4, phone), avatar_url = COALESCE($5, avatar_url), role = COALESCE($6, role), updated_at = $7
        WHERE id = $8
        RETURNING *
      `;
      const res = await this.pool.query(q, [
        data.clerkId,
        data.email.toLowerCase().trim(),
        data.fullName || existing.fullName,
        data.phone !== undefined ? data.phone : null,
        data.avatarUrl || null,
        data.role || null,
        now,
        existing.id,
      ]);
      return this.mapUser(res.rows[0]);
    }

    const id = data.clerkId.startsWith('user_') ? data.clerkId : `usr_${crypto.randomUUID()}`;
    const q = `
      INSERT INTO users (id, clerk_id, email, password_hash, full_name, phone, role, status, avatar_url, created_at, updated_at)
      VALUES ($1, $2, $3, '', $4, $5, $6, 'active', $7, $8, $8)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      data.clerkId,
      data.email.toLowerCase().trim(),
      data.fullName || 'Valued Client',
      data.phone || '',
      data.role || 'customer',
      data.avatarUrl || null,
      now,
    ]);
    return this.mapUser(res.rows[0]);
  }

  async deleteByClerkId(clerkId: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM users WHERE clerk_id = $1 OR id = $1', [clerkId]);
    return (res.rowCount ?? 0) > 0;
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = `usr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO users (id, email, password_hash, full_name, phone, role, status, avatar_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      user.email.toLowerCase().trim(),
      user.passwordHash,
      user.fullName,
      user.phone,
      user.role,
      user.status,
      user.avatarUrl || null,
      now,
      now,
    ]);
    return this.mapUser(res.rows[0]);
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const q = `
      UPDATE users
      SET email = $1, full_name = $2, phone = $3, role = $4, status = $5, avatar_url = $6, updated_at = $7
      WHERE id = $8
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      merged.email.toLowerCase().trim(),
      merged.fullName,
      merged.phone,
      merged.role,
      merged.status,
      merged.avatarUrl || null,
      merged.updatedAt,
      id,
    ]);
    return res.rows[0] ? this.mapUser(res.rows[0]) : null;
  }

  async list(limit = 50, offset = 0): Promise<User[]> {
    const res = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [
      limit,
      offset,
    ]);
    return res.rows.map((r) => this.mapUser(r));
  }
}

// -------------------------------------------------------------
// Vehicles Repository
// -------------------------------------------------------------
export class PostgresVehicleRepository implements IVehicleRepository {
  constructor(private pool: pg.Pool) {}

  private mapVehicle(r: any): Vehicle {
    return {
      id: r.id,
      make: r.make,
      model: r.model,
      year: Number(r.year),
      trim: r.trim || undefined,
      priceNgn: Number(r.price_ngn),
      priceUsd: r.price_usd ? Number(r.price_usd) : undefined,
      mileage: Number(r.mileage),
      mileageUnit: r.mileage_unit,
      transmission: r.transmission,
      fuelType: r.fuel_type,
      location: r.location,
      city: r.city || undefined,
      state: r.state || undefined,
      verified: Boolean(r.verified),
      cleanTitle: Boolean(r.clean_title),
      condition: r.condition,
      bodyType: r.body_type,
      engine: r.engine,
      driveType: r.drive_type,
      color: r.color,
      seats: Number(r.seats),
      stockId: r.stock_id,
      description: r.description,
      features: parseJson(r.features_json, []),
      inspectionPassed: Boolean(r.inspection_passed),
      sellerId: r.seller_id || undefined,
      status: r.status,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async findById(id: string): Promise<Vehicle | null> {
    const res = await this.pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    return res.rows[0] ? this.mapVehicle(res.rows[0]) : null;
  }

  async findByStockId(stockId: string): Promise<Vehicle | null> {
    const res = await this.pool.query('SELECT * FROM vehicles WHERE stock_id = $1', [stockId]);
    return res.rows[0] ? this.mapVehicle(res.rows[0]) : null;
  }

  async list(filters?: VehicleFilterParams): Promise<{ vehicles: Vehicle[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters?.make && filters.make !== 'All Makes') {
      conditions.push(`LOWER(make) = LOWER($${idx++})`);
      values.push(filters.make);
    }
    if (filters?.model) {
      conditions.push(`LOWER(model) LIKE LOWER($${idx++})`);
      values.push(`%${filters.model}%`);
    }
    if (filters?.condition && filters.condition !== 'All Conditions' && filters.condition !== 'All') {
      conditions.push(`LOWER(condition) = LOWER($${idx++})`);
      values.push(filters.condition);
    }
    if (filters?.bodyType && filters.bodyType !== 'All Body Types' && filters.bodyType !== 'All') {
      conditions.push(`LOWER(body_type) = LOWER($${idx++})`);
      values.push(filters.bodyType);
    }
    if (filters?.transmission && filters.transmission !== 'All Transmissions' && filters.transmission !== 'All') {
      conditions.push(`LOWER(transmission) = LOWER($${idx++})`);
      values.push(filters.transmission);
    }
    if (filters?.fuelType && filters.fuelType !== 'All Fuels' && filters.fuelType !== 'All') {
      conditions.push(`LOWER(fuel_type) = LOWER($${idx++})`);
      values.push(filters.fuelType);
    }
    if (filters?.minPrice !== undefined) {
      conditions.push(`price_ngn >= $${idx++}`);
      values.push(filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(`price_ngn <= $${idx++}`);
      values.push(filters.maxPrice);
    }
    if (filters?.minYear !== undefined) {
      conditions.push(`year >= $${idx++}`);
      values.push(filters.minYear);
    }
    if (filters?.maxYear !== undefined) {
      conditions.push(`year <= $${idx++}`);
      values.push(filters.maxYear);
    }
    if (filters?.minMileage !== undefined) {
      conditions.push(`mileage >= $${idx++}`);
      values.push(filters.minMileage);
    }
    if (filters?.maxMileage !== undefined) {
      conditions.push(`mileage <= $${idx++}`);
      values.push(filters.maxMileage);
    }
    if (filters?.city) {
      conditions.push(`(LOWER(city) = LOWER($${idx}) OR LOWER(location) LIKE LOWER($${idx++}))`);
      values.push(`%${filters.city}%`);
    }
    if (filters?.verified !== undefined) {
      conditions.push(`verified = $${idx++}`);
      values.push(filters.verified);
    }
    if (filters?.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    } else {
      conditions.push(`status != 'delisted'`);
    }
    if (filters?.search) {
      conditions.push(
        `(LOWER(make) LIKE LOWER($${idx}) OR LOWER(model) LIKE LOWER($${idx}) OR LOWER(description) LIKE LOWER($${idx}) OR LOWER(location) LIKE LOWER($${idx}) OR LOWER(stock_id) LIKE LOWER($${idx++}))`
      );
      values.push(`%${filters.search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.pool.query(`SELECT COUNT(*) as count FROM vehicles ${where}`, values);
    const total = Number(countRes.rows[0]?.count || 0);

    const limit = Math.max(1, filters?.limit || 50);
    const offset = Math.max(0, filters?.offset || 0);

    let orderBy = 'created_at DESC, id DESC';
    if (filters?.sort === 'price-asc') {
      orderBy = 'price_ngn ASC, id DESC';
    } else if (filters?.sort === 'price-desc') {
      orderBy = 'price_ngn DESC, id DESC';
    } else if (filters?.sort === 'mileage-asc') {
      orderBy = 'mileage ASC, id DESC';
    } else if (filters?.sort === 'mileage-desc') {
      orderBy = 'mileage DESC, id DESC';
    } else if (filters?.sort === 'year-desc') {
      orderBy = 'year DESC, price_ngn ASC, id DESC';
    } else if (filters?.sort === 'year-asc') {
      orderBy = 'year ASC, price_ngn ASC, id DESC';
    } else if (filters?.sort === 'newest') {
      orderBy = 'created_at DESC, id DESC';
    }

    const query = `
      SELECT * FROM vehicles
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const rowsRes = await this.pool.query(query, [...values, limit, offset]);

    return {
      vehicles: rowsRes.rows.map((r) => this.mapVehicle(r)),
      total,
    };
  }

  async getFacets(): Promise<VehicleFacets> {
    const makeRes = await this.pool.query("SELECT DISTINCT make FROM vehicles WHERE verified = TRUE AND status = 'available' ORDER BY make ASC");
    const modelRes = await this.pool.query("SELECT DISTINCT model FROM vehicles WHERE verified = TRUE AND status = 'available' ORDER BY model ASC");
    const bodyRes = await this.pool.query("SELECT DISTINCT body_type FROM vehicles WHERE verified = TRUE AND status = 'available' AND body_type IS NOT NULL ORDER BY body_type ASC");
    const condRes = await this.pool.query("SELECT DISTINCT condition FROM vehicles WHERE verified = TRUE AND status = 'available' AND condition IS NOT NULL ORDER BY condition ASC");
    const transRes = await this.pool.query("SELECT DISTINCT transmission FROM vehicles WHERE verified = TRUE AND status = 'available' AND transmission IS NOT NULL ORDER BY transmission ASC");
    const fuelRes = await this.pool.query("SELECT DISTINCT fuel_type FROM vehicles WHERE verified = TRUE AND status = 'available' AND fuel_type IS NOT NULL ORDER BY fuel_type ASC");
    const boundsRes = await this.pool.query(`
      SELECT 
        MIN(price_ngn) as min_price, 
        MAX(price_ngn) as max_price, 
        MIN(year) as min_year, 
        MAX(year) as max_year,
        MIN(mileage) as min_mileage,
        MAX(mileage) as max_mileage
      FROM vehicles 
      WHERE verified = TRUE AND status = 'available'
    `);
    const b = boundsRes.rows[0];

    return {
      makes: makeRes.rows.map((r) => r.make).filter(Boolean),
      models: modelRes.rows.map((r) => r.model).filter(Boolean),
      bodyTypes: bodyRes.rows.map((r) => r.body_type).filter(Boolean),
      conditions: condRes.rows.map((r) => r.condition).filter(Boolean),
      transmissions: transRes.rows.map((r) => r.transmission).filter(Boolean),
      fuelTypes: fuelRes.rows.map((r) => r.fuel_type).filter(Boolean),
      priceBounds: {
        min: b?.min_price ? Number(b.min_price) : 5000000,
        max: b?.max_price ? Number(b.max_price) : 150000000,
      },
      yearBounds: {
        min: b?.min_year ? Number(b.min_year) : 2012,
        max: b?.max_year ? Number(b.max_year) : 2026,
      },
      mileageBounds: {
        min: b?.min_mileage !== undefined ? Number(b.min_mileage) : 0,
        max: b?.max_mileage ? Number(b.max_mileage) : 150000,
      },
    };
  }

  async create(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>, images: string[] = []): Promise<Vehicle> {
    const id = `veh_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO vehicles (
        id, make, model, year, trim, price_ngn, price_usd, mileage, mileage_unit,
        transmission, fuel_type, location, city, state, verified, clean_title,
        condition, body_type, engine, drive_type, color, seats, stock_id,
        description, features_json, inspection_passed, seller_id, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      )
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.trim || null,
      vehicle.priceNgn,
      vehicle.priceUsd || null,
      vehicle.mileage,
      vehicle.mileageUnit,
      vehicle.transmission,
      vehicle.fuelType,
      vehicle.location,
      vehicle.city || null,
      vehicle.state || null,
      vehicle.verified ? true : false,
      vehicle.cleanTitle ? true : false,
      vehicle.condition,
      vehicle.bodyType,
      vehicle.engine,
      vehicle.driveType,
      vehicle.color,
      vehicle.seats || 5,
      vehicle.stockId,
      vehicle.description,
      JSON.stringify(vehicle.features || []),
      vehicle.inspectionPassed ? true : false,
      vehicle.sellerId || null,
      vehicle.status,
      now,
      now,
    ]);

    if (images && images.length > 0) {
      await this.setImages(id, images);
    }

    return this.mapVehicle(res.rows[0]);
  }

  async update(id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const q = `
      UPDATE vehicles SET
        make = $1, model = $2, year = $3, trim = $4, price_ngn = $5, price_usd = $6,
        mileage = $7, mileage_unit = $8, transmission = $9, fuel_type = $10, location = $11,
        city = $12, state = $13, verified = $14, clean_title = $15, condition = $16,
        body_type = $17, engine = $18, drive_type = $19, color = $20, seats = $21,
        description = $22, features_json = $23, inspection_passed = $24, status = $25, updated_at = $26
      WHERE id = $27
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      merged.make,
      merged.model,
      merged.year,
      merged.trim || null,
      merged.priceNgn,
      merged.priceUsd || null,
      merged.mileage,
      merged.mileageUnit,
      merged.transmission,
      merged.fuelType,
      merged.location,
      merged.city || null,
      merged.state || null,
      merged.verified,
      merged.cleanTitle,
      merged.condition,
      merged.bodyType,
      merged.engine,
      merged.driveType,
      merged.color,
      merged.seats,
      merged.description,
      JSON.stringify(merged.features || []),
      merged.inspectionPassed,
      merged.status,
      merged.updatedAt,
      id,
    ]);
    return res.rows[0] ? this.mapVehicle(res.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM vehicles WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async getImages(vehicleId: string): Promise<VehicleImage[]> {
    const res = await this.pool.query(
      'SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY display_order ASC, created_at ASC',
      [vehicleId]
    );
    return res.rows.map((r) => this.mapImage(r));
  }

  private mapImage(r: any): VehicleImage {
    return {
      id: r.id,
      vehicleId: r.vehicle_id,
      url: r.url,
      displayOrder: Number(r.display_order ?? 0),
      caption: r.caption || undefined,
      isPrimary: Boolean(r.is_primary),
      publicId: r.public_id || undefined,
      assetId: r.asset_id || undefined,
      width: r.width !== null && r.width !== undefined ? Number(r.width) : undefined,
      height: r.height !== null && r.height !== undefined ? Number(r.height) : undefined,
      format: r.format || undefined,
      createdAt: toIso(r.created_at),
    };
  }

  async setImages(vehicleId: string, imageUrls: string[]): Promise<void> {
    await this.pool.query('DELETE FROM vehicle_images WHERE vehicle_id = $1', [vehicleId]);
    for (let i = 0; i < imageUrls.length; i++) {
      const imgId = `img_${crypto.randomUUID()}`;
      await this.pool.query(
        'INSERT INTO vehicle_images (id, vehicle_id, url, display_order, is_primary, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [imgId, vehicleId, imageUrls[i], i, i === 0, new Date().toISOString()]
      );
    }
  }

  async addImages(vehicleId: string, images: VehicleImageInput[]): Promise<VehicleImage[]> {
    const created: VehicleImage[] = [];
    for (const img of images) {
      const imgId = `img_${crypto.randomUUID()}`;
      const q = `INSERT INTO vehicle_images
        (id, vehicle_id, url, display_order, is_primary, public_id, asset_id, width, height, format, caption, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`;
      const res = await this.pool.query(q, [
        imgId,
        vehicleId,
        img.url,
        img.displayOrder ?? 0,
        img.isPrimary ?? false,
        img.publicId || null,
        img.assetId || null,
        img.width ?? null,
        img.height ?? null,
        img.format || null,
        img.caption || null,
        new Date().toISOString(),
      ]);
      created.push(this.mapImage(res.rows[0]));
      if (img.isPrimary) {
        await this.pool.query('UPDATE vehicle_images SET is_primary = false WHERE vehicle_id = $1 AND id <> $2', [vehicleId, imgId]);
      }
    }
    return created;
  }

  async updateImage(imageId: string, updates: Partial<Pick<VehicleImage, 'isPrimary' | 'displayOrder' | 'caption'>>): Promise<VehicleImage | null> {
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.isPrimary !== undefined) { params.push(Boolean(updates.isPrimary)); sets.push(`is_primary = $${params.length}`); }
    if (updates.displayOrder !== undefined) { params.push(Math.max(0, Number(updates.displayOrder))); sets.push(`display_order = $${params.length}`); }
    if (updates.caption !== undefined) { params.push(updates.caption || null); sets.push(`caption = $${params.length}`); }
    if (sets.length === 0) return this.getImageById(imageId);
    params.push(imageId);
    const res = await this.pool.query(
      `UPDATE vehicle_images SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return res.rows[0] ? this.mapImage(res.rows[0]) : null;
  }

  async setPrimaryImage(vehicleId: string, imageId: string): Promise<void> {
    await this.pool.query('UPDATE vehicle_images SET is_primary = false WHERE vehicle_id = $1', [vehicleId]);
    await this.pool.query('UPDATE vehicle_images SET is_primary = true WHERE id = $1 AND vehicle_id = $2', [imageId, vehicleId]);
  }

  async deleteImage(imageId: string): Promise<VehicleImage | null> {
    const res = await this.pool.query('DELETE FROM vehicle_images WHERE id = $1 RETURNING *', [imageId]);
    return res.rows[0] ? this.mapImage(res.rows[0]) : null;
  }

  private async getImageById(imageId: string): Promise<VehicleImage | null> {
    const res = await this.pool.query('SELECT * FROM vehicle_images WHERE id = $1', [imageId]);
    return res.rows[0] ? this.mapImage(res.rows[0]) : null;
  }

  async getSeller(sellerId: string): Promise<DealershipSeller | null> {
    const res = await this.pool.query('SELECT * FROM sellers WHERE id = $1', [sellerId]);
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id || undefined,
      name: r.name,
      dealershipName: r.dealership_name || undefined,
      verified: Boolean(r.verified),
      rating: Number(r.rating),
      reviewsCount: Number(r.reviews_count),
      location: r.location,
      phone: r.phone,
      email: r.email || undefined,
      joinedYear: r.joined_year,
      status: r.status,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async createSeller(seller: Omit<DealershipSeller, 'createdAt' | 'updatedAt'>): Promise<DealershipSeller> {
    const now = new Date().toISOString();
    const q = `
      INSERT INTO sellers (id, user_id, name, dealership_name, verified, rating, reviews_count, location, phone, email, joined_year, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        dealership_name = EXCLUDED.dealership_name,
        rating = EXCLUDED.rating,
        reviews_count = EXCLUDED.reviews_count,
        location = EXCLUDED.location,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      seller.id,
      seller.userId || null,
      seller.name,
      seller.dealershipName || null,
      seller.verified ? true : false,
      seller.rating || 5.0,
      seller.reviewsCount || 0,
      seller.location,
      seller.phone,
      seller.email || null,
      seller.joinedYear,
      seller.status || 'active',
      now,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id || undefined,
      name: r.name,
      dealershipName: r.dealership_name || undefined,
      verified: Boolean(r.verified),
      rating: Number(r.rating),
      reviewsCount: Number(r.reviews_count),
      location: r.location,
      phone: r.phone,
      email: r.email || undefined,
      joinedYear: r.joined_year,
      status: r.status,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }
}

// -------------------------------------------------------------
// Offers Repository
// -------------------------------------------------------------
export class PostgresOfferRepository implements IOfferRepository {
  constructor(private pool: pg.Pool) {}

  private mapOffer(r: any): Offer {
    return {
      id: r.id,
      carId: r.car_id,
      carName: r.car_name,
      userId: r.user_id || undefined,
      name: r.buyer_name,
      phone: r.buyer_phone,
      email: r.buyer_email || undefined,
      offerAmountNgn: Number(r.offer_amount_ngn),
      vehicleListingPriceNgn: Number(r.vehicle_listing_price_ngn),
      paymentMethod: r.payment_method,
      notes: r.notes || undefined,
      status: r.status,
      counterAmountNgn: r.counter_amount_ngn ? Number(r.counter_amount_ngn) : undefined,
      staffNotes: r.staff_notes || undefined,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async findById(id: string): Promise<Offer | null> {
    const res = await this.pool.query('SELECT * FROM offers WHERE id = $1', [id]);
    return res.rows[0] ? this.mapOffer(res.rows[0]) : null;
  }

  async listByVehicleId(carId: string): Promise<Offer[]> {
    const res = await this.pool.query('SELECT * FROM offers WHERE car_id = $1 ORDER BY created_at DESC', [carId]);
    return res.rows.map((r) => this.mapOffer(r));
  }

  async listByUserId(userId: string): Promise<Offer[]> {
    const res = await this.pool.query('SELECT * FROM offers WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows.map((r) => this.mapOffer(r));
  }

  async listAll(limit = 50, offset = 0): Promise<Offer[]> {
    const res = await this.pool.query('SELECT * FROM offers ORDER BY created_at DESC LIMIT $1 OFFSET $2', [
      limit,
      offset,
    ]);
    return res.rows.map((r) => this.mapOffer(r));
  }

  async create(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Offer> {
    const id = `ofr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO offers (
        id, car_id, car_name, user_id, buyer_name, buyer_phone, buyer_email,
        offer_amount_ngn, vehicle_listing_price_ngn, payment_method, notes,
        status, counter_amount_ngn, staff_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      offer.carId,
      offer.carName,
      offer.userId || null,
      offer.name,
      offer.phone,
      offer.email || null,
      offer.offerAmountNgn,
      offer.vehicleListingPriceNgn,
      offer.paymentMethod,
      offer.notes || null,
      offer.status,
      offer.counterAmountNgn || null,
      offer.staffNotes || null,
      now,
      now,
    ]);
    return this.mapOffer(res.rows[0]);
  }

  async updateStatus(
    id: string,
    status: Offer['status'],
    counterAmountNgn?: number,
    staffNotes?: string
  ): Promise<Offer | null> {
    const now = new Date().toISOString();
    const q = `
      UPDATE offers
      SET status = $1, counter_amount_ngn = COALESCE($2, counter_amount_ngn),
          staff_notes = COALESCE($3, staff_notes), updated_at = $4
      WHERE id = $5
      RETURNING *
    `;
    const res = await this.pool.query(q, [status, counterAmountNgn || null, staffNotes || null, now, id]);
    return res.rows[0] ? this.mapOffer(res.rows[0]) : null;
  }
}

// -------------------------------------------------------------
// Inspections Repository
// -------------------------------------------------------------
export class PostgresInspectionRepository implements IInspectionRepository {
  constructor(private pool: pg.Pool) {}

  private mapInspection(r: any): Inspection {
    return {
      id: r.id,
      carId: r.car_id,
      carName: r.car_name,
      userId: r.user_id || undefined,
      name: r.customer_name,
      phone: r.customer_phone,
      email: r.customer_email || undefined,
      date: r.scheduled_date,
      timeSlot: r.time_slot,
      hubLocation: r.hub_location,
      inspectionType: r.inspection_type,
      status: r.status,
      inspectorNotes: r.inspector_notes || undefined,
      reportUrl: r.report_url || undefined,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async findById(id: string): Promise<Inspection | null> {
    const res = await this.pool.query('SELECT * FROM inspections WHERE id = $1', [id]);
    return res.rows[0] ? this.mapInspection(res.rows[0]) : null;
  }

  async listByVehicleId(carId: string): Promise<Inspection[]> {
    const res = await this.pool.query('SELECT * FROM inspections WHERE car_id = $1 ORDER BY scheduled_date DESC', [
      carId,
    ]);
    return res.rows.map((r) => this.mapInspection(r));
  }

  async listByUserId(userId: string): Promise<Inspection[]> {
    const res = await this.pool.query('SELECT * FROM inspections WHERE user_id = $1 ORDER BY scheduled_date DESC', [
      userId,
    ]);
    return res.rows.map((r) => this.mapInspection(r));
  }

  async listAll(limit = 50, offset = 0): Promise<Inspection[]> {
    const res = await this.pool.query('SELECT * FROM inspections ORDER BY scheduled_date DESC LIMIT $1 OFFSET $2', [
      limit,
      offset,
    ]);
    return res.rows.map((r) => this.mapInspection(r));
  }

  async create(inspection: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Inspection> {
    const id = `insp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO inspections (
        id, car_id, car_name, user_id, customer_name, customer_phone, customer_email,
        scheduled_date, time_slot, hub_location, inspection_type, status,
        inspector_notes, report_url, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      inspection.carId,
      inspection.carName,
      inspection.userId || null,
      inspection.name,
      inspection.phone,
      inspection.email || null,
      inspection.date,
      inspection.timeSlot,
      inspection.hubLocation,
      inspection.inspectionType,
      inspection.status,
      inspection.inspectorNotes || null,
      inspection.reportUrl || null,
      now,
      now,
    ]);
    return this.mapInspection(res.rows[0]);
  }

  async updateStatus(id: string, status: Inspection['status'], notes?: string): Promise<Inspection | null> {
    const now = new Date().toISOString();
    const q = `
      UPDATE inspections
      SET status = $1, inspector_notes = COALESCE($2, inspector_notes), updated_at = $3
      WHERE id = $4
      RETURNING *
    `;
    const res = await this.pool.query(q, [status, notes || null, now, id]);
    return res.rows[0] ? this.mapInspection(res.rows[0]) : null;
  }
}

// -------------------------------------------------------------
// Rentals Repository
// -------------------------------------------------------------
export class PostgresRentalRepository implements IRentalRepository {
  constructor(private pool: pg.Pool) {}

  private mapRentalVehicle(r: any): RentalVehicle {
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      pricePerDayNgn: Number(r.price_per_day_ngn),
      transmission: r.transmission,
      fuel: r.fuel,
      seats: Number(r.seats),
      imageUrl: r.image_url,
      available: Boolean(r.available),
      rating: Number(r.rating),
      plateNumber: r.plate_number || undefined,
      location: r.location,
      status: r.status,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  private mapBooking(r: any): RentalBooking {
    return {
      id: r.id,
      carId: r.car_id,
      carName: r.car_name,
      userId: r.user_id || undefined,
      customerName: r.customer_name,
      phone: r.phone,
      email: r.email || undefined,
      pickupDate: r.pickup_date,
      returnDate: r.return_date,
      pickupLocation: r.pickup_location,
      days: Number(r.days),
      dailyRateNgn: Number(r.daily_rate_ngn),
      withChauffeur: Boolean(r.with_chauffeur),
      withInsurance: Boolean(r.with_insurance),
      chauffeurFeeNgn: Number(r.chauffeur_fee_ngn),
      insuranceFeeNgn: Number(r.insurance_fee_ngn),
      totalNgn: Number(r.total_ngn),
      status: r.status,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async findVehicleById(id: string): Promise<RentalVehicle | null> {
    const res = await this.pool.query('SELECT * FROM rental_vehicles WHERE id = $1', [id]);
    return res.rows[0] ? this.mapRentalVehicle(res.rows[0]) : null;
  }

  async listVehicles(category?: string, availableOnly = false): Promise<RentalVehicle[]> {
    const conditions: string[] = ["status = 'active'"];
    const values: any[] = [];
    let idx = 1;

    if (category && category !== 'All') {
      conditions.push(`category = $${idx++}`);
      values.push(category);
    }
    if (availableOnly) {
      conditions.push('available = true');
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const res = await this.pool.query(`SELECT * FROM rental_vehicles ${where} ORDER BY rating DESC`, values);
    return res.rows.map((r) => this.mapRentalVehicle(r));
  }

  async createVehicle(vehicle: Omit<RentalVehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalVehicle> {
    const id = `rveh_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO rental_vehicles (
        id, name, category, price_per_day_ngn, transmission, fuel, seats,
        image_url, available, rating, plate_number, location, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      vehicle.name,
      vehicle.category,
      vehicle.pricePerDayNgn,
      vehicle.transmission,
      vehicle.fuel,
      vehicle.seats || 5,
      vehicle.imageUrl,
      vehicle.available ? true : false,
      vehicle.rating || 4.9,
      vehicle.plateNumber || null,
      vehicle.location || 'Lagos',
      vehicle.status || 'active',
      now,
      now,
    ]);
    return this.mapRentalVehicle(res.rows[0]);
  }

  async findBookingById(id: string): Promise<RentalBooking | null> {
    const res = await this.pool.query('SELECT * FROM rental_bookings WHERE id = $1', [id]);
    return res.rows[0] ? this.mapBooking(res.rows[0]) : null;
  }

  async listBookingsByUserId(userId: string): Promise<RentalBooking[]> {
    const res = await this.pool.query('SELECT * FROM rental_bookings WHERE user_id = $1 ORDER BY created_at DESC', [
      userId,
    ]);
    return res.rows.map((r) => this.mapBooking(r));
  }

  async listAllBookings(limit = 50, offset = 0): Promise<RentalBooking[]> {
    const res = await this.pool.query('SELECT * FROM rental_bookings ORDER BY created_at DESC LIMIT $1 OFFSET $2', [
      limit,
      offset,
    ]);
    return res.rows.map((r) => this.mapBooking(r));
  }

  async checkAvailability(rentalVehicleId: string, startDate: string, endDate: string): Promise<boolean> {
    const q = `
      SELECT COUNT(*) as count
      FROM rental_availability_blocks
      WHERE rental_vehicle_id = $1
        AND NOT (end_date < $2 OR start_date > $3)
    `;
    const res = await this.pool.query(q, [rentalVehicleId, startDate, endDate]);
    return Number(res.rows[0]?.count || 0) === 0;
  }

  async createBookingWithBlock(
    booking: Omit<RentalBooking, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RentalBooking> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Atomic check with conflict lock
      const checkQ = `
        SELECT COUNT(*) as count
        FROM rental_availability_blocks
        WHERE rental_vehicle_id = $1
          AND NOT (end_date < $2 OR start_date > $3)
      `;
      const conflictRes = await client.query(checkQ, [booking.carId, booking.pickupDate, booking.returnDate]);
      if (Number(conflictRes.rows[0]?.count || 0) > 0) {
        throw new Error(
          `Vehicle ${booking.carName} is already booked or blocked for dates ${booking.pickupDate} to ${booking.returnDate}`
        );
      }

      const bookingId = `RNT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const blockId = `blk_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Insert availability block
      await client.query(
        `INSERT INTO rental_availability_blocks (id, rental_vehicle_id, start_date, end_date, reason, rental_booking_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [blockId, booking.carId, booking.pickupDate, booking.returnDate, 'booked', bookingId, now]
      );

      // Insert booking
      const bookQ = `
        INSERT INTO rental_bookings (
          id, car_id, car_name, user_id, customer_name, phone, email,
          pickup_date, return_date, pickup_location, days, daily_rate_ngn,
          with_chauffeur, with_insurance, chauffeur_fee_ngn, insurance_fee_ngn,
          total_ngn, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `;
      const bookRes = await client.query(bookQ, [
        bookingId,
        booking.carId,
        booking.carName,
        booking.userId || null,
        booking.customerName,
        booking.phone,
        booking.email || null,
        booking.pickupDate,
        booking.returnDate,
        booking.pickupLocation,
        booking.days,
        booking.dailyRateNgn,
        booking.withChauffeur ? true : false,
        booking.withInsurance ? true : false,
        booking.chauffeurFeeNgn,
        booking.insuranceFeeNgn,
        booking.totalNgn,
        booking.status,
        now,
        now,
      ]);

      await client.query('COMMIT');
      return this.mapBooking(bookRes.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelBooking(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE rental_bookings SET status = 'Cancelled', updated_at = $1 WHERE id = $2", [
        new Date().toISOString(),
        id,
      ]);
      await client.query('DELETE FROM rental_availability_blocks WHERE rental_booking_id = $1', [id]);
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateBookingStatus(id: string, status: RentalBooking['status']): Promise<RentalBooking | null> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      'UPDATE rental_bookings SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [status, now, id]
    );
    if (status === 'Cancelled') {
      await this.pool.query('DELETE FROM rental_availability_blocks WHERE rental_booking_id = $1', [id]).catch(() => undefined);
    }
    return res.rows[0] ? this.mapBooking(res.rows[0]) : null;
  }
}

// -------------------------------------------------------------
// Imports Repository
// -------------------------------------------------------------
export class PostgresImportRepository implements IImportRepository {
  constructor(private pool: pg.Pool) {}

  private mapImport(r: any): ImportRequest {
    return {
      id: r.id,
      trackingId: r.tracking_id,
      userId: r.user_id || undefined,
      customerName: r.customer_name,
      phone: r.phone,
      email: r.email || undefined,
      make: r.make,
      model: r.model,
      year: r.year ? Number(r.year) : undefined,
      yearMin: r.year_min || undefined,
      yearMax: r.year_max || undefined,
      budgetRange: r.budget_range || undefined,
      estimatedBudgetUsd: r.estimated_budget_usd ? Number(r.estimated_budget_usd) : undefined,
      vin: r.vin || undefined,
      vehicleType: r.vehicle_type || undefined,
      fuelType: r.fuel_type || undefined,
      transmission: r.transmission || undefined,
      driveType: r.drive_type || undefined,
      mileagePref: r.mileage_pref || undefined,
      features: parseJson(r.features_json, []),
      deliveryCity: r.delivery_city,
      destinationPort: r.destination_port,
      originPort: r.origin_port,
      additionalNotes: r.additional_notes || undefined,
      status: r.status,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async findRequestById(id: string): Promise<ImportRequest | null> {
    const res = await this.pool.query('SELECT * FROM import_requests WHERE id = $1', [id]);
    return res.rows[0] ? this.mapImport(res.rows[0]) : null;
  }

  async findByTrackingId(trackingId: string): Promise<ImportRequest | null> {
    const res = await this.pool.query('SELECT * FROM import_requests WHERE UPPER(tracking_id) = UPPER($1)', [
      trackingId.trim(),
    ]);
    return res.rows[0] ? this.mapImport(res.rows[0]) : null;
  }

  async findByVin(vin: string): Promise<ImportRequest | null> {
    const res = await this.pool.query('SELECT * FROM import_requests WHERE UPPER(vin) = UPPER($1)', [vin.trim()]);
    return res.rows[0] ? this.mapImport(res.rows[0]) : null;
  }

  async listRequests(userId?: string): Promise<ImportRequest[]> {
    const q = userId
      ? 'SELECT * FROM import_requests WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM import_requests ORDER BY created_at DESC';
    const res = await this.pool.query(q, userId ? [userId] : []);
    return res.rows.map((r) => this.mapImport(r));
  }

  async createRequest(request: Omit<ImportRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImportRequest> {
    const id = `imp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO import_requests (
        id, tracking_id, user_id, customer_name, phone, email, make, model,
        year, year_min, year_max, budget_range, estimated_budget_usd, vin,
        vehicle_type, fuel_type, transmission, drive_type, mileage_pref,
        features_json, delivery_city, destination_port, origin_port,
        additional_notes, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      request.trackingId,
      request.userId || null,
      request.customerName,
      request.phone,
      request.email || null,
      request.make,
      request.model,
      request.year || null,
      request.yearMin || null,
      request.yearMax || null,
      request.budgetRange || null,
      request.estimatedBudgetUsd || null,
      request.vin || null,
      request.vehicleType || null,
      request.fuelType || null,
      request.transmission || null,
      request.driveType || null,
      request.mileagePref || null,
      JSON.stringify(request.features || []),
      request.deliveryCity || 'Lagos',
      request.destinationPort || 'Tin Can Island Container Terminal, Lagos',
      request.originPort || 'Port of Newark, NJ, USA',
      request.additionalNotes || null,
      request.status,
      now,
      now,
    ]);
    return this.mapImport(res.rows[0]);
  }

  async updateStatus(id: string, status: ImportRequest['status']): Promise<ImportRequest | null> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      'UPDATE import_requests SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [status, now, id]
    );
    return res.rows[0] ? this.mapImport(res.rows[0]) : null;
  }

  async saveCostEstimate(estimate: Omit<ImportCostEstimate, 'id' | 'createdAt'>): Promise<ImportCostEstimate> {
    const id = `est_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO import_cost_estimates (
        id, import_request_id, auction_price_usd, vehicle_year, usd_to_ngn_rate,
        ocean_freight_usd, inland_towing_usd, cif_value_usd, cif_value_ngn,
        duty_rate, levy_rate, import_duty_ngn, nac_levy_ngn, vat_ngn,
        terminal_charges_ngn, clearing_agency_fee_ngn, total_customs_clearance_ngn,
        vehicle_landed_cost_ngn, savings_vs_local_market_ngn, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      estimate.importRequestId || null,
      estimate.auctionPriceUsd,
      estimate.vehicleYear,
      estimate.usdToNgnRate,
      estimate.oceanFreightUsd,
      estimate.inlandTowingUsd,
      estimate.cifValueUsd,
      estimate.cifValueNgn,
      estimate.dutyRate,
      estimate.levyRate,
      estimate.importDutyNgn,
      estimate.nacLevyNgn,
      estimate.vatNgn,
      estimate.terminalChargesNgn,
      estimate.clearingAgencyFeeNgn,
      estimate.totalCustomsClearanceNgn,
      estimate.vehicleLandedCostNgn,
      estimate.savingsVsLocalMarketNgn,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      importRequestId: r.import_request_id || undefined,
      auctionPriceUsd: Number(r.auction_price_usd),
      vehicleYear: Number(r.vehicle_year),
      usdToNgnRate: Number(r.usd_to_ngn_rate),
      oceanFreightUsd: Number(r.ocean_freight_usd),
      inlandTowingUsd: Number(r.inland_towing_usd),
      cifValueUsd: Number(r.cif_value_usd),
      cifValueNgn: Number(r.cif_value_ngn),
      dutyRate: Number(r.duty_rate),
      levyRate: Number(r.levy_rate),
      importDutyNgn: Number(r.import_duty_ngn),
      nacLevyNgn: Number(r.nac_levy_ngn),
      vatNgn: Number(r.vat_ngn),
      terminalChargesNgn: Number(r.terminal_charges_ngn),
      clearingAgencyFeeNgn: Number(r.clearing_agency_fee_ngn),
      totalCustomsClearanceNgn: Number(r.total_customs_clearance_ngn),
      vehicleLandedCostNgn: Number(r.vehicle_landed_cost_ngn),
      savingsVsLocalMarketNgn: Number(r.savings_vs_local_market_ngn),
      createdAt: toIso(r.created_at),
    };
  }

  async getCostEstimate(importRequestId: string): Promise<ImportCostEstimate | null> {
    const res = await this.pool.query('SELECT * FROM import_cost_estimates WHERE import_request_id = $1', [
      importRequestId,
    ]);
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      importRequestId: r.import_request_id,
      auctionPriceUsd: Number(r.auction_price_usd),
      vehicleYear: Number(r.vehicle_year),
      usdToNgnRate: Number(r.usd_to_ngn_rate),
      oceanFreightUsd: Number(r.ocean_freight_usd),
      inlandTowingUsd: Number(r.inland_towing_usd),
      cifValueUsd: Number(r.cif_value_usd),
      cifValueNgn: Number(r.cif_value_ngn),
      dutyRate: Number(r.duty_rate),
      levyRate: Number(r.levy_rate),
      importDutyNgn: Number(r.import_duty_ngn),
      nacLevyNgn: Number(r.nac_levy_ngn),
      vatNgn: Number(r.vat_ngn),
      terminalChargesNgn: Number(r.terminal_charges_ngn),
      clearingAgencyFeeNgn: Number(r.clearing_agency_fee_ngn),
      totalCustomsClearanceNgn: Number(r.total_customs_clearance_ngn),
      vehicleLandedCostNgn: Number(r.vehicle_landed_cost_ngn),
      savingsVsLocalMarketNgn: Number(r.savings_vs_local_market_ngn),
      createdAt: toIso(r.created_at),
    };
  }

  async getMilestones(trackingId: string): Promise<ShipmentMilestone[]> {
    const res = await this.pool.query(
      'SELECT * FROM shipment_milestones WHERE tracking_id = $1 ORDER BY step_order ASC',
      [trackingId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      trackingId: r.tracking_id,
      stepOrder: Number(r.step_order),
      title: r.title,
      description: r.description || undefined,
      scheduledDate: r.scheduled_date,
      completedDate: r.completed_date || undefined,
      isCompleted: Boolean(r.is_completed),
      isCurrent: Boolean(r.is_current),
      location: r.location || undefined,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    }));
  }

  async addMilestone(
    milestone: Omit<ShipmentMilestone, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ShipmentMilestone> {
    const id = `mls_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO shipment_milestones (
        id, tracking_id, step_order, title, description, scheduled_date,
        completed_date, is_completed, is_current, location, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      milestone.trackingId,
      milestone.stepOrder,
      milestone.title,
      milestone.description || null,
      milestone.scheduledDate,
      milestone.completedDate || null,
      milestone.isCompleted ? true : false,
      milestone.isCurrent ? true : false,
      milestone.location || null,
      now,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      trackingId: r.tracking_id,
      stepOrder: Number(r.step_order),
      title: r.title,
      description: r.description || undefined,
      scheduledDate: r.scheduled_date,
      completedDate: r.completed_date || undefined,
      isCompleted: Boolean(r.is_completed),
      isCurrent: Boolean(r.is_current),
      location: r.location || undefined,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async updateMilestone(id: string, updates: Partial<ShipmentMilestone>): Promise<ShipmentMilestone | null> {
    const now = new Date().toISOString();
    const q = `
      UPDATE shipment_milestones SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        completed_date = COALESCE($3, completed_date),
        is_completed = COALESCE($4, is_completed),
        is_current = COALESCE($5, is_current),
        location = COALESCE($6, location),
        updated_at = $7
      WHERE id = $8
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      updates.title || null,
      updates.description || null,
      updates.completedDate || null,
      updates.isCompleted !== undefined ? updates.isCompleted : null,
      updates.isCurrent !== undefined ? updates.isCurrent : null,
      updates.location || null,
      now,
      id,
    ]);
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      trackingId: r.tracking_id,
      stepOrder: Number(r.step_order),
      title: r.title,
      description: r.description || undefined,
      scheduledDate: r.scheduled_date,
      completedDate: r.completed_date || undefined,
      isCompleted: Boolean(r.is_completed),
      isCurrent: Boolean(r.is_current),
      location: r.location || undefined,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async getTrackingEvents(trackingId: string): Promise<TrackingEvent[]> {
    const res = await this.pool.query(
      'SELECT * FROM tracking_events WHERE tracking_id = $1 ORDER BY event_timestamp DESC',
      [trackingId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      trackingId: r.tracking_id,
      eventTimestamp: toIso(r.event_timestamp),
      status: r.status,
      location: r.location,
      vesselName: r.vessel_name || undefined,
      containerNo: r.container_no || undefined,
      details: r.details || undefined,
      recordedBy: r.recorded_by || undefined,
      createdAt: toIso(r.created_at),
    }));
  }

  async addTrackingEvent(event: Omit<TrackingEvent, 'id' | 'createdAt'>): Promise<TrackingEvent> {
    const id = `evt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO tracking_events (
        id, tracking_id, event_timestamp, status, location, vessel_name,
        container_no, details, recorded_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      event.trackingId,
      event.eventTimestamp,
      event.status,
      event.location,
      event.vesselName || null,
      event.containerNo || null,
      event.details || null,
      event.recordedBy || null,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      trackingId: r.tracking_id,
      eventTimestamp: toIso(r.event_timestamp),
      status: r.status,
      location: r.location,
      vesselName: r.vessel_name || undefined,
      containerNo: r.container_no || undefined,
      details: r.details || undefined,
      recordedBy: r.recorded_by || undefined,
      createdAt: toIso(r.created_at),
    };
  }
}

// -------------------------------------------------------------
// Sell Car Repository
// -------------------------------------------------------------
export class PostgresSellRepository implements ISellRepository {
  constructor(private pool: pg.Pool) {}

  private mapSell(r: any): SellSubmission {
    return {
      id: r.id,
      userId: r.user_id || undefined,
      sellerName: r.seller_name,
      phone: r.phone,
      email: r.email || undefined,
      make: r.make,
      model: r.model,
      year: Number(r.year),
      trim: r.trim || undefined,
      mileage: Number(r.mileage),
      condition: r.condition,
      issues: r.issues || undefined,
      location: r.location,
      askingPriceNgn: Number(r.asking_price_ngn),
      estimatedValueNgn: Number(r.estimated_value_ngn),
      status: r.status,
      inspectorNotes: r.inspector_notes || undefined,
      photoUrls: Array.isArray(r.photo_urls_json) ? r.photo_urls_json : [],
      reviewStatus: r.review_status || 'pending',
      reviewedBy: r.reviewed_by || undefined,
      reviewedAt: r.reviewed_at ? toIso(r.reviewed_at) : undefined,
      adminNotes: r.admin_notes || undefined,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async findById(id: string): Promise<SellSubmission | null> {
    const res = await this.pool.query('SELECT * FROM sell_submissions WHERE id = $1', [id]);
    return res.rows[0] ? this.mapSell(res.rows[0]) : null;
  }

  async list(userId?: string): Promise<SellSubmission[]> {
    const q = userId
      ? 'SELECT * FROM sell_submissions WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM sell_submissions ORDER BY created_at DESC';
    const res = await this.pool.query(q, userId ? [userId] : []);
    return res.rows.map((r) => this.mapSell(r));
  }

  async create(submission: Omit<SellSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<SellSubmission> {
    const id = `sell_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO sell_submissions (
        id, user_id, seller_name, phone, email, make, model, year, trim,
        mileage, condition, issues, location, asking_price_ngn, estimated_value_ngn,
        status, inspector_notes, photo_urls_json, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      submission.userId || null,
      submission.sellerName,
      submission.phone,
      submission.email || null,
      submission.make,
      submission.model,
      submission.year,
      submission.trim || null,
      submission.mileage,
      submission.condition,
      submission.issues || null,
      submission.location,
      submission.askingPriceNgn,
      submission.estimatedValueNgn,
      submission.status,
      submission.inspectorNotes || null,
      JSON.stringify(submission.photoUrls || []),
      now,
      now,
    ]);
    return this.mapSell(res.rows[0]);
  }

  async listAll(limit = 100, offset = 0): Promise<SellSubmission[]> {
    const res = await this.pool.query(
      'SELECT * FROM sell_submissions ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return res.rows.map((r) => this.mapSell(r));
  }

  async updateStatus(
    id: string,
    status: SellSubmission['status'],
    inspectorNotes?: string
  ): Promise<SellSubmission | null> {
    const now = new Date().toISOString();
    const q = `
      UPDATE sell_submissions
      SET status = $1, inspector_notes = COALESCE($2, inspector_notes), updated_at = $3
      WHERE id = $4
      RETURNING *
    `;
    const res = await this.pool.query(q, [status, inspectorNotes || null, now, id]);
    return res.rows[0] ? this.mapSell(res.rows[0]) : null;
  }

  async updateReview(
    id: string,
    review: { reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_info'; reviewedBy?: string; adminNotes?: string; status?: SellSubmission['status'] }
  ): Promise<SellSubmission | null> {
    const now = new Date().toISOString();
    const q = `
      UPDATE sell_submissions
      SET review_status = $1,
          reviewed_by = $2,
          reviewed_at = $3,
          admin_notes = COALESCE($4, admin_notes),
          status = COALESCE($5, status),
          updated_at = $3
      WHERE id = $6
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      review.reviewStatus,
      review.reviewedBy || null,
      now,
      review.adminNotes || null,
      review.status || null,
      id,
    ]);
    return res.rows[0] ? this.mapSell(res.rows[0]) : null;
  }

  async recordValuationHistory(valuation: Omit<ValuationHistory, 'id' | 'createdAt'>): Promise<ValuationHistory> {
    const id = `val_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO valuation_history (
        id, sell_submission_id, make, model, year, mileage, condition,
        algorithm_version, base_value_ngn, mileage_factor, condition_factor,
        final_valuation_ngn, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      valuation.sellSubmissionId,
      valuation.make,
      valuation.model,
      valuation.year,
      valuation.mileage,
      valuation.condition,
      valuation.algorithmVersion,
      valuation.baseValueNgn,
      valuation.mileageFactor,
      valuation.conditionFactor,
      valuation.finalValuationNgn,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      sellSubmissionId: r.sell_submission_id,
      make: r.make,
      model: r.model,
      year: Number(r.year),
      mileage: Number(r.mileage),
      condition: r.condition,
      algorithmVersion: r.algorithm_version,
      baseValueNgn: Number(r.base_value_ngn),
      mileageFactor: Number(r.mileage_factor),
      conditionFactor: Number(r.condition_factor),
      finalValuationNgn: Number(r.final_valuation_ngn),
      createdAt: toIso(r.created_at),
    };
  }

  async getValuationHistory(sellSubmissionId: string): Promise<ValuationHistory[]> {
    const res = await this.pool.query(
      'SELECT * FROM valuation_history WHERE sell_submission_id = $1 ORDER BY created_at DESC',
      [sellSubmissionId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      sellSubmissionId: r.sell_submission_id,
      make: r.make,
      model: r.model,
      year: Number(r.year),
      mileage: Number(r.mileage),
      condition: r.condition,
      algorithmVersion: r.algorithm_version,
      baseValueNgn: Number(r.base_value_ngn),
      mileageFactor: Number(r.mileage_factor),
      conditionFactor: Number(r.condition_factor),
      finalValuationNgn: Number(r.final_valuation_ngn),
      createdAt: toIso(r.created_at),
    }));
  }
}

// -------------------------------------------------------------
// Concierge Repository
// -------------------------------------------------------------
export class PostgresConciergeRepository implements IConciergeRepository {
  constructor(private pool: pg.Pool) {}

  private mapConcierge(r: any): ConciergeRequest {
    return {
      id: r.id,
      userId: r.user_id || undefined,
      fullName: r.full_name,
      phone: r.phone,
      email: r.email || undefined,
      desiredMake: r.desired_make,
      desiredModel: r.desired_model,
      bodyType: r.body_type || undefined,
      yearRange: r.year_range,
      budgetRange: r.budget_range || undefined,
      maxBudgetNgn: Number(r.max_budget_ngn),
      preferredCondition: r.preferred_condition,
      fuelType: r.fuel_type || undefined,
      transmission: r.transmission || undefined,
      colorPref: r.color_pref || undefined,
      interiorPref: r.interior_pref || undefined,
      notes: r.notes || undefined,
      status: r.status,
      assignedAgentName: r.assigned_agent_name || undefined,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async findById(id: string): Promise<ConciergeRequest | null> {
    const res = await this.pool.query('SELECT * FROM concierge_requests WHERE id = $1', [id]);
    return res.rows[0] ? this.mapConcierge(res.rows[0]) : null;
  }

  async list(userId?: string): Promise<ConciergeRequest[]> {
    const q = userId
      ? 'SELECT * FROM concierge_requests WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM concierge_requests ORDER BY created_at DESC';
    const res = await this.pool.query(q, userId ? [userId] : []);
    return res.rows.map((r) => this.mapConcierge(r));
  }

  async create(request: Omit<ConciergeRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConciergeRequest> {
    const id = `req_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO concierge_requests (
        id, user_id, full_name, phone, email, desired_make, desired_model,
        body_type, year_range, budget_range, max_budget_ngn, preferred_condition,
        fuel_type, transmission, color_pref, interior_pref, notes, status,
        assigned_agent_name, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      request.userId || null,
      request.fullName,
      request.phone,
      request.email || null,
      request.desiredMake,
      request.desiredModel,
      request.bodyType || null,
      request.yearRange,
      request.budgetRange || null,
      request.maxBudgetNgn,
      request.preferredCondition,
      request.fuelType || null,
      request.transmission || null,
      request.colorPref || null,
      request.interiorPref || null,
      request.notes || null,
      request.status,
      request.assignedAgentName || null,
      now,
      now,
    ]);
    return this.mapConcierge(res.rows[0]);
  }

  async updateStatus(
    id: string,
    status: ConciergeRequest['status'],
    assignedAgentName?: string
  ): Promise<ConciergeRequest | null> {
    const now = new Date().toISOString();
    const q = `
      UPDATE concierge_requests
      SET status = $1, assigned_agent_name = COALESCE($2, assigned_agent_name), updated_at = $3
      WHERE id = $4
      RETURNING *
    `;
    const res = await this.pool.query(q, [status, assignedAgentName || null, now, id]);
    return res.rows[0] ? this.mapConcierge(res.rows[0]) : null;
  }
}

// -------------------------------------------------------------
// Saved Preferences Repository
// -------------------------------------------------------------
export class PostgresSavedPreferencesRepository implements ISavedPreferencesRepository {
  constructor(private pool: pg.Pool) {}

  async getSavedVehicles(userId: string): Promise<string[]> {
    const res = await this.pool.query(
      'SELECT vehicle_id FROM saved_vehicles WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows.map((r) => r.vehicle_id);
  }

  async saveVehicle(userId: string, vehicleId: string, notes?: string): Promise<boolean> {
    const id = `sv_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO saved_vehicles (id, user_id, vehicle_id, notes, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, vehicle_id) DO UPDATE SET notes = EXCLUDED.notes
    `;
    await this.pool.query(q, [id, userId, vehicleId, notes || null, now]);
    return true;
  }

  async unsaveVehicle(userId: string, vehicleId: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM saved_vehicles WHERE user_id = $1 AND vehicle_id = $2', [
      userId,
      vehicleId,
    ]);
    return (res.rowCount || 0) > 0;
  }

  async getComparisonList(userId: string): Promise<string[]> {
    const res = await this.pool.query('SELECT vehicle_ids_json FROM comparison_lists WHERE user_id = $1 LIMIT 1', [
      userId,
    ]);
    if (!res.rows[0]) return [];
    return parseJson(res.rows[0].vehicle_ids_json, []);
  }

  async saveComparisonList(userId: string, name: string, vehicleIds: string[]): Promise<ComparisonList> {
    const id = `cmp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await this.pool.query('DELETE FROM comparison_lists WHERE user_id = $1', [userId]);
    const q = `
      INSERT INTO comparison_lists (id, user_id, name, vehicle_ids_json, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await this.pool.query(q, [id, userId, name, JSON.stringify(vehicleIds), now, now]);
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      vehicleIds: parseJson(r.vehicle_ids_json, []),
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const res = await this.pool.query('SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC', [
      userId,
    ]);
    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      criteria: parseJson(r.criteria_json, {}),
      notifyEmail: Boolean(r.notify_email),
      notifySms: Boolean(r.notify_sms),
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    }));
  }

  async createSavedSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch> {
    const id = `srch_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO saved_searches (id, user_id, name, criteria_json, notify_email, notify_sms, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      search.userId,
      search.name,
      JSON.stringify(search.criteria),
      search.notifyEmail ? true : false,
      search.notifySms ? true : false,
      now,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      criteria: parseJson(r.criteria_json, {}),
      notifyEmail: Boolean(r.notify_email),
      notifySms: Boolean(r.notify_sms),
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async deleteSavedSearch(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM saved_searches WHERE id = $1 AND user_id = $2', [id, userId]);
    return (res.rowCount || 0) > 0;
  }
}

// -------------------------------------------------------------
// Audit Repository
// -------------------------------------------------------------
export class PostgresAuditRepository implements IAuditRepository {
  constructor(private pool: pg.Pool) {}

  async record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const id = `aud_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO audit_logs (id, actor_user_id, actor_role, action, resource_type, resource_id, ip_address, user_agent, changes_json, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      entry.actorUserId || null,
      entry.actorRole,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.changesJson ? JSON.stringify(parseJson(entry.changesJson, entry.changesJson)) : null,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      actorUserId: r.actor_user_id || undefined,
      actorRole: r.actor_role,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      ipAddress: r.ip_address || undefined,
      userAgent: r.user_agent || undefined,
      changesJson: typeof r.changes_json === 'object' ? JSON.stringify(r.changes_json) : r.changes_json,
      createdAt: toIso(r.created_at),
    };
  }

  async list(resourceType?: string, resourceId?: string, limit = 50): Promise<AuditLog[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (resourceType) {
      conditions.push(`resource_type = $${idx++}`);
      values.push(resourceType);
    }
    if (resourceId) {
      conditions.push(`resource_id = $${idx++}`);
      values.push(resourceId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const q = `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${idx}`;
    values.push(limit);

    const res = await this.pool.query(q, values);
    return res.rows.map((r) => ({
      id: r.id,
      actorUserId: r.actor_user_id || undefined,
      actorRole: r.actor_role,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      ipAddress: r.ip_address || undefined,
      userAgent: r.user_agent || undefined,
      changesJson: typeof r.changes_json === 'object' ? JSON.stringify(r.changes_json) : r.changes_json,
      createdAt: toIso(r.created_at),
    }));
  }
}

// -------------------------------------------------------------
// Cache Repository
// -------------------------------------------------------------
export class PostgresCacheRepository implements ICacheRepository {
  constructor(private pool: pg.Pool) {}

  async get(cacheKey: string): Promise<any | null> {
    const q = `
      SELECT response_data_json
      FROM external_api_cache
      WHERE cache_key = $1 AND expires_at > NOW()
    `;
    const res = await this.pool.query(q, [cacheKey]);
    if (!res.rows[0]) return null;
    return parseJson(res.rows[0].response_data_json, null);
  }

  async set(
    cacheKey: string,
    provider: ExternalApiCacheRecord['provider'],
    data: any,
    ttlSeconds: number,
    requestUrl?: string
  ): Promise<void> {
    const now = new Date();
    const expires = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const nowIso = now.toISOString();

    const q = `
      INSERT INTO external_api_cache (cache_key, provider, request_url, response_data_json, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (cache_key) DO UPDATE SET
        provider = EXCLUDED.provider,
        request_url = EXCLUDED.request_url,
        response_data_json = EXCLUDED.response_data_json,
        expires_at = EXCLUDED.expires_at,
        updated_at = EXCLUDED.updated_at
    `;
    await this.pool.query(q, [
      cacheKey,
      provider,
      requestUrl || null,
      JSON.stringify(data),
      expires,
      nowIso,
      nowIso,
    ]);
  }

  async delete(cacheKey: string): Promise<void> {
    await this.pool.query('DELETE FROM external_api_cache WHERE cache_key = $1', [cacheKey]);
  }

  async pruneExpired(): Promise<number> {
    const res = await this.pool.query('DELETE FROM external_api_cache WHERE expires_at <= NOW()');
    return res.rowCount || 0;
  }
}

// -------------------------------------------------------------
// AI Usage Repository
// -------------------------------------------------------------
export class PostgresAiUsageRepository implements IAiUsageRepository {
  constructor(private pool: pg.Pool) {}

  async record(entry: Omit<AiUsageRecord, 'id' | 'createdAt'>): Promise<AiUsageRecord> {
    const id = `ai_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO ai_usage_records (id, user_id, prompt_type, model_name, input_tokens, output_tokens, latency_ms, status, metadata_json, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      entry.userId || null,
      entry.promptType,
      entry.modelName,
      entry.inputTokens || null,
      entry.outputTokens || null,
      entry.latencyMs || null,
      entry.status,
      entry.metadataJson ? (typeof entry.metadataJson === 'object' ? JSON.stringify(entry.metadataJson) : entry.metadataJson) : null,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id || undefined,
      promptType: r.prompt_type,
      modelName: r.model_name,
      inputTokens: r.input_tokens ? Number(r.input_tokens) : undefined,
      outputTokens: r.output_tokens ? Number(r.output_tokens) : undefined,
      latencyMs: r.latency_ms ? Number(r.latency_ms) : undefined,
      status: r.status,
      metadataJson: typeof r.metadata_json === 'object' ? JSON.stringify(r.metadata_json) : r.metadata_json || undefined,
      createdAt: toIso(r.created_at),
    };
  }
}

// -------------------------------------------------------------
// Notification Repository
// -------------------------------------------------------------
export class PostgresNotificationRepository implements INotificationRepository {
  constructor(private pool: pg.Pool) {}

  async create(notification: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<NotificationRecord> {
    const id = `notif_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO notifications (id, user_id, recipient_phone, recipient_email, channel, title, message, status, related_entity_type, related_entity_id, created_at, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      notification.userId || null,
      notification.recipientPhone || null,
      notification.recipientEmail || null,
      notification.channel,
      notification.title,
      notification.message,
      notification.status,
      notification.relatedEntityType || null,
      notification.relatedEntityId || null,
      now,
      notification.sentAt || null,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id || undefined,
      recipientPhone: r.recipient_phone || undefined,
      recipientEmail: r.recipient_email || undefined,
      channel: r.channel,
      title: r.title,
      message: r.message,
      status: r.status,
      relatedEntityType: r.related_entity_type || undefined,
      relatedEntityId: r.related_entity_id || undefined,
      createdAt: toIso(r.created_at),
      sentAt: r.sent_at ? toIso(r.sent_at) : undefined,
    };
  }

  async listByUserId(userId: string): Promise<NotificationRecord[]> {
    const res = await this.pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [
      userId,
    ]);
    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id || undefined,
      recipientPhone: r.recipient_phone || undefined,
      recipientEmail: r.recipient_email || undefined,
      channel: r.channel,
      title: r.title,
      message: r.message,
      status: r.status,
      relatedEntityType: r.related_entity_type || undefined,
      relatedEntityId: r.related_entity_id || undefined,
      createdAt: toIso(r.created_at),
      sentAt: r.sent_at ? toIso(r.sent_at) : undefined,
    }));
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query("UPDATE notifications SET status = 'read' WHERE id = $1 AND user_id = $2", [id, userId]);
    return (result.rowCount || 0) > 0;
  }
}

// -------------------------------------------------------------
// Order / Request Status History (Neon Postgres)
// -------------------------------------------------------------
export class PostgresStatusHistoryRepository implements IStatusHistoryRepository {
  constructor(private pool: pg.Pool) {}

  async record(entry: Omit<OrderStatusHistory, 'id' | 'createdAt'>): Promise<OrderStatusHistory> {
    const id = `hist_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO order_status_history (id, resource_type, resource_id, from_status, to_status, note, changed_by, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      entry.resourceType,
      entry.resourceId,
      entry.fromStatus || null,
      entry.toStatus,
      entry.note || null,
      entry.changedBy || null,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      fromStatus: r.from_status || undefined,
      toStatus: r.to_status,
      note: r.note || undefined,
      changedBy: r.changed_by || undefined,
      createdAt: toIso(r.created_at),
    };
  }

  async listFor(resourceType: string, resourceId: string): Promise<OrderStatusHistory[]> {
    const res = await this.pool.query(
      'SELECT * FROM order_status_history WHERE resource_type = $1 AND resource_id = $2 ORDER BY created_at ASC',
      [resourceType, resourceId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      fromStatus: r.from_status || undefined,
      toStatus: r.to_status,
      note: r.note || undefined,
      changedBy: r.changed_by || undefined,
      createdAt: toIso(r.created_at),
    }));
  }

  async listRecent(limit = 100): Promise<OrderStatusHistory[]> {
    const res = await this.pool.query('SELECT * FROM order_status_history ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows.map((r) => ({
      id: r.id,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      fromStatus: r.from_status || undefined,
      toStatus: r.to_status,
      note: r.note || undefined,
      changedBy: r.changed_by || undefined,
      createdAt: toIso(r.created_at),
    }));
  }
}

// -------------------------------------------------------------
// Site Settings / Configurable Rates (Neon Postgres)
// -------------------------------------------------------------
export class PostgresSettingsRepository implements ISettingsRepository {
  constructor(private pool: pg.Pool) {}

  private map(r: any): SiteSetting {
    return {
      id: r.id,
      settingKey: r.setting_key,
      settingValue: r.setting_value,
      valueType: r.value_type,
      label: r.label || undefined,
      description: r.description || undefined,
      effectiveDate: toIso(r.effective_date),
      jurisdiction: r.jurisdiction || undefined,
      sourceRef: r.source_ref || undefined,
      isActive: Boolean(r.is_active),
      updatedBy: r.updated_by || undefined,
      updatedAt: toIso(r.updated_at),
      createdAt: toIso(r.created_at),
    };
  }

  async getAll(includeInactive = false): Promise<SiteSetting[]> {
    const q = includeInactive
      ? 'SELECT * FROM site_settings ORDER BY setting_key'
      : 'SELECT * FROM site_settings WHERE is_active = true ORDER BY setting_key';
    const res = await this.pool.query(q);
    return res.rows.map((r) => this.map(r));
  }

  async getKey(settingKey: string): Promise<SiteSetting | null> {
    const res = await this.pool.query(
      'SELECT * FROM site_settings WHERE setting_key = $1 AND is_active = true LIMIT 1',
      [settingKey]
    );
    return res.rows[0] ? this.map(res.rows[0]) : null;
  }

  async getNumber(settingKey: string, fallback: number): Promise<number> {
    const setting = await this.getKey(settingKey);
    if (!setting) return fallback;
    const value = Number(setting.settingValue);
    return Number.isFinite(value) ? value : fallback;
  }

  async set(entry: {
    settingKey: string;
    settingValue: string;
    valueType: SiteSetting['valueType'];
    label?: string;
    description?: string;
    jurisdiction?: string;
    sourceRef?: string;
    updatedBy?: string;
  }): Promise<SiteSetting> {
    const existing = await this.pool.query(
      'SELECT * FROM site_settings WHERE setting_key = $1 AND is_active = true LIMIT 1',
      [entry.settingKey]
    );
    const now = new Date().toISOString();
    if (existing.rows[0]) {
      const res = await this.pool.query(
        `UPDATE site_settings SET setting_value = $1, value_type = $2, label = COALESCE($3, label),
         description = COALESCE($4, description), jurisdiction = COALESCE($5, jurisdiction),
         source_ref = COALESCE($6, source_ref), updated_by = $7, updated_at = $8
         WHERE id = $9 RETURNING *`,
        [
          entry.settingValue,
          entry.valueType,
          entry.label || null,
          entry.description || null,
          entry.jurisdiction || null,
          entry.sourceRef || null,
          entry.updatedBy || null,
          now,
          existing.rows[0].id,
        ]
      );
      return this.map(res.rows[0]);
    }
    const id = `set_${crypto.randomUUID()}`;
    const res = await this.pool.query(
      `INSERT INTO site_settings (id, setting_key, setting_value, value_type, label, description, effective_date, jurisdiction, source_ref, updated_by, updated_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        id,
        entry.settingKey,
        entry.settingValue,
        entry.valueType,
        entry.label || null,
        entry.description || null,
        now,
        entry.jurisdiction || 'NG',
        entry.sourceRef || null,
        entry.updatedBy || null,
        now,
        now,
      ]
    );
    return this.map(res.rows[0]);
  }
}

// -------------------------------------------------------------
// Activity / Analytics Events (Neon Postgres)
// -------------------------------------------------------------
export class PostgresActivityRepository implements IActivityRepository {
  constructor(private pool: pg.Pool) {}

  async record(entry: Omit<ActivityEvent, 'id' | 'createdAt'>): Promise<ActivityEvent> {
    const id = `evt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO activity_events (id, event_type, user_id, session_id, entity_type, entity_id, path, referrer, search_query, filters_json, ip_hash, user_agent, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      entry.eventType,
      entry.userId || null,
      entry.sessionId || null,
      entry.entityType || null,
      entry.entityId || null,
      entry.path || null,
      entry.referrer || null,
      entry.searchQuery || null,
      entry.filtersJson || null,
      entry.ipHash || null,
      entry.userAgent || null,
      now,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      eventType: r.event_type,
      userId: r.user_id || undefined,
      sessionId: r.session_id || undefined,
      entityType: r.entity_type || undefined,
      entityId: r.entity_id || undefined,
      path: r.path || undefined,
      referrer: r.referrer || undefined,
      searchQuery: r.search_query || undefined,
      filtersJson: r.filters_json || undefined,
      ipHash: r.ip_hash || undefined,
      userAgent: r.user_agent || undefined,
      createdAt: toIso(r.created_at),
    };
  }

  async listRecent(limit = 200): Promise<ActivityEvent[]> {
    const res = await this.pool.query('SELECT * FROM activity_events ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      userId: r.user_id || undefined,
      sessionId: r.session_id || undefined,
      entityType: r.entity_type || undefined,
      entityId: r.entity_id || undefined,
      path: r.path || undefined,
      referrer: r.referrer || undefined,
      searchQuery: r.search_query || undefined,
      filtersJson: r.filters_json || undefined,
      ipHash: r.ip_hash || undefined,
      userAgent: r.user_agent || undefined,
      createdAt: toIso(r.created_at),
    }));
  }

  async summarize(days = 30): Promise<any> {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const totals = await this.pool.query(
      `SELECT event_type, COUNT(*)::int AS count FROM activity_events WHERE created_at >= $1 GROUP BY event_type ORDER BY count DESC`,
      [since]
    );
    const pageViews = await this.pool.query(
      `SELECT path, COUNT(*)::int AS views FROM activity_events WHERE created_at >= $1 AND event_type = 'page_view' GROUP BY path ORDER BY views DESC LIMIT 20`,
      [since]
    );
    const vehicleViews = await this.pool.query(
      `SELECT entity_id, COUNT(*)::int AS views FROM activity_events WHERE created_at >= $1 AND event_type = 'vehicle_view' GROUP BY entity_id ORDER BY views DESC LIMIT 20`,
      [since]
    );
    const byDay = await this.pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*)::int AS events FROM activity_events WHERE created_at >= $1 GROUP BY DATE(created_at) ORDER BY day`,
      [since]
    );
    return {
      since,
      eventTotals: totals.rows,
      totalEvents: totals.rows.reduce((sum: number, row: any) => sum + row.count, 0),
      topPages: pageViews.rows,
      topVehicles: vehicleViews.rows,
      daily: byDay.rows,
    };
  }
}

// -------------------------------------------------------------
// Database Service Facade for Neon Postgres
// -------------------------------------------------------------
export class PostgresDatabaseService implements IDatabaseService {
  public users: IUserRepository;
  public vehicles: IVehicleRepository;
  public offers: IOfferRepository;
  public inspections: IInspectionRepository;
  public rentals: IRentalRepository;
  public imports: IImportRepository;
  public sell: ISellRepository;
  public concierge: IConciergeRepository;
  public saved: ISavedPreferencesRepository;
  public audit: IAuditRepository;
  public cache: ICacheRepository;
  public aiUsage: IAiUsageRepository;
  public notifications: INotificationRepository;
  public statusHistory: IStatusHistoryRepository;
  public settings: ISettingsRepository;
  public activity: IActivityRepository;

  constructor(private pool: pg.Pool) {
    this.users = new PostgresUserRepository(pool);
    this.vehicles = new PostgresVehicleRepository(pool);
    this.offers = new PostgresOfferRepository(pool);
    this.inspections = new PostgresInspectionRepository(pool);
    this.rentals = new PostgresRentalRepository(pool);
    this.imports = new PostgresImportRepository(pool);
    this.sell = new PostgresSellRepository(pool);
    this.concierge = new PostgresConciergeRepository(pool);
    this.saved = new PostgresSavedPreferencesRepository(pool);
    this.audit = new PostgresAuditRepository(pool);
    this.cache = new PostgresCacheRepository(pool);
    this.aiUsage = new PostgresAiUsageRepository(pool);
    this.notifications = new PostgresNotificationRepository(pool);
    this.statusHistory = new PostgresStatusHistoryRepository(pool);
    this.settings = new PostgresSettingsRepository(pool);
    this.activity = new PostgresActivityRepository(pool);
  }

  async initialize(): Promise<void> {
    await initializePostgresSchema(this.pool);
  }

  async transaction<T>(work: (tx: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
