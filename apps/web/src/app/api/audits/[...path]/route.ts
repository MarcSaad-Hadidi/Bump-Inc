import { headers } from 'next/headers';
import { auditApiOrigin } from '../../../../lib/loi25';

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const incoming = await headers();
  let host: string;
  try {
    host = new URL(`http://${incoming.get('host') ?? ''}`).hostname;
  } catch {
    return new Response(null, { status: 403 });
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host))
    return new Response(null, { status: 403 });
  const origin = incoming.get('origin');
  let sameOrigin = true;
  try {
    sameOrigin = !origin || new URL(origin).host === incoming.get('host');
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin || incoming.get('sec-fetch-site') === 'cross-site') {
    return new Response(null, { status: 403 });
  }
  const { path } = await context.params;
  const route = path.join('/');
  const uuid = '[0-9a-f-]{36}';
  if (
    !(request.method === 'POST' && route === 'loi25') &&
    !(request.method === 'GET' && new RegExp(`^${uuid}$`, 'i').test(route)) &&
    !(request.method === 'PATCH' && new RegExp(`^${uuid}/findings/${uuid}$`, 'i').test(route))
  ) {
    return new Response(null, { status: 404 });
  }
  try {
    let body: string | undefined;
    if (request.method !== 'GET') {
      const reader = request.body?.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      body = '';
      while (reader) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 16_384) {
          await reader.cancel();
          return new Response(null, { status: 413 });
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    }
    const response = await fetch(`${auditApiOrigin()}/api/audits/${route}`, {
      method: request.method,
      ...(body === undefined ? {} : { body }),
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'x-audit-storage': response.headers.get('x-audit-storage') ?? 'unknown',
      },
    });
  } catch {
    return Response.json(
      { error: 'Service d’audit indisponible. Vérifiez que l’API locale fonctionne.' },
      { status: 503 },
    );
  }
}

export { proxy as POST, proxy as GET, proxy as PATCH };
