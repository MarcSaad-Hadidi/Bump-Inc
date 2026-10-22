import type { Worker } from 'bullmq';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildHealthServer, checkWorkerReady } from './health.js';

describe('worker health', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps liveness healthy and redacts dependency failures from readiness', async () => {
    const app = buildHealthServer(async () => {
      throw new Error('postgres://secret');
    });
    try {
      expect((await app.inject('/health/live')).statusCode).toBe(200);
      const response = await app.inject('/health/ready');
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'unavailable' });
    } finally {
      await app.close();
    }
  });

  it('reports readiness when all checks succeed', async () => {
    const app = buildHealthServer(async () => {});
    try {
      expect((await app.inject('/health/ready')).statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('reports a disconnected blocking connection after successful initialization and recovers', async () => {
    const blockingConnection = { status: 'ready' };
    const initialized = Promise.resolve(
      blockingConnection as Awaited<ReturnType<Worker['waitUntilReady']>>,
    );
    const worker = {
      isRunning: () => true,
      isPaused: () => false,
      waitUntilReady: () => initialized,
    };
    const app = buildHealthServer(() => checkWorkerReady(worker, { status: 'ready' }));
    try {
      blockingConnection.status = 'ready';
      expect((await app.inject('/health/ready')).statusCode).toBe(200);
      blockingConnection.status = 'reconnecting';
      expect((await app.inject('/health/ready')).statusCode).toBe(503);
      blockingConnection.status = 'ready';
      expect((await app.inject('/health/ready')).statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('bounds a stalled readiness check', async () => {
    const app = buildHealthServer(() => new Promise<void>(() => {}));
    await app.ready();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const responsePromise = app.inject('/health/ready');
      await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));
      await vi.advanceTimersByTimeAsync(3_000);
      expect((await responsePromise).statusCode).toBe(503);
    } finally {
      await app.close();
    }
  });
});
