import { describe, expect, it } from 'vitest';
import {
  CreateLoi25AuditSchema,
  Loi25AuditReportSchema,
  Loi25FindingSchema,
  normalizeDomain,
  UpdateLoi25FindingSchema,
} from './loi25.js';

describe('Loi 25 boundaries', () => {
  it('normalizes a public domain and rejects alternate destinations', () => {
    expect(normalizeDomain('https://EXAMPLE.CA/')).toBe('example.ca');
    expect(normalizeDomain('école.ca')).toBe('xn--cole-9oa.ca');
    for (const domain of [
      'localhost',
      '127.0.0.1',
      '[::1]',
      'example.ca:8080',
      'https://a:b@example.ca',
      'example.ca/path',
      'example.ca?q=x',
      'ftp://example.ca',
      'example.local',
      '0x7f000001',
    ]) {
      expect(
        CreateLoi25AuditSchema.safeParse({ companyName: 'Exemple', domain }).success,
        domain,
      ).toBe(false);
    }
  });
  it('requires bounded editable fields and rejects privileged mutations', () => {
    expect(UpdateLoi25FindingSchema.parse({ humanVerified: false })).toEqual({
      humanVerified: false,
    });
    expect(UpdateLoi25FindingSchema.parse({ estimatedFixCad: 0 })).toEqual({ estimatedFixCad: 0 });
    for (const patch of [
      {},
      { severity: 'CONFORME' },
      { estimatedFixCad: -1 },
      { estimatedFixCad: 1.5 },
      { humanVerified: 'true' },
      { remediationPitchFr: '' },
    ]) {
      expect(UpdateLoi25FindingSchema.safeParse(patch).success).toBe(false);
    }
  });
  it('defaults human verification to false and validates reports', () => {
    const finding = Loi25FindingSchema.parse({
      id: '12345678-1234-4234-8234-123456789012',
      category: 'SECURITE_COURRIEL_DNS',
      severity: 'ELEVE',
      titleFr: 'Titre',
      lawArticle: 'art. 10',
      descriptionFr: 'Description',
      evidence: { records: [] },
      businessRiskFr: 'Risque',
      remediationPitchFr: 'Action',
      estimatedFixCad: 100,
    });
    expect(finding.humanVerified).toBe(false);
    const report = {
      auditId: finding.id,
      companyName: 'Exemple',
      domain: 'example.ca',
      status: 'COMPLETED',
      score: 100,
      grade: 'A',
      summaryFr: '',
      findings: [finding],
      scannedAt: '2026-10-23T12:00:00.000Z',
    };
    expect(Loi25AuditReportSchema.safeParse(report).success).toBe(true);
    expect(Loi25AuditReportSchema.safeParse({ ...report, score: 101 }).success).toBe(false);
    expect(Loi25AuditReportSchema.safeParse({ ...report, scannedAt: 'yesterday' }).success).toBe(
      false,
    );
  });
});
