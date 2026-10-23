import { randomUUID } from 'node:crypto';
import {
  type CreateLoi25Audit,
  type Loi25AuditReport,
  Loi25AuditReportSchema,
  type UpdateLoi25Finding,
} from '@bump/contracts';
import { and, asc, eq } from 'drizzle-orm';
import type { createDatabase } from './index.js';
import { auditFindings, audits } from './schema.js';

export function createAuditRepository(db: ReturnType<typeof createDatabase>['db']) {
  return {
    async create(input: CreateLoi25Audit, id: string = randomUUID()) {
      await db.insert(audits).values({ ...input, id });
      return id;
    },
    async save(report: Loi25AuditReport, rawProbeData: Record<string, unknown> = {}) {
      Loi25AuditReportSchema.parse(report);
      await db.transaction(async (tx) => {
        await tx
          .update(audits)
          .set({
            status: report.status,
            score: report.score,
            grade: report.grade,
            summaryFr: report.summaryFr,
            completedAt: new Date(report.scannedAt),
            rawProbeData,
          })
          .where(eq(audits.id, report.auditId));
        await tx.delete(auditFindings).where(eq(auditFindings.auditId, report.auditId));
        if (report.findings.length)
          await tx
            .insert(auditFindings)
            .values(report.findings.map((finding) => ({ ...finding, auditId: report.auditId })));
      });
    },
    async status(id: string, status: 'RUNNING' | 'FAILED') {
      await db
        .update(audits)
        .set({
          status,
          ...(status === 'FAILED'
            ? {
                score: 0,
                grade: 'F',
                completedAt: new Date(),
                summaryFr:
                  'Analyse interrompue ou indisponible. Le score ne permet aucune conclusion de conformité.',
              }
            : {}),
        })
        .where(eq(audits.id, id));
    },
    async get(id: string): Promise<Loi25AuditReport | undefined> {
      // One repeatable snapshot keeps score, status and findings consistent during completion.
      return db.transaction(
        async (tx) => {
          const [audit] = await tx.select().from(audits).where(eq(audits.id, id));
          if (!audit) return undefined;
          const findings = await tx
            .select()
            .from(auditFindings)
            .where(eq(auditFindings.auditId, id))
            .orderBy(asc(auditFindings.id));
          return Loi25AuditReportSchema.parse({
            auditId: audit.id,
            companyName: audit.companyName,
            domain: audit.domain,
            status: audit.status,
            score: audit.score,
            grade: audit.grade,
            summaryFr: audit.summaryFr,
            scannedAt: (audit.completedAt ?? audit.createdAt).toISOString(),
            findings: findings.map(({ auditId: _, createdAt: __, ...finding }) => finding),
          });
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async updateFinding(auditId: string, findingId: string, patch: UpdateLoi25Finding) {
      const [updated] = await db
        .update(auditFindings)
        .set(patch)
        .where(and(eq(auditFindings.auditId, auditId), eq(auditFindings.id, findingId)))
        .returning({ id: auditFindings.id });
      return !!updated;
    },
  };
}
