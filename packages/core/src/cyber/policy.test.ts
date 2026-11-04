import { describe, expect, it } from 'vitest';
import {
  compareCyberCoverage,
  conflictsWithAbsentCyberRetest,
  cyberFingerprint,
  prioritizeCyber,
} from './policy.js';

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
  it('blocks absence for an exact fingerprint or a component CVE independently of engine and version', () => {
    const observation = { ...base, engine: 'trivy' as const };
    const finding = { fingerprint: 'original', observation };
    expect(
      conflictsWithAbsentCyberRetest(finding, {
        fingerprint: 'original',
        data: { ...observation, engine: 'semgrep', ruleId: 'different', location: 'different.py' },
      }),
    ).toBe(true);
    const changedVersion = {
      ...observation,
      engine: 'sarif' as const,
      ruleId: 'other',
      affectedVersion: '2',
      location: 'vendor/manifest.json',
    };
    expect(
      conflictsWithAbsentCyberRetest(finding, {
        fingerprint: 'new-version',
        data: changedVersion,
      }),
    ).toBe(true);
    expect(
      conflictsWithAbsentCyberRetest(finding, {
        fingerprint: 'other-component',
        data: { ...observation, engine: 'sarif', component: 'other-library' },
      }),
    ).toBe(false);
  });
  it.each(['app.py', 'app.py:3', 'app.py:3:9'])(
    'blocks absence after line/column movement within %s',
    (location) => {
      const observation = {
        engine: 'semgrep' as const,
        ruleId: 'synthetic-rule',
        location: 'app.py:2',
        component: '',
        cve: null,
      };
      expect(
        conflictsWithAbsentCyberRetest(
          { fingerprint: 'first', observation },
          {
            fingerprint: 'moved',
            data: { ...observation, location },
          },
        ),
      ).toBe(true);
    },
  );
  it('keeps different files, rules and engines distinct and treats missing locations conservatively', () => {
    const observation = {
      engine: 'semgrep' as const,
      ruleId: 'synthetic-rule',
      location: 'app.py:2',
      component: '',
      cve: null,
    };
    const finding = { fingerprint: 'first', observation };
    for (const data of [
      { ...observation, location: 'other.py:2' },
      { ...observation, location: 'nested/app.py:3' },
      { ...observation, ruleId: 'different' },
      { ...observation, engine: 'gitleaks' as const },
    ])
      expect(conflictsWithAbsentCyberRetest(finding, { fingerprint: 'other', data })).toBe(false);
    expect(
      conflictsWithAbsentCyberRetest(finding, {
        fingerprint: 'ambiguous',
        data: { ...observation, location: '' },
      }),
    ).toBe(true);
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
