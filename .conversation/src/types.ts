export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  priceNgn: number;
  priceUsd?: number;
  mileage: number; // in km or miles
  mileageUnit?: 'km' | 'miles';
  transmission: 'Automatic' | 'Manual';
  fuelType: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
  location: string;
  city?: string;
  state?: string;
  verified: boolean;
  cleanTitle?: boolean;
  condition: 'Nigeria Used' | 'Brand New' | 'Foreign Used (Tokunbo)';
  bodyType: 'SUV' | 'Sedan' | 'Hatchback' | 'Pickup' | 'Coupe';
  engine: string;
  driveType: 'FWD' | 'AWD' | '4WD' | 'RWD';
  color: string;
  seats: number;
  stockId: string;
  listedTimeAgo: string;
  images: string[];
  description: string;
  features: string[];
  inspectionPassed?: boolean;
  seller?: {
    name: string;
    verified: boolean;
    rating: number;
    reviewsCount: number;
    location: string;
    joinedYear: string;
  };
  importEstimate?: {
    carPriceUsd: number;
    shippingNgn: number;
    dutyNgn: number;
    otherChargesNgn: number;
    estDeliveryTime: string;
  };
}

export interface RentalCar {
  id: string;
  name: string;
  category: string;
  pricePerDay: number;
  transmission: 'Automatic' | 'Manual';
  fuel: string;
  seats: number;
  image: string;
  available: boolean;
  rating: number;
}

export interface ImportOrder {
  id: string;
  trackingNumber: string;
  orderDate: string;
  lastUpdated: string;
  status: 'Order Placed' | 'Purchased' | 'Shipped from USA' | 'Arrived at Port' | 'Customs Clearance' | 'In Transit (Nigeria)' | 'Delivered';
  progressStep: number;
  car: {
    year: number;
    make: string;
    model: string;
    trim: string;
    vin: string;
    engine: string;
    transmission: string;
    driveType: string;
    fuel: string;
    color: string;
    mileage: string;
    image: string;
  };
  route: {
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
    shippingMethod: string;
    departurePort: string;
    arrivalPort: string;
    eta: string;
    deliveryAddress: string;
  };
  costs: {
    vehiclePriceUsd: number;
    shippingUsd: number;
    insuranceUsd: number;
    customsDutyUsd: number;
    otherChargesUsd: number;
    totalAmountUsd: number;
    amountPaidUsd: number;
    balanceDueUsd: number;
    lastPaymentDate: string;
  };
  timeline: {
    stepName: string;
    date: string;
    time?: string;
    completed: boolean;
    current?: boolean;
    note?: string;
  }[];
}

export type ScreenId =
  | 'home'
  | 'buy-cars'
  | 'car-details'
  | 'car-details-rav4'
  | 'rent-car'
  | 'import-landing'
  | 'import-form'
  | 'sell-car'
  | 'find-car'
  | 'saved-compare'
  | 'order-tracking'
  | 'operations-dashboard'
  | 'auth';

export type AppUserRole = 'customer' | 'staff' | 'admin';

export interface AppUser {
  id: string;
  clerkId?: string;
  email: string;
  fullName: string;
  phone?: string;
  role: AppUserRole;
  avatarUrl?: string;
}
