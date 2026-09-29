import { getPostgresPool, initializePostgresSchema, getDatabaseUrl } from './postgres';
import { PostgresDatabaseService } from '../repositories/postgresRepositories';
import { getDatabase, initializeDatabaseSchema } from './sqlite';
import { SqliteDatabaseService } from '../repositories/sqliteRepositories';
import { IDatabaseService } from '../repositories/interfaces';

let serviceInstance: IDatabaseService | null = null;
let activeDbType: 'neon-postgres' | 'sqlite' = 'neon-postgres';
let initializationPromise: Promise<void> = Promise.resolve();

const DEFAULT_SITE_SETTINGS: Array<{
  settingKey: string;
  settingValue: string;
  valueType: 'string' | 'number' | 'json';
  label?: string;
  description?: string;
}> = [
  // Import duty calculator rates
  { settingKey: 'import.usd_to_ngn', settingValue: '1500', valueType: 'number', label: 'USD → NGN rate', description: 'Exchange rate used by the import duty estimator.' },
  { settingKey: 'import.freight_default_usd', settingValue: '1800', valueType: 'number', label: 'Default freight (USD)', description: 'Sea freight from major US ports.' },
  { settingKey: 'import.freight_houston_usd', settingValue: '1950', valueType: 'number', label: 'Houston freight (USD)', description: 'Sea freight premium from Houston.' },
  { settingKey: 'import.inland_towing_usd', settingValue: '450', valueType: 'number', label: 'Inland towing (USD)', description: 'US-side inland towing.' },
  { settingKey: 'import.duty_rate', settingValue: '0.35', valueType: 'number', label: 'Import duty rate (ICE)', description: 'CIF-based Nigerian import duty.' },
  { settingKey: 'import.duty_rate_ev', settingValue: '0.10', valueType: 'number', label: 'Import duty rate (EV)', description: 'Reduced duty for electric vehicles.' },
  { settingKey: 'import.levy_rate', settingValue: '0.15', valueType: 'number', label: 'ECOWAS levy (ICE)', description: 'ECOWAS levy rate.' },
  { settingKey: 'import.levy_rate_ev', settingValue: '0.05', valueType: 'number', label: 'ECOWAS levy (EV)', description: 'ECOWAS levy rate for EVs.' },
  { settingKey: 'import.vat_rate', settingValue: '0.075', valueType: 'number', label: 'VAT rate', description: 'VAT applied to import.' },
  { settingKey: 'import.terminal_charges_ngn', settingValue: '380000', valueType: 'number', label: 'Terminal charges (NGN)', description: 'Port terminal charges.' },
  { settingKey: 'import.clearing_fee_ngn', settingValue: '450000', valueType: 'number', label: 'Clearing fee (NGN)', description: 'Customs clearing fee.' },
  // Rental add-on fees
  { settingKey: 'rental.chauffeur_fee_day', settingValue: '25000', valueType: 'number', label: 'Chauffeur fee / day (NGN)', description: 'Daily chauffeur add-on.' },
  { settingKey: 'rental.insurance_fee_day', settingValue: '10000', valueType: 'number', label: 'Rental insurance / day (NGN)', description: 'Daily insurance add-on.' },
  // Sell valuation base prices
  { settingKey: 'valuation.base_prices', settingValue: JSON.stringify({ Toyota: 28000000, Lexus: 38000000, Mercedes: 45000000, Honda: 22000000, Hyundai: 18000000, Ford: 24000000 }), valueType: 'json', label: 'Valuation base prices (NGN)', description: 'Base market values per make.' },
];

async function seedDefaultSettings(service: IDatabaseService): Promise<void> {
  for (const entry of DEFAULT_SITE_SETTINGS) {
    try {
      const existing = await service.settings.getKey(entry.settingKey);
      if (!existing) {
        await service.settings.set(entry);
      }
    } catch (err: any) {
      console.warn('[Settings] Seed failed for', entry.settingKey, ':', err?.message);
    }
  }
}

export function getDatabaseType(): 'neon-postgres' | 'sqlite' {
  return activeDbType;
}

export function getDatabaseService(): IDatabaseService {
  if (!serviceInstance) {
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
    const useSqlite = process.env.USE_SQLITE === 'true' || !hasDatabaseUrl;

    if (useSqlite) {
      console.log('[Database] Initializing SQLite local database (USE_SQLITE=true or no DATABASE_URL)...');
      const db = getDatabase();
      initializeDatabaseSchema(db);
      serviceInstance = new SqliteDatabaseService(db);
      activeDbType = 'sqlite';
      const seeding = seedDefaultSettings(serviceInstance);
      initializationPromise = seeding.catch((err) => {
        console.warn('[Settings] Seeding failed:', err?.message);
      });
    } else {
      console.log('[Database] Connecting to Neon Cloud PostgreSQL Database...');
      try {
        const pool = getPostgresPool();
        const postgresService = new PostgresDatabaseService(pool);
        initializationPromise = postgresService
          .initialize()
          .then(() => seedDefaultSettings(postgresService))
          .catch((err) => {
            console.warn('[Neon DB] Postgres initialization failed, falling back to SQLite:', err.message);
            const db = getDatabase();
            initializeDatabaseSchema(db);
            serviceInstance = new SqliteDatabaseService(db);
            activeDbType = 'sqlite';
            return seedDefaultSettings(serviceInstance!).catch((seedErr: any) => {
              console.warn('[Settings] Seeding failed:', seedErr?.message);
            });
          });
        serviceInstance = postgresService;
        activeDbType = 'neon-postgres';
      } catch (err: any) {
        console.warn('[Neon DB] Postgres connection failed, falling back to SQLite:', err.message);
        const db = getDatabase();
        initializeDatabaseSchema(db);
        serviceInstance = new SqliteDatabaseService(db);
        activeDbType = 'sqlite';
        const seedingFallback = seedDefaultSettings(serviceInstance);
        initializationPromise = seedingFallback.catch((seedErr) => {
          console.warn('[Settings] Seeding failed:', seedErr?.message);
        });
      }
    }
  }
  return serviceInstance;
}

export function getDatabaseReady(): Promise<void> {
  return initializationPromise;
}
