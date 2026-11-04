import type { CyberEngine, CyberObservation, EngagementTarget } from '@bump/contracts';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { organization } from './auth-schema.js';
import { engagement } from './engagement-schema.js';
import { executionJob } from './execution-schema.js';

const cols = () => ({
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const cyberRole = pgTable(
  'cyber_role',
  { ...cols(), userId: text('user_id').notNull(), role: text('role').notNull() },
  (t) => [
    unique('cyber_role_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    unique('cyber_role_member_unique').on(t.organizationId, t.userId),
    check('cyber_role_value', sql`${t.role} IN ('consultant','analyst','reviewer')`),
    index('cyber_role_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberClient = pgTable(
  'cyber_client',
  {
    ...cols(),
    name: text('name').notNull(),
    contact: text('contact').notNull(),
    criticality: integer('criticality').notNull().default(3),
    retentionDays: integer('retention_days').notNull().default(90),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    unique('cyber_client_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    index('cyber_client_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberAsset = pgTable(
  'cyber_asset',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    label: text('label').notNull(),
    target: jsonb('target').$type<EngagementTarget>().notNull(),
    exposure: text('exposure').notNull().default('internal'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    unique('cyber_asset_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    unique('cyber_asset_client_identity').on(t.organizationId, t.clientId, t.id),
    index('cyber_asset_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberMandate = pgTable(
  'cyber_mandate',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    engagementId: uuid('engagement_id').notNull(),
    reference: text('reference').notNull(),
    signedBy: text('signed_by').notNull(),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }).notNull(),
    emergencyContact: text('emergency_contact').notNull(),
    engines: jsonb('engines').$type<CyberEngine[]>().notNull(),
    assetIds: jsonb('asset_ids').$type<string[]>().notNull(),
    excludedAssetIds: jsonb('excluded_asset_ids').$type<string[]>().notNull(),
    limitations: text('limitations').notNull(),
  },
  (t) => [
    unique('cyber_mandate_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.engagementId],
      foreignColumns: [engagement.organizationId, engagement.id],
    }),
    unique('cyber_mandate_client_identity').on(t.organizationId, t.clientId, t.id),
    index('cyber_mandate_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberSource = pgTable(
  'cyber_source',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    assetId: uuid('asset_id').notNull(),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    ciphertext: text('ciphertext').notNull(),
    sha256: text('sha256').notNull(),
    createdBy: text('created_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    purgedAt: timestamp('purged_at', { withTimezone: true }),
  },
  (t) => [
    unique('cyber_source_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.assetId],
      foreignColumns: [cyberAsset.organizationId, cyberAsset.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.assetId],
      foreignColumns: [cyberAsset.organizationId, cyberAsset.clientId, cyberAsset.id],
    }),
    unique('cyber_source_client_identity').on(t.organizationId, t.clientId, t.id),
    index('cyber_source_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberAudit = pgTable(
  'cyber_audit',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    mandateId: uuid('mandate_id').notNull(),
    requestedBy: text('requested_by').notNull(),
    title: text('title').notNull(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
  },
  (t) => [
    unique('cyber_audit_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.mandateId],
      foreignColumns: [cyberMandate.organizationId, cyberMandate.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.mandateId],
      foreignColumns: [cyberMandate.organizationId, cyberMandate.clientId, cyberMandate.id],
    }),
    unique('cyber_audit_client_identity').on(t.organizationId, t.clientId, t.id),
    unique('cyber_audit_idempotency').on(t.organizationId, t.idempotencyKey),
    index('cyber_audit_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberScan = pgTable(
  'cyber_scan',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    auditId: uuid('audit_id').notNull(),
    assetId: uuid('asset_id').notNull(),
    sourceId: uuid('source_id'),
    executionJobId: uuid('execution_job_id').notNull(),
    engine: text('engine').notNull(),
    engineVersion: text('engine_version').notNull().default('pending'),
    stage: text('stage').notNull().default('queued'),
    observationCount: integer('observation_count'),
    coverageHash: text('coverage_hash'),
  },
  (t) => [
    unique('cyber_scan_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.auditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.auditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.clientId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.assetId],
      foreignColumns: [cyberAsset.organizationId, cyberAsset.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.assetId],
      foreignColumns: [cyberAsset.organizationId, cyberAsset.clientId, cyberAsset.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.sourceId],
      foreignColumns: [cyberSource.organizationId, cyberSource.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.sourceId],
      foreignColumns: [cyberSource.organizationId, cyberSource.clientId, cyberSource.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.executionJobId],
      foreignColumns: [executionJob.organizationId, executionJob.id],
    }),
    unique('cyber_scan_client_identity').on(t.organizationId, t.clientId, t.id),
    unique('cyber_scan_execution').on(t.organizationId, t.executionJobId),
    unique('cyber_scan_scope').on(t.organizationId, t.auditId, t.assetId, t.engine),
    index('cyber_scan_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberFinding = pgTable(
  'cyber_finding',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    assetId: uuid('asset_id').notNull(),
    firstAuditId: uuid('first_audit_id').notNull(),
    lastAuditId: uuid('last_audit_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    observation: jsonb('observation').$type<CyberObservation>().notNull(),
    status: text('status').notNull().default('to_review'),
    businessImpact: text('business_impact').notNull().default(''),
    recommendation: text('recommendation').notNull().default(''),
    humanAdjustment: integer('human_adjustment').notNull().default(0),
    compensatingControls: boolean('compensating_controls').notNull().default(false),
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('cyber_finding_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.assetId],
      foreignColumns: [cyberAsset.organizationId, cyberAsset.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.assetId],
      foreignColumns: [cyberAsset.organizationId, cyberAsset.clientId, cyberAsset.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.firstAuditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.firstAuditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.clientId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.lastAuditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.lastAuditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.clientId, cyberAudit.id],
    }),
    unique('cyber_finding_client_identity').on(t.organizationId, t.clientId, t.id),
    unique('cyber_finding_fingerprint').on(t.organizationId, t.clientId, t.fingerprint),
    index('cyber_finding_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberObservation = pgTable(
  'cyber_observation',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    assetId: uuid('asset_id').notNull(),
    auditId: uuid('audit_id').notNull(),
    scanId: uuid('scan_id').notNull(),
    findingId: uuid('finding_id').notNull(),
    data: jsonb('data').$type<CyberObservation>().notNull(),
    fingerprint: text('fingerprint').notNull(),
  },
  (t) => [
    unique('cyber_observation_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.assetId],
      foreignColumns: [cyberAsset.organizationId, cyberAsset.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.assetId],
      foreignColumns: [cyberAsset.organizationId, cyberAsset.clientId, cyberAsset.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.auditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.auditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.clientId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.scanId],
      foreignColumns: [cyberScan.organizationId, cyberScan.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.scanId],
      foreignColumns: [cyberScan.organizationId, cyberScan.clientId, cyberScan.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.findingId],
      foreignColumns: [cyberFinding.organizationId, cyberFinding.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.findingId],
      foreignColumns: [cyberFinding.organizationId, cyberFinding.clientId, cyberFinding.id],
    }),
    unique('cyber_observation_client_identity').on(t.organizationId, t.clientId, t.id),
    unique('cyber_observation_fingerprint').on(t.organizationId, t.scanId, t.fingerprint),
    index('cyber_observation_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberEvidence = pgTable(
  'cyber_evidence',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    scanId: uuid('scan_id').notNull(),
    ciphertext: text('ciphertext').notNull(),
    sha256: text('sha256').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    purgedAt: timestamp('purged_at', { withTimezone: true }),
  },
  (t) => [
    unique('cyber_evidence_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.scanId],
      foreignColumns: [cyberScan.organizationId, cyberScan.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.scanId],
      foreignColumns: [cyberScan.organizationId, cyberScan.clientId, cyberScan.id],
    }),
    unique('cyber_evidence_client_identity').on(t.organizationId, t.clientId, t.id),
    index('cyber_evidence_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberTask = pgTable(
  'cyber_task',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    findingId: uuid('finding_id').notNull(),
    assignee: text('assignee').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    description: text('description').notNull(),
    status: text('status').notNull().default('planned'),
  },
  (t) => [
    unique('cyber_task_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.findingId],
      foreignColumns: [cyberFinding.organizationId, cyberFinding.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.findingId],
      foreignColumns: [cyberFinding.organizationId, cyberFinding.clientId, cyberFinding.id],
    }),
    unique('cyber_task_client_identity').on(t.organizationId, t.clientId, t.id),
    index('cyber_task_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberRetest = pgTable(
  'cyber_retest',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    findingId: uuid('finding_id').notNull(),
    auditId: uuid('audit_id').notNull(),
    conclusion: text('conclusion').notNull(),
    note: text('note').notNull(),
    reviewerId: text('reviewer_id').notNull(),
  },
  (t) => [
    unique('cyber_retest_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.findingId],
      foreignColumns: [cyberFinding.organizationId, cyberFinding.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.findingId],
      foreignColumns: [cyberFinding.organizationId, cyberFinding.clientId, cyberFinding.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.auditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.auditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.clientId, cyberAudit.id],
    }),
    unique('cyber_retest_client_identity').on(t.organizationId, t.clientId, t.id),
    index('cyber_retest_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberReport = pgTable(
  'cyber_report',
  {
    ...cols(),
    clientId: uuid('client_id').notNull(),
    auditId: uuid('audit_id').notNull(),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    sha256: text('sha256').notNull(),
    locale: text('locale').notNull(),
    approvedBy: text('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
  },
  (t) => [
    unique('cyber_report_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.auditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.clientId, t.auditId],
      foreignColumns: [cyberAudit.organizationId, cyberAudit.clientId, cyberAudit.id],
    }),
    unique('cyber_report_client_identity').on(t.organizationId, t.clientId, t.id),
    index('cyber_report_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
export const cyberEvent = pgTable(
  'cyber_event',
  {
    ...cols(),
    clientId: uuid('client_id'),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    targetId: uuid('target_id').notNull(),
    detail: text('detail').notNull(),
  },
  (t) => [
    unique('cyber_event_org_id_unique').on(t.organizationId, t.id),
    foreignKey({ columns: [t.organizationId], foreignColumns: [organization.id] }),
    foreignKey({
      columns: [t.organizationId, t.clientId],
      foreignColumns: [cyberClient.organizationId, cyberClient.id],
    }),
    unique('cyber_event_client_identity').on(t.organizationId, t.clientId, t.id),
    index('cyber_event_tenant_created_idx').on(t.organizationId, t.createdAt),
  ],
);
