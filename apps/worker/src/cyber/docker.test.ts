import { expect, it } from 'vitest';
import { buildDockerArguments, createScannerAdapter, hasDockerIsolation } from './docker.js';

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

it('fails closed when Docker cannot enforce any requested resource boundary', () => {
  const info = {
    MemoryLimit: true,
    SwapLimit: true,
    CpuCfsQuota: true,
    PidsLimit: true,
    SecurityOptions: ['name=seccomp,profile=builtin'],
  };
  expect(hasDockerIsolation(info)).toBe(true);
  for (const key of ['MemoryLimit', 'SwapLimit', 'CpuCfsQuota', 'PidsLimit'])
    expect(hasDockerIsolation({ ...info, [key]: false })).toBe(false);
  expect(
    hasDockerIsolation({ ...info, SecurityOptions: ['name=seccomp,profile=unconfined'] }),
  ).toBe(false);
});
