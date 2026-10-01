// ShabaAutos API Client & Free Car Database Services
import { AppUserRole, Car } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input}`;
  return fetch(url, init);
}

let getAuthTokenFn: (() => Promise<string | null> | string | null) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null> | string | null) {
  getAuthTokenFn = fn;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (getAuthTokenFn) {
    try {
      const token = await getAuthTokenFn();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Fallback
    }
  }
  if (!headers.Authorization && typeof window !== 'undefined') {
    try {
      const saved = JSON.parse(window.localStorage.getItem('shaba_demo_user') || 'null');
      if (saved?.role && ['customer', 'staff', 'admin'].includes(saved.role)) {
        headers.Authorization = `Bearer demo_token_${saved.role}`;
      }
    } catch {
      // Ignore malformed local demo state.
    }
  }
  return headers;
}

export interface VehicleSearchParams {
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
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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

export interface VehiclesApiResponse {
  success: boolean;
  data: Car[];
  pagination: PaginationMetadata;
  total: number;
  page: number;
  limit: number;
}

export interface OfferPayload {
  carId: string;
  carName: string;
  name: string;
  phone: string;
  email?: string;
  offerAmountNgn: number;
  paymentMethod?: string;
  notes?: string;
}

export interface InspectionPayload {
  carId: string;
  carName: string;
  name: string;
  phone: string;
  email?: string;
  date: string;
  timeSlot?: string;
  hubLocation?: string;
  inspectionType?: 'Physical Inspection' | 'Live Video Tour' | 'Mechanic Verification';
}

export interface RentalBookingPayload {
  carId: string;
  carName: string;
  customerName?: string;
  renterName?: string;
  phone: string;
  email?: string;
  pickupDate: string;
  returnDate?: string;
  dropoffDate?: string;
  pickupLocation?: string;
  days: number;
  withChauffeur?: boolean;
  withInsurance?: boolean;
  dailyRateNgn: number;
}

export interface RentalVehicleApiRecord {
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
  location: string;
  status: 'active' | 'maintenance' | 'retired';
}

export async function fetchRentalVehicles(category?: string): Promise<{ success: boolean; data: RentalVehicleApiRecord[] }> {
  const query = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
  const res = await apiFetch(`/api/rentals/vehicles${query}`);
  return await res.json();
}

export interface ImportDutyPayload {
  auctionPriceUsd: number;
  year?: number;
  originPort?: string;
  isElectric?: boolean;
}

export interface ImportRequestPayload {
  make: string;
  model: string;
  vehicleType?: string;
  budgetRange?: string;
  year?: number;
  yearMin?: number;
  yearMax?: number;
  estimatedBudgetUsd?: number;
  vin?: string;
  customerName?: string;
  fullName?: string;
  phone: string;
  email?: string;
  deliveryCity?: string;
  destinationPort?: string;
  transmission?: string;
  fuelType?: string;
  driveType?: string;
  mileagePref?: string;
  features?: string[];
  additionalNotes?: string;
}

export interface SellCarPayload {
  make: string;
  model: string;
  year: number;
  mileage: number;
  condition: string;
  askingPriceNgn?: number;
  sellerName: string;
  phone: string;
  email?: string;
  location?: string;
  trim?: string;
  transmission?: string;
  fuelType?: string;
}

export interface ConciergePayload {
  fullName: string;
  phone: string;
  email?: string;
  desiredMake?: string;
  desiredModel?: string;
  make?: string;
  model?: string;
  bodyType?: string;
  budgetRange?: string;
  yearRange?: string;
  maxBudgetNgn?: number;
  preferredCondition?: string;
  notes?: string;
}

export interface ExternalCarLookupResult {
  searchTerm: string;
  title: string;
  imageUrl: string;
  description: string;
  specs: {
    engine: string;
    transmission: string;
    fuelType: string;
    drivetrain: string;
    estimatedNigeriaPriceNgn: string;
    rating: number;
  };
  verifiedSource: string;
}

export interface DecodedVinResult {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  bodyClass: string;
  doors: string;
  driveType: string;
  engineCylinders: string;
  displacementL: string;
  fuelTypePrimary: string;
  plantCountry: string;
  manufacturer: string;
  cleanTitle: boolean;
  stolenReported: boolean;
  recallStatus: string;
}

// 1. Submit price offer
export async function submitPriceOffer(payload: OfferPayload) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/offers', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, code: 'NETWORK_ERROR', message: 'The offer could not be submitted. Please try again.' };
  }
}

// 2. Book physical or video inspection
export async function bookVehicleInspection(payload: InspectionPayload) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/inspections', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, code: 'NETWORK_ERROR', message: 'The inspection could not be booked. Please try again.' };
  }
}

// 3. Book rental vehicle
export async function bookVehicleRental(payload: RentalBookingPayload) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/rentals/book', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, code: 'NETWORK_ERROR', message: 'The rental reservation could not be completed. Please try again.' };
  }
}

// 4. Calculate Nigeria Customs import duty & clearing costs
export async function calculateCustomsImport(payload: ImportDutyPayload) {
  try {
    const res = await apiFetch('/api/imports/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, code: 'NETWORK_ERROR', message: 'The customs estimate is unavailable. Please try again.' };
  }
}

// 5. Submit import request
export async function submitImportOrder(payload: ImportRequestPayload) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/imports/request', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, code: 'NETWORK_ERROR', message: 'The import request could not be submitted. Please try again.' };
  }
}

// 6. Track vehicle shipment by code or VIN
export async function trackOrderShipment(trackingId: string) {
  try {
    const res = await apiFetch(`/api/tracking/${encodeURIComponent(trackingId.trim())}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, code: 'NETWORK_ERROR', message: 'Tracking is unavailable. Please try again.' };
  }
}

// 7. Sell car submission
export async function submitSellCarValuation(payload: SellCarPayload) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/sell', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, code: 'NETWORK_ERROR', message: 'The valuation could not be submitted. Please try again.' };
  }
}

// 8. Submit Concierge Request
export async function submitConcierge(payload: ConciergePayload) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/concierge', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, code: 'NETWORK_ERROR', message: 'The concierge request could not be submitted. Please try again.' };
  }
}

// -------------------------------------------------------------
// USER SPECIFIC ENDPOINTS (/api/me/*)
// -------------------------------------------------------------

export async function fetchMySavedVehicles(): Promise<{ success: boolean; savedCarIds: string[]; vehicles: Car[] }> {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/saved-vehicles', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, savedCarIds: [], vehicles: [] };
  }
}

export async function saveVehicleToAccount(vehicleId: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch(`/api/me/saved-vehicles/${encodeURIComponent(vehicleId)}`, {
      method: 'POST',
      headers,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function removeSavedVehicleFromAccount(vehicleId: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch(`/api/me/saved-vehicles/${encodeURIComponent(vehicleId)}`, {
      method: 'DELETE',
      headers,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchMyComparison(): Promise<{ success: boolean; vehicleIds: string[]; vehicles: Car[] }> {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/comparison', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, vehicleIds: [], vehicles: [] };
  }
}

export async function updateMyComparison(vehicleIds: string[]): Promise<{ success: boolean; vehicleIds: string[]; vehicles: Car[] }> {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/comparison', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ vehicleIds }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, vehicleIds, vehicles: [] };
  }
}

export async function fetchSavedSearches(): Promise<{ success: boolean; data: any[] }> {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/saved-searches', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, data: [] };
  }
}

export async function createSavedSearch(name: string, criteria: any, notifyEmail = false, notifySms = false) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/saved-searches', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, criteria, notifyEmail, notifySms }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteSavedSearch(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch(`/api/me/saved-searches/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchMyOffers() {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/offers', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchMyInspections() {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/inspections', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchMyRentals() {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/rentals', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchMyImports() {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/imports', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateMyProfile(payload: { fullName?: string; phone?: string }): Promise<{ success: boolean; user?: any; message?: string; fieldErrors?: Record<string, string> }> {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/me/profile', { method: 'PATCH', headers, body: JSON.stringify(payload) });
    return await res.json();
  } catch {
    return { success: false, message: 'Profile could not be updated. Please try again.' };
  }
}

export async function syncUserProfile(data: { clerkId?: string; email: string; fullName: string; phone?: string; role?: string }) {
  try {
    const headers = await getAuthHeaders();
    const res = await apiFetch('/api/auth/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// ==========================================================
// FREE CAR APIS (NHTSA vPIC + WIKIMEDIA COMMONS CAR IMAGERY)
// ==========================================================

// 9. Fetch genuine models for any make using NHTSA free API
export async function fetchManufacturerModels(make: string): Promise<string[]> {
  try {
    const res = await apiFetch(`/api/external/models?make=${encodeURIComponent(make)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && Array.isArray(json.models) && json.models.length > 0) {
        return json.models;
      }
    }
  } catch (err) {
    console.error('Failed to fetch models from NHTSA:', err);
  }

  return [];
}

// 10. Free VIN Decoder using NHTSA vPIC
export async function decodeVehicleVin(vin: string): Promise<DecodedVinResult | null> {
  try {
    const res = await apiFetch(`/api/external/vin/${encodeURIComponent(vin)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
    return null;
  } catch (err) {
    console.error('VIN decode request failed:', err);
    return null;
  }
}

// 11. Free Car Lookup & Image Fetcher (Wikipedia / Wikimedia Commons)
export async function lookupCarWithImage(query: string, make?: string, model?: string): Promise<ExternalCarLookupResult | null> {
  try {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (make) params.append('make', make);
    if (model) params.append('model', model);

    const res = await apiFetch(`/api/external/car-lookup?${params.toString()}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
    return null;
  } catch (err) {
    console.error('Car lookup request failed:', err);
    return null;
  }
}

// 12. Fetch Vehicles filter query with persistent API, server-side filtering & pagination metadata
export async function fetchVehiclesWithPagination(params?: VehicleSearchParams): Promise<VehiclesApiResponse> {
  const searchParams = new URLSearchParams();
  if (params?.make && params.make !== 'All Makes' && params.make !== 'All') searchParams.append('make', params.make);
  if (params?.model && params.model !== 'All Models' && params.model !== 'All') searchParams.append('model', params.model);
  if (params?.condition && params.condition !== 'All Conditions' && params.condition !== 'All') searchParams.append('condition', params.condition);
  if (params?.bodyType && params.bodyType !== 'All Body Types' && params.bodyType !== 'All') searchParams.append('bodyType', params.bodyType);
  if (params?.transmission && params.transmission !== 'All Transmissions' && params.transmission !== 'All') searchParams.append('transmission', params.transmission);
  if (params?.fuelType && params.fuelType !== 'All Fuels' && params.fuelType !== 'All') searchParams.append('fuelType', params.fuelType);
  if (params?.minPrice !== undefined) searchParams.append('minPrice', params.minPrice.toString());
  if (params?.maxPrice !== undefined) searchParams.append('maxPrice', params.maxPrice.toString());
  if (params?.minYear !== undefined) searchParams.append('minYear', params.minYear.toString());
  if (params?.maxYear !== undefined) searchParams.append('maxYear', params.maxYear.toString());
  if (params?.minMileage !== undefined) searchParams.append('minMileage', params.minMileage.toString());
  if (params?.maxMileage !== undefined) searchParams.append('maxMileage', params.maxMileage.toString());
  if (params?.city && params.city !== 'All Locations' && params.city !== 'All Cities' && params.city !== 'Select Location') searchParams.append('city', params.city);
  if (params?.verified !== undefined) searchParams.append('verified', String(params.verified));
  if (params?.search) searchParams.append('search', params.search);
  if (params?.sort) searchParams.append('sort', params.sort);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const queryStr = searchParams.toString();
  const endpoint = queryStr ? `/api/vehicles?${queryStr}` : '/api/vehicles';

  try {
    const res = await apiFetch(endpoint);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return {
          success: true,
          data: json.data,
          pagination: json.pagination || {
            page: json.page || 1,
            pageSize: json.limit || 12,
            total: json.total || json.data.length,
            totalPages: Math.max(1, Math.ceil((json.total || json.data.length) / (json.limit || 12))),
            hasNextPage: false,
            hasPrevPage: false,
          },
          total: json.total !== undefined ? json.total : json.data.length,
          page: json.page || 1,
          limit: json.limit || 12,
        };
      }
    }
  } catch (err) {
    console.warn('Vehicle API query failed:', err);
  }

  return {
    success: false,
    data: [],
    pagination: { page: params?.page || 1, pageSize: params?.pageSize || params?.limit || 12, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    total: 0,
    page: params?.page || 1,
    limit: params?.pageSize || params?.limit || 12,
  };
}

/* Legacy local filtering implementation intentionally removed: production inventory is database-backed. */
/*
  let filtered = [...BUY_CARS_INVENTORY];
  if (params?.make && params.make !== 'All Makes') {
    filtered = filtered.filter((c) => c.make?.toLowerCase() === params.make?.toLowerCase());
  }
  if (params?.model && params.model !== 'All Models') {
    filtered = filtered.filter((c) => c.model?.toLowerCase().includes(params.model?.toLowerCase() || ''));
  }
  if (params?.condition && params.condition !== 'All Conditions' && params.condition !== 'All') {
    filtered = filtered.filter((c) => c.condition?.toLowerCase() === params.condition?.toLowerCase());
  }
  if (params?.bodyType && params.bodyType !== 'All Body Types' && params.bodyType !== 'All') {
    filtered = filtered.filter((c) => c.bodyType?.toLowerCase() === params.bodyType?.toLowerCase());
  }
  if (params?.transmission && params.transmission !== 'All' && params.transmission !== 'All Transmissions') {
    filtered = filtered.filter((c) => c.transmission?.toLowerCase() === params.transmission?.toLowerCase());
  }
  if (params?.fuelType && params.fuelType !== 'All' && params.fuelType !== 'All Fuels') {
    filtered = filtered.filter((c) => c.fuelType?.toLowerCase() === params.fuelType?.toLowerCase());
  }
  if (params?.minPrice !== undefined) {
    filtered = filtered.filter((c) => c.priceNgn >= params.minPrice!);
  }
  if (params?.maxPrice !== undefined) {
    filtered = filtered.filter((c) => c.priceNgn <= params.maxPrice!);
  }
  if (params?.minYear !== undefined) {
    filtered = filtered.filter((c) => c.year >= params.minYear!);
  }
  if (params?.maxYear !== undefined) {
    filtered = filtered.filter((c) => c.year <= params.maxYear!);
  }
  if (params?.minMileage !== undefined) {
    filtered = filtered.filter((c) => c.mileage >= params.minMileage!);
  }
  if (params?.maxMileage !== undefined) {
    filtered = filtered.filter((c) => c.mileage <= params.maxMileage!);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.make?.toLowerCase().includes(q) ||
        c.model?.toLowerCase().includes(q) ||
        c.year?.toString().includes(q) ||
        c.location?.toLowerCase().includes(q)
    );
  }

  // In-memory sort fallback
  if (params?.sort === 'price-asc') {
    filtered.sort((a, b) => a.priceNgn - b.priceNgn);
  } else if (params?.sort === 'price-desc') {
    filtered.sort((a, b) => b.priceNgn - a.priceNgn);
  } else if (params?.sort === 'mileage-asc') {
    filtered.sort((a, b) => a.mileage - b.mileage);
  } else if (params?.sort === 'mileage-desc') {
    filtered.sort((a, b) => b.mileage - a.mileage);
  } else if (params?.sort === 'year-desc') {
    filtered.sort((a, b) => b.year - a.year);
  } else if (params?.sort === 'year-asc') {
    filtered.sort((a, b) => a.year - b.year);
  }

  const page = params?.page || 1;
  const pageSize = params?.pageSize || params?.limit || 12;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return {
    success: true,
    data: paged,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    total,
    page,
    limit: pageSize,
  };
*/

// Backward-compatible fetchVehicles returning Car[]
export async function fetchVehicles(params?: VehicleSearchParams): Promise<Car[]> {
  const res = await fetchVehiclesWithPagination(params);
  return res.data;
}

// 13. Fetch single vehicle by ID or stock ID
export async function fetchVehicleById(id: string): Promise<Car | null> {
  const res = await apiFetch(`/api/vehicles/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Vehicle service unavailable');
  const json = await res.json();
  return json.success && json.data ? json.data : null;
}

// 14. Fetch dynamic inventory facets (makes, models, conditions, price bounds, years)
export interface PublicSiteSettings {
  [key: string]: { value: string | number | boolean; valueType: string } | undefined;
}

export async function fetchPublicSettings(): Promise<PublicSiteSettings> {
  try {
    const res = await apiFetch('/api/settings/public');
    if (!res.ok) return {};
    const json = await res.json();
    return (json?.data || {}) as PublicSiteSettings;
  } catch {
    return {};
  }
}

export async function fetchVehicleFacets(): Promise<VehicleFacets | null> {
  try {
    const res = await apiFetch('/api/vehicles/facets');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[API DEV SEED FALLBACK] Vehicle facets query failed:', err);
  }
  return null;
}

// 15. Create share token for vehicle
export async function createVehicleShareToken(vehicleId: string): Promise<{ success: boolean; shareToken?: string; shareUrl?: string; message?: string }> {
  try {
    const res = await apiFetch(`/api/vehicles/${encodeURIComponent(vehicleId)}/share-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: 'Unable to create a share link. Please try again.' };
  }
}


export interface OperationsMetrics {
  totalVehicles: number;
  pendingApproval: number;
  available: number;
  reserved: number;
  sold: number;
  delisted: number;
  unreadNotifications: number;
}

export interface OperationsVehicle extends Car {
  images: string[];
  status: 'available' | 'reserved' | 'sold' | 'delisted';
}

export interface OperationsVehicleImage {
  id: string;
  vehicleId: string;
  url: string;
  displayOrder: number;
  isPrimary: boolean;
  caption?: string;
}

export interface OperationsNotification {
  id: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export type MyNotification = OperationsNotification;

export interface OperationsAuditEntry {
  id: string;
  actorUserId?: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changesJson?: string;
  createdAt: string;
}

export async function fetchOperationsSummary(token?: string): Promise<{ success: boolean; role: AppUserRole; metrics: OperationsMetrics }> {
  const res = await apiFetch('/api/ops/summary', { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function fetchOperationsVehicles(status?: string, token?: string): Promise<{ success: boolean; data: OperationsVehicle[]; total: number }> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiFetch(`/api/ops/vehicles${query}`, { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function createOperationsVehicle(payload: Record<string, unknown>, token?: string): Promise<{ success: boolean; data?: OperationsVehicle; message?: string }> {
  const res = await apiFetch('/api/ops/vehicles', { method: 'POST', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  return res.json();
}

export async function approveOperationsVehicle(id: string, token?: string): Promise<{ success: boolean; data?: OperationsVehicle; message?: string }> {
  const res = await apiFetch(`/api/ops/vehicles/${encodeURIComponent(id)}/approve`, { method: 'PATCH', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function deleteOperationsVehicle(id: string, token?: string): Promise<{ success: boolean; message?: string }> {
  const res = await apiFetch(`/api/ops/vehicles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return res.json();
}

export async function updateOperationsVehicle(id: string, payload: Record<string, unknown>, token?: string): Promise<{ success: boolean; data?: OperationsVehicle; message?: string }> {
  const res = await apiFetch(`/api/ops/vehicles/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  return res.json();
}

export async function fetchOperationsVehicleImages(id: string, token?: string): Promise<{ success: boolean; data: OperationsVehicleImage[]; message?: string }> {
  const res = await apiFetch(`/api/ops/vehicles/${encodeURIComponent(id)}/images`, { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function uploadOperationsVehicleImages(id: string, files: File[], token?: string): Promise<{ success: boolean; data?: OperationsVehicleImage[]; message?: string }> {
  const body = new FormData();
  files.forEach((file) => body.append('images', file));
  const bearer = token || (getAuthTokenFn ? await getAuthTokenFn() : null);
  const res = await apiFetch(`/api/ops/vehicles/${encodeURIComponent(id)}/images/upload`, { method: 'POST', headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined, body });
  return res.json();
}

export async function updateOperationsVehicleImage(id: string, imageId: string, payload: { isPrimary?: boolean; caption?: string; displayOrder?: number }, token?: string): Promise<{ success: boolean; data?: OperationsVehicleImage; message?: string }> {
  const res = await apiFetch(`/api/ops/vehicles/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`, { method: 'PATCH', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  return res.json();
}

export async function deleteOperationsVehicleImage(id: string, imageId: string, token?: string): Promise<{ success: boolean; message?: string }> {
  const res = await apiFetch(`/api/ops/vehicles/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`, { method: 'DELETE', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function reorderOperationsVehicleImages(id: string, order: string[], token?: string): Promise<{ success: boolean; data?: OperationsVehicleImage[]; message?: string }> {
  const res = await apiFetch(`/api/ops/vehicles/${encodeURIComponent(id)}/images/reorder`, { method: 'POST', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ order }) });
  return res.json();
}

export async function fetchOperationsNotifications(token?: string): Promise<{ success: boolean; data: OperationsNotification[] }> {
  const res = await apiFetch('/api/ops/notifications', { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function markOperationsNotificationRead(id: string, token?: string): Promise<{ success: boolean; message?: string }> {
  const res = await apiFetch(`/api/ops/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function fetchMyNotifications(token?: string): Promise<{ success: boolean; data: MyNotification[] }> {
  const res = await apiFetch('/api/me/notifications', { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function markMyNotificationsRead(token?: string): Promise<{ success: boolean; updated?: number }> {
  const res = await apiFetch('/api/me/notifications/read', { method: 'POST', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function markMyNotificationRead(id: string, token?: string): Promise<{ success: boolean; updated?: boolean }> {
  const res = await apiFetch(`/api/me/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function fetchOperationsAudit(token?: string): Promise<{ success: boolean; data: OperationsAuditEntry[] }> {
  const res = await apiFetch('/api/ops/audit', { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export type OperationsQueue = 'sell' | 'concierge' | 'imports' | 'rentals';
export interface OperationsSetting { id: string; settingKey: string; settingValue: string; valueType: 'string' | 'number' | 'json'; label?: string; description?: string; updatedAt?: string; }

export async function fetchOperationsQueue(kind: OperationsQueue, token?: string): Promise<{ success: boolean; data: any[]; message?: string }> {
  const res = await apiFetch(`/api/ops/${kind}`, { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function updateOperationsQueue(kind: OperationsQueue, id: string, payload: Record<string, unknown>, token?: string): Promise<{ success: boolean; data?: any; message?: string }> {
  const res = await apiFetch(`/api/ops/${kind}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  return res.json();
}

export async function recordOperationsImportEvent(trackingId: string, payload: { status: string; location?: string; details?: string }, token?: string): Promise<{ success: boolean; data?: any; message?: string }> {
  const res = await apiFetch(`/api/ops/imports/${encodeURIComponent(trackingId)}/events`, { method: 'POST', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  return res.json();
}

export async function fetchOperationsAnalytics(days: number, token?: string): Promise<{ success: boolean; data?: { since: string; totalEvents: number; eventTotals: { event_type: string; count: number }[]; topPages: { path: string; views: number }[]; topVehicles: { entity_id: string; views: number }[]; daily: { day: string; events: number }[] }; message?: string }> {
  const res = await apiFetch(`/api/ops/analytics?days=${encodeURIComponent(days)}`, { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function fetchOperationsSettings(token?: string): Promise<{ success: boolean; data: OperationsSetting[]; message?: string }> {
  const res = await apiFetch('/api/ops/settings', { headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return res.json();
}

export async function saveOperationsSetting(settingKey: string, settingValue: string, token?: string): Promise<{ success: boolean; data?: OperationsSetting[]; message?: string }> {
  const res = await apiFetch('/api/ops/settings', { method: 'PUT', headers: { ...(await getAuthHeaders()), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ settings: [{ settingKey, settingValue }] }) });
  return res.json();
}
