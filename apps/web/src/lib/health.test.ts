import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { getApiOrigin, getHealth } from './health';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('server health diagnostics', () => {
  it('uses only the configured origin and a fixed health path with a deadline', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getHealth('http://127.0.0.1:3001', 'ready')).resolves.toBe('Available');
    expect(fetchMock).toHaveBeenCalledWith(new URL('http://127.0.0.1:3001/health/ready'), {
      cache: 'no-store',
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });

  it('shows non-success readiness responses as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(getHealth('http://127.0.0.1:3001', 'ready')).resolves.toBe('Unavailable');
  });

  it('shows a failed connection or expired timeout as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('connection refused')));
    await expect(getHealth('http://127.0.0.1:3001', 'live')).resolves.toBe('Unavailable');
  });

  it.each([
    'file:///etc/passwd',
    'http://user:password@localhost:3001',
    'http://localhost:3001/untrusted',
    'http://localhost:3001/?target=other',
    'http://localhost:3001/#fragment',
    'invalid',
  ])('rejects invalid configured API origin %s', (origin) => {
    vi.stubEnv('API_INTERNAL_URL', origin);
    expect(getApiOrigin).toThrow();
  });

  it('accepts an operator-configured internal origin', () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://api:3001');
    expect(getApiOrigin()).toBe('http://api:3001');
  });

  it('rejects malformed configuration without a native URL error exposing raw input', () => {
    vi.stubEnv('API_INTERNAL_URL', 'synthetic-private-value');
    expect(getApiOrigin).toThrow(ZodError);
    expect(getApiOrigin).not.toThrow('synthetic-private-value');
  });
});
