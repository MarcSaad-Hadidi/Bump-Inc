import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { type CyberObservation, cyberSourceInputSchema } from '@bump/contracts';
import { z } from 'zod';
import { parseCyberOutput } from './parsers.js';
import {
  GITLEAKS_RULES,
  type NativeEngine,
  SCANNER_IMAGES,
  SCANNER_VERSIONS,
  SEMGREP_RULES,
} from './registry.js';

const filesSchema = cyberSourceInputSchema.shape.files;
export type ScannerFiles = z.infer<typeof filesSchema>;
export type ExecutionPlan = {
  engine: NativeEngine;
  root: string;
  source: string;
  rules: string;
  name: string;
  cache: string | null;
  files: ScannerFiles;
};
export interface ScannerAdapter {
  id: NativeEngine;
  version: string;
  validateConfiguration(input: unknown): ScannerFiles;
  prepareExecution(input: unknown): Promise<ExecutionPlan>;
  execute(plan: ExecutionPlan, signal: AbortSignal): Promise<string>;
  parseResults(raw: string): CyberObservation[];
  normalizeFindings(observations: CyberObservation[]): CyberObservation[];
  collectEvidence(raw: string): string;
  cleanup(plan: ExecutionPlan): Promise<void>;
}
export class ScannerFailure extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
export function dockerCommand(
  args: string[],
  signal: AbortSignal,
  maxBytes = 1048576,
  containerName?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const abort = new AbortController();
    let child: ReturnType<typeof spawn> | undefined;
    let cleanup: Promise<unknown> = Promise.resolve();
    let stopping = false;
    const terminate = () => {
      if (stopping) return;
      stopping = true;
      abort.abort();
      child?.kill('SIGKILL');
      if (containerName)
        cleanup = dockerCommand(
          ['rm', '--force', containerName],
          AbortSignal.timeout(3000),
          2000,
        ).catch(() => undefined);
    };
    signal.addEventListener('abort', terminate, { once: true });
    let bytes = 0;
    const chunks: Buffer[] = [];
    let failed = false;
    let exceeded = false;
    child = spawn('docker', ['--host=unix:///var/run/docker.sock', ...args], {
      shell: false,
      signal: abort.signal,
      killSignal: 'SIGKILL',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout!.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        exceeded = true;
        terminate();
      } else chunks.push(chunk);
    });
    child.stderr!.resume();
    child.on('error', () => {
      failed = true;
    });
    child.once('close', async (code) => {
      signal.removeEventListener('abort', terminate);
      await cleanup;
      if (exceeded) reject(new ScannerFailure('scanner_output_limit'));
      else if (signal.aborted) reject(new ScannerFailure('scanner_cancelled'));
      else if (failed || code !== 0) reject(new ScannerFailure('scanner_process_failed'));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    if (signal.aborted) terminate();
  });
}
export function hasDockerIsolation(input: unknown) {
  const parsed = z
    .object({
      MemoryLimit: z.literal(true),
      SwapLimit: z.literal(true),
      CpuCfsQuota: z.literal(true),
      PidsLimit: z.literal(true),
      SecurityOptions: z.array(z.string()),
    })
    .safeParse(input);
  return (
    parsed.success &&
    parsed.data.SecurityOptions.some(
      (v) => v.startsWith('name=seccomp') && !v.includes('unconfined'),
    )
  );
}
export async function resourceIsolationAvailable() {
  try {
    return hasDockerIsolation(
      JSON.parse(
        await dockerCommand(['info', '--format', '{{json .}}'], AbortSignal.timeout(3000), 1048576),
      ),
    );
  } catch {
    return false;
  }
}
export async function trivyDatabaseIdentity(path: string) {
  const stat = await lstat(join(path, 'db', 'metadata.json'));
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384)
    throw new ScannerFailure('trivy_database_unavailable');
  const raw = await readFile(join(path, 'db', 'metadata.json'), 'utf8');
  const data = z
    .object({ Version: z.number(), UpdatedAt: z.string(), NextUpdate: z.string() })
    .parse(JSON.parse(raw));
  if (!Number.isFinite(Date.parse(data.NextUpdate)) || Date.parse(data.NextUpdate) <= Date.now())
    throw new ScannerFailure('trivy_database_expired');
  return raw;
}
async function checkedCache() {
  const path = resolve(process.env.CYBER_TRIVY_CACHE_DIR ?? '.artifacts/trivy-cache');
  if (/[\n\r,]/.test(path)) throw new ScannerFailure('unsafe_cache');
  let cursor = path;
  while (true) {
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new ScannerFailure('unsafe_cache');
    const next = dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
  const directory = await lstat(join(path, 'db'));
  if (!directory.isDirectory() || directory.isSymbolicLink())
    throw new ScannerFailure('unsafe_cache');
  const file = await lstat(join(path, 'db', 'trivy.db'));
  const metadata = await lstat(join(path, 'db', 'metadata.json'));
  if (!file.isFile() || file.isSymbolicLink() || !metadata.isFile() || metadata.isSymbolicLink())
    throw new ScannerFailure('trivy_database_unavailable');
  await trivyDatabaseIdentity(path);
  return path;
}
export async function nativeCapabilities() {
  const bounded = await resourceIsolationAvailable();
  return Promise.all(
    (Object.keys(SCANNER_IMAGES) as NativeEngine[]).map(async (id) => {
      try {
        if (!bounded) throw new ScannerFailure('resource_isolation_unavailable');
        await dockerCommand(
          ['image', 'inspect', SCANNER_IMAGES[id], '--format', '{{.Id}}'],
          AbortSignal.timeout(3000),
          2000,
        );
        if (id === 'trivy') await checkedCache();
        return { id, available: true, version: SCANNER_VERSIONS[id], reason: null };
      } catch (error) {
        return {
          id,
          available: false,
          version: SCANNER_VERSIONS[id],
          reason: error instanceof ScannerFailure ? error.code : 'image_unavailable',
        };
      }
    }),
  );
}
export function buildDockerArguments(plan: ExecutionPlan): string[] {
  if (!Object.hasOwn(SCANNER_IMAGES, plan.engine) || !/^bump-cyber-[a-f0-9-]{36}$/.test(plan.name))
    throw new ScannerFailure('invalid_execution_plan');
  for (const path of [plan.source, plan.rules, ...(plan.cache ? [plan.cache] : [])])
    if (!path.startsWith('/') || /[\r\n,]/.test(path)) throw new ScannerFailure('invalid_mount');
  const args = [
    'run',
    '--rm',
    '--sig-proxy=false',
    '--pull=never',
    '--name',
    plan.name,
    '--label',
    'bump.cyber=true',
    '--network=none',
    '--read-only',
    '--user=65534:65534',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true',
    '--pids-limit=128',
    '--cpus=1',
    '--memory=1536m',
    '--memory-swap=1536m',
    '--ulimit',
    'nofile=256:256',
    '--ulimit',
    'core=0:0',
    '--log-driver=none',
    '--stop-timeout=1',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,nodev,size=128m',
    '--workdir=/src',
    '--mount',
    `type=bind,src=${plan.source},dst=/src,readonly`,
    '--mount',
    `type=bind,src=${plan.rules},dst=/rules,readonly`,
  ];
  for (const name of [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
    'no_proxy',
  ])
    args.push('--env', `${name}=`);
  for (const value of [
    'XDG_CACHE_HOME=/tmp/cache',
    'SEMGREP_SETTINGS_FILE=/tmp/semgrep-settings.yml',
    'SEMGREP_LOG_FILE=/tmp/semgrep.log',
    'SEMGREP_SEND_METRICS=off',
    'SEMGREP_ENABLE_VERSION_CHECK=0',
    'PYTHONDONTWRITEBYTECODE=1',
  ])
    args.push('--env', value);
  if (plan.engine === 'trivy') {
    if (!plan.cache) throw new ScannerFailure('trivy_database_unavailable');
    args.push('--mount', `type=bind,src=${plan.cache},dst=/cache,readonly`);
  }
  args.push(SCANNER_IMAGES[plan.engine]);
  if (plan.engine === 'semgrep')
    args.push(
      'semgrep',
      'scan',
      '--config',
      '/rules/semgrep.yml',
      '--metrics=off',
      '--disable-version-check',
      '--disable-nosem',
      '--no-git-ignore',
      '--no-rewrite-rule-ids',
      '--jobs=1',
      '--max-target-bytes=131072',
      '--timeout=5',
      '--json',
      '--quiet',
      '/src',
    );
  if (plan.engine === 'gitleaks')
    args.push(
      'dir',
      '/src',
      '--config',
      '/rules/gitleaks.toml',
      '--redact=100',
      '--ignore-gitleaks-allow',
      '--no-banner',
      '--log-level=error',
      '--max-target-megabytes=1',
      '--report-format=json',
      '--report-path=/dev/stdout',
      '--exit-code=0',
    );
  if (plan.engine === 'trivy')
    args.push(
      'fs',
      '--config',
      '/dev/null',
      '--ignorefile',
      '/dev/null',
      '--cache-dir',
      '/cache',
      '--cache-backend',
      'memory',
      '--offline-scan',
      '--skip-db-update',
      '--skip-java-db-update',
      '--skip-check-update',
      '--scanners',
      'vuln,misconfig',
      '--parallel',
      '1',
      '--format',
      'json',
      '--quiet',
      '/src',
    );
  return args;
}
export function createScannerAdapter(engine: NativeEngine): ScannerAdapter {
  const validate = (input: unknown) => {
    const files = filesSchema.parse(input);
    // Trivy has source-level suppressions without a global disable switch. Fail
    // closed rather than accepting a suppressed result as a clean retest.
    if (engine === 'trivy' && files.some((f) => /(?:trivy|tfsec)\s*:\s*ignore\b/i.test(f.content)))
      throw new ScannerFailure('source_suppression_not_allowed');
    return files;
  };
  return {
    id: engine,
    version: SCANNER_VERSIONS[engine],
    validateConfiguration(input) {
      return validate(input);
    },
    async prepareExecution(input) {
      const files = validate(input).filter(
        (f) => !['.semgrepignore', '.gitleaksignore'].includes(f.path.split('/').at(-1) ?? ''),
      );
      if (!files.length) throw new ScannerFailure('no_eligible_source_files');
      if (
        new Set(files.map((f) => f.path)).size !== files.length ||
        Buffer.byteLength(JSON.stringify(files)) > 524288
      )
        throw new ScannerFailure('source_limit');
      const root = await mkdtemp(join(tmpdir(), 'bump-cyber-'));
      const source = join(root, 'source'),
        rules = join(root, 'rules');
      try {
        await mkdir(source, { mode: 0o755 });
        await mkdir(rules, { mode: 0o755 });
        await writeFile(join(rules, 'semgrep.yml'), SEMGREP_RULES, { mode: 0o444 });
        await writeFile(join(rules, 'gitleaks.toml'), GITLEAKS_RULES, { mode: 0o444 });
        for (const f of files) {
          const path = join(source, f.path);
          if (!path.startsWith(source + '/')) throw new ScannerFailure('invalid_path');
          await mkdir(dirname(path), { recursive: true, mode: 0o755 });
          await writeFile(path, f.content, { flag: 'wx', mode: 0o444 });
        }
        await chmod(source, 0o555);
        return {
          engine,
          root,
          source,
          rules,
          name: `bump-cyber-${randomUUID()}`,
          cache: engine === 'trivy' ? await checkedCache() : null,
          files,
        };
      } catch {
        await rm(root, { recursive: true, force: true });
        throw new ScannerFailure('scanner_preparation_failed');
      }
    },
    async execute(plan, signal) {
      if (!(await resourceIsolationAvailable()))
        throw new ScannerFailure('resource_isolation_unavailable');
      return dockerCommand(buildDockerArguments(plan), signal, 1048576, plan.name);
    },
    parseResults(raw) {
      return parseCyberOutput(engine, raw);
    },
    normalizeFindings(observations) {
      return observations;
    },
    collectEvidence(raw) {
      return raw;
    },
    async cleanup(plan) {
      await dockerCommand(['rm', '--force', plan.name], AbortSignal.timeout(3000), 2000).catch(
        () => undefined,
      );
      await chmod(plan.source, 0o755).catch(() => undefined);
      await rm(plan.root, { recursive: true, force: true });
    },
  };
}
