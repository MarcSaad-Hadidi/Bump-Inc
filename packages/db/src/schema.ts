import type { AuditMode, AuditStatus, Loi25Category, Severity } from '@bump/contracts';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const systemProbes = pgTable('system_probes', {
  id: uuid('id').primaryKey(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const audits = pgTable('audits', {
  id: uuid('id').primaryKey(),
  companyName: text('company_name').notNull(),
  domain: text('domain').notNull(),
  mode: text('mode').$type<AuditMode>().notNull().default('PASSIVE_LOI25'),
  status: text('status').$type<AuditStatus>().notNull().default('PENDING'),
  score: integer('score').notNull().default(0),
  grade: text('grade').notNull().default('F'),
  summaryFr: text('summary_fr').notNull().default('Analyse en attente.'),
  rawProbeData: jsonb('raw_probe_data').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const auditFindings = pgTable(
  'audit_findings',
  {
    id: uuid('id').primaryKey(),
    auditId: uuid('audit_id')
      .notNull()
      .references(() => audits.id, { onDelete: 'cascade' }),
    category: text('category').$type<Loi25Category>().notNull(),
    severity: text('severity').$type<Severity>().notNull(),
    titleFr: text('title_fr').notNull(),
    lawArticle: text('law_article').notNull(),
    descriptionFr: text('description_fr').notNull(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
    businessRiskFr: text('business_risk_fr').notNull(),
    remediationPitchFr: text('remediation_pitch_fr').notNull(),
    estimatedFixCad: integer('estimated_fix_cad').notNull(),
    humanVerified: boolean('human_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_findings_audit_id_idx').on(table.auditId)],
);
