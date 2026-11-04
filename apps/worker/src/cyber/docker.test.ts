import { expect, it } from 'vitest';
import {
  buildDockerArguments,
  createScannerAdapter,
  hasDockerIsolation,
  scannerSecondsUntil,
} from './docker.js';
import { SCANNER_IMAGES } from './registry.js';

it('uses fixed images and structured Docker confinement without a shell', () => {
  const plan = {
    engine: 'gitleaks' as const,
    root: '/tmp/lab',
    source: '/tmp/lab/source',
    rules: '/tmp/lab/rules',
    cache: null,
    name: 'bump-cyber-10000000-0000-4000-8000-000000000001',
    files: [{ path: 'app.py', content: 'synthetic' }],
  };
  const args = buildDockerArguments(plan);
  for (const flag of [
    '--network=none',
    '--read-only',
    '--user=65534:65534',
    '--cap-drop=ALL',
    '--pids-limit=128',
    '--cpus=1',
    '--memory=1536m',
    '--redact=100',
    '--ignore-gitleaks-allow',
    '--sig-proxy=false',
    '--pull=never',
    '--log-driver=none',
  ])
    expect(args).toContain(flag);
  expect(args).not.toContain('synthetic');
  expect(args).not.toContain('/var/run/docker.sock');
  expect(() => buildDockerArguments({ ...plan, source: '/tmp/a,src=/etc' })).toThrow();
  expect(() => buildDockerArguments({ ...plan, engine: 'arbitrary' as 'gitleaks' })).toThrow();
});
it('rejects source traversal and extra command input before any process starts', () => {
  const scanner = createScannerAdapter('semgrep');
  expect(() => scanner.validateConfiguration([{ path: '../escape', content: 'x' }])).toThrow();
  expect(() =>
    scanner.validateConfiguration([{ path: 'a.py', content: 'x', command: 'sh' }]),
  ).toThrow();
});
it.each(['semgrep', 'trivy', 'gitleaks'] as const)(
  'enforces an independent in-container deadline for %s',
  (engine) => {
    const plan = {
      engine,
      root: '/tmp/lab',
      source: '/tmp/lab/source',
      rules: '/tmp/lab/rules',
      cache: '/tmp/lab/cache',
      name: 'bump-cyber-10000000-0000-4000-8000-000000000001',
      files: [{ path: 'app.py', content: 'synthetic' }],
    };
    const args = buildDockerArguments(plan, 2);
    expect(args).toContain('--init');
    expect(args).toContain('--entrypoint=/usr/bin/timeout');
    const afterImage = args.slice(args.indexOf(SCANNER_IMAGES[engine]) + 1);
    expect(afterImage.slice(0, 3)).toEqual(['-s', 'KILL', '2']);
    expect(afterImage[3]).toBe(
      { semgrep: '/usr/bin/semgrep', trivy: '/usr/local/bin/trivy', gitleaks: '/usr/bin/gitleaks' }[
        engine
      ],
    );
    for (const invalid of [0, 31, Infinity, NaN, 1.5])
      expect(() => buildDockerArguments(plan, invalid)).toThrow();
  },
);
it('rounds the remaining absolute deadline down and never starts an expired execution', () => {
  expect(scannerSecondsUntil(new Date(3999), 1000)).toBe(2);
  expect(scannerSecondsUntil(new Date(99999), 1000)).toBe(30);
  for (const date of [new Date(1000), new Date(1500), new Date(NaN)])
    expect(() => scannerSecondsUntil(date, 1000)).toThrow();
});
it.each([
  '# trivy:ignore:AVD-DS-0002',
  '#tfsec:ignore:aws-s3-enable-versioning',
  '# TRIVY : ignore : AVD-DS-0002',
])('rejects source-controlled Trivy suppression: %s', async (comment) => {
  await expect(
    createScannerAdapter('trivy').prepareExecution([
      { path: 'Dockerfile', content: `${comment}\nFROM alpine\nUSER root\n` },
    ]),
  ).rejects.toMatchObject({ code: 'source_suppression_not_allowed' });
});

it('fixes complete Trivy package/check inventory and precise detection in the reviewed argv', () => {
  const args = buildDockerArguments({
    engine: 'trivy',
    root: '/tmp/lab',
    source: '/tmp/lab/source',
    rules: '/tmp/lab/rules',
    cache: '/tmp/lab/cache',
    name: 'bump-cyber-10000000-0000-4000-8000-000000000001',
    files: [{ path: 'requirements.txt', content: 'Django==1.2\n' }],
  });
  expect(args).toContain('--list-all-pkgs');
  expect(args).toContain('--include-non-failures');
  expect(
    args.slice(args.indexOf('--detection-priority'), args.indexOf('--detection-priority') + 2),
  ).toEqual(['--detection-priority', 'precise']);
  expect(args).toContain('--offline-scan');
  expect(args).toContain('--network=none');
});

it('fails closed when Docker cannot enforce any requested resource boundary', () => {
  const info = {
    MemoryLimit: true,
    SwapLimit: true,
    CpuCfsQuota: true,
    PidsLimit: true,
    InitBinary: 'docker-init',
    SecurityOptions: ['name=seccomp,profile=builtin'],
  };
  expect(hasDockerIsolation(info)).toBe(true);
  expect(hasDockerIsolation({ ...info, InitBinary: '' })).toBe(false);
  for (const key of ['MemoryLimit', 'SwapLimit', 'CpuCfsQuota', 'PidsLimit'])
    expect(hasDockerIsolation({ ...info, [key]: false })).toBe(false);
  expect(
    hasDockerIsolation({ ...info, SecurityOptions: ['name=seccomp,profile=unconfined'] }),
  ).toBe(false);
});
