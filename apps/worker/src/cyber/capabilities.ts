import type { CyberEngine } from '@bump/contracts';
import { loadCyberVault } from '@bump/integrations';
import { nativeCapabilities } from './docker.js';
import { SCANNER_VERSIONS } from './registry.js';
export type CyberCapability = {
  id: CyberEngine;
  available: boolean;
  version: string;
  reason: string | null;
};
export function startCyberCapabilities() {
  let capabilities: CyberCapability[] = (Object.keys(SCANNER_VERSIONS) as CyberEngine[]).map(
    (id) => ({ id, available: false, version: SCANNER_VERSIONS[id], reason: 'starting' }),
  );
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: Promise<void> = Promise.resolve();
  const tick = () => {
    active = (async () => {
      try {
        await loadCyberVault();
      } catch {
        capabilities = capabilities.map((v) => ({
          ...v,
          available: false,
          reason: 'evidence_key_unavailable',
        }));
        return;
      }
      const native = await nativeCapabilities();
      capabilities = [
        ...native,
        { id: 'json', available: true, version: SCANNER_VERSIONS.json, reason: null },
        { id: 'sarif', available: true, version: SCANNER_VERSIONS.sarif, reason: null },
        {
          id: 'web-passive',
          available: process.env.CYBER_PASSIVE_ENABLED === 'true',
          version: SCANNER_VERSIONS['web-passive'],
          reason: process.env.CYBER_PASSIVE_ENABLED === 'true' ? null : 'operator_disabled',
        },
      ];
    })().finally(() => {
      if (!closed) timer = setTimeout(tick, 10000);
    });
  };
  tick();
  return {
    read: () => capabilities,
    async close() {
      closed = true;
      clearTimeout(timer);
      await active;
    },
  };
}
