// Normalized Persistent Domain Models for ShabaAutos

export type UserRole = 'customer' | 'staff' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending';

export interface User {
  id: string;
  clerkId?: string;
  email: string;
  passwordHash?: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealershipSeller {
  id: string;
  userId?: string;
  name: string;
  dealershipName?: string;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  location: string;
  phone: string;
  email?: string;
  joinedYear: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  priceNgn: number;
  priceUsd?: number;
  mileage: number;
  mileageUnit: 'km' | 'miles';
  transmission: 'Automatic' | 'Manual';
  fuelType: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
  location: string;
  city?: string;
  state?: string;
  verified: boolean;
  cleanTitle: boolean;
  condition: 'Nigeria Used' | 'Brand New' | 'Foreign Used (Tokunbo)';
  bodyType: 'SUV' | 'Sedan' | 'Hatchback' | 'Pickup' | 'Coupe';
  engine: string;
  driveType: 'FWD' | 'AWD' | '4WD' | 'RWD';
  color: string;
  seats: number;
  stockId: string;
  description: string;
  features: string[];
  inspectionPassed: boolean;
  sellerId?: string;
  status: 'available' | 'reserved' | 'sold' | 'delisted';
  createdAt: string;
  updatedAt: string;
}

export interface VehicleImage {
  id: string;
  vehicleId: string;
  url: string;
  displayOrder: number;
  caption?: string;
  createdAt: string;
}

export interface SavedVehicle {
  id: string;
  userId: string;
  vehicleId: string;
  notes?: string;
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  criteria: Record<string, any>;
  notifyEmail: boolean;
  notifySms: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonList {
  id: string;
  userId: string;
  name: string;
  vehicleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;
  carId: string;
  carName: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  offerAmountNgn: number;
  vehicleListingPriceNgn: number;
  paymentMethod: string;
  notes?: string;
  status: 'Pending Review' | 'Accepted' | 'Countered' | 'Declined';
  counterAmountNgn?: number;
  staffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inspection {
  id: string;
  carId: string;
  carName: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  date: string;
  timeSlot: string;
  hubLocation: string;
  inspectionType: 'Physical Inspection' | 'Live Video Tour' | 'Mechanic Verification';
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  inspectorNotes?: string;
  reportUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalVehicle {
  id: string;
  name: string;
  category: string;
  pricePerDayNgn: number;
  transmission: 'Automatic' | 'Manual';
  fuel: string;
  seats: number;
  imageUrl: string;
  available: boolean;
  rating: number;
  plateNumber?: string;
  location: string;
  status: 'active' | 'maintenance' | 'retired';
  createdAt: string;
  updatedAt: string;
}

export interface RentalAvailabilityBlock {
  id: string;
  rentalVehicleId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: 'maintenance' | 'booked' | 'held';
  rentalBookingId?: string;
  createdAt: string;
}

export interface RentalBooking {
  id: string;
  carId: string;
  carName: string;
  userId?: string;
  customerName: string;
  phone: string;
  email?: string;
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  days: number;
  dailyRateNgn: number;
  withChauffeur: boolean;
  withInsurance: boolean;
  chauffeurFeeNgn: number;
  insuranceFeeNgn: number;
  totalNgn: number;
  status: 'Active Reservation' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ImportRequest {
  id: string;
  trackingId: string;
  userId?: string;
  customerName: string;
  phone: string;
  email?: string;
  make: string;
  model: string;
  year?: number;
  yearMin?: string;
  yearMax?: string;
  budgetRange?: string;
  estimatedBudgetUsd?: number;
  vin?: string;
  vehicleType?: string;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  mileagePref?: string;
  features: string[];
  deliveryCity: string;
  destinationPort: string;
  originPort: string;
  additionalNotes?: string;
  status: 'Sourcing Started' | 'Inspection Passed' | 'Shipped from USA' | 'Port Arrival' | 'Customs Clearance' | 'Delivered' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ImportCostEstimate {
  id: string;
  importRequestId?: string;
  auctionPriceUsd: number;
  vehicleYear: number;
  usdToNgnRate: number;
  oceanFreightUsd: number;
  inlandTowingUsd: number;
  cifValueUsd: number;
  cifValueNgn: number;
  dutyRate: number;
  levyRate: number;
  importDutyNgn: number;
  nacLevyNgn: number;
  vatNgn: number;
  terminalChargesNgn: number;
  clearingAgencyFeeNgn: number;
  totalCustomsClearanceNgn: number;
  vehicleLandedCostNgn: number;
  savingsVsLocalMarketNgn: number;
  createdAt: string;
}

export interface ShipmentMilestone {
  id: string;
  trackingId: string;
  stepOrder: number;
  title: string;
  description?: string;
  scheduledDate: string;
  completedDate?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  id: string;
  trackingId: string;
  eventTimestamp: string;
  status: string;
  location: string;
  vesselName?: string;
  containerNo?: string;
  details?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface SellSubmission {
  id: string;
  userId?: string;
  sellerName: string;
  phone: string;
  email?: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  mileage: number;
  condition: string;
  issues?: string;
  location: string;
  askingPriceNgn: number;
  estimatedValueNgn: number;
  status: 'Under Review' | 'Inspection Scheduled' | 'Offer Extended' | 'Purchased' | 'Rejected';
  inspectorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValuationHistory {
  id: string;
  sellSubmissionId?: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  condition: string;
  algorithmVersion: string;
  baseValueNgn: number;
  mileageFactor: number;
  conditionFactor: number;
  finalValuationNgn: number;
  createdAt: string;
}

export interface ConciergeRequest {
  id: string;
  userId?: string;
  fullName: string;
  phone: string;
  email?: string;
  desiredMake: string;
  desiredModel: string;
  bodyType?: string;
  yearRange: string;
  budgetRange?: string;
  maxBudgetNgn: number;
  preferredCondition: string;
  fuelType?: string;
  transmission?: string;
  colorPref?: string;
  interiorPref?: string;
  notes?: string;
  status: 'Request Received' | 'Agent Assigned' | 'Options Presented' | 'Fulfilled' | 'Closed';
  assignedAgentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  channel: 'sms' | 'email' | 'in_app';
  title: string;
  message: string;
  status: 'queued' | 'sent' | 'failed' | 'read';
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
  sentAt?: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  changesJson?: string;
  createdAt: string;
}

export interface ExternalApiCacheRecord {
  cacheKey: string;
  provider: 'nhtsa' | 'wikimedia' | 'cbn_fx' | 'other';
  requestUrl?: string;
  responseDataJson: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiUsageRecord {
  id: string;
  userId?: string;
  promptType: 'concierge_recommendation' | 'valuation_insight' | 'car_description';
  modelName: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  status: 'success' | 'failed';
  metadataJson?: string;
  createdAt: string;
}
