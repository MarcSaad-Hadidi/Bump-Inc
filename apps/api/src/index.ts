import { apiEnvSchema, parseEnv } from '@bump/contracts';
import { buildServer } from './server.js';

const env = parseEnv(apiEnvSchema);
const app = buildServer(env);
let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => {
    app.log.error('Shutdown deadline exceeded');
    process.exit(1);
  }, 10_000);
  deadline.unref();
  try {
    await app.close();
  } catch {
    app.log.error('Graceful shutdown failed');
    process.exit(1);
  } finally {
    clearTimeout(deadline);
  }
}

process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});

try {
  await app.listen({ host: env.HOST, port: env.API_PORT });
} catch {
  app.log.error('API startup failed');
  process.exitCode = 1;
  await shutdown();
}
