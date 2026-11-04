import { cyberProxyAllowed } from '../../../../lib/cyber-proxy';
import { getApiOrigin } from '../../../../lib/health';

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const configured = process.env.CYBER_PUBLIC_ORIGIN ?? 'http://127.0.0.1:3000';
  let publicOrigin: URL;
  try {
    publicOrigin = new URL(configured);
    if (
      !['https:', 'http:'].includes(publicOrigin.protocol) ||
      publicOrigin.username ||
      publicOrigin.password ||
      publicOrigin.pathname !== '/' ||
      publicOrigin.search ||
      publicOrigin.hash
    )
      throw new Error();
  } catch {
    return Response.json({ error: 'Private origin unavailable' }, { status: 503 });
  }
  const path = (await context.params).path.join('/');
  // Verification links opened in webmail are cross-site document navigations.
  // Better Auth owns token/callback validation; fetches and frames stay blocked.
  const emailVerificationNavigation =
    request.method === 'GET' &&
    path === 'api/auth/verify-email' &&
    request.headers.get('sec-fetch-mode') === 'navigate' &&
    request.headers.get('sec-fetch-dest') === 'document';
  if (
    request.headers.get('host') !== publicOrigin.host ||
    (request.headers.get('sec-fetch-site') === 'cross-site' && !emailVerificationNavigation)
  )
    return new Response(null, { status: 403 });
  const origin = request.headers.get('origin');
  if (origin && origin !== publicOrigin.origin) return new Response(null, { status: 403 });
  if (!['GET', 'HEAD'].includes(request.method) && origin !== publicOrigin.origin)
    return new Response(null, { status: 403 });
  if (!cyberProxyAllowed(request.method, path)) return new Response(null, { status: 404 });
  const search = new URL(request.url).search;
  try {
    let body: string | undefined;
    if (request.method !== 'GET') {
      const reader = request.body?.getReader(),
        decoder = new TextDecoder();
      let count = 0;
      body = '';
      while (reader) {
        const part = await reader.read();
        if (part.done) break;
        count += part.value.byteLength;
        if (count > 1048576) {
          await reader.cancel();
          return new Response(null, { status: 413 });
        }
        body += decoder.decode(part.value, { stream: true });
      }
      body += decoder.decode();
    }
    const cookies = (request.headers.get('cookie') ?? '')
      .split(';')
      .map((c) => c.trim())
      .filter((c) => /^(?:__Secure-|__Host-)?better-auth\.[a-z0-9_-]+=/i.test(c))
      .join('; ');
    const response = await fetch(`${getApiOrigin()}/${path}${search}`, {
      method: request.method,
      headers: {
        'content-type': 'application/json',
        origin: process.env.AUTH_BASE_URL ?? 'http://127.0.0.1:3001',
        ...(cookies ? { cookie: cookies } : {}),
      },
      ...(body === undefined ? {} : { body }),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(35000),
    });
    const headers = new Headers({
      'content-type': response.headers.get('content-type') ?? 'application/json',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-frame-options': path.endsWith('/html') ? 'SAMEORIGIN' : 'DENY',
    });
    for (const cookie of response.headers.getSetCookie()) headers.append('set-cookie', cookie);
    for (const key of ['content-disposition', 'content-security-policy', 'location']) {
      const value = response.headers.get(key);
      if (value) headers.set(key, value);
    }
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (reader) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 20000000) {
        await reader.cancel();
        return Response.json(
          { error: 'Response limit exceeded' },
          { status: 502, headers: { 'cache-control': 'no-store' } },
        );
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(bytes, { status: response.status, headers });
  } catch {
    return Response.json(
      { error: 'Private API unavailable' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT };
