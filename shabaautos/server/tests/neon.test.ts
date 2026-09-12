import assert from 'node:assert/strict';
import { getPostgresPool } from '../database/postgres';
import { PostgresDatabaseService } from '../repositories/postgresRepositories';

async function runNeonTests() {
  console.log('--- TESTING NEON POSTGRESQL REPOSITORY LAYER ---');
  const pool = getPostgresPool();
  const service = new PostgresDatabaseService(pool);

  await service.initialize();
  console.log('✓ Test 1: Neon schema verified');

  // Verify vehicles count from Neon
  const { vehicles, total } = await service.vehicles.list({ limit: 5 });
  console.log(`✓ Test 2: Listed ${vehicles.length} vehicles from Neon DB (Total: ${total})`);
  assert.ok(total > 0, 'Total vehicles in Neon must be greater than 0');

  // Verify a vehicle by stockId or findById
  const sample = vehicles[0];
  const found = await service.vehicles.findById(sample.id);
  assert.ok(found, 'Vehicle must be retrievable by ID from Neon');
  assert.equal(found.make, sample.make);
  console.log(`✓ Test 3: Vehicle ${found.make} ${found.model} retrieved successfully`);

  // Verify rentals
  const rentals = await service.rentals.listVehicles();
  console.log(`✓ Test 4: Listed ${rentals.length} rental vehicles from Neon DB`);
  assert.ok(rentals.length > 0, 'Rentals must exist');

  // Verify shipment imports
  const imports = await service.imports.listRequests();
  console.log(`✓ Test 5: Listed ${imports.length} import tracking records from Neon DB`);
  assert.ok(imports.length > 0, 'Imports must exist');

  console.log('--- ALL NEON TESTS PASSED SUCCESSFULLY ---');
  await pool.end();
}

runNeonTests().catch((err) => {
  console.error('[Neon Test Error]:', err);
  process.exit(1);
});
