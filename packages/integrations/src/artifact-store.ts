import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, link, lstat, mkdir, open, unlink } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { z } from 'zod';

export interface ArtifactStore {
  backend: 'local' | 's3';
  put(key: string, bytes: Buffer, sha256: string): Promise<void>;
  get(key: string, maxBytes: number): Promise<Buffer>;
  close(): void;
}

const maxSourceBytes = 512 * 1024;
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const keySchema = z.string().regex(new RegExp(`^${uuid}/${uuid}\\.json$`));
const sizeSchema = z.number().int().min(1).max(maxSourceBytes);
const digestSchema = z.string().regex(/^[0-9a-f]{64}$/);
const configurationSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ARTIFACT_BACKEND: z.enum(['local', 's3']).default('local'),
  ARTIFACT_LOCAL_ROOT: z
    .string()
    .min(1)
    .max(4096)
    .refine((value) => !value.includes('\0'))
    .default('.artifacts/audit-objects'),
  ARTIFACT_S3_ENDPOINT: z.url().optional(),
  ARTIFACT_S3_REGION: z.string().min(1).max(100).optional(),
  ARTIFACT_S3_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/)
    .optional(),
  ARTIFACT_S3_ACCESS_KEY_ID: z.string().min(8).max(200).optional(),
  ARTIFACT_S3_SECRET_ACCESS_KEY: z.string().min(16).max(500).optional(),
});

function digest(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function validatePut(key: string, bytes: Buffer, sha256: string): void {
  if (
    !keySchema.safeParse(key).success ||
    !Buffer.isBuffer(bytes) ||
    !sizeSchema.safeParse(bytes.length).success ||
    !digestSchema.safeParse(sha256).success ||
    digest(bytes) !== sha256
  )
    throw new Error('Invalid artifact request');
}

function validateGet(key: string, maxBytes: number): void {
  if (!keySchema.safeParse(key).success || !sizeSchema.safeParse(maxBytes).success) {
    throw new Error('Invalid artifact request');
  }
}

function hasCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === code;
}

async function privateDirectory(path: string): Promise<void> {
  const parent = dirname(path);
  if (parent !== path) await checkedDirectory(parent);
  try {
    await mkdir(path, { mode: 0o700 });
  } catch (error) {
    if (!hasCode(error, 'EEXIST')) throw error;
  }
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Unsafe artifact directory');
  if (process.platform !== 'win32') await chmod(path, 0o700);
}

async function checkedDirectory(path: string): Promise<void> {
  const parent = dirname(path);
  if (parent !== path) await checkedDirectory(parent);
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (!hasCode(error, 'ENOENT')) throw error;
    try {
      await mkdir(path, { mode: 0o700 });
    } catch (creationError) {
      if (!hasCode(creationError, 'EEXIST')) throw creationError;
    }
    info = await lstat(path);
  }
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Unsafe artifact directory');
}

function localStore(rootInput: string): ArtifactStore {
  const root = resolve(rootInput);
  if (root === parse(root).root) throw new Error('Invalid artifact configuration');

  async function filePath(key: string): Promise<string> {
    await privateDirectory(root);
    const tenantDirectory = join(root, key.split('/')[0] as string);
    await privateDirectory(tenantDirectory);
    return join(root, key);
  }

  async function read(path: string, maxBytes: number): Promise<Buffer> {
    const info = await lstat(path);
    if (info.isSymbolicLink() || !info.isFile() || info.size > maxBytes) {
      throw new Error('Invalid artifact file');
    }
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const opened = await handle.stat();
      if (
        !opened.isFile() ||
        opened.size > maxBytes ||
        opened.ino !== info.ino ||
        opened.dev !== info.dev
      ) {
        throw new Error('Invalid artifact file');
      }
      const bytes = Buffer.alloc(maxBytes + 1);
      let offset = 0;
      while (offset < bytes.length) {
        const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
        if (bytesRead === 0) break;
        offset += bytesRead;
      }
      if (offset > maxBytes) throw new Error('Artifact size exceeded');
      return bytes.subarray(0, offset);
    } finally {
      await handle.close();
    }
  }

  return {
    backend: 'local',
    async put(key, bytes, sha256) {
      validatePut(key, bytes, sha256);
      let temporary: string | undefined;
      try {
        const path = await filePath(key);
        const candidate = join(dirname(path), `.${randomUUID()}.tmp`);
        const handle = await open(candidate, 'wx', 0o600);
        temporary = candidate;
        try {
          await handle.writeFile(bytes);
          await handle.sync();
        } finally {
          await handle.close();
        }
        try {
          await link(temporary, path);
        } catch (error) {
          if (!hasCode(error, 'EEXIST') || digest(await read(path, maxSourceBytes)) !== sha256) {
            throw new Error('Artifact conflict');
          }
        }
      } catch {
        throw new Error('Artifact storage failed');
      } finally {
        if (temporary) {
          try {
            await unlink(temporary);
          } catch (error) {
            if (!hasCode(error, 'ENOENT')) throw new Error('Artifact storage failed');
          }
        }
      }
    },
    async get(key, maxBytes) {
      validateGet(key, maxBytes);
      try {
        return await read(await filePath(key), maxBytes);
      } catch {
        throw new Error('Artifact storage failed');
      }
    },
    close() {},
  };
}

export function createArtifactStore(input: unknown = process.env): ArtifactStore {
  const parsed = configurationSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid artifact configuration');
  const config = parsed.data;
  if (config.ARTIFACT_BACKEND === 'local') {
    if (config.NODE_ENV === 'production') throw new Error('Invalid artifact configuration');
    return localStore(config.ARTIFACT_LOCAL_ROOT);
  }
  const endpointText = config.ARTIFACT_S3_ENDPOINT;
  const region =
    config.ARTIFACT_S3_REGION ?? (config.NODE_ENV !== 'production' ? 'us-east-1' : undefined);
  const bucket = config.ARTIFACT_S3_BUCKET;
  const accessKeyId = config.ARTIFACT_S3_ACCESS_KEY_ID;
  const secretAccessKey = config.ARTIFACT_S3_SECRET_ACCESS_KEY;
  if (!endpointText || !region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Invalid artifact configuration');
  }
  const endpoint = new URL(endpointText);
  if (
    !['http:', 'https:'].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== '/' ||
    (config.NODE_ENV === 'production' &&
      (endpoint.protocol !== 'https:' ||
        /example|change.?me|disposable|test|local|dummy|placeholder|minio/i.test(
          `${accessKeyId} ${secretAccessKey}`,
        )))
  ) {
    throw new Error('Invalid artifact configuration');
  }
  const client = new S3Client({
    endpoint: endpoint.href,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    maxAttempts: 2,
    requestHandler: { connectionTimeout: 3000, requestTimeout: 5000 },
  });

  const store: ArtifactStore = {
    backend: 's3',
    async put(key, bytes, sha256) {
      validatePut(key, bytes, sha256);
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: 'application/json',
            IfNoneMatch: '*',
          }),
          { abortSignal: AbortSignal.timeout(5000) },
        );
      } catch (error) {
        if (
          error !== null &&
          typeof error === 'object' &&
          '$metadata' in error &&
          typeof error.$metadata === 'object' &&
          error.$metadata !== null &&
          'httpStatusCode' in error.$metadata &&
          error.$metadata.httpStatusCode === 412
        ) {
          const existing = await store.get(key, maxSourceBytes);
          if (digest(existing) === sha256) return;
        }
        throw new Error('Artifact storage failed');
      }
    },
    async get(key, maxBytes) {
      validateGet(key, maxBytes);
      let body: Readable | undefined;
      const signal = AbortSignal.timeout(5000);
      const abortRead = () => body?.destroy(new Error('Artifact read timed out'));
      try {
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
          abortSignal: signal,
        });
        if (!(response.Body instanceof Readable)) throw new Error('Invalid artifact stream');
        body = response.Body;
        signal.throwIfAborted();
        signal.addEventListener('abort', abortRead, { once: true });
        if (response.ContentLength !== undefined && response.ContentLength > maxBytes) {
          throw new Error('Artifact size exceeded');
        }
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of body) {
          if (!(chunk instanceof Uint8Array)) throw new Error('Invalid artifact stream');
          size += chunk.byteLength;
          if (size > maxBytes) throw new Error('Artifact size exceeded');
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks, size);
      } catch {
        throw new Error('Artifact storage failed');
      } finally {
        signal.removeEventListener('abort', abortRead);
        body?.destroy();
      }
    },
    close() {
      client.destroy();
    },
  };
  return store;
}
