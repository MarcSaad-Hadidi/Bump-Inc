import PDFDocument from 'pdfkit';
import { expect, it, vi } from 'vitest';
import { syntheticReport, syntheticResolvedReport } from '../../../tests/fixtures/cyber-report.js';
import { renderCyberPdf } from '../src/cyber-pdf.js';

it('generates a self-contained PDF with the Unicode font and real report pages', async () => {
  const pdf = await renderCyberPdf(syntheticReport);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(10000);
  expect(pdf.toString('latin1')).toContain('/Type /Pages');
  expect(pdf.subarray(-20).toString()).toContain('%%EOF');
});

it.each(['fr', 'en'] as const)(
  'keeps the %s confidentiality footer on each content page without adding blank pages',
  async (locale) => {
    const pdf = await renderCyberPdf({ ...syntheticReport, locale });
    // The small empty synthetic report has five content pages. A footer below
    // the flow margin must not create another page for every existing page.
    expect([...pdf.toString('latin1').matchAll(/\/Type \/Page\b/g)]).toHaveLength(5);
  },
);

it('prints historical provenance and closed resolutions, while keeping priority risks active', async () => {
  const rendered = vi.spyOn(PDFDocument.prototype, 'text');
  try {
    const pdf = await renderCyberPdf(syntheticResolvedReport);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const lines = rendered.mock.calls.map(([value]) => String(value));
    expect(lines.some((line) => line.includes('Historical evidence from an earlier audit'))).toBe(
      true,
    );
    expect(lines.some((line) => line.includes('not a detection in the selected audit'))).toBe(true);
    expect(lines.some((line) => line.includes('Recorded resolution: Verified correction'))).toBe(
      true,
    );
    expect(lines.some((line) => line.includes('Recorded resolution: Accepted risk'))).toBe(true);
    expect(
      lines.some((line) => line.includes(`Retest audit: ${syntheticResolvedReport.audit.id}`)),
    ).toBe(true);
    const risks = lines
      .slice(lines.indexOf('Priority risks') + 1, lines.indexOf('Technical findings'))
      .join('\n');
    expect(risks).toContain('Active synthetic priority risk');
    expect(risks).not.toContain('Historically corrected synthetic pattern');
    expect(risks).not.toContain('Closed accepted synthetic risk');
  } finally {
    rendered.mockRestore();
  }
});
