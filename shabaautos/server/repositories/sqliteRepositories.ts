import { DatabaseSync } from 'node:sqlite';
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

export class SqliteUserRepository implements IUserRepository {
  constructor(private db: DatabaseSync) {}

  async findById(id: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ? OR clerk_id = ?').get(id, id) as any;
    return row ? this.mapUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
    return row ? this.mapUser(row) : null;
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE clerk_id = ? OR id = ?').get(clerkId, clerkId) as any;
    return row ? this.mapUser(row) : null;
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
      const updated: User = {
        ...existing,
        clerkId: data.clerkId,
        email: data.email || existing.email,
        fullName: data.fullName || existing.fullName,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : existing.avatarUrl,
        role: data.role || existing.role,
        updatedAt: now,
      };

      this.db
        .prepare(
          `UPDATE users SET clerk_id = ?, email = ?, full_name = ?, phone = ?, avatar_url = ?, role = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          updated.clerkId || null,
          updated.email,
          updated.fullName,
          updated.phone,
          updated.avatarUrl || null,
          updated.role,
          updated.updatedAt,
          existing.id
        );

      return updated;
    }

    // Create new profile linked to Clerk
    const id = data.clerkId.startsWith('user_') ? data.clerkId : `usr_${crypto.randomUUID()}`;
    const newUser: User = {
      id,
      clerkId: data.clerkId,
      email: data.email,
      fullName: data.fullName || 'Valued Client',
      phone: data.phone || '',
      role: data.role || 'customer',
      status: 'active',
      avatarUrl: data.avatarUrl,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO users (id, clerk_id, email, password_hash, full_name, phone, role, status, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newUser.id,
        newUser.clerkId || null,
        newUser.email,
        newUser.passwordHash || '',
        newUser.fullName,
        newUser.phone,
        newUser.role,
        newUser.status,
        newUser.avatarUrl || null,
        newUser.createdAt,
        newUser.updatedAt
      );

    return newUser;
  }

  async deleteByClerkId(clerkId: string): Promise<boolean> {
    const res = this.db.prepare('DELETE FROM users WHERE clerk_id = ? OR id = ?').run(clerkId, clerkId);
    return res.changes > 0;
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = `usr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const newUser: User = {
      id,
      ...user,
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO users (id, email, password_hash, full_name, phone, role, status, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newUser.id,
        newUser.email,
        newUser.passwordHash,
        newUser.fullName,
        newUser.phone,
        newUser.role,
        newUser.status,
        newUser.avatarUrl || null,
        newUser.createdAt,
        newUser.updatedAt
      );
    return newUser;
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `UPDATE users SET email = ?, full_name = ?, phone = ?, role = ?, status = ?, avatar_url = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        updated.email,
        updated.fullName,
        updated.phone,
        updated.role,
        updated.status,
        updated.avatarUrl || null,
        updated.updatedAt,
        id
      );
    return updated;
  }

  async list(limit = 50, offset = 0): Promise<User[]> {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    return rows.map((r) => this.mapUser(r));
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      clerkId: row.clerk_id || undefined,
      email: row.email,
      passwordHash: row.password_hash,
      fullName: row.full_name,
      phone: row.phone,
      role: row.role,
      status: row.status,
      avatarUrl: row.avatar_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteVehicleRepository implements IVehicleRepository {
  constructor(private db: DatabaseSync) {}

  async findById(id: string): Promise<Vehicle | null> {
    const row = this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapVehicle(row);
  }

  async findByStockId(stockId: string): Promise<Vehicle | null> {
    const row = this.db.prepare('SELECT * FROM vehicles WHERE stock_id = ?').get(stockId) as any;
    if (!row) return null;
    return this.mapVehicle(row);
  }

  async list(filters: VehicleFilterParams = {}): Promise<{ vehicles: Vehicle[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.make && filters.make !== 'All Makes') {
      conditions.push('LOWER(make) = LOWER(?)');
      params.push(filters.make);
    }
    if (filters.model && filters.model !== 'All Models') {
      conditions.push('LOWER(model) LIKE LOWER(?)');
      params.push(`%${filters.model}%`);
    }
    if (filters.condition && filters.condition !== 'All' && filters.condition !== 'All Conditions') {
      conditions.push('LOWER(condition) = LOWER(?)');
      params.push(filters.condition);
    }
    if (filters.bodyType && filters.bodyType !== 'All' && filters.bodyType !== 'All Body Types') {
      conditions.push('LOWER(body_type) = LOWER(?)');
      params.push(filters.bodyType);
    }
    if (filters.transmission && filters.transmission !== 'All Transmissions' && filters.transmission !== 'All') {
      conditions.push('LOWER(transmission) = LOWER(?)');
      params.push(filters.transmission);
    }
    if (filters.fuelType && filters.fuelType !== 'All Fuels' && filters.fuelType !== 'All') {
      conditions.push('LOWER(fuel_type) = LOWER(?)');
      params.push(filters.fuelType);
    }
    if (filters.city) {
      conditions.push('(LOWER(city) = LOWER(?) OR LOWER(location) LIKE LOWER(?))');
      params.push(filters.city, `%${filters.city}%`);
    }
    if (filters.verified !== undefined) {
      conditions.push('verified = ?');
      params.push(filters.verified ? 1 : 0);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    } else {
      conditions.push("status != 'delisted'");
    }
    if (filters.minPrice !== undefined) {
      conditions.push('price_ngn >= ?');
      params.push(filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push('price_ngn <= ?');
      params.push(filters.maxPrice);
    }
    if (filters.minYear !== undefined) {
      conditions.push('year >= ?');
      params.push(filters.minYear);
    }
    if (filters.maxYear !== undefined) {
      conditions.push('year <= ?');
      params.push(filters.maxYear);
    }
    if (filters.minMileage !== undefined) {
      conditions.push('mileage >= ?');
      params.push(filters.minMileage);
    }
    if (filters.maxMileage !== undefined) {
      conditions.push('mileage <= ?');
      params.push(filters.maxMileage);
    }
    if (filters.search) {
      conditions.push('(LOWER(make) LIKE LOWER(?) OR LOWER(model) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?) OR LOWER(stock_id) LIKE LOWER(?))');
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = this.db.prepare(`SELECT COUNT(*) as cnt FROM vehicles ${whereClause}`).get(...params) as any;
    const total = countRow ? Number(countRow.cnt) : 0;

    let orderBy = 'created_at DESC, id DESC';
    if (filters.sort === 'price-asc') {
      orderBy = 'price_ngn ASC, id DESC';
    } else if (filters.sort === 'price-desc') {
      orderBy = 'price_ngn DESC, id DESC';
    } else if (filters.sort === 'mileage-asc') {
      orderBy = 'mileage ASC, id DESC';
    } else if (filters.sort === 'mileage-desc') {
      orderBy = 'mileage DESC, id DESC';
    } else if (filters.sort === 'year-desc') {
      orderBy = 'year DESC, price_ngn ASC, id DESC';
    } else if (filters.sort === 'year-asc') {
      orderBy = 'year ASC, price_ngn ASC, id DESC';
    } else if (filters.sort === 'newest') {
      orderBy = 'created_at DESC, id DESC';
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const rows = this.db
      .prepare(`SELECT * FROM vehicles ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as any[];

    const vehicles = rows.map((r) => this.mapVehicle(r));
    return { vehicles, total };
  }

  async getFacets(): Promise<VehicleFacets> {
    const makeRows = this.db.prepare("SELECT DISTINCT make FROM vehicles WHERE verified = 1 AND status = 'available' ORDER BY make ASC").all() as any[];
    const modelRows = this.db.prepare("SELECT DISTINCT model FROM vehicles WHERE verified = 1 AND status = 'available' ORDER BY model ASC").all() as any[];
    const bodyRows = this.db.prepare("SELECT DISTINCT body_type FROM vehicles WHERE verified = 1 AND status = 'available' AND body_type IS NOT NULL ORDER BY body_type ASC").all() as any[];
    const conditionRows = this.db.prepare("SELECT DISTINCT condition FROM vehicles WHERE verified = 1 AND status = 'available' AND condition IS NOT NULL ORDER BY condition ASC").all() as any[];
    const transRows = this.db.prepare("SELECT DISTINCT transmission FROM vehicles WHERE verified = 1 AND status = 'available' AND transmission IS NOT NULL ORDER BY transmission ASC").all() as any[];
    const fuelRows = this.db.prepare("SELECT DISTINCT fuel_type FROM vehicles WHERE verified = 1 AND status = 'available' AND fuel_type IS NOT NULL ORDER BY fuel_type ASC").all() as any[];
    const boundsRow = this.db.prepare(`
      SELECT 
        MIN(price_ngn) as min_price, 
        MAX(price_ngn) as max_price, 
        MIN(year) as min_year, 
        MAX(year) as max_year,
        MIN(mileage) as min_mileage,
        MAX(mileage) as max_mileage
      FROM vehicles 
      WHERE verified = 1 AND status = 'available'
    `).get() as any;

    return {
      makes: makeRows.map((r) => r.make).filter(Boolean),
      models: modelRows.map((r) => r.model).filter(Boolean),
      bodyTypes: bodyRows.map((r) => r.body_type).filter(Boolean),
      conditions: conditionRows.map((r) => r.condition).filter(Boolean),
      transmissions: transRows.map((r) => r.transmission).filter(Boolean),
      fuelTypes: fuelRows.map((r) => r.fuel_type).filter(Boolean),
      priceBounds: {
        min: boundsRow?.min_price ? Number(boundsRow.min_price) : 5000000,
        max: boundsRow?.max_price ? Number(boundsRow.max_price) : 150000000,
      },
      yearBounds: {
        min: boundsRow?.min_year ? Number(boundsRow.min_year) : 2012,
        max: boundsRow?.max_year ? Number(boundsRow.max_year) : 2026,
      },
      mileageBounds: {
        min: boundsRow?.min_mileage !== undefined ? Number(boundsRow.min_mileage) : 0,
        max: boundsRow?.max_mileage ? Number(boundsRow.max_mileage) : 150000,
      },
    };
  }

  async create(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>, images: string[] = []): Promise<Vehicle> {
    const id = `veh_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const newVehicle: Vehicle = {
      id,
      ...vehicle,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO vehicles (
          id, make, model, year, trim, price_ngn, price_usd, mileage, mileage_unit,
          transmission, fuel_type, location, city, state, verified, clean_title,
          condition, body_type, engine, drive_type, color, seats, stock_id,
          description, features_json, inspection_passed, seller_id, status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`
      )
      .run(
        newVehicle.id,
        newVehicle.make,
        newVehicle.model,
        newVehicle.year,
        newVehicle.trim || null,
        newVehicle.priceNgn,
        newVehicle.priceUsd || null,
        newVehicle.mileage,
        newVehicle.mileageUnit,
        newVehicle.transmission,
        newVehicle.fuelType,
        newVehicle.location,
        newVehicle.city || null,
        newVehicle.state || null,
        newVehicle.verified ? 1 : 0,
        newVehicle.cleanTitle ? 1 : 0,
        newVehicle.condition,
        newVehicle.bodyType,
        newVehicle.engine,
        newVehicle.driveType,
        newVehicle.color,
        newVehicle.seats,
        newVehicle.stockId,
        newVehicle.description,
        JSON.stringify(newVehicle.features || []),
        newVehicle.inspectionPassed ? 1 : 0,
        newVehicle.sellerId || null,
        newVehicle.status,
        newVehicle.createdAt,
        newVehicle.updatedAt
      );

    if (images.length > 0) {
      await this.setImages(id, images);
    }

    return newVehicle;
  }

  async update(id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated: Vehicle = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `UPDATE vehicles SET
          make = ?, model = ?, year = ?, trim = ?, price_ngn = ?, price_usd = ?,
          mileage = ?, mileage_unit = ?, transmission = ?, fuel_type = ?, location = ?,
          city = ?, state = ?, verified = ?, clean_title = ?, condition = ?,
          body_type = ?, engine = ?, drive_type = ?, color = ?, seats = ?,
          description = ?, features_json = ?, inspection_passed = ?, status = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        updated.make,
        updated.model,
        updated.year,
        updated.trim || null,
        updated.priceNgn,
        updated.priceUsd || null,
        updated.mileage,
        updated.mileageUnit,
        updated.transmission,
        updated.fuelType,
        updated.location,
        updated.city || null,
        updated.state || null,
        updated.verified ? 1 : 0,
        updated.cleanTitle ? 1 : 0,
        updated.condition,
        updated.bodyType,
        updated.engine,
        updated.driveType,
        updated.color,
        updated.seats,
        updated.description,
        JSON.stringify(updated.features || []),
        updated.inspectionPassed ? 1 : 0,
        updated.status,
        updated.updatedAt,
        id
      );
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const res = this.db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    return (res as any).changes > 0;
  }

  async getImages(vehicleId: string): Promise<VehicleImage[]> {
    const rows = this.db.prepare('SELECT * FROM vehicle_images WHERE vehicle_id = ? ORDER BY display_order ASC').all(vehicleId) as any[];
    return rows.map((r) => this.mapImage(r));
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
      createdAt: r.created_at,
    };
  }

  async setImages(vehicleId: string, imageUrls: string[]): Promise<void> {
    this.db.prepare('DELETE FROM vehicle_images WHERE vehicle_id = ?').run(vehicleId);
    const insertStmt = this.db.prepare(
      'INSERT INTO vehicle_images (id, vehicle_id, url, display_order, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    imageUrls.forEach((url, idx) => {
      insertStmt.run(`img_${crypto.randomUUID()}`, vehicleId, url, idx, idx === 0 ? 1 : 0, now);
    });
  }

  async addImages(vehicleId: string, images: VehicleImageInput[]): Promise<VehicleImage[]> {
    const created: VehicleImage[] = [];
    const insertStmt = this.db.prepare(
      `INSERT INTO vehicle_images (id, vehicle_id, url, display_order, is_primary, public_id, asset_id, width, height, format, caption, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    for (const img of images) {
      const imgId = `img_${crypto.randomUUID()}`;
      insertStmt.run(
        imgId,
        vehicleId,
        img.url,
        img.displayOrder ?? 0,
        img.isPrimary ? 1 : 0,
        img.publicId || null,
        img.assetId || null,
        img.width ?? null,
        img.height ?? null,
        img.format || null,
        img.caption || null,
        now
      );
      created.push(this.mapImage(this.db.prepare('SELECT * FROM vehicle_images WHERE id = ?').get(imgId)));
      if (img.isPrimary) {
        this.db.prepare('UPDATE vehicle_images SET is_primary = 0 WHERE vehicle_id = ? AND id <> ?').run(vehicleId, imgId);
      }
    }
    return created;
  }

  async updateImage(imageId: string, updates: Partial<Pick<VehicleImage, 'isPrimary' | 'displayOrder' | 'caption'>>): Promise<VehicleImage | null> {
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.isPrimary !== undefined) { params.push(updates.isPrimary ? 1 : 0); sets.push('is_primary = ?'); }
    if (updates.displayOrder !== undefined) { params.push(Math.max(0, Number(updates.displayOrder))); sets.push('display_order = ?'); }
    if (updates.caption !== undefined) { params.push(updates.caption || null); sets.push('caption = ?'); }
    if (sets.length === 0) return this.getImageById(imageId);
    params.push(imageId);
    this.db.prepare(`UPDATE vehicle_images SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.getImageById(imageId);
  }

  async setPrimaryImage(vehicleId: string, imageId: string): Promise<void> {
    this.db.prepare('UPDATE vehicle_images SET is_primary = 0 WHERE vehicle_id = ?').run(vehicleId);
    this.db.prepare('UPDATE vehicle_images SET is_primary = 1 WHERE id = ? AND vehicle_id = ?').run(imageId, vehicleId);
  }

  async deleteImage(imageId: string): Promise<VehicleImage | null> {
    const row = this.db.prepare('SELECT * FROM vehicle_images WHERE id = ?').get(imageId) as any;
    if (!row) return null;
    this.db.prepare('DELETE FROM vehicle_images WHERE id = ?').run(imageId);
    return this.mapImage(row);
  }

  private getImageById(imageId: string): VehicleImage | null {
    const row = this.db.prepare('SELECT * FROM vehicle_images WHERE id = ?').get(imageId) as any;
    return row ? this.mapImage(row) : null;
  }

  async getSeller(sellerId: string): Promise<DealershipSeller | null> {
    const row = this.db.prepare('SELECT * FROM sellers WHERE id = ?').get(sellerId) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id || undefined,
      name: row.name,
      dealershipName: row.dealership_name || undefined,
      verified: Boolean(row.verified),
      rating: Number(row.rating),
      reviewsCount: Number(row.reviews_count),
      location: row.location,
      phone: row.phone,
      email: row.email || undefined,
      joinedYear: row.joined_year,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createSeller(seller: Omit<DealershipSeller, 'createdAt' | 'updatedAt'>): Promise<DealershipSeller> {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO sellers (id, user_id, name, dealership_name, verified, rating, reviews_count, location, phone, email, joined_year, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        seller.id,
        seller.userId || null,
        seller.name,
        seller.dealershipName || null,
        seller.verified ? 1 : 0,
        seller.rating,
        seller.reviewsCount,
        seller.location,
        seller.phone,
        seller.email || null,
        seller.joinedYear,
        seller.status,
        now,
        now
      );
    return {
      ...seller,
      createdAt: now,
      updatedAt: now,
    };
  }

  private mapVehicle(row: any): Vehicle {
    let features: string[] = [];
    try {
      features = JSON.parse(row.features_json || '[]');
    } catch {
      features = [];
    }

    return {
      id: row.id,
      make: row.make,
      model: row.model,
      year: Number(row.year),
      trim: row.trim || undefined,
      priceNgn: Number(row.price_ngn),
      priceUsd: row.price_usd ? Number(row.price_usd) : undefined,
      mileage: Number(row.mileage),
      mileageUnit: row.mileage_unit,
      transmission: row.transmission,
      fuelType: row.fuel_type,
      location: row.location,
      city: row.city || undefined,
      state: row.state || undefined,
      verified: Boolean(row.verified),
      cleanTitle: Boolean(row.clean_title),
      condition: row.condition,
      bodyType: row.body_type,
      engine: row.engine,
      driveType: row.drive_type,
      color: row.color,
      seats: Number(row.seats),
      stockId: row.stock_id,
      description: row.description,
      features,
      inspectionPassed: Boolean(row.inspection_passed),
      sellerId: row.seller_id || undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteOfferRepository implements IOfferRepository {
  constructor(private db: DatabaseSync) {}

  async findById(id: string): Promise<Offer | null> {
    const row = this.db.prepare('SELECT * FROM offers WHERE id = ?').get(id) as any;
    return row ? this.mapOffer(row) : null;
  }

  async listByVehicleId(carId: string): Promise<Offer[]> {
    const rows = this.db.prepare('SELECT * FROM offers WHERE car_id = ? ORDER BY created_at DESC').all(carId) as any[];
    return rows.map((r) => this.mapOffer(r));
  }

  async listByUserId(userId: string): Promise<Offer[]> {
    const rows = this.db.prepare('SELECT * FROM offers WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map((r) => this.mapOffer(r));
  }

  async listAll(limit = 50, offset = 0): Promise<Offer[]> {
    const rows = this.db.prepare('SELECT * FROM offers ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    return rows.map((r) => this.mapOffer(r));
  }

  async create(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Offer> {
    const id = `ofr_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newOffer: Offer = {
      id,
      ...offer,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO offers (
          id, car_id, car_name, user_id, buyer_name, buyer_phone, buyer_email,
          offer_amount_ngn, vehicle_listing_price_ngn, payment_method, notes,
          status, counter_amount_ngn, staff_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newOffer.id,
        newOffer.carId,
        newOffer.carName,
        newOffer.userId || null,
        newOffer.name,
        newOffer.phone,
        newOffer.email || null,
        newOffer.offerAmountNgn,
        newOffer.vehicleListingPriceNgn,
        newOffer.paymentMethod,
        newOffer.notes || null,
        newOffer.status,
        newOffer.counterAmountNgn || null,
        newOffer.staffNotes || null,
        newOffer.createdAt,
        newOffer.updatedAt
      );

    return newOffer;
  }

  async updateStatus(id: string, status: Offer['status'], counterAmountNgn?: number, staffNotes?: string): Promise<Offer | null> {
    const now = new Date().toISOString();
    this.db
      .prepare(
        'UPDATE offers SET status = ?, counter_amount_ngn = COALESCE(?, counter_amount_ngn), staff_notes = COALESCE(?, staff_notes), updated_at = ? WHERE id = ?'
      )
      .run(status, counterAmountNgn || null, staffNotes || null, now, id);
    return this.findById(id);
  }

  private mapOffer(row: any): Offer {
    return {
      id: row.id,
      carId: row.car_id,
      carName: row.car_name,
      userId: row.user_id || undefined,
      name: row.buyer_name,
      phone: row.buyer_phone,
      email: row.buyer_email || undefined,
      offerAmountNgn: Number(row.offer_amount_ngn),
      vehicleListingPriceNgn: Number(row.vehicle_listing_price_ngn),
      paymentMethod: row.payment_method,
      notes: row.notes || undefined,
      status: row.status,
      counterAmountNgn: row.counter_amount_ngn ? Number(row.counter_amount_ngn) : undefined,
      staffNotes: row.staff_notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteInspectionRepository implements IInspectionRepository {
  constructor(private db: DatabaseSync) {}

  async findById(id: string): Promise<Inspection | null> {
    const row = this.db.prepare('SELECT * FROM inspections WHERE id = ?').get(id) as any;
    return row ? this.mapInspection(row) : null;
  }

  async listByVehicleId(carId: string): Promise<Inspection[]> {
    const rows = this.db.prepare('SELECT * FROM inspections WHERE car_id = ? ORDER BY scheduled_date DESC').all(carId) as any[];
    return rows.map((r) => this.mapInspection(r));
  }

  async listByUserId(userId: string): Promise<Inspection[]> {
    const rows = this.db.prepare('SELECT * FROM inspections WHERE user_id = ? ORDER BY scheduled_date DESC').all(userId) as any[];
    return rows.map((r) => this.mapInspection(r));
  }

  async listAll(limit = 50, offset = 0): Promise<Inspection[]> {
    const rows = this.db.prepare('SELECT * FROM inspections ORDER BY scheduled_date DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    return rows.map((r) => this.mapInspection(r));
  }

  async create(inspection: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Inspection> {
    const id = `insp_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newInsp: Inspection = {
      id,
      ...inspection,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO inspections (
          id, car_id, car_name, user_id, customer_name, customer_phone, customer_email,
          scheduled_date, time_slot, hub_location, inspection_type, status,
          inspector_notes, report_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newInsp.id,
        newInsp.carId,
        newInsp.carName,
        newInsp.userId || null,
        newInsp.name,
        newInsp.phone,
        newInsp.email || null,
        newInsp.date,
        newInsp.timeSlot,
        newInsp.hubLocation,
        newInsp.inspectionType,
        newInsp.status,
        newInsp.inspectorNotes || null,
        newInsp.reportUrl || null,
        newInsp.createdAt,
        newInsp.updatedAt
      );

    return newInsp;
  }

  async updateStatus(id: string, status: Inspection['status'], notes?: string): Promise<Inspection | null> {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE inspections SET status = ?, inspector_notes = COALESCE(?, inspector_notes), updated_at = ? WHERE id = ?')
      .run(status, notes || null, now, id);
    return this.findById(id);
  }

  private mapInspection(row: any): Inspection {
    return {
      id: row.id,
      carId: row.car_id,
      carName: row.car_name,
      userId: row.user_id || undefined,
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email || undefined,
      date: row.scheduled_date,
      timeSlot: row.time_slot,
      hubLocation: row.hub_location,
      inspectionType: row.inspection_type,
      status: row.status,
      inspectorNotes: row.inspector_notes || undefined,
      reportUrl: row.report_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteRentalRepository implements IRentalRepository {
  constructor(private db: DatabaseSync) {}

  async findVehicleById(id: string): Promise<RentalVehicle | null> {
    const row = this.db.prepare('SELECT * FROM rental_vehicles WHERE id = ?').get(id) as any;
    return row ? this.mapRentalVehicle(row) : null;
  }

  async listVehicles(category?: string, availableOnly = false): Promise<RentalVehicle[]> {
    const conditions: string[] = ["status != 'retired'"];
    const params: any[] = [];
    if (category && category !== 'All') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (availableOnly) {
      conditions.push('available = 1');
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const rows = this.db.prepare(`SELECT * FROM rental_vehicles ${where} ORDER BY rating DESC`).all(...params) as any[];
    return rows.map((r) => this.mapRentalVehicle(r));
  }

  async createVehicle(vehicle: Omit<RentalVehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalVehicle> {
    const id = `rent_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newVehicle: RentalVehicle = {
      id,
      ...vehicle,
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO rental_vehicles (
          id, name, category, price_per_day_ngn, transmission, fuel, seats,
          image_url, available, rating, plate_number, location, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newVehicle.id,
        newVehicle.name,
        newVehicle.category,
        newVehicle.pricePerDayNgn,
        newVehicle.transmission,
        newVehicle.fuel,
        newVehicle.seats,
        newVehicle.imageUrl,
        newVehicle.available ? 1 : 0,
        newVehicle.rating,
        newVehicle.plateNumber || null,
        newVehicle.location,
        newVehicle.status,
        newVehicle.createdAt,
        newVehicle.updatedAt
      );
    return newVehicle;
  }

  async findBookingById(id: string): Promise<RentalBooking | null> {
    const row = this.db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(id) as any;
    return row ? this.mapBooking(row) : null;
  }

  async listBookingsByUserId(userId: string): Promise<RentalBooking[]> {
    const rows = this.db.prepare('SELECT * FROM rental_bookings WHERE user_id = ? ORDER BY pickup_date DESC').all(userId) as any[];
    return rows.map((r) => this.mapBooking(r));
  }

  async listAllBookings(limit = 50, offset = 0): Promise<RentalBooking[]> {
    const rows = this.db.prepare('SELECT * FROM rental_bookings ORDER BY pickup_date DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    return rows.map((r) => this.mapBooking(r));
  }

  async checkAvailability(rentalVehicleId: string, startDate: string, endDate: string): Promise<boolean> {
    const overlap = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM rental_availability_blocks
         WHERE rental_vehicle_id = ?
         AND (
           (start_date <= ? AND end_date >= ?) OR
           (start_date <= ? AND end_date >= ?) OR
           (start_date >= ? AND end_date <= ?)
         )`
      )
      .get(rentalVehicleId, startDate, startDate, endDate, endDate, startDate, endDate) as any;
    return Number(overlap.count) === 0;
  }

  // TRANSACTION BOUNDARY FOR BOOKINGS
  async createBookingWithBlock(booking: Omit<RentalBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalBooking> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const isAvailable = await this.checkAvailability(booking.carId, booking.pickupDate, booking.returnDate);
      if (!isAvailable) {
        throw new Error(`Vehicle ${booking.carId} is already booked or blocked for the requested dates`);
      }

      const id = `RNT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const newBooking: RentalBooking = {
        id,
        ...booking,
        createdAt: now,
        updatedAt: now,
      };

      this.db
        .prepare(
          `INSERT INTO rental_bookings (
            id, car_id, car_name, user_id, customer_name, phone, email,
            pickup_date, return_date, pickup_location, days, daily_rate_ngn,
            with_chauffeur, with_insurance, chauffeur_fee_ngn, insurance_fee_ngn,
            total_ngn, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          newBooking.id,
          newBooking.carId,
          newBooking.carName,
          newBooking.userId || null,
          newBooking.customerName,
          newBooking.phone,
          newBooking.email || null,
          newBooking.pickupDate,
          newBooking.returnDate,
          newBooking.pickupLocation,
          newBooking.days,
          newBooking.dailyRateNgn,
          newBooking.withChauffeur ? 1 : 0,
          newBooking.withInsurance ? 1 : 0,
          newBooking.chauffeurFeeNgn,
          newBooking.insuranceFeeNgn,
          newBooking.totalNgn,
          newBooking.status,
          newBooking.createdAt,
          newBooking.updatedAt
        );

      const blockId = `blk_${crypto.randomUUID()}`;
      this.db
        .prepare(
          `INSERT INTO rental_availability_blocks (
            id, rental_vehicle_id, start_date, end_date, reason, rental_booking_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(blockId, newBooking.carId, newBooking.pickupDate, newBooking.returnDate, 'booked', newBooking.id, now);

      this.db.exec('COMMIT;');
      return newBooking;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  async cancelBooking(id: string): Promise<boolean> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const res = this.db.prepare("UPDATE rental_bookings SET status = 'Cancelled', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      this.db.prepare('DELETE FROM rental_availability_blocks WHERE rental_booking_id = ?').run(id);
      this.db.exec('COMMIT;');
      return (res as any).changes > 0;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  async updateBookingStatus(id: string, status: RentalBooking['status']): Promise<RentalBooking | null> {
    this.db
      .prepare('UPDATE rental_bookings SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);
    if (status === 'Cancelled') {
      this.db.prepare('DELETE FROM rental_availability_blocks WHERE rental_booking_id = ?').run(id);
    }
    const row = this.db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(id) as any;
    return row ? this.mapBooking(row) : null;
  }

  private mapRentalVehicle(row: any): RentalVehicle {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      pricePerDayNgn: Number(row.price_per_day_ngn),
      transmission: row.transmission,
      fuel: row.fuel,
      seats: Number(row.seats),
      imageUrl: row.image_url,
      available: Boolean(row.available),
      rating: Number(row.rating),
      plateNumber: row.plate_number || undefined,
      location: row.location,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapBooking(row: any): RentalBooking {
    return {
      id: row.id,
      carId: row.car_id,
      carName: row.car_name,
      userId: row.user_id || undefined,
      customerName: row.customer_name,
      phone: row.phone,
      email: row.email || undefined,
      pickupDate: row.pickup_date,
      returnDate: row.return_date,
      pickupLocation: row.pickup_location,
      days: Number(row.days),
      dailyRateNgn: Number(row.daily_rate_ngn),
      withChauffeur: Boolean(row.with_chauffeur),
      withInsurance: Boolean(row.with_insurance),
      chauffeurFeeNgn: Number(row.chauffeur_fee_ngn),
      insuranceFeeNgn: Number(row.insurance_fee_ngn),
      totalNgn: Number(row.total_ngn),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteImportRepository implements IImportRepository {
  constructor(private db: DatabaseSync) {}

  async findRequestById(id: string): Promise<ImportRequest | null> {
    const row = this.db.prepare('SELECT * FROM import_requests WHERE id = ?').get(id) as any;
    return row ? this.mapRequest(row) : null;
  }

  async findByTrackingId(trackingId: string): Promise<ImportRequest | null> {
    const row = this.db.prepare('SELECT * FROM import_requests WHERE tracking_id = ?').get(trackingId) as any;
    return row ? this.mapRequest(row) : null;
  }

  async findByVin(vin: string): Promise<ImportRequest | null> {
    const row = this.db.prepare('SELECT * FROM import_requests WHERE LOWER(vin) = LOWER(?)').get(vin) as any;
    return row ? this.mapRequest(row) : null;
  }

  async listRequests(userId?: string): Promise<ImportRequest[]> {
    const query = userId
      ? 'SELECT * FROM import_requests WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM import_requests ORDER BY created_at DESC';
    const rows = (userId ? this.db.prepare(query).all(userId) : this.db.prepare(query).all()) as any[];
    return rows.map((r) => this.mapRequest(r));
  }

  async createRequest(request: Omit<ImportRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImportRequest> {
    const id = `imp_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newReq: ImportRequest = {
      id,
      ...request,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO import_requests (
          id, tracking_id, user_id, customer_name, phone, email, make, model, year,
          year_min, year_max, budget_range, estimated_budget_usd, vin, vehicle_type,
          fuel_type, transmission, drive_type, mileage_pref, features_json,
          delivery_city, destination_port, origin_port, additional_notes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newReq.id,
        newReq.trackingId,
        newReq.userId || null,
        newReq.customerName,
        newReq.phone,
        newReq.email || null,
        newReq.make,
        newReq.model,
        newReq.year || null,
        newReq.yearMin || null,
        newReq.yearMax || null,
        newReq.budgetRange || null,
        newReq.estimatedBudgetUsd || null,
        newReq.vin || null,
        newReq.vehicleType || null,
        newReq.fuelType || null,
        newReq.transmission || null,
        newReq.driveType || null,
        newReq.mileagePref || null,
        JSON.stringify(newReq.features || []),
        newReq.deliveryCity,
        newReq.destinationPort,
        newReq.originPort,
        newReq.additionalNotes || null,
        newReq.status,
        newReq.createdAt,
        newReq.updatedAt
      );

    return newReq;
  }

  async updateStatus(id: string, status: ImportRequest['status']): Promise<ImportRequest | null> {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE import_requests SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
    return this.findRequestById(id);
  }

  async saveCostEstimate(estimate: Omit<ImportCostEstimate, 'id' | 'createdAt'>): Promise<ImportCostEstimate> {
    const id = `est_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newEst: ImportCostEstimate = {
      id,
      ...estimate,
      createdAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO import_cost_estimates (
          id, import_request_id, auction_price_usd, vehicle_year, usd_to_ngn_rate,
          ocean_freight_usd, inland_towing_usd, cif_value_usd, cif_value_ngn,
          duty_rate, levy_rate, import_duty_ngn, nac_levy_ngn, vat_ngn,
          terminal_charges_ngn, clearing_agency_fee_ngn, total_customs_clearance_ngn,
          vehicle_landed_cost_ngn, savings_vs_local_market_ngn, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newEst.id,
        newEst.importRequestId || null,
        newEst.auctionPriceUsd,
        newEst.vehicleYear,
        newEst.usdToNgnRate,
        newEst.oceanFreightUsd,
        newEst.inlandTowingUsd,
        newEst.cifValueUsd,
        newEst.cifValueNgn,
        newEst.dutyRate,
        newEst.levyRate,
        newEst.importDutyNgn,
        newEst.nacLevyNgn,
        newEst.vatNgn,
        newEst.terminalChargesNgn,
        newEst.clearingAgencyFeeNgn,
        newEst.totalCustomsClearanceNgn,
        newEst.vehicleLandedCostNgn,
        newEst.savingsVsLocalMarketNgn,
        newEst.createdAt
      );

    return newEst;
  }

  async getCostEstimate(importRequestId: string): Promise<ImportCostEstimate | null> {
    const row = this.db
      .prepare('SELECT * FROM import_cost_estimates WHERE import_request_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(importRequestId) as any;
    if (!row) return null;
    return {
      id: row.id,
      importRequestId: row.import_request_id || undefined,
      auctionPriceUsd: Number(row.auction_price_usd),
      vehicleYear: Number(row.vehicle_year),
      usdToNgnRate: Number(row.usd_to_ngn_rate),
      oceanFreightUsd: Number(row.ocean_freight_usd),
      inlandTowingUsd: Number(row.inland_towing_usd),
      cifValueUsd: Number(row.cif_value_usd),
      cifValueNgn: Number(row.cif_value_ngn),
      dutyRate: Number(row.duty_rate),
      levyRate: Number(row.levy_rate),
      importDutyNgn: Number(row.import_duty_ngn),
      nacLevyNgn: Number(row.nac_levy_ngn),
      vatNgn: Number(row.vat_ngn),
      terminalChargesNgn: Number(row.terminal_charges_ngn),
      clearingAgencyFeeNgn: Number(row.clearing_agency_fee_ngn),
      totalCustomsClearanceNgn: Number(row.total_customs_clearance_ngn),
      vehicleLandedCostNgn: Number(row.vehicle_landed_cost_ngn),
      savingsVsLocalMarketNgn: Number(row.savings_vs_local_market_ngn),
      createdAt: row.created_at,
    };
  }

  async getMilestones(trackingId: string): Promise<ShipmentMilestone[]> {
    const rows = this.db
      .prepare('SELECT * FROM shipment_milestones WHERE tracking_id = ? ORDER BY step_order ASC')
      .all(trackingId) as any[];
    return rows.map((r) => ({
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
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async addMilestone(milestone: Omit<ShipmentMilestone, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShipmentMilestone> {
    const id = `mls_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newMls: ShipmentMilestone = {
      id,
      ...milestone,
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO shipment_milestones (
          id, tracking_id, step_order, title, description, scheduled_date,
          completed_date, is_completed, is_current, location, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newMls.id,
        newMls.trackingId,
        newMls.stepOrder,
        newMls.title,
        newMls.description || null,
        newMls.scheduledDate,
        newMls.completedDate || null,
        newMls.isCompleted ? 1 : 0,
        newMls.isCurrent ? 1 : 0,
        newMls.location || null,
        newMls.createdAt,
        newMls.updatedAt
      );
    return newMls;
  }

  async updateMilestone(id: string, updates: Partial<ShipmentMilestone>): Promise<ShipmentMilestone | null> {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE shipment_milestones SET
          is_completed = COALESCE(?, is_completed),
          is_current = COALESCE(?, is_current),
          completed_date = COALESCE(?, completed_date),
          updated_at = ?
         WHERE id = ?`
      )
      .run(
        updates.isCompleted !== undefined ? (updates.isCompleted ? 1 : 0) : null,
        updates.isCurrent !== undefined ? (updates.isCurrent ? 1 : 0) : null,
        updates.completedDate || null,
        now,
        id
      );
    const row = this.db.prepare('SELECT * FROM shipment_milestones WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      trackingId: row.tracking_id,
      stepOrder: Number(row.step_order),
      title: row.title,
      description: row.description || undefined,
      scheduledDate: row.scheduled_date,
      completedDate: row.completed_date || undefined,
      isCompleted: Boolean(row.is_completed),
      isCurrent: Boolean(row.is_current),
      location: row.location || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getTrackingEvents(trackingId: string): Promise<TrackingEvent[]> {
    const rows = this.db
      .prepare('SELECT * FROM tracking_events WHERE tracking_id = ? ORDER BY event_timestamp DESC')
      .all(trackingId) as any[];
    return rows.map((r) => ({
      id: r.id,
      trackingId: r.tracking_id,
      eventTimestamp: r.event_timestamp,
      status: r.status,
      location: r.location,
      vesselName: r.vessel_name || undefined,
      containerNo: r.container_no || undefined,
      details: r.details || undefined,
      recordedBy: r.recorded_by || undefined,
      createdAt: r.created_at,
    }));
  }

  async addTrackingEvent(event: Omit<TrackingEvent, 'id' | 'createdAt'>): Promise<TrackingEvent> {
    const id = `evt_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newEvt: TrackingEvent = {
      id,
      ...event,
      createdAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO tracking_events (
          id, tracking_id, event_timestamp, status, location, vessel_name, container_no, details, recorded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newEvt.id,
        newEvt.trackingId,
        newEvt.eventTimestamp,
        newEvt.status,
        newEvt.location,
        newEvt.vesselName || null,
        newEvt.containerNo || null,
        newEvt.details || null,
        newEvt.recordedBy || null,
        newEvt.createdAt
      );
    return newEvt;
  }

  private mapRequest(row: any): ImportRequest {
    let features: string[] = [];
    try {
      features = JSON.parse(row.features_json || '[]');
    } catch {
      features = [];
    }
    return {
      id: row.id,
      trackingId: row.tracking_id,
      userId: row.user_id || undefined,
      customerName: row.customer_name,
      phone: row.phone,
      email: row.email || undefined,
      make: row.make,
      model: row.model,
      year: row.year ? Number(row.year) : undefined,
      yearMin: row.year_min || undefined,
      yearMax: row.year_max || undefined,
      budgetRange: row.budget_range || undefined,
      estimatedBudgetUsd: row.estimated_budget_usd ? Number(row.estimated_budget_usd) : undefined,
      vin: row.vin || undefined,
      vehicleType: row.vehicle_type || undefined,
      fuelType: row.fuel_type || undefined,
      transmission: row.transmission || undefined,
      driveType: row.drive_type || undefined,
      mileagePref: row.mileage_pref || undefined,
      features,
      deliveryCity: row.delivery_city,
      destinationPort: row.destination_port,
      originPort: row.origin_port,
      additionalNotes: row.additional_notes || undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteSellRepository implements ISellRepository {
  constructor(private db: DatabaseSync) {}

  async findById(id: string): Promise<SellSubmission | null> {
    const row = this.db.prepare('SELECT * FROM sell_submissions WHERE id = ?').get(id) as any;
    return row ? this.mapSell(row) : null;
  }

  async list(userId?: string): Promise<SellSubmission[]> {
    const query = userId
      ? 'SELECT * FROM sell_submissions WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM sell_submissions ORDER BY created_at DESC';
    const rows = (userId ? this.db.prepare(query).all(userId) : this.db.prepare(query).all()) as any[];
    return rows.map((r) => this.mapSell(r));
  }

  async create(submission: Omit<SellSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<SellSubmission> {
    const id = `sell_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newSell: SellSubmission = {
      id,
      ...submission,
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO sell_submissions (
          id, user_id, seller_name, phone, email, make, model, year, trim,
          mileage, condition, issues, location, asking_price_ngn, estimated_value_ngn,
          status, inspector_notes, photo_urls_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newSell.id,
        newSell.userId || null,
        newSell.sellerName,
        newSell.phone,
        newSell.email || null,
        newSell.make,
        newSell.model,
        newSell.year,
        newSell.trim || null,
        newSell.mileage,
        newSell.condition,
        newSell.issues || null,
        newSell.location,
        newSell.askingPriceNgn,
        newSell.estimatedValueNgn,
        newSell.status,
        newSell.inspectorNotes || null,
        JSON.stringify(newSell.photoUrls || []),
        newSell.createdAt,
        newSell.updatedAt
      );
    return newSell;
  }

  async listAll(limit = 100, offset = 0): Promise<SellSubmission[]> {
    const rows = this.db.prepare('SELECT * FROM sell_submissions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    return rows.map((r) => this.mapSell(r));
  }

  async updateStatus(id: string, status: SellSubmission['status'], inspectorNotes?: string): Promise<SellSubmission | null> {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE sell_submissions SET status = ?, inspector_notes = COALESCE(?, inspector_notes), updated_at = ? WHERE id = ?')
      .run(status, inspectorNotes || null, now, id);
    return this.findById(id);
  }

  async updateReview(id: string, review: { reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_info'; reviewedBy?: string; adminNotes?: string; status?: SellSubmission['status'] }): Promise<SellSubmission | null> {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE sell_submissions SET review_status = ?, reviewed_by = ?, reviewed_at = ?,
         admin_notes = COALESCE(?, admin_notes), status = COALESCE(?, status), updated_at = ? WHERE id = ?`
      )
      .run(
        review.reviewStatus,
        review.reviewedBy || null,
        now,
        review.adminNotes || null,
        review.status || null,
        now,
        id
      );
    return this.findById(id);
  }

  async recordValuationHistory(valuation: Omit<ValuationHistory, 'id' | 'createdAt'>): Promise<ValuationHistory> {
    const id = `val_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newRecord: ValuationHistory = {
      id,
      ...valuation,
      createdAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO valuation_history (
          id, sell_submission_id, make, model, year, mileage, condition,
          algorithm_version, base_value_ngn, mileage_factor, condition_factor, final_valuation_ngn, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newRecord.id,
        newRecord.sellSubmissionId || null,
        newRecord.make,
        newRecord.model,
        newRecord.year,
        newRecord.mileage,
        newRecord.condition,
        newRecord.algorithmVersion,
        newRecord.baseValueNgn,
        newRecord.mileageFactor,
        newRecord.conditionFactor,
        newRecord.finalValuationNgn,
        newRecord.createdAt
      );
    return newRecord;
  }

  async getValuationHistory(sellSubmissionId: string): Promise<ValuationHistory[]> {
    const rows = this.db
      .prepare('SELECT * FROM valuation_history WHERE sell_submission_id = ? ORDER BY created_at DESC')
      .all(sellSubmissionId) as any[];
    return rows.map((r) => ({
      id: r.id,
      sellSubmissionId: r.sell_submission_id || undefined,
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
      createdAt: r.created_at,
    }));
  }

  private mapSell(row: any): SellSubmission {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      sellerName: row.seller_name,
      phone: row.phone,
      email: row.email || undefined,
      make: row.make,
      model: row.model,
      year: Number(row.year),
      trim: row.trim || undefined,
      mileage: Number(row.mileage),
      condition: row.condition,
      issues: row.issues || undefined,
      location: row.location,
      askingPriceNgn: Number(row.asking_price_ngn),
      estimatedValueNgn: Number(row.estimated_value_ngn),
      status: row.status,
      inspectorNotes: row.inspector_notes || undefined,
      photoUrls: (() => { try { const v = JSON.parse(row.photo_urls_json || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } })(),
      reviewStatus: row.review_status || 'pending',
      reviewedBy: row.reviewed_by || undefined,
      reviewedAt: row.reviewed_at || undefined,
      adminNotes: row.admin_notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteConciergeRepository implements IConciergeRepository {
  constructor(private db: DatabaseSync) {}

  async findById(id: string): Promise<ConciergeRequest | null> {
    const row = this.db.prepare('SELECT * FROM concierge_requests WHERE id = ?').get(id) as any;
    return row ? this.mapConcierge(row) : null;
  }

  async list(userId?: string): Promise<ConciergeRequest[]> {
    const query = userId
      ? 'SELECT * FROM concierge_requests WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM concierge_requests ORDER BY created_at DESC';
    const rows = (userId ? this.db.prepare(query).all(userId) : this.db.prepare(query).all()) as any[];
    return rows.map((r) => this.mapConcierge(r));
  }

  async create(request: Omit<ConciergeRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConciergeRequest> {
    const id = `req_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newReq: ConciergeRequest = {
      id,
      ...request,
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO concierge_requests (
          id, user_id, full_name, phone, email, desired_make, desired_model, body_type,
          year_range, budget_range, max_budget_ngn, preferred_condition, fuel_type,
          transmission, color_pref, interior_pref, notes, status, assigned_agent_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newReq.id,
        newReq.userId || null,
        newReq.fullName,
        newReq.phone,
        newReq.email || null,
        newReq.desiredMake,
        newReq.desiredModel,
        newReq.bodyType || null,
        newReq.yearRange,
        newReq.budgetRange || null,
        newReq.maxBudgetNgn,
        newReq.preferredCondition,
        newReq.fuelType || null,
        newReq.transmission || null,
        newReq.colorPref || null,
        newReq.interiorPref || null,
        newReq.notes || null,
        newReq.status,
        newReq.assignedAgentName || null,
        newReq.createdAt,
        newReq.updatedAt
      );
    return newReq;
  }

  async updateStatus(id: string, status: ConciergeRequest['status'], assignedAgentName?: string): Promise<ConciergeRequest | null> {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE concierge_requests SET status = ?, assigned_agent_name = COALESCE(?, assigned_agent_name), updated_at = ? WHERE id = ?')
      .run(status, assignedAgentName || null, now, id);
    return this.findById(id);
  }

  private mapConcierge(row: any): ConciergeRequest {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email || undefined,
      desiredMake: row.desired_make,
      desiredModel: row.desired_model,
      bodyType: row.body_type || undefined,
      yearRange: row.year_range,
      budgetRange: row.budget_range || undefined,
      maxBudgetNgn: Number(row.max_budget_ngn),
      preferredCondition: row.preferred_condition,
      fuelType: row.fuel_type || undefined,
      transmission: row.transmission || undefined,
      colorPref: row.color_pref || undefined,
      interiorPref: row.interior_pref || undefined,
      notes: row.notes || undefined,
      status: row.status,
      assignedAgentName: row.assigned_agent_name || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteSavedPreferencesRepository implements ISavedPreferencesRepository {
  constructor(private db: DatabaseSync) {}

  async getSavedVehicles(userId: string): Promise<string[]> {
    const rows = this.db.prepare('SELECT vehicle_id FROM saved_vehicles WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map((r) => r.vehicle_id);
  }

  async saveVehicle(userId: string, vehicleId: string, notes?: string): Promise<boolean> {
    const id = `sv_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    try {
      this.db
        .prepare('INSERT OR IGNORE INTO saved_vehicles (id, user_id, vehicle_id, notes, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, userId, vehicleId, notes || null, now);
      return true;
    } catch {
      return false;
    }
  }

  async unsaveVehicle(userId: string, vehicleId: string): Promise<boolean> {
    const res = this.db.prepare('DELETE FROM saved_vehicles WHERE user_id = ? AND vehicle_id = ?').run(userId, vehicleId);
    return (res as any).changes > 0;
  }

  async getComparisonList(userId: string): Promise<string[]> {
    const row = this.db.prepare('SELECT vehicle_ids_json FROM comparison_lists WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(userId) as any;
    if (!row) return [];
    try {
      return JSON.parse(row.vehicle_ids_json);
    } catch {
      return [];
    }
  }

  async saveComparisonList(userId: string, name: string, vehicleIds: string[]): Promise<ComparisonList> {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT id FROM comparison_lists WHERE user_id = ?').get(userId) as any;
    if (existing) {
      this.db
        .prepare('UPDATE comparison_lists SET name = ?, vehicle_ids_json = ?, updated_at = ? WHERE id = ?')
        .run(name, JSON.stringify(vehicleIds), now, existing.id);
      return {
        id: existing.id,
        userId,
        name,
        vehicleIds,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      const id = `cmp_${crypto.randomUUID()}`;
      this.db
        .prepare('INSERT INTO comparison_lists (id, user_id, name, vehicle_ids_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, userId, name, JSON.stringify(vehicleIds), now, now);
      return {
        id,
        userId,
        name,
        vehicleIds,
        createdAt: now,
        updatedAt: now,
      };
    }
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const rows = this.db.prepare('SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      criteria: JSON.parse(r.criteria_json || '{}'),
      notifyEmail: Boolean(r.notify_email),
      notifySms: Boolean(r.notify_sms),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createSavedSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch> {
    const id = `srch_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const newSrch: SavedSearch = {
      id,
      ...search,
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        'INSERT INTO saved_searches (id, user_id, name, criteria_json, notify_email, notify_sms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        newSrch.id,
        newSrch.userId,
        newSrch.name,
        JSON.stringify(newSrch.criteria),
        newSrch.notifyEmail ? 1 : 0,
        newSrch.notifySms ? 1 : 0,
        newSrch.createdAt,
        newSrch.updatedAt
      );
    return newSrch;
  }

  async deleteSavedSearch(id: string, userId: string): Promise<boolean> {
    const res = this.db.prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?').run(id, userId);
    return (res as any).changes > 0;
  }
}

export class SqliteAuditRepository implements IAuditRepository {
  constructor(private db: DatabaseSync) {}

  async record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const id = `aud_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const log: AuditLog = {
      id,
      ...entry,
      createdAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO audit_logs (id, actor_user_id, actor_role, action, resource_type, resource_id, ip_address, user_agent, changes_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        log.id,
        log.actorUserId || null,
        log.actorRole,
        log.action,
        log.resourceType,
        log.resourceId,
        log.ipAddress || null,
        log.userAgent || null,
        log.changesJson || null,
        log.createdAt
      );
    return log;
  }

  async list(resourceType?: string, resourceId?: string, limit = 100): Promise<AuditLog[]> {
    let query = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    if (resourceType && resourceId) {
      query += ' WHERE resource_type = ? AND resource_id = ?';
      params.push(resourceType, resourceId);
    } else if (resourceType) {
      query += ' WHERE resource_type = ?';
      params.push(resourceType);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      actorUserId: r.actor_user_id || undefined,
      actorRole: r.actor_role,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      ipAddress: r.ip_address || undefined,
      userAgent: r.user_agent || undefined,
      changesJson: r.changes_json || undefined,
      createdAt: r.created_at,
    }));
  }
}

export class SqliteCacheRepository implements ICacheRepository {
  constructor(private db: DatabaseSync) {}

  async get(cacheKey: string): Promise<any | null> {
    const row = this.db.prepare('SELECT response_data_json, expires_at FROM external_api_cache WHERE cache_key = ?').get(cacheKey) as any;
    if (!row) return null;
    const now = new Date().toISOString();
    if (row.expires_at < now) {
      this.delete(cacheKey);
      return null;
    }
    try {
      return JSON.parse(row.response_data_json);
    } catch {
      return null;
    }
  }

  async set(cacheKey: string, provider: ExternalApiCacheRecord['provider'], data: any, ttlSeconds: number, requestUrl?: string): Promise<void> {
    const now = new Date();
    const expires = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const nowStr = now.toISOString();
    const json = JSON.stringify(data);
    this.db
      .prepare(
        `INSERT INTO external_api_cache (cache_key, provider, request_url, response_data_json, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           response_data_json = excluded.response_data_json,
           expires_at = excluded.expires_at,
           updated_at = excluded.updated_at`
      )
      .run(cacheKey, provider, requestUrl || null, json, expires, nowStr, nowStr);
  }

  async delete(cacheKey: string): Promise<void> {
    this.db.prepare('DELETE FROM external_api_cache WHERE cache_key = ?').run(cacheKey);
  }

  async pruneExpired(): Promise<number> {
    const now = new Date().toISOString();
    const res = this.db.prepare('DELETE FROM external_api_cache WHERE expires_at < ?').run(now);
    return (res as any).changes || 0;
  }
}

export class SqliteAiUsageRepository implements IAiUsageRepository {
  constructor(private db: DatabaseSync) {}

  async record(entry: Omit<AiUsageRecord, 'id' | 'createdAt'>): Promise<AiUsageRecord> {
    const id = `ai_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const log: AiUsageRecord = {
      id,
      ...entry,
      createdAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO ai_usage_records (id, user_id, prompt_type, model_name, input_tokens, output_tokens, latency_ms, status, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        log.id,
        log.userId || null,
        log.promptType,
        log.modelName,
        log.inputTokens || null,
        log.outputTokens || null,
        log.latencyMs || null,
        log.status,
        log.metadataJson || null,
        log.createdAt
      );
    return log;
  }
}

export class SqliteNotificationRepository implements INotificationRepository {
  constructor(private db: DatabaseSync) {}

  async create(notification: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<NotificationRecord> {
    const id = `notif_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const record: NotificationRecord = {
      id,
      ...notification,
      createdAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO notifications (id, user_id, recipient_phone, recipient_email, channel, title, message, status, related_entity_type, related_entity_id, created_at, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.userId || null,
        record.recipientPhone || null,
        record.recipientEmail || null,
        record.channel,
        record.title,
        record.message,
        record.status,
        record.relatedEntityType || null,
        record.relatedEntityId || null,
        record.createdAt,
        record.sentAt || null
      );
    return record;
  }

  async listByUserId(userId: string): Promise<NotificationRecord[]> {
    const rows = this.db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map((r) => ({
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
      createdAt: r.created_at,
      sentAt: r.sent_at || undefined,
    }));
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    return this.db.prepare("UPDATE notifications SET status = 'read' WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
  }
}

export class SqliteStatusHistoryRepository implements IStatusHistoryRepository {
  constructor(private db: DatabaseSync) {}

  async record(entry: Omit<OrderStatusHistory, 'id' | 'createdAt'>): Promise<OrderStatusHistory> {
    const id = `hist_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const record: OrderStatusHistory = { id, ...entry, createdAt: now };
    this.db
      .prepare(
        `INSERT INTO order_status_history (id, resource_type, resource_id, from_status, to_status, note, changed_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.resourceType,
        record.resourceId,
        record.fromStatus || null,
        record.toStatus,
        record.note || null,
        record.changedBy || null,
        record.createdAt
      );
    return record;
  }

  async listFor(resourceType: string, resourceId: string): Promise<OrderStatusHistory[]> {
    const rows = this.db.prepare('SELECT * FROM order_status_history WHERE resource_type = ? AND resource_id = ? ORDER BY created_at ASC').all(resourceType, resourceId) as any[];
    return rows.map((r) => ({
      id: r.id,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      fromStatus: r.from_status || undefined,
      toStatus: r.to_status,
      note: r.note || undefined,
      changedBy: r.changed_by || undefined,
      createdAt: r.created_at,
    }));
  }

  async listRecent(limit = 100): Promise<OrderStatusHistory[]> {
    const rows = this.db.prepare('SELECT * FROM order_status_history ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      fromStatus: r.from_status || undefined,
      toStatus: r.to_status,
      note: r.note || undefined,
      changedBy: r.changed_by || undefined,
      createdAt: r.created_at,
    }));
  }
}

export class SqliteSettingsRepository implements ISettingsRepository {
  constructor(private db: DatabaseSync) {}

  private map(r: any): SiteSetting {
    return {
      id: r.id,
      settingKey: r.setting_key,
      settingValue: r.setting_value,
      valueType: r.value_type,
      label: r.label || undefined,
      description: r.description || undefined,
      effectiveDate: r.effective_date,
      jurisdiction: r.jurisdiction || undefined,
      sourceRef: r.source_ref || undefined,
      isActive: Boolean(r.is_active),
      updatedBy: r.updated_by || undefined,
      updatedAt: r.updated_at,
      createdAt: r.created_at,
    };
  }

  async getAll(includeInactive = false): Promise<SiteSetting[]> {
    const rows = includeInactive
      ? (this.db.prepare('SELECT * FROM site_settings ORDER BY setting_key').all() as any[])
      : (this.db.prepare('SELECT * FROM site_settings WHERE is_active = 1 ORDER BY setting_key').all() as any[]);
    return rows.map((r) => this.map(r));
  }

  async getKey(settingKey: string): Promise<SiteSetting | null> {
    const row = this.db.prepare('SELECT * FROM site_settings WHERE setting_key = ? AND is_active = 1 LIMIT 1').get(settingKey) as any;
    return row ? this.map(row) : null;
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
    const existing = this.db.prepare('SELECT * FROM site_settings WHERE setting_key = ? AND is_active = 1 LIMIT 1').get(entry.settingKey) as any;
    const now = new Date().toISOString();
    if (existing) {
      this.db.prepare(
        `UPDATE site_settings SET setting_value = ?, value_type = ?, label = COALESCE(?, label),
         description = COALESCE(?, description), jurisdiction = COALESCE(?, jurisdiction),
         source_ref = COALESCE(?, source_ref), updated_by = ?, updated_at = ? WHERE id = ?`
      ).run(
        entry.settingValue,
        entry.valueType,
        entry.label || null,
        entry.description || null,
        entry.jurisdiction || null,
        entry.sourceRef || null,
        entry.updatedBy || null,
        now,
        existing.id
      );
      return this.map(this.db.prepare('SELECT * FROM site_settings WHERE id = ?').get(existing.id));
    }
    const id = `set_${crypto.randomUUID()}`;
    this.db.prepare(
      `INSERT INTO site_settings (id, setting_key, setting_value, value_type, label, description, effective_date, jurisdiction, source_ref, updated_by, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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
      now
    );
    return this.map(this.db.prepare('SELECT * FROM site_settings WHERE id = ?').get(id));
  }
}

export class SqliteActivityRepository implements IActivityRepository {
  constructor(private db: DatabaseSync) {}

  async record(entry: Omit<ActivityEvent, 'id' | 'createdAt'>): Promise<ActivityEvent> {
    const id = `evt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const record: ActivityEvent = { id, ...entry, createdAt: now };
    this.db
      .prepare(
        `INSERT INTO activity_events (id, event_type, user_id, session_id, entity_type, entity_id, path, referrer, search_query, filters_json, ip_hash, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.eventType,
        record.userId || null,
        record.sessionId || null,
        record.entityType || null,
        record.entityId || null,
        record.path || null,
        record.referrer || null,
        record.searchQuery || null,
        record.filtersJson || null,
        record.ipHash || null,
        record.userAgent || null,
        record.createdAt
      );
    return record;
  }

  async listRecent(limit = 200): Promise<ActivityEvent[]> {
    const rows = this.db.prepare('SELECT * FROM activity_events ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
    return rows.map((r) => ({
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
      createdAt: r.created_at,
    }));
  }

  async summarize(days = 30): Promise<any> {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const totals = this.db.prepare(
      'SELECT event_type, COUNT(*) AS count FROM activity_events WHERE created_at >= ? GROUP BY event_type ORDER BY count DESC'
    ).all(since) as any[];
    const pageViews = this.db.prepare(
      "SELECT path, COUNT(*) AS views FROM activity_events WHERE created_at >= ? AND event_type = 'page_view' GROUP BY path ORDER BY views DESC LIMIT 20"
    ).all(since) as any[];
    const vehicleViews = this.db.prepare(
      "SELECT entity_id, COUNT(*) AS views FROM activity_events WHERE created_at >= ? AND event_type = 'vehicle_view' GROUP BY entity_id ORDER BY views DESC LIMIT 20"
    ).all(since) as any[];
    const byDay = this.db.prepare(
      'SELECT SUBSTR(created_at, 1, 10) AS day, COUNT(*) AS events FROM activity_events WHERE created_at >= ? GROUP BY day ORDER BY day'
    ).all(since) as any[];
    return {
      since,
      eventTotals: totals,
      totalEvents: totals.reduce((sum: number, row: any) => sum + row.count, 0),
      topPages: pageViews,
      topVehicles: vehicleViews,
      daily: byDay,
    };
  }
}

export class SqliteDatabaseService implements IDatabaseService {
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

  constructor(private db: DatabaseSync) {
    this.users = new SqliteUserRepository(db);
    this.vehicles = new SqliteVehicleRepository(db);
    this.offers = new SqliteOfferRepository(db);
    this.inspections = new SqliteInspectionRepository(db);
    this.rentals = new SqliteRentalRepository(db);
    this.imports = new SqliteImportRepository(db);
    this.sell = new SqliteSellRepository(db);
    this.concierge = new SqliteConciergeRepository(db);
    this.saved = new SqliteSavedPreferencesRepository(db);
    this.audit = new SqliteAuditRepository(db);
    this.cache = new SqliteCacheRepository(db);
    this.aiUsage = new SqliteAiUsageRepository(db);
    this.notifications = new SqliteNotificationRepository(db);
    this.statusHistory = new SqliteStatusHistoryRepository(db);
    this.settings = new SqliteSettingsRepository(db);
    this.activity = new SqliteActivityRepository(db);
  }

  async initialize(): Promise<void> {
    // Database and schema are set up synchronously during connection
  }

  async transaction<T>(work: (tx: any) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = await work(this);
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}
