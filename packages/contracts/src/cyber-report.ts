import { z } from 'zod';
import { cyberId, cyberObservationSchema, cyberText } from './cyber.js';

const text = z.string().max(20000);
export const cyberReportInputSchema = z.strictObject({
  auditId: cyberId,
  locale: z.enum(['fr', 'en']),
  executiveSummary: cyberText(8000),
  reviewNotes: cyberText(4000),
});
const legacyCyberReportSnapshotSchema = z.strictObject({
  version: z.literal('cyber-report-v1'),
  reportId: cyberId,
  organizationId: cyberId,
  locale: z.enum(['fr', 'en']),
  createdAt: z.iso.datetime(),
  client: z.strictObject({ id: cyberId, name: text, contact: text }),
  audit: z.strictObject({
    id: cyberId,
    title: text,
    createdAt: z.iso.datetime(),
    responsible: text,
  }),
  mandate: z.strictObject({
    reference: text,
    signedBy: text,
    authorizedAt: z.iso.datetime(),
    validFrom: z.iso.datetime(),
    validUntil: z.iso.datetime(),
    limitations: text,
    emergencyContact: text,
    exclusions: z.array(z.strictObject({ label: text, target: text })).max(20),
  }),
  executiveSummary: text,
  reviewNotes: text,
  assets: z
    .array(z.strictObject({ id: cyberId, label: text, kind: text, target: text, exposure: text }))
    .max(100),
  scans: z
    .array(
      z.strictObject({
        id: cyberId,
        assetId: cyberId,
        engine: text,
        version: text,
        state: text,
        stage: text,
        observationCount: z.number().nullable(),
        errorCode: text.nullable(),
        sourceSha256: text.nullable(),
        coverageHash: text.nullable(),
      }),
    )
    .max(200),
  findings: z
    .array(
      z.strictObject({
        id: cyberId,
        assetId: cyberId,
        status: text,
        observation: cyberObservationSchema,
        businessImpact: text,
        recommendation: text,
        reviewedBy: text.nullable(),
        reviewedAt: z.iso.datetime().nullable(),
        priority: z.strictObject({
          score: z.number().min(0).max(100),
          factors: z.array(text).max(20),
        }),
        sources: z
          .array(z.strictObject({ engine: text, version: text, detectedAt: z.iso.datetime() }))
          .max(100),
      }),
    )
    .max(1000),
  unreviewedCount: z.number().int().min(0),
  falsePositiveCount: z.number().int().min(0),
  tasks: z
    .array(
      z.strictObject({
        findingId: cyberId,
        assignee: text,
        dueAt: z.iso.datetime(),
        description: text,
        status: text,
      }),
    )
    .max(1000),
  retests: z
    .array(
      z.strictObject({
        findingId: cyberId,
        auditId: cyberId,
        conclusion: text,
        note: text,
        reviewerId: text,
        createdAt: z.iso.datetime(),
      }),
    )
    .max(1000),
});

const cyberReportFindingSchema = legacyCyberReportSnapshotSchema.shape.findings.element.extend({
  evidenceAuditId: cyberId,
  evidenceFromSelectedAudit: z.boolean(),
  resolution: z
    .strictObject({
      kind: z.enum(['verified_fixed', 'accepted_risk', 'false_positive']),
      eventId: cyberId,
      reviewerId: text,
      reviewedAt: z.iso.datetime(),
      note: text,
      auditId: cyberId.nullable(),
    })
    .nullable(),
});
const currentCyberReportSnapshotSchema = legacyCyberReportSnapshotSchema.extend({
  version: z.literal('cyber-report-v2'),
  findings: z.array(cyberReportFindingSchema).max(1000),
});
// Parse existing frozen v1 snapshots without adding keys or changing their digest.
export const cyberReportSnapshotSchema = z.discriminatedUnion('version', [
  legacyCyberReportSnapshotSchema,
  currentCyberReportSnapshotSchema,
]);
export type CyberReportSnapshot = z.infer<typeof cyberReportSnapshotSchema>;
