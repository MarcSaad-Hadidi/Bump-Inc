import type { EngagementAction, EngagementTarget, ExecutionWorkInput } from '@bump/contracts';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
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

export const executionStatuses = [
  'queued',
  'running',
  'retry_wait',
  'succeeded',
  'cancelled',
  'denied',
  'dead_letter',
] as const;

export const executionJob = pgTable(
  'execution_job',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id),
    actorUserId: text('actor_user_id').notNull(),
    engagementId: uuid('engagement_id').notNull(),
    expectedRevision: integer('expected_revision').notNull(),
    target: jsonb('target').$type<EngagementTarget>().notNull(),
    action: text('action').$type<EngagementAction>().notNull(),
    kind: text('kind', { enum: ['synthetic', 'audit.import'] })
      .notNull()
      .default('synthetic'),
    payload: jsonb('payload').$type<ExecutionWorkInput['payload']>().notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    requestId: uuid('request_id').notNull(),
    status: text('status', { enum: executionStatuses }).notNull().default('queued'),
    attempt: integer('attempt').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull(),
    timeoutMs: integer('timeout_ms').notNull(),
    backoffMs: integer('backoff_ms').notNull(),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    leaseToken: uuid('lease_token'),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }),
    cancelRequestedAt: timestamp('cancel_requested_at', { withTimezone: true }),
    result: jsonb('result').$type<{ completed: true }>(),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => [
    unique('execution_job_org_id_unique').on(table.organizationId, table.id),
    unique('execution_job_idempotency_unique').on(
      table.organizationId,
      table.actorUserId,
      table.idempotencyKey,
    ),
    foreignKey({
      name: 'execution_job_same_organization_version_fk',
      columns: [table.organizationId, table.engagementId, table.expectedRevision],
      foreignColumns: [
        engagementVersion.organizationId,
        engagementVersion.engagementId,
        engagementVersion.revision,
      ],
    }),
    index('execution_job_org_status_idx').on(table.organizationId, table.status),
    index('execution_job_deadline_idx').on(table.status, table.deadlineAt),
    check(
      'execution_job_status_check',
      sql`${table.status} IN ('queued','running','retry_wait','succeeded','cancelled','denied','dead_letter')`,
    ),
    check(
      'execution_job_bounds_check',
      sql`${table.attempt} >= 0 AND ${table.maxAttempts} BETWEEN 1 AND 5 AND ${table.attempt} <= ${table.maxAttempts} AND ${table.timeoutMs} BETWEEN 100 AND 30000 AND ${table.backoffMs} BETWEEN 100 AND 60000`,
    ),
    check(
      'execution_job_identity_check',
      sql`${table.requestHash} ~ '^[a-f0-9]{64}$' AND length(${table.idempotencyKey}) BETWEEN 1 AND 128 AND ${table.kind} IN ('synthetic','audit.import')`,
    ),
    check(
      'execution_job_lease_check',
      sql`(${table.status} = 'running' AND ${table.leaseToken} IS NOT NULL AND ${table.deadlineAt} IS NOT NULL) OR (${table.status} <> 'running' AND ${table.leaseToken} IS NULL AND ${table.deadlineAt} IS NULL)`,
    ),
  ],
);

export const executionEvent = pgTable(
  'execution_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id').notNull(),
    jobId: uuid('job_id').notNull(),
    attempt: integer('attempt').notNull(),
    status: text('status', { enum: executionStatuses }).notNull(),
    code: text('code'),
    requestId: uuid('request_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'execution_event_same_organization_fk',
      columns: [table.organizationId, table.jobId],
      foreignColumns: [executionJob.organizationId, executionJob.id],
    }),
    index('execution_event_job_created_idx').on(table.organizationId, table.jobId, table.createdAt),
  ],
);

export const executionAttempt = pgTable(
  'execution_attempt',
  {
    organizationId: text('organization_id').notNull(),
    jobId: uuid('job_id').notNull(),
    attempt: integer('attempt').notNull(),
    token: uuid('token').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    outcome: text('outcome'),
    code: text('code'),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.jobId, table.attempt] }),
    foreignKey({
      name: 'execution_attempt_same_organization_fk',
      columns: [table.organizationId, table.jobId],
      foreignColumns: [executionJob.organizationId, executionJob.id],
    }),
    check('execution_attempt_positive', sql`${table.attempt} > 0`),
    index('execution_attempt_org_started_idx').on(table.organizationId, table.startedAt),
  ],
);

export const executionControl = pgTable(
  'execution_control',
  {
    organizationId: text('organization_id')
      .primaryKey()
      .references(() => organization.id),
    emergencyStop: boolean('emergency_stop').notNull().default(false),
    concurrencyLimit: integer('concurrency_limit').notNull().default(2),
    rateLimit: integer('rate_limit').notNull().default(30),
  },
  (table) => [
    check(
      'execution_control_bounds',
      sql`${table.concurrencyLimit} BETWEEN 1 AND 32 AND ${table.rateLimit} BETWEEN 1 AND 1000`,
    ),
  ],
);

export const executionOutbox = pgTable(
  'execution_outbox',
  {
    jobId: uuid('job_id').primaryKey(),
    organizationId: text('organization_id').notNull(),
    publishAfter: timestamp('publish_after', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'execution_outbox_same_organization_fk',
      columns: [table.organizationId, table.jobId],
      foreignColumns: [executionJob.organizationId, executionJob.id],
    }),
    index('execution_outbox_publish_idx').on(table.publishAfter),
  ],
);
