import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organization } from './auth-schema.js';

export {
  account,
  invitation,
  member,
  organization,
  session,
  user,
  verification,
} from './auth-schema.js';

export const systemProbes = pgTable('system_probes', {
  id: uuid('id').primaryKey(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizationSettings = pgTable(
  'organization_settings',
  {
    organizationId: text('organization_id')
      .primaryKey()
      .references(() => organization.id),
    locale: text('locale', { enum: ['en', 'fr'] })
      .notNull()
      .default('en'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('organization_settings_locale_check', sql`${table.locale} IN ('en', 'fr')`)],
);

export const organizationAudit = pgTable(
  'organization_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id),
    actorUserId: text('actor_user_id').notNull(),
    action: text('action').notNull(),
    targetId: text('target_id'),
    requestId: uuid('request_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('organization_audit_organization_created_idx').on(table.organizationId, table.createdAt),
  ],
);
