import { afterEach, expect, it, vi } from 'vitest';
import { cyberProxyAllowed } from '../../../lib/cyber-proxy';
import { GET as verifyEmail } from '../auth/[...path]/route';
import { GET, POST } from './[...path]/route';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('allows only explicit private application routes', () => {
  expect(cyberProxyAllowed('POST', 'api/auth/sign-in/email')).toBe(true);
  expect(cyberProxyAllowed('POST', 'api/auth/delete-user')).toBe(false);
  expect(cyberProxyAllowed('GET', 'health/live')).toBe(false);
  expect(cyberProxyAllowed('GET', 'https://attacker.test')).toBe(false);
  expect(cyberProxyAllowed('POST', 'api/auth/organization/create')).toBe(false);
});
it('forwards only the identity cookies with a trusted server origin and private response headers', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ id: 'synthetic' }));
  vi.stubGlobal('fetch', fetcher);
  const result = await GET(
    new Request('http://127.0.0.1:3000/api/cyber/me', {
      headers: {
        host: '127.0.0.1:3000',
        cookie:
          'unrelated=private; better-auth.session_token=synthetic; CF_Authorization=never-forward',
      },
    }),
    { params: Promise.resolve({ path: ['me'] }) },
  );
  expect(result.status).toBe(200);
  expect(result.headers.get('cache-control')).toBe('private, no-store');
  const options = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;
  expect(new Headers(options?.headers).get('cookie')).toBe('better-auth.session_token=synthetic');
  expect(new Headers(options?.headers).get('origin')).toBe('http://127.0.0.1:3001');
  expect(options?.redirect).toBe('manual');
});
it('bounds incoming bodies before forwarding any data to the API', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const response = await POST(
    new Request('http://127.0.0.1:3000/api/cyber/organizations', {
      method: 'POST',
      headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
      body: 'x'.repeat(1048577),
    }),
    { params: Promise.resolve({ path: ['organizations'] }) },
  );
  expect(response.status).toBe(413);
  expect(fetcher).not.toHaveBeenCalled();
});
it('cancels oversized upstream streams before buffering an unlimited response', async () => {
  const cancelled = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              controller.enqueue(new Uint8Array(11000000));
            },
            cancel: cancelled,
          }),
        ),
    ),
  );
  const response = await GET(
    new Request('http://127.0.0.1:3000/api/cyber/me', { headers: { host: '127.0.0.1:3000' } }),
    { params: Promise.resolve({ path: ['me'] }) },
  );
  expect(response.status).toBe(502);
  expect(cancelled).toHaveBeenCalled();
});
it('refuses hostile or absent origins before proxying authenticated mutations', async () => {
  const context = { params: Promise.resolve({ path: ['organizations'] }) };
  for (const headers of [
    { host: 'attacker.test', origin: 'http://attacker.test' },
    { host: '127.0.0.1:3000' },
    { host: '127.0.0.1:3000', origin: 'https://attacker.test' },
  ])
    expect(
      (
        await POST(
          new Request('http://127.0.0.1:3000/api/cyber/organizations', {
            method: 'POST',
            headers,
            body: '{}',
          }),
          context,
        )
      ).status,
    ).toBe(403);
  expect(
    (
      await GET(
        new Request('http://127.0.0.1:3000/api/cyber/anything', {
          headers: { host: '127.0.0.1:3000' },
        }),
        { params: Promise.resolve({ path: ['anything'] }) },
      )
    ).status,
  ).toBe(404);
});

it('forwards a verification link opened from cross-site webmail through the conventional auth route', async () => {
  vi.stubEnv('CYBER_PUBLIC_ORIGIN', 'https://cyber.example.test');
  vi.stubEnv('AUTH_BASE_URL', 'https://cyber.example.test');
  vi.stubEnv('API_INTERNAL_URL', 'http://127.0.0.1:3001');
  const callback = 'https://cyber.example.test/cyber';
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: callback },
      }),
  );
  vi.stubGlobal('fetch', fetcher);
  const query = `?token=synthetic-verification-token&callbackURL=${encodeURIComponent(callback)}`;
  const response = await verifyEmail(
    new Request(`https://cyber.example.test/api/auth/verify-email${query}`, {
      headers: {
        host: 'cyber.example.test',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
        'sec-fetch-user': '?1',
        referer: 'https://webmail.example.test/',
      },
    }),
    { params: Promise.resolve({ path: ['verify-email'] }) },
  );
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe(callback);
  expect(fetcher).toHaveBeenCalledWith(
    `http://127.0.0.1:3001/api/auth/verify-email${query}`,
    expect.objectContaining({ method: 'GET', redirect: 'manual' }),
  );
  const forwarded = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
  expect(forwarded.get('origin')).toBe('https://cyber.example.test');
  expect(forwarded.has('referer')).toBe(false);
});

it('keeps cross-site fetches, frames, other routes and hostile origins outside the navigation exception', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const cases = [
    { path: ['api', 'auth', 'verify-email'], mode: 'cors', dest: 'empty' },
    { path: ['api', 'auth', 'verify-email'], mode: 'navigate', dest: 'iframe' },
    { path: ['api', 'auth', 'verify-email'], mode: '', dest: '' },
    { path: ['me'], mode: 'navigate', dest: 'document' },
    {
      path: ['api', 'auth', 'verify-email'],
      mode: 'navigate',
      dest: 'document',
      host: 'attacker.test',
    },
    {
      path: ['api', 'auth', 'verify-email'],
      mode: 'navigate',
      dest: 'document',
      origin: 'https://attacker.test',
    },
  ];
  for (const incoming of cases) {
    const response = await GET(
      new Request('http://127.0.0.1:3000/api/auth/verify-email?token=synthetic', {
        headers: {
          host: incoming.host ?? '127.0.0.1:3000',
          'sec-fetch-site': 'cross-site',
          'sec-fetch-mode': incoming.mode,
          'sec-fetch-dest': incoming.dest,
          ...(incoming.origin ? { origin: incoming.origin } : {}),
        },
      }),
      { params: Promise.resolve({ path: incoming.path }) },
    );
    expect(response.status).toBe(403);
  }
  const mutation = await POST(
    new Request('http://127.0.0.1:3000/api/cyber/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        host: '127.0.0.1:3000',
        origin: 'http://127.0.0.1:3000',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
      },
      body: '{}',
    }),
    { params: Promise.resolve({ path: ['api', 'auth', 'sign-in', 'email'] }) },
  );
  expect(mutation.status).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
});
