import { getPostgresPool, initializePostgresSchema, getDatabaseUrl } from './postgres';
import { PostgresDatabaseService } from '../repositories/postgresRepositories';
import { getDatabase, initializeDatabaseSchema } from './sqlite';
import { SqliteDatabaseService } from '../repositories/sqliteRepositories';
import { IDatabaseService } from '../repositories/interfaces';

let serviceInstance: IDatabaseService | null = null;
let activeDbType: 'neon-postgres' | 'sqlite' = 'neon-postgres';
let initializationPromise: Promise<void> = Promise.resolve();

export function getDatabaseType(): 'neon-postgres' | 'sqlite' {
  return activeDbType;
}

export function getDatabaseService(): IDatabaseService {
  if (!serviceInstance) {
    const useSqlite = process.env.USE_SQLITE === 'true';

    if (useSqlite) {
      console.log('[Database] Initializing SQLite local database (USE_SQLITE=true)...');
      const db = getDatabase();
      initializeDatabaseSchema(db);
      serviceInstance = new SqliteDatabaseService(db);
      activeDbType = 'sqlite';
    } else {
      console.log('[Database] Connecting to Neon Cloud PostgreSQL Database...');
      const pool = getPostgresPool();
      const postgresService = new PostgresDatabaseService(pool);
      initializationPromise = postgresService.initialize();
      serviceInstance = postgresService;
      activeDbType = 'neon-postgres';
    }
  }
  return serviceInstance;
}

export function getDatabaseReady(): Promise<void> {
  return initializationPromise;
}
