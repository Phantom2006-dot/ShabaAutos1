import { Car, RentalCar, ImportOrder } from '../types';

export const POPULAR_CARS: Car[] = [
  {
    id: 'camry-2022',
    make: 'Toyota',
    model: 'Camry XSE',
    year: 2022,
    trim: 'XSE',
    priceNgn: 32500000,
    mileage: 45000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Lagos',
    city: 'Lekki',
    state: 'Lagos',
    verified: true,
    cleanTitle: true,
    condition: 'Nigeria Used',
    bodyType: 'Sedan',
    engine: '2.5L 4-Cylinder',
    driveType: 'FWD',
    color: 'Midnight Black',
    seats: 5,
    stockId: 'SA-2022-CAMRY-XSE-001',
    listedTimeAgo: '2 days ago',
    images: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80',
    ],
    description: 'This 2022 Toyota Camry XSE is in pristine condition with complete dealership maintenance records. Features red leather sport interior, panoramic sunroof, JBL premium sound system, lane keep assist, adaptive cruise control, and 19-inch gloss black alloy wheels. Never been in an accident, buy and drive condition with all customs and clearing papers verified.',
    features: [
      'First registration in Nigeria',
      'No accident history reported',
      'Full service history available',
      'All documents are up to date',
      'Panoramic sunroof',
      'Wireless phone charging',
      'Keyless push button start',
      'Blind spot monitoring with rear cross traffic alert',
      'Buy and drive condition'
    ],
    inspectionPassed: true,
    seller: {
      name: 'Prime Motors Ltd',
      verified: true,
      rating: 4.9,
      reviewsCount: 142,
      location: 'Victoria Island, Lagos',
      joinedYear: '2020'
    }
  },
  {
    id: 'lexus-rx-2023',
    make: 'Lexus',
    model: 'RX 350',
    year: 2023,
    trim: 'F-Sport',
    priceNgn: 45800000,
    mileage: 18000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Lagos',
    city: 'Victoria Island',
    state: 'Lagos',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '3.5L V6',
    driveType: 'AWD',
    color: 'Sonic Titanium Silver',
    seats: 5,
    stockId: 'SA-2023-RX350-002',
    listedTimeAgo: '3 days ago',
    images: [
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Luxury compact SUV in showroom status. Comes with head-up display, 360-degree panoramic camera, Mark Levinson audio, and adaptive variable suspension.',
    features: [
      'Tokunbo foreign used',
      'Mark Levinson surround sound',
      'Heated and ventilated seats',
      'Power tailgate with kick sensor'
    ],
    inspectionPassed: true
  },
  {
    id: 'mercedes-gle-2022',
    make: 'Mercedes-Benz',
    model: 'GLE 450',
    year: 2022,
    trim: '4MATIC AMG Line',
    priceNgn: 68750000,
    mileage: 22000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Abuja',
    city: 'Maitama',
    state: 'FCT Abuja',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '3.0L Turbo Inline-6 EQ Boost',
    driveType: 'AWD',
    color: 'Obsidian Black',
    seats: 7,
    stockId: 'SA-2022-MB-GLE-003',
    listedTimeAgo: '5 days ago',
    images: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The pinnacle of German engineering and luxury. Features dual 12.3-inch widescreen displays, ambient lighting in 64 colors, Burmester surround system, and air suspension.',
    features: [
      'Full AMG Sport package',
      'Air suspension with height adjustment',
      'Third-row 7-seater configuration',
      'Apple CarPlay and Android Auto'
    ],
    inspectionPassed: true
  },
  {
    id: 'land-cruiser-2021',
    make: 'Toyota',
    model: 'Land Cruiser',
    year: 2021,
    trim: 'VXR V8',
    priceNgn: 85000000,
    mileage: 30000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Diesel',
    location: 'Lagos',
    city: 'Ikoyi',
    state: 'Lagos',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '4.5L Twin-Turbo Diesel V8',
    driveType: '4WD',
    color: 'Pearl White',
    seats: 7,
    stockId: 'SA-2021-TLC-VXR-004',
    listedTimeAgo: '1 week ago',
    images: [
      'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Unmatched durability and road dominance. Fully armored underbody protection, crawl control, rear seat entertainment screens, and refrigerator cool box in center console.',
    features: [
      'Cool box center console',
      'Dual rear entertainment screens',
      'Multi-terrain select with crawl control',
      'Original factory alloy wheels'
    ],
    inspectionPassed: true
  },
  {
    id: 'range-rover-sport-2022',
    make: 'Range Rover',
    model: 'Sport HSE Dynamic',
    year: 2022,
    trim: 'Dynamic',
    priceNgn: 95600000,
    mileage: 20000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Lagos',
    city: 'Victoria Island',
    state: 'Lagos',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '3.0L Supercharged V6',
    driveType: 'AWD',
    color: 'Carpathian Grey',
    seats: 5,
    stockId: 'SA-2022-RRS-005',
    listedTimeAgo: '2 weeks ago',
    images: [
      'https://images.unsplash.com/photo-1563720223523-491ff04651de?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Dynamic performance combined with British luxury. Deployable side steps, red Brembo brake calipers, Meridian 825W audio, soft-close doors, and electronic air suspension.',
    features: [
      'Deployable electric side steps',
      'Meridian 825W surround sound',
      'Soft-close doors',
      'Sliding panoramic glass roof'
    ],
    inspectionPassed: true
  }
];

export const BUY_CARS_INVENTORY: Car[] = [
  {
    id: 'rav4-2022',
    make: 'Toyota',
    model: 'RAV4 XLE',
    year: 2022,
    trim: 'XLE Premium',
    priceNgn: 42500000,
    priceUsd: 18500,
    mileage: 32000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Lagos',
    city: 'Lekki',
    state: 'Lagos',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '2.5L 4-Cylinder Dynamic Force',
    driveType: 'AWD',
    color: 'Midnight Black Metallic',
    seats: 5,
    stockId: 'SA-2022-RAV4-XLE-001',
    listedTimeAgo: '2 days ago',
    images: [
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80',
    ],
    description: 'Fresh US import 2022 Toyota RAV4 XLE AWD. Immaculate condition, accident-free CarFax verified. Equipped with SofTex synthetic leather seats, power moonroof, blind-spot monitoring, power liftgate, Apple CarPlay, and radar cruise control. Fully cleared at Tin Can port Lagos with all custom duty paid.',
    features: [
      'US Tokunbo (Clean Carfax)',
      'All Wheel Drive (AWD)',
      'SofTex Premium Leather Seats',
      'Power Sunroof / Moonroof',
      'Apple CarPlay & Android Auto',
      'Lane Departure Alert with Steering Assist',
      'Automatic High Beams & Radar Cruise'
    ],
    inspectionPassed: true,
    seller: {
      name: 'Prime Motors Ltd',
      verified: true,
      rating: 4.8,
      reviewsCount: 98,
      location: 'Victoria Island, Lagos',
      joinedYear: '2021'
    },
    importEstimate: {
      carPriceUsd: 18500,
      shippingNgn: 6200000,
      dutyNgn: 3800000,
      otherChargesNgn: 950000,
      estDeliveryTime: '3-4 Weeks'
    }
  },
  {
    id: 'highlander-2021',
    make: 'Toyota',
    model: 'Highlander Limited',
    year: 2021,
    trim: 'Limited AWD',
    priceNgn: 58750000,
    mileage: 45000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Abuja',
    city: 'Garki',
    state: 'FCT Abuja',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '3.5L V6 Dual VVT-i',
    driveType: 'AWD',
    color: 'Celestial Silver Metallic',
    seats: 7,
    stockId: 'SA-2021-HL-LTD-002',
    listedTimeAgo: '3 days ago',
    images: [
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Top-tier family luxury SUV. 7-seater captain chairs layout, heated and ventilated front seats, premium JBL 11-speaker sound system, hands-free power liftgate.',
    features: ['Captain chairs second row', 'JBL Audio', 'Heated & cooled seats', 'AWD system'],
    inspectionPassed: true
  },
  {
    id: 'land-cruiser-vxr-2020',
    make: 'Toyota',
    model: 'Land Cruiser VXR',
    year: 2020,
    trim: 'VXR V8',
    priceNgn: 85000000,
    mileage: 60000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Diesel',
    location: 'Lagos',
    city: 'Ikoyi',
    state: 'Lagos',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '4.5L V8 Twin Turbo Diesel',
    driveType: '4WD',
    color: 'Super White',
    seats: 7,
    stockId: 'SA-2020-LC-VXR-003',
    listedTimeAgo: '1 week ago',
    images: [
      'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Heavy duty luxury flagship. Built for the toughest terrains while maintaining supreme cabin comfort and road presence.',
    features: ['Crawl Control', 'Cool Box', 'Rear screens', 'Full leather'],
    inspectionPassed: true
  },
  {
    id: '4runner-2019',
    make: 'Toyota',
    model: '4Runner SR5',
    year: 2019,
    trim: 'SR5 Premium',
    priceNgn: 36800000,
    mileage: 70000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Port Harcourt',
    city: 'GRA Phase 2',
    state: 'Rivers',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '4.0L V6 DOHC',
    driveType: '4WD',
    color: 'Magnetic Gray Metallic',
    seats: 7,
    stockId: 'SA-2019-4R-SR5-004',
    listedTimeAgo: '1 week ago',
    images: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'True body-on-frame offroad machine. Solid, reliable, and ready for Nigerian highways and rugged paths with zero issues.',
    features: ['Body on frame', 'High ground clearance', 'Power rear tailgate window', 'Tow package'],
    inspectionPassed: true
  },
  {
    id: 'venza-2023',
    make: 'Toyota',
    model: 'Venza LE',
    year: 2023,
    trim: 'LE Hybrid',
    priceNgn: 41900000,
    mileage: 18000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Hybrid',
    location: 'Lagos',
    city: 'Victoria Island',
    state: 'Lagos',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '2.5L 4-Cylinder Hybrid Synergy Drive',
    driveType: 'AWD',
    color: 'Blizzard Pearl',
    seats: 5,
    stockId: 'SA-2023-VENZA-005',
    listedTimeAgo: '4 days ago',
    images: [
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Ultra-refined hybrid crossover delivering outstanding fuel efficiency (approx 40 MPG) with standard electronic On-Demand AWD and whisper quiet cabin.',
    features: ['Hybrid fuel economy', 'Electronic AWD', 'LED headlights', 'Safety Sense 2.0'],
    inspectionPassed: true
  },
  {
    id: 'chr-2021',
    make: 'Toyota',
    model: 'C-HR XLE',
    year: 2021,
    trim: 'XLE',
    priceNgn: 27500000,
    mileage: 28000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Abuja',
    city: 'Wuse 2',
    state: 'FCT Abuja',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'Hatchback',
    engine: '2.0L 4-Cylinder',
    driveType: 'FWD',
    color: 'Ruby Flare Pearl / Black Roof',
    seats: 5,
    stockId: 'SA-2021-CHR-006',
    listedTimeAgo: '5 days ago',
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Sporty, eye-catching compact crossover. Perfect for navigating city traffic with great agility, low fuel consumption and striking modern styling.',
    features: ['Two-tone paint', 'Sport drive mode', 'Touchscreen infotainment', 'Backup camera'],
    inspectionPassed: true
  },
  {
    id: 'fortuner-2020',
    make: 'Toyota',
    model: 'Fortuner TRD',
    year: 2020,
    trim: 'TRD Sportivo',
    priceNgn: 47800000,
    mileage: 55000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Diesel',
    location: 'Lagos',
    city: 'Ikeja',
    state: 'Lagos',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '2.8L Turbo Diesel',
    driveType: '4WD',
    color: 'White Pearl',
    seats: 7,
    stockId: 'SA-2020-FORTUNER-007',
    listedTimeAgo: '1 week ago',
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Aggressive TRD styling package on a proven Hilux platform. 7 spacious leather seats, high ground clearance, paddle shifters, and heavy-duty suspension.',
    features: ['TRD Bodykit', '7 Seats', 'Paddle shifters', 'Heavy duty suspension'],
    inspectionPassed: true
  },
  {
    id: 'corolla-cross-2023',
    make: 'Toyota',
    model: 'Corolla Cross',
    year: 2023,
    trim: 'XLE',
    priceNgn: 29900000,
    mileage: 15000,
    mileageUnit: 'km',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Ibadan',
    city: 'Bodija',
    state: 'Oyo',
    verified: true,
    cleanTitle: true,
    condition: 'Foreign Used (Tokunbo)',
    bodyType: 'SUV',
    engine: '2.0L 4-Cylinder Dynamic Force',
    driveType: 'FWD',
    color: 'Sonic Silver Metallic',
    seats: 5,
    stockId: 'SA-2023-CCROSS-008',
    listedTimeAgo: '2 weeks ago',
    images: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The reliability of the world famous Corolla built into a versatile SUV stance. Excellent visibility, smooth ride quality, and low running costs.',
    features: ['Practically brand new', 'Roof rails', 'LED fog lamps', 'Blind spot monitoring'],
    inspectionPassed: true
  }
];

export const RENTAL_CARS: RentalCar[] = [
  {
    id: 'rent-corolla-2021',
    name: 'Toyota Corolla 2021',
    category: 'Economy',
    pricePerDay: 35000,
    transmission: 'Automatic',
    fuel: 'Petrol',
    seats: 5,
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.8
  },
  {
    id: 'rent-crv-2022',
    name: 'Honda CR-V 2022',
    category: 'SUV',
    pricePerDay: 60000,
    transmission: 'Automatic',
    fuel: 'Petrol',
    seats: 5,
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.9
  },
  {
    id: 'rent-cclass-2022',
    name: 'Mercedes-Benz C-Class 2022',
    category: 'Luxury',
    pricePerDay: 90000,
    transmission: 'Automatic',
    fuel: 'Petrol',
    seats: 5,
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 5.0
  },
  {
    id: 'rent-hiace-2020',
    name: 'Toyota Hiace 2020',
    category: 'Van',
    pricePerDay: 70000,
    transmission: 'Manual',
    fuel: 'Diesel',
    seats: 14,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.7
  },
  {
    id: 'rent-rx-2022',
    name: 'Lexus RX 350 2022',
    category: 'Premium SUV',
    pricePerDay: 120000,
    transmission: 'Automatic',
    fuel: 'Petrol',
    seats: 5,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.9
  }
];

export const IMPORT_POPULAR_CARS = [
  {
    id: 'imp-rav4',
    title: 'Toyota RAV4 XLE',
    year: 2022,
    priceUsd: 18500,
    priceNgnEst: 31450000,
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80',
    specs: 'AWD • 2.5L • Automatic',
    estDelivery: '3-4 Weeks'
  },
  {
    id: 'imp-gle',
    title: 'Mercedes-Benz GLE 350',
    year: 2021,
    priceUsd: 24800,
    priceNgnEst: 42160000,
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    specs: '4MATIC • 2.0L Turbo • Automatic',
    estDelivery: '3-4 Weeks'
  },
  {
    id: 'imp-x3',
    title: 'BMW X3 xDrive30i',
    year: 2021,
    priceUsd: 22400,
    priceNgnEst: 38080000,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    specs: 'AWD • 2.0L Turbo • Automatic',
    estDelivery: '3-4 Weeks'
  },
  {
    id: 'imp-rx',
    title: 'Lexus RX 350',
    year: 2022,
    priceUsd: 21900,
    priceNgnEst: 37230000,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    specs: 'AWD • 3.5L V6 • Automatic',
    estDelivery: '3-4 Weeks'
  }
];

export const SAVED_COMPARE_CARS = [
  {
    id: 'comp-1',
    name: 'Toyota RAV4 2022',
    trim: 'XLE • Petrol',
    priceNgn: 28500000,
    location: 'Lekki, Lagos',
    mileage: '32,000 km',
    transmission: 'Automatic',
    engine: '2.5L 4-Cylinder',
    fuel: 'Petrol',
    bodyType: 'SUV',
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80',
    selected: true
  },
  {
    id: 'comp-2',
    name: 'Honda CR-V 2021',
    trim: 'EX-L • Petrol',
    priceNgn: 26000000,
    location: 'Abuja',
    mileage: '41,000 km',
    transmission: 'Automatic',
    engine: '1.5L Turbo',
    fuel: 'Petrol',
    bodyType: 'SUV',
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    selected: true
  },
  {
    id: 'comp-3',
    name: 'Lexus RX 350 2020',
    trim: 'Premium • Petrol',
    priceNgn: 45000000,
    location: 'Victoria Island, Lagos',
    mileage: '28,000 km',
    transmission: 'Automatic',
    engine: '3.5L V6',
    fuel: 'Petrol',
    bodyType: 'SUV',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    selected: true
  },
  {
    id: 'comp-4',
    name: 'Mercedes-Benz GLC 300 2019',
    trim: '4MATIC • Petrol',
    priceNgn: 32000000,
    location: 'Port Harcourt',
    mileage: '50,000 km',
    transmission: 'Automatic',
    engine: '2.0L Turbo',
    fuel: 'Petrol',
    bodyType: 'SUV',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    selected: false
  }
];

export const DEMO_IMPORT_ORDER: ImportOrder = {
  id: 'SA-IMP-00078',
  trackingNumber: 'SA-IMP-00078',
  orderDate: 'May 14, 2024',
  lastUpdated: 'May 20, 2024, 10:30 AM',
  status: 'Customs Clearance',
  progressStep: 4,
  car: {
    year: 2022,
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE',
    vin: '2T3P1RFV3NC123456',
    engine: '2.5L 4-Cylinder',
    transmission: 'Automatic',
    driveType: 'AWD',
    fuel: 'Petrol',
    color: 'White',
    mileage: '45,000 miles',
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80'
  },
  route: {
    originCity: 'Houston, Texas',
    originCountry: 'USA',
    destinationCity: 'Lagos',
    destinationCountry: 'Nigeria',
    shippingMethod: 'Roll-on/Roll-off (RoRo)',
    departurePort: 'Port of Houston, TX',
    arrivalPort: 'Tin Can Island Port, Lagos',
    eta: 'June 5, 2024',
    deliveryAddress: 'Plot 14, Block B, Admiralty Way, Lekki Phase 1, Lagos'
  },
  costs: {
    vehiclePriceUsd: 15000,
    shippingUsd: 1250,
    insuranceUsd: 200,
    customsDutyUsd: 3000,
    otherChargesUsd: 850,
    totalAmountUsd: 20300,
    amountPaidUsd: 10000,
    balanceDueUsd: 10300,
    lastPaymentDate: 'May 14, 2024'
  },
  timeline: [
    {
      stepName: 'Purchased',
      date: 'May 14, 2024',
      time: '11:20 AM',
      completed: true,
      note: 'Vehicle successfully won and paid at Copart Dallas auction facility.'
    },
    {
      stepName: 'Shipped from USA',
      date: 'May 16, 2024',
      time: '02:40 PM',
      completed: true,
      note: 'Vessel Grimaldi Lines departed Houston port carrying vehicle.'
    },
    {
      stepName: 'Arrived at Port',
      date: 'May 18, 2024',
      time: '09:15 AM',
      completed: true,
      note: 'Vessel docked safely at Tin Can Island Terminal, Lagos.'
    },
    {
      stepName: 'Customs Clearance',
      date: 'May 20, 2024',
      time: '10:30 AM',
      completed: false,
      current: true,
      note: 'Customs clearance in progress. Document assessment and duty assessment processing (takes approx 3-5 working days).'
    },
    {
      stepName: 'In Transit (Nigeria)',
      date: 'Pending',
      completed: false,
      note: 'Carrier will transport directly from port to delivery destination.'
    },
    {
      stepName: 'Delivered',
      date: 'Pending',
      completed: false,
      note: 'Final vehicle inspection upon doorstep handover.'
    }
  ]
};

export const TRACKED_ORDER = {
  orderId: 'ORD-2024-0891',
  status: 'In Transit',
  orderDate: 'Oct 12, 2024',
  estDeliveryDate: 'Nov 28, 2024',
  shippingLine: 'Mediterranean Shipping Company (MSC)',
  vesselName: 'MSC LEANNE',
  trackingNumber: 'MSCU12849102',
  originPort: 'Port of Newark, NJ, USA',
  destinationPort: 'Tin Can Island Port, Lagos, Nigeria',
  car: {
    name: '2022 Toyota RAV4 XLE',
    priceUsd: 18500,
    priceNgn: 29600000,
    vin: '2T3P1RFV3NC123456',
    specs: '2.5L 4-Cylinder • Automatic • AWD • 28,400 miles • Silver',
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80'
  },
  steps: [
    {
      title: 'Order Confirmed & Payment Received',
      date: 'Oct 12, 2024',
      description: 'Initial deposit verified. Sourcing agents assigned to US dealer lot.',
      completed: true,
      current: false
    },
    {
      title: 'Vehicle Purchased & Pre-Shipment Inspection',
      date: 'Oct 15, 2024',
      description: 'Vehicle physical inspection completed with clean Carfax verified. Title secured.',
      completed: true,
      current: false
    },
    {
      title: 'Dispatched to US Port of Newark',
      date: 'Oct 19, 2024',
      description: 'Trucking carrier delivered vehicle to Newark port container terminal.',
      completed: true,
      current: false
    },
    {
      title: 'Ocean Shipping in Transit (Atlantic Route)',
      date: 'Oct 24, 2024 - Present',
      description: 'Vessel MSC LEANNE departed Port of Newark. Currently crossing the Atlantic toward West Africa.',
      completed: false,
      current: true
    },
    {
      title: 'Customs Clearance & Duty Assessment',
      date: 'Est. Nov 20, 2024',
      description: 'Clearing team will submit Bill of Lading, process PAAR, and pay Nigeria Customs duty at Tin Can Island.',
      completed: false,
      current: false
    },
    {
      title: 'Final Doorstep Delivery to Lekki, Lagos',
      date: 'Est. Nov 28, 2024',
      description: 'Vehicle washed, full diagnostic scan performed, and keys handed over at client doorstep.',
      completed: false,
      current: false
    }
  ],
  documents: [
    { name: 'Original Bill of Lading (MSC-2024-BOL)', type: 'PDF Document', size: '2.4 MB' },
    { name: 'US Export Certificate of Title', type: 'PDF Document', size: '1.8 MB' },
    { name: 'CarFax 150-Point Inspection Report', type: 'PDF Document', size: '4.1 MB' },
    { name: 'Commercial Invoice & Duty Assessment Receipt', type: 'PDF Document', size: '1.2 MB' }
  ],
  assignedAgent: {
    name: 'Chidi Okafor',
    role: 'Senior Logistics & Customs Coordinator',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    phone: '+234 803 123 9988'
  }
};

