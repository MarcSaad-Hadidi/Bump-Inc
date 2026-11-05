import { databaseEnvSchema, parseEnv } from '@bump/contracts';
import { migrateDatabase } from './migration.js';

try {
  const env = parseEnv(databaseEnvSchema);
  await migrateDatabase(env.MIGRATION_DATABASE_URL);
  process.stdout.write('Database migrations applied.\n');
} catch {
  process.stderr.write(
    'Database migration failed; inspect database connectivity and reviewed migration files.\n',
  );
  process.exitCode = 1;
}
