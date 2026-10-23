import { headers } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './[...path]/route';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('local audit proxy', () => {
  it('rejects rebinding, cross-origin requests and arbitrary upstream paths', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const incoming of [
      { host: 'evil.example' },
      { host: 'localhost:3000', origin: 'https://evil.example' },
      { host: 'localhost:3000', origin: 'malformed' },
    ]) {
      vi.mocked(headers).mockResolvedValue(
        new Headers(incoming) as Awaited<ReturnType<typeof headers>>,
      );
      expect(
        (
          await POST(
            new Request('http://localhost:3000/api/audits/loi25', { method: 'POST', body: '{}' }),
            { params: Promise.resolve({ path: ['loi25'] }) },
          )
        ).status,
      ).toBe(403);
    }
    vi.mocked(headers).mockResolvedValue(
      new Headers({ host: 'localhost:3000' }) as Awaited<ReturnType<typeof headers>>,
    );
    expect(
      (
        await GET(new Request('http://localhost:3000/api/audits/health'), {
          params: Promise.resolve({ path: ['health'] }),
        })
      ).status,
    ).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('caps request bodies and forwards only required headers', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://127.0.0.1:3001');
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        cookie: 'secret',
      }) as Awaited<ReturnType<typeof headers>>,
    );
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true }, { headers: { 'x-audit-storage': 'memory' } }));
    vi.stubGlobal('fetch', fetch);
    const context = { params: Promise.resolve({ path: ['loi25'] }) };
    expect(
      (
        await POST(
          new Request('http://localhost/api/audits/loi25', {
            method: 'POST',
            body: 'x'.repeat(16_385),
          }),
          context,
        )
      ).status,
    ).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
    const response = await POST(
      new Request('http://localhost/api/audits/loi25', { method: 'POST', body: '{}' }),
      context,
    );
    expect(response.headers.get('x-audit-storage')).toBe('memory');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/audits/loi25',
      expect.objectContaining({ headers: { 'content-type': 'application/json' }, body: '{}' }),
    );
  });
});
