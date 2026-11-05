import { expect, it } from 'vitest';
import { parseCyberOutput, parseGitleaks, parseSemgrep, parseTrivy } from './parsers.js';

it('keeps rule, file and line while withholding code snippets', () => {
  const result = parseSemgrep({
    version: '1.183.0',
    errors: [],
    results: [
      {
        check_id: 'bump.python.dynamic-eval',
        path: '/src/app.py',
        start: { line: 4 },
        extra: { severity: 'ERROR', lines: 'synthetic-secret-code' },
      },
    ],
  });
  expect(result[0]).toMatchObject({ engine: 'semgrep', location: 'app.py:4', severity: 'high' });
  expect(JSON.stringify(result)).not.toContain('synthetic-secret-code');
  expect(() =>
    parseSemgrep({ version: 'x', results: [], errors: [{ message: 'parse failed' }] }),
  ).toThrow();
});
it('preserves CVE, affected/fixed versions and CVSS', () => {
  const [result] = parseTrivy({
    SchemaVersion: 2,
    Results: [
      {
        Target: 'package-lock.json',
        Vulnerabilities: [
          {
            VulnerabilityID: 'CVE-2026-12345',
            PkgName: 'synthetic-library',
            InstalledVersion: '1.0',
            FixedVersion: '1.1',
            Severity: 'HIGH',
            CVSS: { nvd: { V3Score: 8.5 } },
            PrimaryURL: 'https://nvd.nist.gov/vuln/detail/CVE-2026-12345',
          },
        ],
      },
    ],
  });
  expect(result).toMatchObject({
    cve: 'CVE-2026-12345',
    affectedVersion: '1.0',
    fixedVersion: '1.1',
    cvss: 8.5,
  });
});
it('rejects an unknown Trivy check state rather than treating it as a clean result', () => {
  expect(() =>
    parseTrivy({
      SchemaVersion: 2,
      Results: [
        {
          Target: 'Dockerfile',
          Misconfigurations: [
            { ID: 'DS002', AVDID: 'AVD-DS-0002', Severity: 'HIGH', Status: 'UNKNOWN' },
          ],
        },
      ],
    }),
  ).toThrow();
});
it('does not turn Trivy PASS or EXCEPTION checks into findings', () => {
  const result = parseTrivy({
    SchemaVersion: 2,
    Results: [
      {
        Target: 'Dockerfile',
        Misconfigurations: ['PASS', 'EXCEPTION', 'FAIL'].map((Status, index) => ({
          ID: `DS00${index}`,
          AVDID: `AVD-DS-000${index}`,
          Severity: 'HIGH',
          Status,
        })),
      },
    ],
  });
  expect(result.map((finding) => finding.ruleId)).toEqual(['AVD-DS-0002']);
});
it('never exposes complete secret, match or commit metadata', () => {
  const secret = 'synthetic-' + String.fromCharCode(65).repeat(30);
  const result = parseGitleaks([
    {
      RuleID: 'synthetic-rule',
      File: 'config.py',
      StartLine: 2,
      Secret: secret,
      Match: secret,
      Author: 'private@example.invalid',
    },
  ]);
  expect(JSON.stringify(result)).not.toContain(secret);
  expect(JSON.stringify(result)).not.toContain('private@example.invalid');
  expect(result[0]?.evidence).toContain('fully withheld');
});
it('rejects malformed reports, excessive observations and unsafe references', () => {
  expect(() => parseCyberOutput('gitleaks', 'not JSON')).toThrow();
  expect(() =>
    parseGitleaks(Array.from({ length: 1001 }, () => ({ RuleID: 'r', File: 'f', StartLine: 1 }))),
  ).toThrow();
  const result = parseCyberOutput(
    'sarif',
    JSON.stringify({
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'Synthetic' } },
          results: [
            {
              ruleId: 'r',
              message: { text: 'secret should not render' },
              locations: [
                { physicalLocation: { artifactLocation: { uri: 'file:///etc/passwd' } } },
              ],
            },
          ],
        },
      ],
    }),
  );
  expect(result[0]?.location).toBe('withheld-path');
  expect(JSON.stringify(result)).not.toContain('secret should not render');
  expect(result[0]?.engineVersion).toContain('imported');
});
