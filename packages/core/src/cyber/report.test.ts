import { type CyberReportSnapshot, cyberReportSnapshotSchema } from '@bump/contracts';
import { expect, it } from 'vitest';
import {
  syntheticReport,
  syntheticResolvedReport,
} from '../../../../tests/fixtures/cyber-report.js';
import { renderCyberReportHtml } from './report-html.js';
import { cyberReportDigest } from './reports.js';

it('escapes report content and marks drafts without loading scripts or external resources', () => {
  const html = renderCyberReportHtml(
    { ...syntheticReport, executiveSummary: '<img src=x onerror=alert(1)> & "test"' },
    false,
  );
  expect(html).not.toContain('<img');
  expect(html).not.toContain('<script');
  expect(html).toContain('&lt;img');
  expect(html).toContain('BROUILLON');
  expect(html).toContain('Non observé');
  expect(renderCyberReportHtml({ ...syntheticReport, locale: 'en' }, true)).toContain(
    'APPROVED FOR AUTHORIZED DISTRIBUTION',
  );
});
it('hashes the same snapshot consistently after PostgreSQL JSONB key ordering, and detects edits', () => {
  const reordered = Object.fromEntries(
    Object.entries(syntheticReport).reverse(),
  ) as CyberReportSnapshot;
  expect(cyberReportDigest(reordered)).toBe(cyberReportDigest(syntheticReport));
  expect(cyberReportDigest({ ...syntheticReport, executiveSummary: 'Changed' })).not.toBe(
    cyberReportDigest(syntheticReport),
  );
});

it('labels historical evidence and retest audits without listing closed resolutions as priority risks', () => {
  const html = renderCyberReportHtml(syntheticResolvedReport, true);
  expect(html).toContain('Historical evidence from an earlier audit');
  expect(html).toContain('not a detection in the selected audit');
  expect(html).toContain('10000000-0000-4000-8000-000000000012');
  expect(html).toContain('Retest audit');
  expect(html).toContain('Verified correction');
  expect(html).toContain('Accepted risk');
  const risks = html.split('<h2>Priority risks</h2>')[1]?.split('</section>')[0];
  expect(risks).toContain('Active synthetic priority risk');
  expect(risks).not.toContain('Historically corrected synthetic pattern');
  expect(risks).not.toContain('Closed accepted synthetic risk');
});

it('escapes resolution notes and preserves the original payload and digest of legacy v1 snapshots', () => {
  if (syntheticResolvedReport.version !== 'cyber-report-v2') throw new Error('Invalid fixture');
  const finding = syntheticResolvedReport.findings[0]!;
  const html = renderCyberReportHtml(
    {
      ...syntheticResolvedReport,
      findings: [
        { ...finding, resolution: { ...finding.resolution!, note: '<script>unsafe</script>' } },
      ],
    },
    true,
  );
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
  const { evidenceAuditId, evidenceFromSelectedAudit, resolution, ...legacyFinding } = finding;
  const legacy: CyberReportSnapshot = {
    ...syntheticReport,
    version: 'cyber-report-v1',
    findings: [legacyFinding],
  };
  expect(cyberReportSnapshotSchema.parse(legacy)).toEqual(legacy);
  expect(cyberReportDigest(cyberReportSnapshotSchema.parse(legacy))).toBe(
    cyberReportDigest(legacy),
  );
  expect(
    cyberReportDigest({
      ...syntheticResolvedReport,
      findings: [{ ...finding, evidenceAuditId: syntheticResolvedReport.audit.id }],
    }),
  ).not.toBe(cyberReportDigest({ ...syntheticResolvedReport, findings: [finding] }));
});
