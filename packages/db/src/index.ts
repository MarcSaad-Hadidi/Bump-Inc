import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export { authSchema } from './auth-schema.js';
export { migrateDatabase } from './migration.js';
export { organizationAudit, organizationSettings, systemProbes } from './schema.js';
export {
  assertRuntimeRole,
  setTenantContext,
  TenantAccessError,
  type TenantRole,
  type Transaction,
  withTenant,
} from './tenant.js';
export { schema };

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(url: string) {
  const pool = new pg.Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 3_000,
    statement_timeout: 3_000,
  });
  return { db: drizzle(pool, { schema }), pool };
}
