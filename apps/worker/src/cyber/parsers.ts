import { createHash } from 'node:crypto';
import { type CyberEngine, type CyberObservation, cyberObservationSchema } from '@bump/contracts';
import { z } from 'zod';

const bounded = z.string().max(8192);
const identifier = z.string().min(1).max(512);
export function safeToken(value: string, max = 180) {
  return (
    value
      .replace(
        /(?:AKIA[0-9A-Z]{16}|gh[pousr]_[a-zA-Z0-9_]+|(?:Bearer|Basic)\s+\S+|[a-zA-Z0-9_+=]{24,})/g,
        '[REDACTED]',
      )
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(0, max) || 'withheld'
  );
}
export function safeLocation(value: string, line?: number) {
  const path = value.replace(/^\/src\//, '').replaceAll('\\', '/');
  if (
    path.startsWith('/') ||
    path.includes('://') ||
    path.split('/').some((p) => p === '..') ||
    path.length > 400
  )
    return 'withheld-path';
  return `${safeToken(path, 400)}${line ? `:${line}` : ''}`;
}
function references(values: string[] = []) {
  return [...new Set(values)]
    .flatMap((value) => {
      try {
        const u = new URL(value);
        if (
          !['https:', 'http:'].includes(u.protocol) ||
          u.username ||
          u.password ||
          u.search ||
          u.hash ||
          value.length > 2000
        )
          return [];
        if (safeToken(value, 2000) !== value) return [];
        return [u.href];
      } catch {
        return [];
      }
    })
    .slice(0, 20);
}
function base(
  engine: CyberEngine,
  version: string,
  ruleId: string,
  title: string,
): CyberObservation {
  return {
    engine,
    engineVersion: safeToken(version, 100),
    ruleId: safeToken(ruleId, 256),
    title: safeToken(title, 300),
    severity: 'unknown',
    confidence: 'medium',
    location: '',
    component: '',
    affectedVersion: '',
    fixedVersion: '',
    cve: null,
    cvss: null,
    references: [],
    evidence: 'Automated signal; human validation required. Source content is withheld.',
    recommendation:
      'Validate the signal, assess business impact and apply the official remediation appropriate to the component.',
  };
}
const line = z.number().int().min(1).max(2147483647);
const semgrep = z.object({
  version: identifier,
  results: z
    .array(
      z.object({
        check_id: identifier,
        path: identifier,
        start: z.object({ line }),
        extra: z.object({ severity: z.enum(['ERROR', 'WARNING', 'INFO']) }),
      }),
    )
    .max(1000),
  errors: z.array(z.unknown()).max(1000),
});
const semgrepTitles: Record<string, string> = {
  'bump.python.dynamic-eval': 'Dynamic evaluation of input',
  'bump.python.shell-command': 'Shell command construction',
  'bump.javascript.dynamic-eval': 'Dynamic JavaScript evaluation',
};
export function parseSemgrep(input: unknown): CyberObservation[] {
  const data = semgrep.parse(input);
  if (data.errors.length) throw new Error('Incomplete Semgrep analysis');
  return data.results.map((r) => ({
    ...base(
      'semgrep',
      data.version,
      r.check_id,
      semgrepTitles[r.check_id] ?? `Semgrep rule ${safeToken(r.check_id)}`,
    ),
    severity: ({ ERROR: 'high', WARNING: 'medium', INFO: 'low' } as const)[r.extra.severity],
    location: safeLocation(r.path, r.start.line),
  }));
}
const trivyVulnerability = z.object({
  VulnerabilityID: identifier,
  PkgName: identifier,
  InstalledVersion: bounded,
  FixedVersion: bounded.optional(),
  Severity: z.enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  PrimaryURL: bounded.optional(),
  References: z.array(bounded).max(500).optional(),
  CVSS: z
    .record(z.string(), z.object({ V3Score: z.number().min(0).max(10).optional() }))
    .optional(),
});
const trivyMisconfiguration = z.object({
  ID: identifier,
  AVDID: identifier.optional(),
  Severity: z.enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  Status: z.enum(['PASS', 'FAIL', 'EXCEPTION']).optional(),
  PrimaryURL: bounded.optional(),
  CauseMetadata: z.object({ StartLine: line.optional() }).optional(),
});
const trivy = z.object({
  SchemaVersion: z.literal(2),
  Results: z
    .array(
      z.object({
        Target: identifier,
        Vulnerabilities: z.array(trivyVulnerability).max(1000).optional(),
        Misconfigurations: z.array(trivyMisconfiguration).max(1000).optional(),
      }),
    )
    .max(200),
});
export function parseTrivy(input: unknown, version = '0.76.1'): CyberObservation[] {
  const data = trivy.parse(input);
  const output: CyberObservation[] = [];
  for (const result of data.Results) {
    for (const v of result.Vulnerabilities ?? []) {
      output.push({
        ...base(
          'trivy',
          version,
          v.VulnerabilityID,
          `Affected dependency: ${safeToken(v.PkgName)}`,
        ),
        severity: v.Severity.toLowerCase() as CyberObservation['severity'],
        component: safeToken(v.PkgName),
        affectedVersion: safeToken(v.InstalledVersion, 100),
        fixedVersion: v.FixedVersion ? safeToken(v.FixedVersion, 100) : '',
        location: safeLocation(result.Target),
        cve: /^CVE-\d{4}-\d{4,}$/.test(v.VulnerabilityID) ? v.VulnerabilityID : null,
        cvss:
          v.CVSS?.['nvd']?.V3Score ??
          Object.values(v.CVSS ?? {}).find((c) => c.V3Score !== undefined)?.V3Score ??
          null,
        references: references([...(v.PrimaryURL ? [v.PrimaryURL] : []), ...(v.References ?? [])]),
        recommendation: v.FixedVersion
          ? `Evaluate upgrading ${safeToken(v.PkgName)} to the fixed version ${safeToken(v.FixedVersion, 100)}; test compatibility.`
          : 'Consult the official advisory and evaluate compensating controls; no fixed version was reported.',
      });
    }
    for (const m of result.Misconfigurations ?? []) {
      if (m.Status && m.Status !== 'FAIL') continue;
      output.push({
        ...base(
          'trivy',
          version,
          m.AVDID ?? m.ID,
          `Configuration rule ${safeToken(m.AVDID ?? m.ID)}`,
        ),
        severity: m.Severity.toLowerCase() as CyberObservation['severity'],
        location: safeLocation(result.Target, m.CauseMetadata?.StartLine),
        references: references(m.PrimaryURL ? [m.PrimaryURL] : []),
      });
    }
  }
  if (output.length > 1000) throw new Error('Observation limit exceeded');
  return output.map((v) => cyberObservationSchema.parse(v));
}
const leaks = z
  .array(
    z.object({ RuleID: identifier, File: identifier, StartLine: line, EndLine: line.optional() }),
  )
  .max(1000);
export function parseGitleaks(input: unknown, version = '8.30.1'): CyberObservation[] {
  return leaks.parse(input).map((r) => ({
    ...base('gitleaks', version, r.RuleID, `Potential exposed secret (${safeToken(r.RuleID)})`),
    severity: 'high',
    confidence: 'high',
    location: safeLocation(r.File, r.StartLine),
    evidence:
      'Potential secret detected. Secret, match, snippet and commit author are fully withheld. No credential validity was tested.',
    recommendation:
      'Review privately. If valid and exposed, revoke/rotate the credential at its provider; removing source text alone is insufficient.',
  }));
}
const sarif = z.object({
  version: z.literal('2.1.0'),
  runs: z
    .array(
      z.object({
        tool: z.object({
          driver: z.object({
            name: identifier,
            version: identifier.optional(),
            semanticVersion: identifier.optional(),
          }),
        }),
        results: z
          .array(
            z.object({
              ruleId: identifier.optional(),
              level: z.enum(['none', 'note', 'warning', 'error']).optional(),
              locations: z
                .array(
                  z.object({
                    physicalLocation: z.object({
                      artifactLocation: z.object({ uri: identifier }),
                      region: z.object({ startLine: line.optional() }).optional(),
                    }),
                  }),
                )
                .max(20)
                .optional(),
            }),
          )
          .max(1000),
      }),
    )
    .max(20),
});
export function parseSarif(input: unknown): CyberObservation[] {
  const data = sarif.parse(input);
  const output: CyberObservation[] = [];
  for (const run of data.runs)
    for (const [i, r] of run.results.entries()) {
      const rule =
        r.ruleId ??
        `unidentified-${createHash('sha256')
          .update(JSON.stringify(r) + i)
          .digest('hex')
          .slice(0, 16)}`;
      const place = r.locations?.[0]?.physicalLocation;
      output.push({
        ...base(
          'sarif',
          `${safeToken(run.tool.driver.name, 40)} ${safeToken(run.tool.driver.version ?? run.tool.driver.semanticVersion ?? 'not-reported', 40)} (imported)`,
          `${safeToken(run.tool.driver.name, 60)}:${rule}`,
          `Imported rule ${safeToken(rule)}`,
        ),
        severity:
          r.level === 'error'
            ? 'high'
            : r.level === 'warning'
              ? 'medium'
              : r.level === 'note'
                ? 'info'
                : 'unknown',
        location: place ? safeLocation(place.artifactLocation.uri, place.region?.startLine) : '',
      });
    }
  if (output.length > 1000) throw new Error('Observation limit exceeded');
  return output;
}
export function parseCyberJson(input: unknown): CyberObservation[] {
  const source = z
    .object({
      version: z.literal(1),
      engine: z.enum(['semgrep', 'trivy', 'gitleaks']),
      engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
      report: z.unknown(),
    })
    .parse(input);
  const observations =
    source.engine === 'semgrep'
      ? parseSemgrep(source.report)
      : source.engine === 'trivy'
        ? parseTrivy(source.report, source.engineVersion)
        : parseGitleaks(source.report, source.engineVersion);
  return observations.map((o) =>
    cyberObservationSchema.parse({ ...o, engineVersion: `${o.engineVersion} (imported)` }),
  );
}
export function parseCyberOutput(engine: CyberEngine, raw: string): CyberObservation[] {
  if (Buffer.byteLength(raw) > 1048576) throw new Error('Output limit exceeded');
  const data: unknown = JSON.parse(raw);
  const result =
    engine === 'semgrep'
      ? parseSemgrep(data)
      : engine === 'trivy'
        ? parseTrivy(data)
        : engine === 'gitleaks'
          ? parseGitleaks(data)
          : engine === 'sarif'
            ? parseSarif(data)
            : engine === 'json'
              ? parseCyberJson(data)
              : z.array(cyberObservationSchema).max(1000).parse(data);
  return result.map((o) => cyberObservationSchema.parse(o));
}
