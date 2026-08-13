import { runMigrations } from './database';
import { seedDatabaseIfEmpty } from './store';
import { getDatabasePath } from './database';

runMigrations();
seedDatabaseIfEmpty(true);
console.log(`Database migrated and seeded at ${getDatabasePath()}`);
