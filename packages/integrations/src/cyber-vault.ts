import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

export function createCyberVault(key: Buffer) {
  if (key.length !== 32) throw new Error('Cyber evidence requires a 256-bit operator key');
  const keyId = createHash('sha256').update(key).digest('hex').slice(0, 16);
  return {
    keyId,
    seal(context: string, plaintext: string) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(context));
      const bytes = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      return [
        'v1',
        keyId,
        iv.toString('base64url'),
        bytes.toString('base64url'),
        cipher.getAuthTag().toString('base64url'),
      ].join('.');
    },
    open(context: string, ciphertext: string) {
      try {
        const [v, k, iv, bytes, tag, ...rest] = ciphertext.split('.');
        if (v !== 'v1' || k !== keyId || !iv || !bytes || !tag || rest.length) throw new Error();
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
        decipher.setAAD(Buffer.from(context));
        decipher.setAuthTag(Buffer.from(tag, 'base64url'));
        return Buffer.concat([
          decipher.update(Buffer.from(bytes, 'base64url')),
          decipher.final(),
        ]).toString('utf8');
      } catch {
        throw new Error('Cyber evidence integrity or key check failed');
      }
    },
  };
}
export type CyberVault = ReturnType<typeof createCyberVault>;
export async function loadCyberVault(
  path = process.env.CYBER_EVIDENCE_KEY_FILE,
): Promise<CyberVault> {
  if (!path) throw new Error('CYBER_EVIDENCE_KEY_FILE is required for Cyber');
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (
      !stat.isFile() ||
      stat.size !== 32 ||
      (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)
    )
      throw new Error('Cyber key file must be private and contain 32 bytes');
    return createCyberVault(await file.readFile());
  } finally {
    await file.close();
  }
}
