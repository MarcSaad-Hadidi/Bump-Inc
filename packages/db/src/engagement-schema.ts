import type { EngagementScope } from '@bump/contracts';
import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { organization } from './auth-schema.js';

export const engagement = pgTable(
  'engagement',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id),
    currentRevision: integer('current_revision').notNull().default(1),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: text('revoked_by'),
    revocationReason: text('revocation_reason'),
  },
  (table) => [
    unique('engagement_organization_id_id_unique').on(table.organizationId, table.id),
    check('engagement_revision_positive', sql`${table.currentRevision} > 0`),
    check(
      'engagement_revocation_complete',
      sql`(${table.revokedAt} IS NULL AND ${table.revokedBy} IS NULL AND ${table.revocationReason} IS NULL) OR (${table.revokedAt} IS NOT NULL AND ${table.revokedBy} IS NOT NULL AND ${table.revocationReason} IS NOT NULL AND length(trim(${table.revocationReason})) > 0)`,
    ),
  ],
);

export const engagementVersion = pgTable(
  'engagement_version',
  {
    organizationId: text('organization_id').notNull(),
    engagementId: uuid('engagement_id').notNull(),
    revision: integer('revision').notNull(),
    objective: text('objective').notNull(),
    responsibleUserId: text('responsible_user_id').notNull(),
    scope: jsonb('scope').$type<EngagementScope>().notNull(),
    authorizationText: text('authorization_text').notNull(),
    authorizationSha256: text('authorization_sha256').notNull(),
    sourceReference: text('source_reference'),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.engagementId, table.revision] }),
    foreignKey({
      name: 'engagement_version_same_organization_fk',
      columns: [table.organizationId, table.engagementId],
      foreignColumns: [engagement.organizationId, engagement.id],
    }),
    check('engagement_version_revision_positive', sql`${table.revision} > 0`),
    check('engagement_version_valid_interval', sql`${table.validFrom} < ${table.validUntil}`),
    check('engagement_version_digest_format', sql`${table.authorizationSha256} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const engagementApproval = pgTable(
  'engagement_approval',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id').notNull(),
    engagementId: uuid('engagement_id').notNull(),
    revision: integer('revision').notNull(),
    approverUserId: text('approver_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('engagement_approval_version_unique').on(
      table.organizationId,
      table.engagementId,
      table.revision,
    ),
    foreignKey({
      name: 'engagement_approval_same_organization_version_fk',
      columns: [table.organizationId, table.engagementId, table.revision],
      foreignColumns: [
        engagementVersion.organizationId,
        engagementVersion.engagementId,
        engagementVersion.revision,
      ],
    }),
  ],
);
