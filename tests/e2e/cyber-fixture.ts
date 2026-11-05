import { randomUUID } from 'node:crypto';
import { apiEnvSchema, parseEnv } from '@bump/contracts';
import { createDatabase, migrateDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import type { MailMessage } from '@bump/integrations';

export async function createCyberBrowserPerson() {
  const runtime = process.env['DATABASE_URL'],
    migration = process.env['MIGRATION_DATABASE_URL'];
  if (
    !runtime ||
    !migration ||
    !new URL(runtime).pathname.endsWith('_test') ||
    !new URL(migration).pathname.endsWith('_test')
  )
    throw new Error('Dedicated test database required');
  await migrateDatabase(migration);
  const db = createDatabase(runtime),
    operator = createDatabase(migration);
  const env = parseEnv(apiEnvSchema, {
    ...process.env,
    NODE_ENV: 'test',
    AUTH_BASE_URL: 'http://127.0.0.1:3101',
    AUTH_ALLOW_SIGNUP: 'true',
    AUTH_ENABLED: 'true',
    LOG_LEVEL: 'silent',
  });
  const mail: MailMessage[] = [];
  const auth = createAuth(db.db, env, async (message) => {
    mail.push(message);
  });
  const email = `synthetic-browser-${randomUUID()}@example.invalid`,
    password = `Synthetic-browser-${randomUUID()}!`;
  const enrolled = await auth.api.signUpEmail({
    body: { name: 'Consultant synthétique', email, password },
  });
  const userId = enrolled.user.id;
  const link = mail[0]?.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error('Synthetic verification email missing');
  const verified = await auth.handler(new Request(link));
  if (![200, 302].includes(verified.status)) throw new Error('Synthetic email verification failed');
  mail.length = 0;
  const organizations: string[] = [];
  return {
    email,
    password,
    userId,
    organizations,
    async cleanup() {
      try {
        for (const org of organizations) {
          for (const table of [
            'cyber_event',
            'cyber_report',
            'cyber_retest',
            'cyber_task',
            'cyber_evidence',
            'cyber_observation',
            'cyber_finding',
            'cyber_scan',
            'cyber_audit',
            'cyber_source',
            'cyber_mandate',
            'cyber_asset',
            'cyber_client',
            'cyber_role',
            'execution_outbox',
            'execution_event',
            'execution_attempt',
            'execution_job',
            'execution_control',
            'engagement_approval',
            'engagement_version',
            'engagement',
            'organization_audit',
            'organization_settings',
            'member',
          ])
            await operator.pool.query(`DELETE FROM ${table} WHERE organization_id=$1`, [org]);
          await operator.pool.query('DELETE FROM organization WHERE id=$1', [org]);
        }
        await operator.pool.query('DELETE FROM "user" WHERE id=$1', [userId]);
      } finally {
        await db.pool.end();
        await operator.pool.end();
      }
    },
  };
}
