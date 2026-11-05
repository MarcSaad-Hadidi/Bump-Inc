import { expect, it } from 'vitest';
import { trivyCoverage } from './coverage.js';

function pythonInventory(packages: { Name: string; Version: string }[]) {
  return {
    SchemaVersion: 2,
    Results: [
      {
        Target: 'requirements.txt',
        Class: 'lang-pkgs',
        Type: 'pip',
        Packages: packages,
      },
    ],
  };
}

it('detects loss of a parsed dependency even when its manifest path is unchanged', () => {
  const initial = pythonInventory([
    { Name: 'Django', Version: '1.2' },
    { Name: 'urllib3', Version: '2.0.7' },
  ]);
  const rangeOmittedByParser = pythonInventory([{ Name: 'urllib3', Version: '2.0.7' }]);

  expect(trivyCoverage(initial)).not.toEqual(trivyCoverage(rangeOmittedByParser));
});

it('keeps exact-version upgrades and inventory ordering comparable', () => {
  const initial = pythonInventory([
    { Name: 'Django', Version: '1.2' },
    { Name: 'urllib3', Version: '2.0.7' },
  ]);
  const upgraded = pythonInventory([
    { Name: 'urllib3', Version: '2.5.0' },
    { Name: 'django', Version: '5.2.7' },
  ]);
  expect(trivyCoverage(initial)).toEqual(trivyCoverage(upgraded));
});

it('does not bind version-bearing native IDs, PURLs or package metadata paths', () => {
  const inventory = (Version: string) => {
    const input = pythonInventory([{ Name: 'Django', Version }]);
    const result = input.Results[0]!;
    return {
      ...input,
      Results: [
        {
          ...result,
          Packages: [
            {
              ...result.Packages[0],
              ID: `Django@${Version}`,
              Identifier: { UID: `synthetic-${Version}`, PURL: `pkg:pypi/django@${Version}` },
              FilePath: `Django-${Version}.dist-info/METADATA`,
            },
          ],
        },
      ],
    };
  };
  expect(trivyCoverage(inventory('1.2'))).toEqual(trivyCoverage(inventory('5.2.7')));
});

it('retains target, package type and package multiplicity in coverage', () => {
  const initial = pythonInventory([{ Name: 'Django', Version: '1.2' }]);
  const result = initial.Results[0]!;
  for (const change of [{ Target: 'other/requirements.txt' }, { Type: 'npm' }])
    expect(trivyCoverage(initial)).not.toEqual(
      trivyCoverage({ ...initial, Results: [{ ...result, ...change }] }),
    );
  expect(trivyCoverage(initial)).not.toEqual(
    trivyCoverage(pythonInventory([...result.Packages, { Name: 'Django', Version: '2.0' }])),
  );
});

function configInventory(status: 'PASS' | 'FAIL' = 'FAIL') {
  return {
    SchemaVersion: 2,
    Results: [
      {
        Target: 'Dockerfile',
        Class: 'config',
        Type: 'dockerfile',
        MisconfSummary: {
          Successes: status === 'PASS' ? 2 : 1,
          Failures: status === 'FAIL' ? 1 : 0,
        },
        Misconfigurations: [
          { ID: 'DS002', AVDID: 'AVD-DS-0002', Status: status, CauseMetadata: { StartLine: 2 } },
          { ID: 'DS026', AVDID: 'AVD-DS-0026', Status: 'PASS' },
        ],
      },
    ],
  };
}

it('keeps FAIL-to-PASS corrections comparable without binding source line numbers', () => {
  const corrected = configInventory('PASS');
  corrected.Results[0]!.Misconfigurations[0]!.CauseMetadata = { StartLine: 12 };
  expect(trivyCoverage(configInventory('FAIL'))).toEqual(trivyCoverage(corrected));
});

it('detects loss of an executed check even when all remaining checks pass', () => {
  const fewerChecks = configInventory('PASS');
  fewerChecks.Results[0]!.Misconfigurations.pop();
  fewerChecks.Results[0]!.MisconfSummary.Successes = 1;
  expect(trivyCoverage(configInventory('FAIL'))).not.toEqual(trivyCoverage(fewerChecks));
});

it.each([
  {},
  { SchemaVersion: 2, Results: [] },
  { SchemaVersion: 2, Results: [{ Target: 'requirements.txt', Type: 'pip', Class: 'lang-pkgs' }] },
  { SchemaVersion: 2, Results: [{ Target: 'requirements.txt', Type: 'pip', Class: 'unknown' }] },
  { SchemaVersion: 2, Results: [{ Target: 'Dockerfile', Type: 'dockerfile', Class: 'config' }] },
  pythonInventory([{ Name: 'Django', Version: '>=1.2' }]),
  pythonInventory([{ Name: 'Django', Version: 'latest' }]),
])('refuses absent or unknown native inventory: %j', (input) => {
  expect(() => trivyCoverage(input)).toThrow('Incomplete Trivy coverage');
});

it.each(['UNKNOWN', 'EXCEPTION', undefined])(
  'refuses a check that was not demonstrably executed: %s',
  (Status) => {
    const input = configInventory();
    const result = input.Results[0]!;
    expect(() =>
      trivyCoverage({
        ...input,
        Results: [{ ...result, Misconfigurations: [{ ID: 'DS002', Status }] }],
      }),
    ).toThrow('Incomplete Trivy coverage');
  },
);

it('requires every summarized check to be present and refuses suppressed results', () => {
  const input = configInventory();
  const result = input.Results[0]!;
  for (const change of [
    { MisconfSummary: undefined },
    { MisconfSummary: { Successes: 2, Failures: 1 } },
    { ExperimentalModifiedFindings: [{ Status: 'ignored' }] },
  ])
    expect(() => trivyCoverage({ ...input, Results: [{ ...result, ...change }] })).toThrow(
      'Incomplete Trivy coverage',
    );
});

it('refuses a native finding whose affected component is missing from inventory', () => {
  const input = pythonInventory([{ Name: 'urllib3', Version: '2.0.7' }]);
  const result = input.Results[0]!;
  expect(() =>
    trivyCoverage({
      ...input,
      Results: [
        {
          ...result,
          Vulnerabilities: [{ PkgName: 'django', InstalledVersion: '1.2' }],
        },
      ],
    }),
  ).toThrow('Incomplete Trivy coverage');
});

it('reconciles every exact requirements declaration with the native inventory', () => {
  const files = [
    {
      path: 'requirements.txt',
      content: '# Synthetic fixtures only\nDjango[extra]==1.2 # exact pin\nurllib3 == 2.0.7\n',
    },
  ];
  const initial = pythonInventory([
    { Name: 'Django', Version: '1.2' },
    { Name: 'urllib3', Version: '2.0.7' },
  ]);
  expect(trivyCoverage(initial, files)).toEqual(trivyCoverage(initial));
  expect(() =>
    trivyCoverage(pythonInventory([{ Name: 'urllib3', Version: '2.0.7' }]), files),
  ).toThrow('Incomplete Trivy coverage');
});

it.each([
  'Django>=1.2',
  'Django~=1.2',
  'Django==1.*',
  'Django',
  'Django @ https://example.invalid/Django.whl',
  '-r other-requirements.txt',
  'Django==1.2; python_version < "3.13"',
  'Django[invalid==1.2',
  'Django==1.2 \\\n+    --hash=sha256:synthetic',
])('refuses unresolved or unsupported requirements syntax: %s', (declaration) => {
  const report = pythonInventory([
    { Name: 'Django', Version: '1.2' },
    { Name: 'urllib3', Version: '2.0.7' },
  ]);
  expect(() =>
    trivyCoverage(report, [
      { path: 'requirements.txt', content: `${declaration}\nurllib3==2.0.7\n` },
    ]),
  ).toThrow('Incomplete Trivy coverage');
});
