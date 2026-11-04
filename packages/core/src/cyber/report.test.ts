import type { CyberReportSnapshot } from '@bump/contracts';
import { expect, it } from 'vitest';
import { syntheticReport } from '../../../../tests/fixtures/cyber-report.js';
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
