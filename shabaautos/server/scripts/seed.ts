import crypto from 'node:crypto';
import { getDatabaseService, getDatabaseType } from '../database/index';
import { BUY_CARS_INVENTORY, POPULAR_CARS, RENTAL_CARS, TRACKED_ORDER } from '../../src/data/cars';
import { getPostgresPool } from '../database/postgres';
import { getDatabase } from '../database/sqlite';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function seedDatabase(force = false): Promise<void> {
  const dbService = getDatabaseService();
  const dbType = getDatabaseType();

  // Check if vehicles already exist
  const { total } = await dbService.vehicles.list({ limit: 1 });

  if (total > 0 && !force) {
    console.log(`[Seed] Database (${dbType}) already populated (${total} vehicles). Skipping seed.`);
    return;
  }

  console.log(`[Seed] Starting database seeding on ${dbType}...`);

  if (force) {
    console.log('[Seed] Clearing existing tables...');
    if (dbType === 'neon-postgres') {
      const pool = getPostgresPool();
      await pool.query(`
        TRUNCATE TABLE
          vehicle_images, vehicles, sellers,
          rental_availability_blocks, rental_bookings, rental_vehicles,
          shipment_milestones, tracking_events, import_cost_estimates, import_requests,
          offers, inspections, sell_submissions, valuation_history, concierge_requests,
          saved_vehicles, saved_searches, comparison_lists, users, notifications,
          audit_logs, ai_usage_records
        CASCADE;
      `);
    } else {
      const rawDb = getDatabase();
      rawDb.exec(`
        DELETE FROM vehicle_images;
        DELETE FROM vehicles;
        DELETE FROM sellers;
        DELETE FROM rental_availability_blocks;
        DELETE FROM rental_bookings;
        DELETE FROM rental_vehicles;
        DELETE FROM shipment_milestones;
        DELETE FROM tracking_events;
        DELETE FROM import_cost_estimates;
        DELETE FROM import_requests;
        DELETE FROM offers;
        DELETE FROM inspections;
        DELETE FROM sell_submissions;
        DELETE FROM valuation_history;
        DELETE FROM concierge_requests;
        DELETE FROM saved_vehicles;
        DELETE FROM saved_searches;
        DELETE FROM comparison_lists;
        DELETE FROM users;
        DELETE FROM notifications;
        DELETE FROM audit_logs;
        DELETE FROM ai_usage_records;
      `);
    }
  }

  // 1. Seed Users (Admin & Customer)
  console.log('[Seed] Seeding users...');
  const now = new Date().toISOString();
  const adminPasswordHash = hashPassword('AdminShaba2026!');
  const customerPasswordHash = hashPassword('SecurePass123!');

  const admin = await dbService.users.create({
    email: 'admin@shabaautos.com',
    passwordHash: adminPasswordHash,
    fullName: 'Shaba Autos Administrator',
    phone: '+234 802 345 6789',
    role: 'admin',
    status: 'active',
  });

  const customer = await dbService.users.create({
    email: 'danielnworah9@gmail.com',
    passwordHash: customerPasswordHash,
    fullName: 'Daniel Nworah',
    phone: '+234 813 456 7890',
    role: 'customer',
    status: 'active',
  });

  // 2. Seed Sellers / Dealerships
  console.log('[Seed] Seeding dealerships & verified sellers...');
  const sellersMap = new Map<string, string>();
  const initialSellers = [
    { name: 'Prime Motors Ltd', dealership: 'Prime Motors Ikoyi', phone: '+234 803 111 2222', location: 'Lekki Phase 1, Lagos', rating: 4.9, reviews: 42 },
    { name: 'Lekki Luxury Rides', dealership: 'Lekki Luxury Auto Hub', phone: '+234 805 222 3333', location: 'Victoria Island, Lagos', rating: 5.0, reviews: 58 },
    { name: 'Mainland Motors', dealership: 'Mainland Auto Direct', phone: '+234 802 333 4444', location: 'Ikeja GRA, Lagos', rating: 4.8, reviews: 31 },
    { name: 'Prestige Motors Abuja', dealership: 'Prestige Auto Hub', phone: '+234 809 444 5555', location: 'Maitama, Abuja', rating: 4.9, reviews: 27 },
  ];

  for (const s of initialSellers) {
    const sellerId = `sel_${crypto.randomUUID().slice(0, 8)}`;
    await dbService.vehicles.createSeller({
      id: sellerId,
      userId: admin.id,
      name: s.name,
      dealershipName: s.dealership,
      verified: true,
      rating: s.rating,
      reviewsCount: s.reviews,
      location: s.location,
      phone: s.phone,
      email: `contact@${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.ng`,
      joinedYear: '2021',
      status: 'active',
    });
    sellersMap.set(s.name, sellerId);
  }

  // 3. Seed Vehicles & Images
  console.log('[Seed] Seeding vehicle showroom inventory...');
  const allCars = [...BUY_CARS_INVENTORY];
  for (const p of POPULAR_CARS) {
    if (!allCars.some((c) => c.id === p.id)) {
      allCars.push(p);
    }
  }

  for (const car of allCars) {
    const sellerId = (car.seller?.name && sellersMap.get(car.seller.name)) || sellersMap.get('Prime Motors Ltd');
    const images = Array.isArray(car.images) && car.images.length > 0 ? car.images : [];

    await dbService.vehicles.create(
      {
        make: car.make,
        model: car.model,
        year: Number(car.year),
        trim: car.trim,
        priceNgn: Number(car.priceNgn),
        priceUsd: car.priceUsd ? Number(car.priceUsd) : Math.round(Number(car.priceNgn) / 1500),
        mileage: Number(car.mileage),
        mileageUnit: (car.mileageUnit as any) || 'km',
        transmission: car.transmission === 'Manual' ? 'Manual' : 'Automatic',
        fuelType: (car.fuelType as any) || 'Petrol',
        location: car.location || 'Lagos',
        city: car.city || 'Lagos',
        state: car.state || 'Lagos',
        verified: car.verified !== undefined ? Boolean(car.verified) : true,
        cleanTitle: car.cleanTitle !== undefined ? Boolean(car.cleanTitle) : true,
        condition: (car.condition as any) || 'Nigeria Used',
        bodyType: (car.bodyType as any) || 'SUV',
        engine: car.engine || '2.5L 4-Cylinder',
        driveType: (car.driveType as any) || 'AWD',
        color: car.color || 'Silver',
        seats: Number(car.seats) || 5,
        stockId: car.stockId || `SA-${car.year}-${car.make.toUpperCase().slice(0, 3)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
        description: car.description || `${car.year} ${car.make} ${car.model} in excellent condition, verified documentation.`,
        features: Array.isArray(car.features) ? car.features : ['Air Conditioning', 'Power Steering', 'Reverse Camera'],
        inspectionPassed: car.inspectionPassed !== undefined ? Boolean(car.inspectionPassed) : true,
        sellerId,
        status: 'available',
      },
      images
    );
  }

  // 4. Seed Rental Vehicles
  console.log('[Seed] Seeding rental fleet...');
  for (const rental of RENTAL_CARS) {
    const price = (rental as any).pricePerDayNgn || (rental as any).pricePerDay || 50000;
    const img = (rental as any).imageUrl || (rental as any).image || 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80';
    await dbService.rentals.createVehicle({
      name: rental.name,
      category: rental.category,
      pricePerDayNgn: Number(price),
      transmission: rental.transmission === 'Manual' ? 'Manual' : 'Automatic',
      fuel: rental.fuel || 'Petrol',
      seats: Number(rental.seats) || 5,
      imageUrl: img,
      available: rental.available !== undefined ? Boolean(rental.available) : true,
      rating: Number(rental.rating) || 4.9,
      plateNumber: `KJA-${Math.floor(100 + Math.random() * 900)}AB`,
      location: 'Lagos',
      status: 'active',
    });
  }

  // 5. Seed Genuine Tracked Order (from TRACKED_ORDER)
  console.log('[Seed] Seeding sample verified tracked shipment...');
  const sampleOrder = await dbService.imports.createRequest({
    trackingId: TRACKED_ORDER.orderId || 'ORD-2024-0891',
    userId: customer.id,
    customerName: 'Oluwasegun Ajibola',
    phone: '+234 802 345 6789',
    email: 'customer@shabaautos.com',
    make: 'Toyota',
    model: 'RAV4 XLE',
    year: 2022,
    vin: TRACKED_ORDER.car?.vin || '2T3P1RFV3NC123456',
    deliveryCity: 'Lagos',
    destinationPort: TRACKED_ORDER.destinationPort || 'Tin Can Island Container Terminal, Lagos',
    originPort: TRACKED_ORDER.originPort || 'Port of Newark, NJ, USA',
    features: ['All-Wheel Drive', 'Panoramic Sunroof', 'Blind Spot Monitoring'],
    additionalNotes: 'Customs cleared directly by ShabaAutos clearing team',
    status: 'Shipped from USA',
  });

  // Add milestones from TRACKED_ORDER
  if (Array.isArray(TRACKED_ORDER.steps)) {
    for (let idx = 0; idx < TRACKED_ORDER.steps.length; idx++) {
      const step = TRACKED_ORDER.steps[idx];
      const stepNum = (step as any).step !== undefined ? Number((step as any).step) : idx + 1;
      await dbService.imports.addMilestone({
        trackingId: sampleOrder.trackingId,
        stepOrder: stepNum,
        title: step.title,
        description: step.description || (step as any).desc,
        scheduledDate: step.date,
        completedDate: step.completed ? step.date : undefined,
        isCompleted: Boolean(step.completed),
        isCurrent: Boolean(step.current),
        location: stepNum <= 2 ? 'Port of Newark, NJ' : stepNum === 4 ? 'Mid-Atlantic (MSC LEANNE V-402)' : 'Lagos, Nigeria',
      });
    }
  }

  await dbService.imports.addTrackingEvent({
    trackingId: sampleOrder.trackingId,
    eventTimestamp: '2026-03-01T14:30:00Z',
    status: 'Vessel Departed Origin Port',
    location: 'Port of Newark, NJ, USA',
    vesselName: TRACKED_ORDER.vesselName || 'MSC LEANNE V-402',
    containerNo: (TRACKED_ORDER as any).containerNo || TRACKED_ORDER.trackingNumber || 'MSCU-902184-7',
    details: 'Container loaded onboard vessel MSC LEANNE V-402. Ocean transit initiated.',
    recordedBy: 'Port Authority NJ & MSC Logistics',
  });

  // Seed sample initial import order SHA-2026-9812
  const secondOrder = await dbService.imports.createRequest({
    trackingId: 'SHA-2026-9812',
    userId: customer.id,
    customerName: 'Daniel Nworah',
    phone: '+234 813 456 7890',
    email: 'danielnworah9@gmail.com',
    make: 'Lexus',
    model: 'RX 350 F-Sport',
    year: 2023,
    vin: '2T2BZMCA7PC192840',
    deliveryCity: 'Lagos',
    destinationPort: 'Tin Can Island Container Terminal, Lagos',
    originPort: 'Port of Houston, TX, USA',
    features: ['F-Sport Package', 'Head-Up Display', 'Triple-Beam LED Headlamps'],
    additionalNotes: 'Air Freight clearing expedited',
    status: 'Customs Clearance',
  });

  const milestonesOrder2 = [
    { step: 1, title: 'Vehicle Sourced & Auction Won', desc: 'Purchased at Manheim Auto Auction, Dallas TX', date: 'Feb 10, 2026', done: true, curr: false },
    { step: 2, title: '150-Point Pre-Export Inspection', desc: 'Engine compression, clean title, and frame inspection passed', date: 'Feb 14, 2026', done: true, curr: false },
    { step: 3, title: 'Export Clearance & Loading', desc: 'US Customs export clearance granted', date: 'Feb 18, 2026', done: true, curr: false },
    { step: 4, title: 'Ocean Freight Transit', desc: 'Vessel arrived at Tin Can Island, Lagos', date: 'Mar 02, 2026', done: true, curr: false },
    { step: 5, title: 'Customs Valuation & Assessment', desc: 'Single Goods Declaration (SGD) assessed by NCS', date: 'Mar 08, 2026', done: false, curr: true },
    { step: 6, title: 'Final Release & Delivery to Hub', desc: 'Vehicle released for delivery to Lekki Hub', date: 'Mar 15, 2026', done: false, curr: false },
  ];

  for (const m of milestonesOrder2) {
    await dbService.imports.addMilestone({
      trackingId: secondOrder.trackingId,
      stepOrder: m.step,
      title: m.title,
      description: m.desc,
      scheduledDate: m.date,
      completedDate: m.done ? m.date : undefined,
      isCompleted: m.done,
      isCurrent: m.curr,
      location: m.step <= 3 ? 'Houston / Dallas, USA' : 'Lagos, Nigeria',
    });
  }

  // 6. Seed saved preferences for test customer
  const firstVehicles = (await dbService.vehicles.list({ limit: 3 })).vehicles;
  for (const v of firstVehicles) {
    await dbService.saved.saveVehicle(customer.id, v.id, 'Saved from showroom search');
  }

  console.log('[Seed] Database seeding completed successfully!');
}

// Standalone execution
if (process.argv[1] && process.argv[1].includes('seed.ts')) {
  seedDatabase(process.argv.includes('--force'))
    .then(() => {
      console.log('[Seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
