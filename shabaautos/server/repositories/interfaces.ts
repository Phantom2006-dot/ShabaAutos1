import {
  User,
  Vehicle,
  VehicleImage,
  DealershipSeller,
  SavedVehicle,
  SavedSearch,
  ComparisonList,
  Offer,
  Inspection,
  RentalVehicle,
  RentalAvailabilityBlock,
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
} from '../models/types';

export interface VehicleFilterParams {
  make?: string;
  model?: string;
  condition?: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  minMileage?: number;
  maxMileage?: number;
  city?: string;
  verified?: boolean;
  status?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface VehicleFacets {
  makes: string[];
  models: string[];
  bodyTypes: string[];
  conditions: string[];
  transmissions: string[];
  fuelTypes: string[];
  priceBounds: { min: number; max: number };
  yearBounds: { min: number; max: number };
  mileageBounds: { min: number; max: number };
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  upsertClerkUser(data: {
    clerkId: string;
    email: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
    role?: 'customer' | 'staff' | 'admin';
  }): Promise<User>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User | null>;
  deleteByClerkId?(clerkId: string): Promise<boolean>;
  list(limit?: number, offset?: number): Promise<User[]>;
}

export interface IVehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
  findByStockId(stockId: string): Promise<Vehicle | null>;
  list(filters?: VehicleFilterParams): Promise<{ vehicles: Vehicle[]; total: number }>;
  create(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>, images?: string[]): Promise<Vehicle>;
  update(id: string, updates: Partial<Vehicle>): Promise<Vehicle | null>;
  delete(id: string): Promise<boolean>;
  getImages(vehicleId: string): Promise<VehicleImage[]>;
  setImages(vehicleId: string, imageUrls: string[]): Promise<void>;
  getSeller(sellerId: string): Promise<DealershipSeller | null>;
  createSeller(seller: Omit<DealershipSeller, 'createdAt' | 'updatedAt'>): Promise<DealershipSeller>;
  getFacets(): Promise<VehicleFacets>;
}

export interface IOfferRepository {
  findById(id: string): Promise<Offer | null>;
  listByVehicleId(carId: string): Promise<Offer[]>;
  listByUserId(userId: string): Promise<Offer[]>;
  listAll(limit?: number, offset?: number): Promise<Offer[]>;
  create(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Offer>;
  updateStatus(id: string, status: Offer['status'], counterAmountNgn?: number, staffNotes?: string): Promise<Offer | null>;
}

export interface IInspectionRepository {
  findById(id: string): Promise<Inspection | null>;
  listByVehicleId(carId: string): Promise<Inspection[]>;
  listByUserId(userId: string): Promise<Inspection[]>;
  listAll(limit?: number, offset?: number): Promise<Inspection[]>;
  create(inspection: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Inspection>;
  updateStatus(id: string, status: Inspection['status'], notes?: string): Promise<Inspection | null>;
}

export interface IRentalRepository {
  findVehicleById(id: string): Promise<RentalVehicle | null>;
  listVehicles(category?: string, availableOnly?: boolean): Promise<RentalVehicle[]>;
  createVehicle(vehicle: Omit<RentalVehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalVehicle>;
  findBookingById(id: string): Promise<RentalBooking | null>;
  listBookingsByUserId(userId: string): Promise<RentalBooking[]>;
  listAllBookings(limit?: number, offset?: number): Promise<RentalBooking[]>;
  checkAvailability(rentalVehicleId: string, startDate: string, endDate: string): Promise<boolean>;
  createBookingWithBlock(
    booking: Omit<RentalBooking, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RentalBooking>;
  cancelBooking(id: string, reason?: string): Promise<boolean>;
}

export interface IImportRepository {
  findRequestById(id: string): Promise<ImportRequest | null>;
  findByTrackingId(trackingId: string): Promise<ImportRequest | null>;
  findByVin(vin: string): Promise<ImportRequest | null>;
  listRequests(userId?: string): Promise<ImportRequest[]>;
  createRequest(request: Omit<ImportRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImportRequest>;
  updateStatus(id: string, status: ImportRequest['status']): Promise<ImportRequest | null>;
  saveCostEstimate(estimate: Omit<ImportCostEstimate, 'id' | 'createdAt'>): Promise<ImportCostEstimate>;
  getCostEstimate(importRequestId: string): Promise<ImportCostEstimate | null>;
  getMilestones(trackingId: string): Promise<ShipmentMilestone[]>;
  addMilestone(milestone: Omit<ShipmentMilestone, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShipmentMilestone>;
  updateMilestone(id: string, updates: Partial<ShipmentMilestone>): Promise<ShipmentMilestone | null>;
  getTrackingEvents(trackingId: string): Promise<TrackingEvent[]>;
  addTrackingEvent(event: Omit<TrackingEvent, 'id' | 'createdAt'>): Promise<TrackingEvent>;
}

export interface ISellRepository {
  findById(id: string): Promise<SellSubmission | null>;
  list(userId?: string): Promise<SellSubmission[]>;
  create(submission: Omit<SellSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<SellSubmission>;
  updateStatus(id: string, status: SellSubmission['status'], inspectorNotes?: string): Promise<SellSubmission | null>;
  recordValuationHistory(valuation: Omit<ValuationHistory, 'id' | 'createdAt'>): Promise<ValuationHistory>;
  getValuationHistory(sellSubmissionId: string): Promise<ValuationHistory[]>;
}

export interface IConciergeRepository {
  findById(id: string): Promise<ConciergeRequest | null>;
  list(userId?: string): Promise<ConciergeRequest[]>;
  create(request: Omit<ConciergeRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConciergeRequest>;
  updateStatus(id: string, status: ConciergeRequest['status'], assignedAgentName?: string): Promise<ConciergeRequest | null>;
}

export interface ISavedPreferencesRepository {
  getSavedVehicles(userId: string): Promise<string[]>;
  saveVehicle(userId: string, vehicleId: string, notes?: string): Promise<boolean>;
  unsaveVehicle(userId: string, vehicleId: string): Promise<boolean>;
  getComparisonList(userId: string): Promise<string[]>;
  saveComparisonList(userId: string, name: string, vehicleIds: string[]): Promise<ComparisonList>;
  getSavedSearches(userId: string): Promise<SavedSearch[]>;
  createSavedSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch>;
  deleteSavedSearch(id: string, userId: string): Promise<boolean>;
}

export interface IAuditRepository {
  record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  list(resourceType?: string, resourceId?: string, limit?: number): Promise<AuditLog[]>;
}

export interface ICacheRepository {
  get(cacheKey: string): Promise<any | null>;
  set(cacheKey: string, provider: ExternalApiCacheRecord['provider'], data: any, ttlSeconds: number, requestUrl?: string): Promise<void>;
  delete(cacheKey: string): Promise<void>;
  pruneExpired(): Promise<number>;
}

export interface IAiUsageRepository {
  record(entry: Omit<AiUsageRecord, 'id' | 'createdAt'>): Promise<AiUsageRecord>;
}

export interface INotificationRepository {
  create(notification: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<NotificationRecord>;
  listByUserId(userId: string): Promise<NotificationRecord[]>;
}

export interface IDatabaseService {
  initialize(): Promise<void>;
  users: IUserRepository;
  vehicles: IVehicleRepository;
  offers: IOfferRepository;
  inspections: IInspectionRepository;
  rentals: IRentalRepository;
  imports: IImportRepository;
  sell: ISellRepository;
  concierge: IConciergeRepository;
  saved: ISavedPreferencesRepository;
  audit: IAuditRepository;
  cache: ICacheRepository;
  aiUsage: IAiUsageRepository;
  notifications: INotificationRepository;
  transaction<T>(work: (tx: any) => Promise<T>): Promise<T>;
}
