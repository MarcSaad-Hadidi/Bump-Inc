import { z } from 'zod';
import { engagementTargetSchema } from './engagement.js';

export const cyberId = z.uuid().transform((v) => v.toLowerCase());
export const cyberText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v));
export const cyberEngineSchema = z.enum([
  'semgrep',
  'trivy',
  'gitleaks',
  'web-passive',
  'json',
  'sarif',
]);
export type CyberEngine = z.infer<typeof cyberEngineSchema>;
export const cyberRoleSchema = z.enum(['consultant', 'analyst', 'reviewer']);
export type CyberRole = 'admin' | z.infer<typeof cyberRoleSchema>;
export const cyberSeveritySchema = z.enum(['unknown', 'info', 'low', 'medium', 'high', 'critical']);
export const cyberConfidenceSchema = z.enum(['low', 'medium', 'high']);
export const cyberFindingStatusSchema = z.enum([
  'to_review',
  'confirmed',
  'false_positive',
  'planned',
  'in_progress',
  'to_retest',
  'verified_fixed',
  'accepted_risk',
  'closed',
]);
export const cyberClientInputSchema = z.strictObject({
  name: cyberText(160),
  contact: cyberText(254),
  criticality: z.number().int().min(1).max(5).default(3),
  retentionDays: z.number().int().min(1).max(365).default(90),
});
export const cyberAssetInputSchema = z.strictObject({
  clientId: cyberId,
  label: cyberText(160),
  target: engagementTargetSchema,
  exposure: z.enum(['public', 'internal', 'restricted']).default('internal'),
});
export const cyberMandateInputSchema = z
  .strictObject({
    clientId: cyberId,
    reference: cyberText(120),
    signedBy: cyberText(160),
    authorizedAt: z.iso.datetime({ offset: true }),
    responsibleUserId: cyberId,
    authorizationText: cyberText(20000),
    emergencyContact: cyberText(254),
    validFrom: z.iso.datetime({ offset: true }),
    validUntil: z.iso.datetime({ offset: true }),
    assetIds: z.array(cyberId).min(1).max(20),
    excludedAssetIds: z.array(cyberId).max(20).default([]),
    engines: z.array(cyberEngineSchema).min(1).max(6),
    mode: z.literal('passive'),
    limitations: cyberText(4000),
  })
  .superRefine((v, c) => {
    if (Date.parse(v.validUntil) <= Date.parse(v.validFrom))
      c.addIssue({ code: 'custom', message: 'Invalid time window' });
    if (Date.parse(v.authorizedAt) > Date.now())
      c.addIssue({ code: 'custom', message: 'Authorization must already exist' });
    if (
      new Set(v.assetIds).size !== v.assetIds.length ||
      new Set(v.engines).size !== v.engines.length
    )
      c.addIssue({ code: 'custom', message: 'Duplicate scope' });
  });
export const cyberSourceInputSchema = z
  .strictObject({
    assetId: cyberId,
    name: cyberText(160),
    files: z
      .array(
        z.strictObject({
          path: z
            .string()
            .min(1)
            .max(200)
            .regex(/^[a-zA-Z0-9_.\/-]+$/)
            .refine(
              (v) =>
                !v.startsWith('/') &&
                !v.startsWith('-') &&
                !v.split('/').some((p) => !p || p === '.' || p === '..'),
            ),
          content: z
            .string()
            .max(131072)
            .refine((v) => !v.includes('\0')),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((v, c) => {
    if (
      new Set(v.files.map((f) => f.path)).size !== v.files.length ||
      Buffer.byteLength(JSON.stringify(v.files)) > 524288
    )
      c.addIssue({ code: 'custom', message: 'Source exceeds limits or contains duplicate paths' });
  });
export const cyberAuditInputSchema = z.strictObject({
  clientId: cyberId,
  mandateId: cyberId,
  assetIds: z.array(cyberId).min(1).max(20),
  engines: z.array(cyberEngineSchema).min(1).max(6),
  idempotencyKey: cyberId,
  title: cyberText(160),
});
export const cyberObservationSchema = z.strictObject({
  engine: cyberEngineSchema,
  engineVersion: cyberText(100),
  ruleId: cyberText(256),
  title: cyberText(300),
  severity: cyberSeveritySchema,
  confidence: cyberConfidenceSchema,
  location: z.string().max(512).default(''),
  component: z.string().max(256).default(''),
  affectedVersion: z.string().max(100).default(''),
  fixedVersion: z.string().max(100).default(''),
  cve: z
    .string()
    .regex(/^CVE-\d{4}-\d{4,}$/)
    .nullable()
    .default(null),
  cvss: z.number().min(0).max(10).nullable().default(null),
  references: z
    .array(
      z.url().refine((v) => {
        const u = new URL(v);
        return (
          ['https:', 'http:'].includes(u.protocol) &&
          !u.username &&
          !u.password &&
          !u.search &&
          !u.hash
        );
      }),
    )
    .max(20)
    .default([]),
  evidence: cyberText(2000),
  recommendation: cyberText(4000),
});
export type CyberObservation = z.infer<typeof cyberObservationSchema>;
export const cyberReviewSchema = z.strictObject({
  status: cyberFindingStatusSchema,
  note: cyberText(4000),
  businessImpact: cyberText(4000),
  recommendation: cyberText(4000),
  humanAdjustment: z.number().int().min(-20).max(20).default(0),
  compensatingControls: z.boolean().default(false),
});
export const cyberTaskInputSchema = z.strictObject({
  findingId: cyberId,
  assignee: cyberText(160),
  dueAt: z.iso.datetime({ offset: true }),
  description: cyberText(4000),
});
export const cyberRetestInputSchema = z.strictObject({
  findingId: cyberId,
  auditId: cyberId,
  conclusion: z.enum(['present', 'absent', 'inconclusive']),
  note: cyberText(4000),
});
export const CYBER_POLICY_VERSION = 'cyber-risk-v1';
export const cyberScanPayloadSchema = z.strictObject({ scanId: cyberId });
