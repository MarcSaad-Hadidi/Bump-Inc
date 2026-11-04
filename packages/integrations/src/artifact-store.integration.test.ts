import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ArtifactStore, createArtifactStore } from './artifact-store.js';

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const bytes = Buffer.from('{"version":1,"observations":[]}');
const key = () => `${randomUUID()}/${randomUUID()}.json`;
let store: ArtifactStore;
let client: S3Client;
let endpoint: string;
const bucket = 'bump-ingestion-test';
let environment: Record<string, string>;

beforeAll(async () => {
  const configured = process.env.S3_TEST_ENDPOINT;
  if (process.env.NODE_ENV !== 'test' || !configured)
    throw new Error('Isolated S3 test service required');
  const url = new URL(configured);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    process.env.S3_TEST_BUCKET !== bucket ||
    process.env.S3_TEST_ACCESS_KEY_ID !== 'bump_ci_disposable' ||
    process.env.S3_TEST_SECRET_ACCESS_KEY !== 'bump_ci_s3_disposable_only'
  ) {
    throw new Error('Isolated S3 test service required');
  }
  endpoint = url.href;
  environment = {
    NODE_ENV: 'test',
    ARTIFACT_BACKEND: 's3',
    ARTIFACT_S3_ENDPOINT: endpoint,
    ARTIFACT_S3_REGION: 'us-east-1',
    ARTIFACT_S3_BUCKET: bucket,
    ARTIFACT_S3_ACCESS_KEY_ID: 'bump_ci_disposable',
    ARTIFACT_S3_SECRET_ACCESS_KEY: 'bump_ci_s3_disposable_only',
  };
  store = createArtifactStore(environment);
  client = new S3Client({
    endpoint,
    region: 'us-east-1',
    forcePathStyle: true,
    maxAttempts: 2,
    credentials: {
      accessKeyId: 'bump_ci_disposable',
      secretAccessKey: 'bump_ci_s3_disposable_only',
    },
    requestHandler: { connectionTimeout: 3000, requestTimeout: 5000 },
  });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }), {
        abortSignal: AbortSignal.timeout(Math.max(1, Math.min(3000, deadline - Date.now()))),
      });
      return;
    } catch {
      const remaining = deadline - Date.now();
      if (remaining > 0) await delay(Math.min(200, remaining));
    }
  }
  throw new Error('Isolated S3 test service unavailable');
});
afterAll(() => {
  store?.close();
  client?.destroy();
});

describe('real isolated S3 immutable artifacts', () => {
  it('authenticates with the seeded credentials and round-trips exact bytes', async () => {
    const object = key();
    expect(store.backend).toBe('s3');
    await store.put(object, bytes, digest(bytes));
    expect(await store.get(object, bytes.length)).toEqual(bytes);
  });

  it('rejects invalid authentication for both reads and writes', async () => {
    const object = key();
    await store.put(object, bytes, digest(bytes));
    for (const override of [
      { ARTIFACT_S3_ACCESS_KEY_ID: 'invalid_disposable_key' },
      { ARTIFACT_S3_SECRET_ACCESS_KEY: 'invalid_disposable_secret_only' },
    ]) {
      const unauthorized = createArtifactStore({ ...environment, ...override });
      try {
        await expect(unauthorized.get(object, 100)).rejects.toThrow(/^Artifact storage failed$/);
        await expect(unauthorized.put(key(), bytes, digest(bytes))).rejects.toThrow(
          /^Artifact storage failed$/,
        );
      } finally {
        unauthorized.close();
      }
    }
  });

  it('enforces actual conditional PUT, accepts matching retries and preserves conflicting bytes', async () => {
    const object = key();
    await store.put(object, bytes, digest(bytes));
    const changed = Buffer.from('{"different":true}');
    await expect(
      client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: object,
          Body: changed,
          IfNoneMatch: '*',
        }),
        { abortSignal: AbortSignal.timeout(5000) },
      ),
    ).rejects.toMatchObject({
      $metadata: { httpStatusCode: 412 },
    });
    await store.put(object, bytes, digest(bytes));
    await expect(store.put(object, changed, digest(changed))).rejects.toThrow(
      /^Artifact storage failed$/,
    );
    expect(await store.get(object, 100)).toEqual(bytes);
  });

  it('serializes simultaneous identical puts and conflicting puts without replacing the winner', async () => {
    const identical = key();
    await Promise.all(Array.from({ length: 4 }, () => store.put(identical, bytes, digest(bytes))));
    const conflicting = key();
    const other = Buffer.from('{"other":true}');
    const result = await Promise.allSettled([
      store.put(conflicting, bytes, digest(bytes)),
      store.put(conflicting, other, digest(other)),
    ]);
    expect(result.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    expect([bytes.toString(), other.toString()]).toContain(
      (await store.get(conflicting, 100)).toString(),
    );
  });

  it('bounds returned data and wraps missing-object and unavailable-service errors', async () => {
    const object = key();
    await store.put(object, bytes, digest(bytes));
    await expect(store.get(object, bytes.length - 1)).rejects.toThrow(/^Artifact storage failed$/);
    await expect(store.get(key(), 100)).rejects.toThrow(/^Artifact storage failed$/);
    const unavailable = createArtifactStore({
      ...environment,
      ARTIFACT_S3_ENDPOINT: 'http://127.0.0.1:1',
    });
    try {
      await expect(unavailable.get(object, 100)).rejects.toThrow(/^Artifact storage failed$/);
      await expect(unavailable.put(key(), bytes, digest(bytes))).rejects.toThrow(
        /^Artifact storage failed$/,
      );
    } finally {
      unavailable.close();
    }
  });

  it('detects operator-corrupted objects on retry and exposes bytes for worker digest verification', async () => {
    const object = key();
    await store.put(object, bytes, digest(bytes));
    const corrupted = Buffer.from('synthetic-corruption');
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: object, Body: corrupted }), {
      abortSignal: AbortSignal.timeout(5000),
    });
    expect(digest(await store.get(object, 100))).not.toBe(digest(bytes));
    await expect(store.put(object, bytes, digest(bytes))).rejects.toThrow(
      /^Artifact storage failed$/,
    );
  });

  it('refuses anonymous reads against the private service', async () => {
    const object = key();
    await store.put(object, bytes, digest(bytes));
    const response = await fetch(`${endpoint}${bucket}/${object}`, {
      signal: AbortSignal.timeout(5000),
    });
    await response.body?.cancel();
    expect([401, 403]).toContain(response.status);
    const responseWithCredentials = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: object }),
      {
        abortSignal: AbortSignal.timeout(5000),
      },
    );
    expect(responseWithCredentials.Body).toBeDefined();
    await responseWithCredentials.Body?.transformToByteArray();
  });
});
