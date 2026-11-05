import {
  dockerCommand,
  hasDockerIsolation,
  nativeCapabilities,
} from '../apps/worker/dist/cyber/docker.js';

if (process.argv.slice(2).some((arg) => arg !== '--require-native'))
  throw new Error('Unknown diagnostic option');
let info;
try {
  info = JSON.parse(
    await dockerCommand(['info', '--format', '{{json .}}'], AbortSignal.timeout(10000)),
  );
} catch {
  console.log(JSON.stringify({ code: 'docker_probe_unavailable' }));
  process.exit(1);
}
// Whitelist capabilities only: never publish host identity, daemon configuration,
// proxy settings, raw errors or customer paths from Docker's diagnostic output.
const boundaries = {
  init: typeof info.InitBinary === 'string' && info.InitBinary.length > 0,
  memory: info.MemoryLimit === true,
  swap: info.SwapLimit === true,
  cpu: info.CpuCfsQuota === true,
  pids: info.PidsLimit === true,
  seccomp:
    Array.isArray(info.SecurityOptions) &&
    info.SecurityOptions.some(
      (v) => typeof v === 'string' && v.startsWith('name=seccomp') && !v.includes('unconfined'),
    ),
};
const engines = await nativeCapabilities();
console.log(JSON.stringify({ boundaries, isolated: hasDockerIsolation(info), engines }, null, 2));
if (process.argv.includes('--require-native') && engines.some((engine) => !engine.available))
  process.exitCode = 1;
