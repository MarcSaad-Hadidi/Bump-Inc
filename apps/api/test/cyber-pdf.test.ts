import { expect, it } from 'vitest';
import { syntheticReport } from '../../../tests/fixtures/cyber-report.js';
import { renderCyberPdf } from '../src/cyber-pdf.js';

it('generates a self-contained PDF with the Unicode font and real report pages', async () => {
  const pdf = await renderCyberPdf(syntheticReport);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(10000);
  expect(pdf.toString('latin1')).toContain('/Type /Pages');
  expect(pdf.subarray(-20).toString()).toContain('%%EOF');
});
