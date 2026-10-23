import { z } from 'zod';

export const AuditStatusSchema = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']);
export const AuditModeSchema = z.enum(['PASSIVE_LOI25', 'AUTHORIZED_FULL']);
export const SeveritySchema = z.enum(['CRITIQUE', 'ELEVE', 'MOYEN', 'CONFORME']);
export const Loi25CategorySchema = z.enum([
  'RESPONSABLE_ET_POLITIQUE',
  'CONSENTEMENT_COOKIES_PROFILAGE',
  'FORMULAIRES_ET_COLLECTE',
  'TRANSFERT_HORS_QUEBEC_ET_TIERS',
  'SECURITE_COURRIEL_DNS',
  'TRANSPARENCE_IA_CHATBOT',
]);
export const Loi25FindingSchema = z.strictObject({
  id: z.uuid(),
  category: Loi25CategorySchema,
  severity: SeveritySchema,
  titleFr: z.string().min(1),
  lawArticle: z.string().min(1),
  descriptionFr: z.string().min(1),
  evidence: z.record(z.string(), z.unknown()),
  businessRiskFr: z.string().min(1),
  remediationPitchFr: z.string().trim().min(1).max(5000),
  estimatedFixCad: z.number().int().min(0).max(10_000_000),
  humanVerified: z.boolean().default(false),
});
export const Loi25AuditReportSchema = z.strictObject({
  auditId: z.uuid(),
  companyName: z.string().min(1),
  domain: z.string().min(1),
  status: AuditStatusSchema,
  score: z.number().int().min(0).max(100),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  summaryFr: z.string(),
  findings: z.array(Loi25FindingSchema),
  scannedAt: z.iso.datetime(),
});

export function normalizeDomain(input: string): string {
  const url = new URL(input.includes('://') ? input : `https://${input}`);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(url.hostname) ||
    url.hostname.length > 253 ||
    /\.(?:local|localhost|internal|test|invalid)$/i.test(url.hostname)
  )
    throw new Error('Invalid public domain');
  return url.hostname.toLowerCase();
}

export const CreateLoi25AuditSchema = z.strictObject({
  companyName: z.string().trim().min(1).max(200),
  domain: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .transform((value, ctx) => {
      try {
        return normalizeDomain(value);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Domaine public invalide' });
        return z.NEVER;
      }
    }),
});
export const UpdateLoi25FindingSchema = Loi25FindingSchema.pick({
  humanVerified: true,
  estimatedFixCad: true,
  remediationPitchFr: true,
})
  .extend({ humanVerified: z.boolean() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Empty update');

export type AuditStatus = z.infer<typeof AuditStatusSchema>;
export type AuditMode = z.infer<typeof AuditModeSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type Loi25Category = z.infer<typeof Loi25CategorySchema>;
export type Loi25Finding = z.infer<typeof Loi25FindingSchema>;
export type Loi25AuditReport = z.infer<typeof Loi25AuditReportSchema>;
export type CreateLoi25Audit = z.infer<typeof CreateLoi25AuditSchema>;
export type UpdateLoi25Finding = z.infer<typeof UpdateLoi25FindingSchema>;
