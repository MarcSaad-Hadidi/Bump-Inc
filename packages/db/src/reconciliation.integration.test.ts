import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { expect, it } from 'vitest';
import { migrateDatabase } from './migration.js';

it.each(['main', 'security'])(
  'upgrades the %s lineage without replaying applied SQL',
  async (lineage) => {
    const url = process.env.MIGRATION_DATABASE_URL;
    if (process.env.NODE_ENV !== 'test' || !url || !new URL(url).pathname.endsWith('_test'))
      throw new Error('Disposable test database required');
    const admin = new pg.Pool({ connectionString: url });
    const name = `cyber_${randomUUID().replaceAll('-', '')}_test`;
    const target = new URL(url);
    target.pathname = `/${name}`;
    let client: pg.Pool | undefined;
    try {
      await admin.query(`CREATE DATABASE ${name}`);
      client = new pg.Pool({ connectionString: target.href });
      await client.query(
        'CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)',
      );
      const tags = [
        '0000_marvelous_invaders',
        ...(lineage === 'main'
          ? ['0001_bizarre_slyde']
          : [
              '0001_identity_tenancy',
              '0002_engagement_authorization',
              '0003_execution_engine',
              '0004_audit_ingestion',
            ]),
      ];
      for (const tag of tags) {
        const source = await readFile(
          fileURLToPath(new URL(`../migrations/${tag}.sql`, import.meta.url)),
          'utf8',
        );
        await client.query(source);
        await client.query(
          'INSERT INTO drizzle.__drizzle_migrations(hash, created_at) VALUES ($1,$2)',
          [createHash('sha256').update(source).digest('hex'), 1792787734535],
        );
      }
      if (lineage === 'main')
        await client.query(
          "INSERT INTO audits (id,company_name,domain) VALUES ('10000000-0000-4000-8000-000000000001','Synthetic preserved','example.invalid')",
        );
      await migrateDatabase(target.href);
      await migrateDatabase(target.href);
      expect(
        (await client.query('SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations')).rows[0]
          .n,
      ).toBe(7);
      if (lineage === 'main')
        expect((await client.query('SELECT company_name FROM audits')).rows[0].company_name).toBe(
          'Synthetic preserved',
        );
      expect(
        (await client.query("SELECT to_regclass('public.audit_observation') AS t")).rows[0].t,
      ).toBe('audit_observation');
    } finally {
      await client?.end();
      await admin.query(`DROP DATABASE IF EXISTS ${name}`);
      await admin.end();
    }
  },
);
