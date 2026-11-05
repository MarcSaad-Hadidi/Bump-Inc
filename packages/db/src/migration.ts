import { fileURLToPath } from 'node:url';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import pg from 'pg';

export async function migrateDatabase(url: string): Promise<void> {
  const pool = new pg.Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 60_000,
    lock_timeout: 10_000,
  });
  try {
    const migrations = readMigrationFiles({
      migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
    });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('bump-migrations', 0))");
      await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
      await client.query(
        'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)',
      );
      const applied = await client.query<{ hash: string }>(
        'SELECT hash FROM drizzle.__drizzle_migrations',
      );
      const known = new Set(migrations.map((migration) => migration.hash));
      if (applied.rows.some((row) => !known.has(row.hash)))
        throw new Error('Unknown migration lineage; operator review required');
      const hashes = new Set(applied.rows.map((row) => row.hash));
      // Main and PR02–05 diverged. Hashes, not their latest timestamps, identify
      // already-applied immutable SQL. Apply missing members in reviewed journal order.
      for (const migration of migrations) {
        if (hashes.has(migration.hash)) continue;
        for (const statement of migration.sql) await client.query(statement);
        await client.query(
          'INSERT INTO drizzle.__drizzle_migrations(hash, created_at) VALUES ($1, $2)',
          [migration.hash, migration.folderMillis],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
