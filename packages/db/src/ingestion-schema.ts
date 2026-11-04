import type { AuditFormat, CanonicalObservation, EngagementTarget } from '@bump/contracts';
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
import { engagementVersion } from './engagement-schema.js';
import { executionJob } from './execution-schema.js';

export const auditImport = pgTable(
  'audit_import',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id),
    actorUserId: text('actor_user_id').notNull(),
    engagementId: uuid('engagement_id').notNull(),
    expectedRevision: integer('expected_revision').notNull(),
    target: jsonb('target').$type<EngagementTarget>().notNull(),
    format: text('format').$type<AuditFormat>().notNull(),
    importerVersion: text('importer_version').notNull(),
    sourceName: text('source_name').notNull(),
    sourceSha256: text('source_sha256').notNull(),
    byteCount: integer('byte_count').notNull(),
    storageBackend: text('storage_backend', { enum: ['local', 's3'] }).notNull(),
    storageKey: text('storage_key').notNull(),
    fingerprint: text('fingerprint').notNull(),
    requestId: uuid('request_id').notNull(),
    status: text('status', { enum: ['staging', 'ready'] })
      .notNull()
      .default('staging'),
    executionJobId: uuid('execution_job_id').unique(),
    observationCount: integer('observation_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    unique('audit_import_org_id_unique').on(table.organizationId, table.id),
    unique('audit_import_fingerprint_unique').on(table.organizationId, table.fingerprint),
    foreignKey({
      name: 'audit_import_same_organization_version_fk',
      columns: [table.organizationId, table.engagementId, table.expectedRevision],
      foreignColumns: [
        engagementVersion.organizationId,
        engagementVersion.engagementId,
        engagementVersion.revision,
      ],
    }),
    foreignKey({
      name: 'audit_import_same_organization_job_fk',
      columns: [table.organizationId, table.executionJobId],
      foreignColumns: [executionJob.organizationId, executionJob.id],
    }),
    check(
      'audit_import_source_check',
      sql`${table.byteCount} BETWEEN 1 AND 524288 AND length(${table.sourceName}) BETWEEN 1 AND 255 AND ${table.sourceSha256} ~ '^[a-f0-9]{64}$' AND ${table.fingerprint} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'audit_import_format_check',
      sql`${table.format} IN ('bump-json-v1','sarif-2.1.0','cyclonedx-1.6-json') AND ${table.importerVersion} = 'bump-ingestion-v1'`,
    ),
    check(
      'audit_import_storage_check',
      sql`${table.storageBackend} IN ('local','s3') AND ${table.storageKey} = ${table.organizationId} || '/' || ${table.id}::text || '.json'`,
    ),
    check(
      'audit_import_state_check',
      sql`(${table.status} = 'staging' AND ${table.executionJobId} IS NULL AND ${table.readyAt} IS NULL AND ${table.observationCount} IS NULL AND ${table.completedAt} IS NULL) OR (${table.status} = 'ready' AND ${table.executionJobId} IS NOT NULL AND ${table.readyAt} IS NOT NULL AND ((${table.observationCount} IS NULL AND ${table.completedAt} IS NULL) OR (${table.observationCount} IS NOT NULL AND ${table.observationCount} BETWEEN 0 AND 1000 AND ${table.completedAt} IS NOT NULL)))`,
    ),
  ],
);

export const auditImportRequest = pgTable(
  'audit_import_request',
  {
    organizationId: text('organization_id').notNull(),
    actorUserId: text('actor_user_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    importId: uuid('import_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.actorUserId, table.idempotencyKey] }),
    foreignKey({
      name: 'audit_import_request_same_organization_fk',
      columns: [table.organizationId, table.importId],
      foreignColumns: [auditImport.organizationId, auditImport.id],
    }),
    check(
      'audit_import_request_identity_check',
      sql`${table.requestHash} ~ '^[a-f0-9]{64}$' AND ${table.idempotencyKey} ~ '^[a-zA-Z0-9_-]{1,128}$'`,
    ),
  ],
);

export const auditObservation = pgTable(
  'audit_observation',
  {
    organizationId: text('organization_id').notNull(),
    importId: uuid('import_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    observation: jsonb('observation').$type<CanonicalObservation>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.importId, table.ordinal] }),
    foreignKey({
      name: 'audit_observation_same_organization_fk',
      columns: [table.organizationId, table.importId],
      foreignColumns: [auditImport.organizationId, auditImport.id],
    }),
    check('audit_observation_ordinal_check', sql`${table.ordinal} BETWEEN 0 AND 999`),
    check(
      'audit_observation_shape_check',
      sql`jsonb_typeof(${table.observation}) = 'object' AND ${table.observation} ?& ARRAY['kind','title','reportedSeverity','sourcePointer'] AND jsonb_typeof(${table.observation}->'kind') = 'string' AND ${table.observation}->>'kind' IN ('issue','component') AND jsonb_typeof(${table.observation}->'reportedSeverity') = 'string' AND ${table.observation}->>'reportedSeverity' IN ('unknown','info','low','medium','high','critical') AND jsonb_typeof(${table.observation}->'title') = 'string' AND length(${table.observation}->>'title') BETWEEN 1 AND 512 AND jsonb_typeof(${table.observation}->'sourcePointer') = 'string' AND length(${table.observation}->>'sourcePointer') BETWEEN 1 AND 512`,
    ),
  ],
);
