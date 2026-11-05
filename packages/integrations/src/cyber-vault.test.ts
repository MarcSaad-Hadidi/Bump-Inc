import { expect, it } from 'vitest';
import { createCyberVault } from './cyber-vault.js';

it('encrypts evidence and rejects tampering or a different tenant/context', () => {
  const vault = createCyberVault(Buffer.alloc(32, 7));
  const token = vault.seal('tenant-a/evidence-a', 'synthetic confidential evidence');
  expect(token).not.toContain('confidential');
  expect(vault.open('tenant-a/evidence-a', token)).toBe('synthetic confidential evidence');
  expect(() => vault.open('tenant-b/evidence-a', token)).toThrow();
  expect(() => vault.open('tenant-a/evidence-b', token)).toThrow();
  expect(() => createCyberVault(Buffer.alloc(16))).toThrow();
  const parts = token.split('.');
  parts[3] = Buffer.from('tampered').toString('base64url');
  expect(() => vault.open('tenant-a/evidence-a', parts.join('.'))).toThrow();
});
