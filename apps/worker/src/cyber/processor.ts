import { createHash } from 'node:crypto';
import { type CyberEngine, cyberEngineSchema, cyberScanPayloadSchema } from '@bump/contracts';
import {
  executionCheckpoint,
  finishCyberScan,
  finishExecution,
  readCyberScanForExecution,
  requireCyberRole,
  stageCyberScan,
  withCyber,
} from '@bump/core';
import type { Database } from '@bump/db';
import { type CyberVault, loadCyberVault } from '@bump/integrations';
import { z } from 'zod';
import { createScannerAdapter, trivyDatabaseIdentity } from './docker.js';
import { parseCyberOutput } from './parsers.js';
import { passiveObservations, runCyberPassive } from './passive.js';
import type { NativeEngine } from './registry.js';
import { GITLEAKS_RULES, SCANNER_VERSIONS, SEMGREP_RULES } from './registry.js';

type Attempt = { organizationId: string; userId: string; jobId: string; token: string };
export async function processCyberScan(
  database: Database,
  attempt: Attempt,
  payload: unknown,
  options: { signal?: AbortSignal; vault?: CyberVault; deadline: Date },
) {
  const { scanId } = cyberScanPayloadSchema.parse(payload);
  const scope = { ...attempt, scanId };
  const vault = options.vault ?? (await loadCyberVault());
  const bound = await readCyberScanForExecution(database, scope);
  const engine = cyberEngineSchema.parse(bound.scan.engine);
  const stop = new AbortController();
  const abort = () => stop.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timeout = setTimeout(abort, Math.max(1, options.deadline.getTime() - Date.now()));
  let checking = false;
  let pending: Promise<void> = Promise.resolve();
  const check = () => {
    if (checking || stop.signal.aborted) return;
    checking = true;
    pending = executionCheckpoint(database, attempt)
      .then(async (ok) => {
        if (!ok) {
          abort();
          return;
        }
        await withCyber(database, attempt, async (_tx, role) => {
          requireCyberRole(role, ['admin', 'consultant', 'analyst']);
        });
      })
      .catch(abort)
      .finally(() => {
        checking = false;
      });
  };
  const interval = setInterval(check, 200);
  try {
    stop.signal.throwIfAborted();
    await stageCyberScan(database, scope, 'preparing');
    let raw: string;
    let observations;
    let coverage: string[] = [];
    if (engine === 'web-passive') {
      if (process.env.CYBER_PASSIVE_ENABLED !== 'true') throw new Error('Passive network disabled');
      if (bound.asset.target.kind !== 'hostname') throw new Error('Invalid passive target');
      await stageCyberScan(database, scope, 'running');
      const result = await runCyberPassive(bound.asset.target.value, stop.signal);
      raw = JSON.stringify(result);
      observations = passiveObservations(result);
      coverage = ['HTTPS HEAD /; no redirects followed', 'DNS A/AAAA/TXT/_dmarc TXT'];
    } else {
      if (!bound.source) throw new Error('Source missing');
      const source = vault.open(
        `${attempt.organizationId}/${bound.source.id}`,
        bound.source.ciphertext,
      );
      if (createHash('sha256').update(source).digest('hex') !== bound.source.sha256)
        throw new Error('Source integrity failed');
      if (engine === 'json' || engine === 'sarif') {
        if (bound.source.kind !== engine) throw new Error('Source mismatch');
        await stageCyberScan(database, scope, 'running');
        raw = source;
        observations = parseCyberOutput(engine, raw);
      } else {
        if (bound.source.kind !== 'files') throw new Error('Source mismatch');
        const adapter = createScannerAdapter(engine as NativeEngine);
        const plan = await adapter.prepareExecution(JSON.parse(source));
        try {
          await stageCyberScan(database, scope, 'running');
          raw = await adapter.execute(plan, stop.signal);
          observations = adapter.normalizeFindings(adapter.parseResults(raw));
          if (engine === 'semgrep') {
            const paths = z
              .object({ paths: z.object({ scanned: z.array(z.string()).min(1).max(1000) }) })
              .parse(JSON.parse(raw));
            coverage = paths.paths.scanned.map((v) => v.replace(/^\/src\//, ''));
          } else coverage = plan.files.map((f) => f.path);
          if (engine === 'trivy' && plan.cache)
            coverage.push('database:' + (await trivyDatabaseIdentity(plan.cache)));
          raw = adapter.collectEvidence(raw);
        } finally {
          await adapter.cleanup(plan);
        }
      }
    }
    stop.signal.throwIfAborted();
    await stageCyberScan(database, scope, 'parsing');
    if (!(await executionCheckpoint(database, attempt))) throw new Error('Authorization changed');
    await readCyberScanForExecution(database, scope);
    const coverageHash = ['json', 'sarif'].includes(engine)
      ? ''
      : createHash('sha256')
          .update(
            JSON.stringify({
              engine,
              version: SCANNER_VERSIONS[engine],
              rules:
                engine === 'semgrep'
                  ? SEMGREP_RULES
                  : engine === 'gitleaks'
                    ? GITLEAKS_RULES
                    : 'reviewed-default-v1',
              paths: [...coverage].sort(),
            }),
          )
          .digest('hex');
    await finishCyberScan(database, vault, scope, {
      raw,
      observations,
      engineVersion: SCANNER_VERSIONS[engine],
      coverageHash,
    });
  } catch {
    await finishExecution(database, {
      ...attempt,
      outcome: stop.signal.aborted ? 'cancelled' : 'failed',
    });
  } finally {
    clearTimeout(timeout);
    clearInterval(interval);
    options.signal?.removeEventListener('abort', abort);
    await pending;
  }
}
