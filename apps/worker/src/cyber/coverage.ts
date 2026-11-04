import { z } from 'zod';

const identity = z.string().min(1).max(512);
const packageInventory = z.object({
  Name: identity,
  // An unresolved constraint/tag is not an analyzed installed version.
  Version: identity.regex(/^[vV]?\d[A-Za-z0-9.!+_~:-]*$/),
  SrcName: identity.optional(),
  Arch: identity.optional(),
  FilePath: identity.optional(),
});
const checkInventory = z.object({
  ID: identity,
  AVDID: identity.optional(),
  Status: z.enum(['PASS', 'FAIL', 'EXCEPTION']),
});
const report = z.object({
  SchemaVersion: z.literal(2),
  Results: z
    .array(
      z.object({
        Target: identity,
        Class: z.enum(['lang-pkgs', 'os-pkgs', 'config']),
        Type: identity,
        Packages: z.array(packageInventory).max(10000).optional(),
        Vulnerabilities: z
          .array(z.object({ PkgName: identity, InstalledVersion: identity }))
          .max(1000)
          .optional(),
        Misconfigurations: z.array(checkInventory).max(10000).optional(),
        MisconfSummary: z
          .object({
            Successes: z.number().int().min(0),
            Failures: z.number().int().min(0),
          })
          .optional(),
        ExperimentalModifiedFindings: z.array(z.unknown()).max(10000).optional(),
      }),
    )
    .min(1)
    .max(200),
});

const incomplete = () => new Error('Incomplete Trivy coverage');
const targetPath = (target: string) => target.replace(/^\/src\//, '');
const pipName = (name: string) => name.toLowerCase().replace(/[-_.]+/g, '-');

/** Native coverage only: imported reports cannot establish this execution identity. */
export function trivyCoverage(
  input: unknown,
  files: readonly { path: string; content: string }[] = [],
): string[] {
  const parsed = report.safeParse(input);
  if (!parsed.success) throw incomplete();
  const results = parsed.data.Results;
  const coverage: string[] = [];
  for (const result of results) {
    if (result.ExperimentalModifiedFindings?.length) throw incomplete();
    const scope = [targetPath(result.Target), result.Class, result.Type];
    coverage.push(JSON.stringify(['target', ...scope]));
    if (result.Class === 'config') {
      const checks = result.Misconfigurations;
      const summary = result.MisconfSummary;
      if (!checks?.length || !summary || checks.some((check) => check.Status === 'EXCEPTION'))
        throw incomplete();
      if (
        summary.Successes !== checks.filter((check) => check.Status === 'PASS').length ||
        summary.Failures !== checks.filter((check) => check.Status === 'FAIL').length
      )
        throw incomplete();
      // Status and source line may change after a genuine correction; the executed check must remain.
      for (const check of checks)
        coverage.push(JSON.stringify(['check', ...scope, check.AVDID ?? check.ID]));
    } else {
      if (!result.Packages?.length) throw incomplete();
      const componentName = (name: string) => (result.Type === 'pip' ? pipName(name) : name);
      for (const vulnerability of result.Vulnerabilities ?? [])
        if (
          !result.Packages.some(
            (pkg) =>
              componentName(pkg.Name) === componentName(vulnerability.PkgName) &&
              (result.Class === 'os-pkgs' || pkg.Version === vulnerability.InstalledVersion),
          )
        )
          throw incomplete();
      // Versions, PURLs and UIDs contain the version being remediated. Keep component identity,
      // target and multiplicity instead, so an upgrade remains comparable but a lost package does not.
      for (const pkg of result.Packages)
        coverage.push(
          JSON.stringify([
            'package',
            ...scope,
            componentName(pkg.Name),
            pkg.SrcName ?? '',
            pkg.Arch ?? '',
          ]),
        );
    }
  }

  // Trivy precise deliberately skips unresolved requirements, directives and invalid lines.
  // Accept only a conservative exact-pin subset, and reconcile every declaration with native
  // inventory. A successful partial scan must never establish comparable correction evidence.
  for (const file of files.filter((f) => f.path.split('/').at(-1) === 'requirements.txt')) {
    const expected: string[] = [];
    for (const line of file.content.split(/\r?\n/)) {
      const declaration = line.split('#', 1)[0]!.trim();
      if (!declaration) continue;
      const match = declaration.match(
        /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[A-Za-z0-9._-]+(?:,[A-Za-z0-9._-]+)*\])?\s*==\s*([vV]?\d[A-Za-z0-9.!+_:-]*)$/,
      );
      if (!match) throw incomplete();
      expected.push(JSON.stringify([pipName(match[1]!), match[2]!]));
    }
    const actual = results
      .filter(
        (r) => targetPath(r.Target) === file.path && r.Class === 'lang-pkgs' && r.Type === 'pip',
      )
      .flatMap((r) => r.Packages ?? [])
      .map((pkg) => JSON.stringify([pipName(pkg.Name), pkg.Version]));
    if (JSON.stringify(expected.sort()) !== JSON.stringify(actual.sort())) throw incomplete();
  }
  return coverage.sort();
}
