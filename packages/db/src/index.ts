import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export { createAuditRepository } from './audits.js';
export { migrateDatabase } from './migration.js';
export { auditFindings, audits, systemProbes } from './schema.js';
export { schema };

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
