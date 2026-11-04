import { describe, expect, it } from 'vitest';
import { compareCyberCoverage, cyberFingerprint, prioritizeCyber } from './policy.js';

describe('Cyber risk and correlation', () => {
  const base = {
    assetId: 'a',
    ruleId: 'r',
    component: 'library',
    affectedVersion: '1',
    location: 'src/a.ts:4',
    cve: 'CVE-2026-1000',
  };
  it('correlates identical component CVEs across engines but never by title alone', () => {
    expect(cyberFingerprint(base)).toBe(cyberFingerprint({ ...base, ruleId: 'other' }));
    expect(cyberFingerprint({ ...base, affectedVersion: '2' })).not.toBe(cyberFingerprint(base));
    expect(cyberFingerprint({ ...base, assetId: 'b' })).not.toBe(cyberFingerprint(base));
    expect(cyberFingerprint({ ...base, cve: null, ruleId: 'x' })).not.toBe(
      cyberFingerprint({ ...base, cve: null }),
    );
  });
  it('keeps unknown threat enrichment unknown and explains weighted business priority', () => {
    const risk = prioritizeCyber({
      severity: 'high',
      cvss: null,
      epss: null,
      kev: null,
      exposure: 'internal',
      criticality: 3,
      confidence: 'medium',
      humanAdjustment: 0,
      compensatingControls: false,
    });
    expect(risk.score).toBeGreaterThan(0);
    expect(risk.factors).toContain('EPSS: unknown');
    expect(risk.factors).toContain('KEV: unknown');
    expect(
      prioritizeCyber({
        severity: 'high',
        cvss: 9,
        epss: 1,
        kev: true,
        exposure: 'public',
        criticality: 5,
        confidence: 'high',
        humanAdjustment: 0,
        compensatingControls: false,
      }).score,
    ).toBeGreaterThan(risk.score);
  });
  it('warns when fewer results accompany reduced coverage', () => {
    const report = compareCyberCoverage(['a:semgrep', 'b:trivy'], ['a:semgrep'], ['x', 'y'], ['x']);
    expect(report.coverageReduced).toBe(true);
    expect(report.notObserved).toEqual(['y']);
    expect(report).not.toHaveProperty('fixed');
  });
});
