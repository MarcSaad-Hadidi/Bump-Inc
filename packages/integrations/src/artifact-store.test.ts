import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { createArtifactStore } from './artifact-store.js';

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const bytes = Buffer.from('{"version":1,"observations":[]}');
const tenant = randomUUID();
const key = `${tenant}/${randomUUID()}.json`;
const s3Environment = {
  NODE_ENV: 'test',
  ARTIFACT_BACKEND: 's3',
  ARTIFACT_S3_ENDPOINT: 'http://127.0.0.1:8333',
  ARTIFACT_S3_BUCKET: 'bump-ingestion-test',
  ARTIFACT_S3_ACCESS_KEY_ID: 'bump_ci_disposable',
  ARTIFACT_S3_SECRET_ACCESS_KEY: 'bump_ci_s3_disposable_only',
};
let temporary: string;
const temporaryParent = resolve('.artifacts/tmp');

beforeEach(async () => {
  await mkdir(temporaryParent, { recursive: true });
  temporary = await mkdtemp(join(temporaryParent, 'artifact-store-'));
});
afterEach(async () => {
  vi.restoreAllMocks();
  if (
    dirname(temporary) !== temporaryParent ||
    !basename(temporary).startsWith('artifact-store-')
  ) {
    throw new Error('Unsafe test cleanup');
  }
  await rm(temporary, { recursive: true, force: true });
});

function local(root = join(temporary, 'private')) {
  return createArtifactStore({ NODE_ENV: 'test', ARTIFACT_LOCAL_ROOT: root });
}

function mockSend() {
  // The SDK callback overload hides the promise response type from the spy.
  return vi.spyOn(S3Client.prototype, 'send') as unknown as Mock<
    (command: unknown, options?: unknown) => Promise<unknown>
  >;
}

describe('private local artifact storage', () => {
  it('publishes privately, reads bounded bytes and retries identical writes without replacement', async () => {
    const store = local();
    expect(store.backend).toBe('local');
    await store.put(key, bytes, digest(bytes));
    await store.put(key, bytes, digest(bytes));
    expect(await store.get(key, bytes.length)).toEqual(bytes);
    const path = join(temporary, 'private', key);
    expect(await readFile(path)).toEqual(bytes);
    expect(await readdir(dirname(path))).toEqual([basename(path)]);
    if (process.platform !== 'win32') {
      expect((await lstat(path)).mode & 0o777).toBe(0o600);
      expect((await lstat(dirname(path))).mode & 0o777).toBe(0o700);
      expect((await lstat(join(temporary, 'private'))).mode & 0o777).toBe(0o700);
    }
    store.close();
  });

  it('supports concurrent identical publication and refuses conflicting writes', async () => {
    const store = local();
    await Promise.all(Array.from({ length: 8 }, () => store.put(key, bytes, digest(bytes))));
    const changed = Buffer.from('{"changed":true}');
    await expect(store.put(key, changed, digest(changed))).rejects.toThrow(
      /^Artifact storage failed$/,
    );
    expect(await store.get(key, 512 * 1024)).toEqual(bytes);
    expect(await readdir(join(temporary, 'private', tenant))).toEqual([basename(key)]);
  });

  it('preserves the winning bytes when concurrent writers disagree', async () => {
    const store = local();
    const other = Buffer.from('different');
    const results = await Promise.allSettled([
      store.put(key, bytes, digest(bytes)),
      store.put(key, other, digest(other)),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect([bytes.toString(), other.toString()]).toContain(
      (await store.get(key, 512 * 1024)).toString(),
    );
  });

  it.each([
    '../secret',
    '/private/file',
    `${tenant}/../secret`,
    `${tenant}\\${randomUUID()}.json`,
    `${tenant}/${randomUUID()}.json/extra`,
    `${tenant}/%2e%2e.json`,
    'not-a-uuid/file.json',
  ])('rejects malformed key %s', async (invalid) => {
    const store = local();
    await expect(store.put(invalid, bytes, digest(bytes))).rejects.toThrow(
      /^Invalid artifact request$/,
    );
    await expect(store.get(invalid, 100)).rejects.toThrow(/^Invalid artifact request$/);
    expect(await readdir(temporary)).toEqual([]);
  });

  it('rejects incorrect hashes and oversized or empty inputs before touching disk', async () => {
    const store = local();
    await expect(store.put(key, bytes, '0'.repeat(64))).rejects.toThrow('Invalid artifact request');
    await expect(store.put(key, bytes, 'bad')).rejects.toThrow('Invalid artifact request');
    for (const invalid of [Buffer.alloc(0), Buffer.alloc(512 * 1024 + 1)]) {
      await expect(store.put(key, invalid, digest(invalid))).rejects.toThrow(
        'Invalid artifact request',
      );
    }
    for (const limit of [0, -1, 1.5, Number.NaN, 512 * 1024 + 1]) {
      await expect(store.get(key, limit)).rejects.toThrow('Invalid artifact request');
    }
    expect(await readdir(temporary)).toEqual([]);
  });

  it('rejects missing, oversized, corrupted and non-file objects with generic errors', async () => {
    const store = local();
    await expect(store.get(key, 100)).rejects.toThrow(/^Artifact storage failed$/);
    await store.put(key, bytes, digest(bytes));
    await expect(store.get(key, bytes.length - 1)).rejects.toThrow(/^Artifact storage failed$/);
    await writeFile(join(temporary, 'private', key), 'corrupted');
    await expect(store.put(key, bytes, digest(bytes))).rejects.toThrow(/^Artifact storage failed$/);
    expect(digest(await store.get(key, 100))).not.toBe(digest(bytes));
    const directoryKey = `${tenant}/${randomUUID()}.json`;
    await mkdir(join(temporary, 'private', directoryKey));
    await expect(store.get(directoryKey, 100)).rejects.toThrow(/^Artifact storage failed$/);
  });

  it.each(['root', 'ancestor', 'tenant'])('refuses %s directory links', async (position) => {
    const destination = join(temporary, 'outside');
    await mkdir(destination);
    const root = join(temporary, 'private');
    const linkType = process.platform === 'win32' ? 'junction' : 'dir';
    if (position === 'root') await symlink(destination, root, linkType);
    if (position === 'ancestor') await symlink(destination, root, linkType);
    if (position === 'tenant') {
      await mkdir(root);
      await symlink(destination, join(root, tenant), linkType);
    }
    const store = local(position === 'ancestor' ? join(root, 'nested') : root);
    await expect(store.put(key, bytes, digest(bytes))).rejects.toThrow(/^Artifact storage failed$/);
    await expect(store.get(key, 100)).rejects.toThrow(/^Artifact storage failed$/);
    expect(await readdir(destination)).toEqual([]);
  });

  it.skipIf(process.platform === 'win32')(
    'refuses file symlinks for reads and duplicate writes',
    async () => {
      const destination = join(temporary, 'outside.json');
      await writeFile(destination, bytes);
      await mkdir(join(temporary, 'private', tenant), { recursive: true });
      await symlink(destination, join(temporary, 'private', key));
      const store = local();
      await expect(store.get(key, 100)).rejects.toThrow(/^Artifact storage failed$/);
      await expect(store.put(key, bytes, digest(bytes))).rejects.toThrow(
        /^Artifact storage failed$/,
      );
      expect(await readFile(destination)).toEqual(bytes);
    },
  );
});

describe('artifact configuration', () => {
  it.each([
    { NODE_ENV: 'production' },
    { ARTIFACT_BACKEND: 'unknown' },
    { ARTIFACT_LOCAL_ROOT: '' },
    { ARTIFACT_LOCAL_ROOT: '\0' },
    { ARTIFACT_BACKEND: 's3' },
    { ...s3Environment, ARTIFACT_S3_ENDPOINT: 'file:///private' },
    { ...s3Environment, ARTIFACT_S3_ENDPOINT: 'http://user:password@127.0.0.1:8333' },
    { ...s3Environment, ARTIFACT_S3_ENDPOINT: 'http://127.0.0.1:8333/?secret=value' },
    { ...s3Environment, ARTIFACT_S3_BUCKET: '../public' },
    { ...s3Environment, NODE_ENV: 'production', ARTIFACT_S3_REGION: 'us-east-1' },
    {
      ...s3Environment,
      NODE_ENV: 'production',
      ARTIFACT_S3_REGION: 'us-east-1',
      ARTIFACT_S3_ENDPOINT: 'https://s3.example.test',
    },
  ])('rejects unsafe configuration generically: %j', (environment) => {
    expect(() => createArtifactStore(environment)).toThrow(/^Invalid artifact configuration$/);
  });
});

describe('S3 adapter request and stream boundaries', () => {
  it('uses conditional immutable puts and a bounded abort signal, then validates known conflicts', async () => {
    const send = mockSend();
    send.mockResolvedValueOnce({});
    const store = createArtifactStore(s3Environment);
    await store.put(key, bytes, digest(bytes));
    const [command, options] = send.mock.calls[0] ?? [];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({
      Key: key,
      IfNoneMatch: '*',
      Body: bytes,
    });
    expect(options).toMatchObject({ abortSignal: expect.any(AbortSignal) });
    send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 412 } });
    send.mockResolvedValueOnce({ Body: Readable.from([bytes]), ContentLength: bytes.length });
    await store.put(key, bytes, digest(bytes));
    expect(send.mock.calls[2]?.[0]).toBeInstanceOf(GetObjectCommand);
    store.close();
  });

  it('rejects conflicting hashes and other downstream errors without exposing their text', async () => {
    const send = mockSend();
    const store = createArtifactStore(s3Environment);
    send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 412 } });
    send.mockResolvedValueOnce({ Body: Readable.from([Buffer.from('corrupt')]) });
    await expect(store.put(key, bytes, digest(bytes))).rejects.toThrow(/^Artifact storage failed$/);
    send.mockRejectedValueOnce(new Error('private endpoint credentials source text'));
    await expect(store.put(key, bytes, digest(bytes))).rejects.toThrow(/^Artifact storage failed$/);
    send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 409 } });
    await expect(store.put(key, bytes, digest(bytes))).rejects.toThrow(/^Artifact storage failed$/);
    store.close();
  });

  it.each([true, false])(
    'closes oversized streams (ContentLength present: %s)',
    async (lengthPresent) => {
      const body = Readable.from([Buffer.alloc(50), Buffer.alloc(50)]);
      mockSend().mockResolvedValueOnce({
        Body: body,
        ...(lengthPresent ? { ContentLength: 100 } : {}),
      });
      const store = createArtifactStore(s3Environment);
      await expect(store.get(key, 60)).rejects.toThrow(/^Artifact storage failed$/);
      expect(body.destroyed).toBe(true);
      store.close();
    },
  );

  it('closes failed streams and wraps missing-object errors', async () => {
    const body = Readable.from(
      (async function* () {
        yield bytes;
        throw new Error('private data');
      })(),
    );
    const send = mockSend().mockResolvedValueOnce({ Body: body });
    const store = createArtifactStore(s3Environment);
    await expect(store.get(key, 100)).rejects.toThrow(/^Artifact storage failed$/);
    expect(body.destroyed).toBe(true);
    send.mockRejectedValueOnce(new Error('NoSuchKey private path'));
    await expect(store.get(key, 100)).rejects.toThrow(/^Artifact storage failed$/);
    store.close();
  });

  it('aborts a stalled response stream even after the SDK has returned its headers', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const body = new Readable({ read() {} });
    mockSend().mockResolvedValueOnce({ Body: body });
    const store = createArtifactStore(s3Environment);
    const result = store.get(key, 100);
    const rejected = expect(result).rejects.toThrow(/^Artifact storage failed$/);
    await vi.waitFor(() => expect(body.listenerCount('readable')).toBeGreaterThan(0));
    controller.abort();
    await rejected;
    expect(body.destroyed).toBe(true);
    store.close();
  });
});
