import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabaseSchema } from '../database/sqlite';
import { SqliteDatabaseService } from '../repositories/sqliteRepositories';
import { VehicleFilterParams } from '../repositories/interfaces';

async function runTests() {
  console.log('--- STARTING REPOSITORY LAYER TEST SUITE ---');

  // Test with an isolated test SQLite in-memory or temporary database
  const testDb = new DatabaseSync(':memory:');
  testDb.exec('PRAGMA foreign_keys = ON;');
  initializeDatabaseSchema(testDb);
  const service = new SqliteDatabaseService(testDb);

  console.log('✓ Test 1: Database schema & migrations initialized successfully');

  // Test 2: Users & Roles
  const user = await service.users.create({
    email: 'test@example.com',
    passwordHash: 'hash_xyz',
    fullName: 'Test User',
    phone: '+234 800 000 0000',
    role: 'customer',
    status: 'active',
  });
  assert.ok(user.id.startsWith('usr_'), 'User ID must be server-generated with usr_ prefix');
  assert.equal(user.email, 'test@example.com');
  const foundUser = await service.users.findByEmail('TEST@example.com');
  assert.ok(foundUser, 'User must be found case-insensitively');
  console.log('✓ Test 2: User creation & lookup passed');

  // Test 3: Vehicles & Indexed Queries
  const vehicle = await service.vehicles.create(
    {
      make: 'Toyota',
      model: 'RAV4 XLE',
      year: 2022,
      trim: 'Premium',
      priceNgn: 35000000,
      priceUsd: 23000,
      mileage: 30000,
      mileageUnit: 'km',
      transmission: 'Automatic',
      fuelType: 'Petrol',
      location: 'Lagos',
      city: 'Lekki',
      state: 'Lagos',
      verified: true,
      cleanTitle: true,
      condition: 'Nigeria Used',
      bodyType: 'SUV',
      engine: '2.5L 4-Cylinder',
      driveType: 'AWD',
      color: 'Midnight Black',
      seats: 5,
      stockId: 'SA-2022-RAV4-TEST-001',
      description: 'Test RAV4 description',
      features: ['Sunroof', 'Leather'],
      inspectionPassed: true,
      status: 'available',
    },
    ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
  );

  assert.ok(vehicle.id.startsWith('veh_'), 'Vehicle ID must be server-generated');
  const images = await service.vehicles.getImages(vehicle.id);
  assert.equal(images.length, 2, 'Vehicle images must be stored and linked');

  // Test Indexed queries
  const filters: VehicleFilterParams = {
    make: 'Toyota',
    condition: 'Nigeria Used',
    minPrice: 30000000,
    maxPrice: 40000000,
  };
  const searchResults = await service.vehicles.list(filters);
  assert.equal(searchResults.total, 1);
  assert.equal(searchResults.vehicles[0].id, vehicle.id);

  const byStock = await service.vehicles.findByStockId('SA-2022-RAV4-TEST-001');
  assert.ok(byStock, 'Must find vehicle by stock ID');
  console.log('✓ Test 3: Vehicle creation, indexing, and image linking passed');

  // Test 4: Offers
  const offer = await service.offers.create({
    carId: vehicle.id,
    carName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    userId: user.id,
    name: user.fullName,
    phone: user.phone,
    offerAmountNgn: 33000000,
    vehicleListingPriceNgn: vehicle.priceNgn,
    paymentMethod: 'Bank Wire / Direct Transfer',
    notes: 'Immediate payment ready',
    status: 'Pending Review',
  });
  assert.ok(offer.id.startsWith('ofr_'), 'Offer ID must be server-generated');
  const updatedOffer = await service.offers.updateStatus(offer.id, 'Countered', 34000000, 'Counter-offer extended');
  assert.equal(updatedOffer?.status, 'Countered');
  assert.equal(updatedOffer?.counterAmountNgn, 34000000);
  console.log('✓ Test 4: Offer creation & status transition passed');

  // Test 5: Inspections
  const insp = await service.inspections.create({
    carId: vehicle.id,
    carName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    userId: user.id,
    name: user.fullName,
    phone: user.phone,
    date: '2026-03-25',
    timeSlot: '10:00 AM - 12:00 PM',
    hubLocation: 'Lekki Phase 1 Hub',
    inspectionType: 'Physical Inspection',
    status: 'Pending',
  });
  assert.ok(insp.id.startsWith('insp_'));
  const updatedInsp = await service.inspections.updateStatus(insp.id, 'Confirmed', 'Hub inspector assigned');
  assert.equal(updatedInsp?.status, 'Confirmed');
  console.log('✓ Test 5: Vehicle inspection booking & status update passed');

  // Test 6: Rental Vehicles & Availability Transaction Boundary
  const rentalCar = await service.rentals.createVehicle({
    name: 'Toyota Corolla 2021',
    category: 'Economy',
    pricePerDayNgn: 35000,
    transmission: 'Automatic',
    fuel: 'Petrol',
    seats: 5,
    imageUrl: 'https://example.com/corolla.jpg',
    available: true,
    rating: 4.8,
    location: 'Lagos',
    status: 'active',
  });

  // Booking 1: 2026-04-01 to 2026-04-05
  const booking1 = await service.rentals.createBookingWithBlock({
    carId: rentalCar.id,
    carName: rentalCar.name,
    userId: user.id,
    customerName: user.fullName,
    phone: user.phone,
    pickupDate: '2026-04-01',
    returnDate: '2026-04-05',
    pickupLocation: 'Victoria Island Hub',
    days: 4,
    dailyRateNgn: rentalCar.pricePerDayNgn,
    withChauffeur: false,
    withInsurance: true,
    chauffeurFeeNgn: 0,
    insuranceFeeNgn: 20000,
    totalNgn: 160000,
    status: 'Active Reservation',
  });
  assert.ok(booking1.id.startsWith('RNT-'));

  // Booking 2 (Conflicting Overlap): 2026-04-03 to 2026-04-07
  let conflictCaught = false;
  try {
    await service.rentals.createBookingWithBlock({
      carId: rentalCar.id,
      carName: rentalCar.name,
      customerName: 'Another Renter',
      phone: '+234 809 999 9999',
      pickupDate: '2026-04-03',
      returnDate: '2026-04-07',
      pickupLocation: 'Ikeja Airport Hub',
      days: 4,
      dailyRateNgn: rentalCar.pricePerDayNgn,
      withChauffeur: false,
      withInsurance: false,
      chauffeurFeeNgn: 0,
      insuranceFeeNgn: 0,
      totalNgn: 140000,
      status: 'Active Reservation',
    });
  } catch (err: any) {
    conflictCaught = true;
    assert.match(err.message, /already booked or blocked/);
  }
  assert.ok(conflictCaught, 'Rental transaction MUST reject overlapping booking');

  // Cancel booking1, releasing block
  await service.rentals.cancelBooking(booking1.id);
  const isNowAvailable = await service.rentals.checkAvailability(rentalCar.id, '2026-04-01', '2026-04-05');
  assert.ok(isNowAvailable, 'Vehicle must be available after cancellation');
  console.log('✓ Test 6: Rental availability conflict check & transaction boundaries passed');

  // Test 7: Import Requests & Tracking Events
  const trackingId = 'SHA-2026-TEST';
  const importReq = await service.imports.createRequest({
    trackingId,
    userId: user.id,
    customerName: user.fullName,
    phone: user.phone,
    make: 'Lexus',
    model: 'GX 460',
    year: 2022,
    vin: 'JTJBM7FX8N5192847',
    features: ['Captain Chairs', 'Mark Levinson Sound'],
    deliveryCity: 'Abuja',
    destinationPort: 'Tin Can Island Port, Lagos',
    originPort: 'Port of Newark, NJ',
    status: 'Sourcing Started',
  });
  assert.equal(importReq.trackingId, trackingId);

  await service.imports.addMilestone({
    trackingId,
    stepOrder: 1,
    title: 'Auction Won',
    scheduledDate: '2026-03-01',
    completedDate: '2026-03-01',
    isCompleted: true,
    isCurrent: false,
  });

  await service.imports.addTrackingEvent({
    trackingId,
    eventTimestamp: new Date().toISOString(),
    status: 'Vehicle Inspected at Manheim Auto Auction',
    location: 'Dallas, TX',
  });

  const foundOrder = await service.imports.findByTrackingId(trackingId);
  assert.ok(foundOrder);
  const milestones = await service.imports.getMilestones(trackingId);
  assert.equal(milestones.length, 1);
  assert.equal(milestones[0].title, 'Auction Won');

  // Ensure non-existent order lookup returns null (No fabricated data)
  const nonExistent = await service.imports.findByTrackingId('FAKE-TRACKING-1234');
  assert.equal(nonExistent, null, 'Non-existent tracking code must return null without fabricating data');
  console.log('✓ Test 7: Import request, milestones, and truthfulness check passed');

  // Test 8: Sell Car & Valuation History
  const sellReq = await service.sell.create({
    userId: user.id,
    sellerName: user.fullName,
    phone: user.phone,
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    mileage: 60000,
    condition: 'Nigeria Used',
    location: 'Lagos',
    askingPriceNgn: 18000000,
    estimatedValueNgn: 17500000,
    status: 'Under Review',
  });
  assert.ok(sellReq.id.startsWith('sell_'));

  const valRecord = await service.sell.recordValuationHistory({
    sellSubmissionId: sellReq.id,
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    mileage: 60000,
    condition: 'Nigeria Used',
    algorithmVersion: 'v2.1-ngn-market',
    baseValueNgn: 22000000,
    mileageFactor: 0.85,
    conditionFactor: 0.93,
    finalValuationNgn: 17391000,
  });
  assert.ok(valRecord.id.startsWith('val_'));
  const valHist = await service.sell.getValuationHistory(sellReq.id);
  assert.equal(valHist.length, 1);
  console.log('✓ Test 8: Sell car submission & valuation history passed');

  // Test 9: Concierge Requests
  const concierge = await service.concierge.create({
    userId: user.id,
    fullName: user.fullName,
    phone: user.phone,
    desiredMake: 'Mercedes-Benz',
    desiredModel: 'GLE 450',
    yearRange: '2021 - 2023',
    maxBudgetNgn: 65000000,
    preferredCondition: 'Foreign Used (Tokunbo)',
    status: 'Request Received',
  });
  assert.ok(concierge.id.startsWith('req_'));
  console.log('✓ Test 9: Concierge request creation passed');

  // Test 10: Saved Preferences & Comparison
  await service.saved.saveVehicle(user.id, vehicle.id, 'My dream SUV');
  const savedList = await service.saved.getSavedVehicles(user.id);
  assert.ok(savedList.includes(vehicle.id));

  await service.saved.saveComparisonList(user.id, 'Family SUVs', [vehicle.id]);
  const comparedIds = await service.saved.getComparisonList(user.id);
  assert.equal(comparedIds.length, 1);
  assert.equal(comparedIds[0], vehicle.id);
  console.log('✓ Test 10: Saved preferences & comparison list passed');

  // Test 11: Cache with TTL & Pruning
  await service.cache.set('nhtsa:models:toyota', 'nhtsa', ['Camry', 'Corolla', 'RAV4'], 3600);
  const cachedData = await service.cache.get('nhtsa:models:toyota');
  assert.deepEqual(cachedData, ['Camry', 'Corolla', 'RAV4']);

  // Set expired item
  await service.cache.set('expired_key', 'other', { temp: true }, -10);
  const expiredData = await service.cache.get('expired_key');
  assert.equal(expiredData, null, 'Expired cache entries must return null');
  console.log('✓ Test 11: Cache storage, TTL expiration, and retrieval passed');

  // Test 12: Audit Logging
  const audit = await service.audit.record({
    actorUserId: user.id,
    actorRole: 'customer',
    action: 'SUBMIT_PRICE_OFFER',
    resourceType: 'offer',
    resourceId: offer.id,
    changesJson: JSON.stringify({ amountNgn: 33000000 }),
  });
  assert.ok(audit.id.startsWith('aud_'));
  const logs = await service.audit.list('offer', offer.id);
  assert.equal(logs.length, 1);
  console.log('✓ Test 12: Audit logging passed');

  console.log('\nALL 12 REPOSITORY TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
