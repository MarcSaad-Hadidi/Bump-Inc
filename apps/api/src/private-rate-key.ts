import type { Auth } from '@bump/identity';
import { normalizeIP } from '@fastify/rate-limit';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyRequest } from 'fastify';

export async function privateRateKey(request: FastifyRequest, auth?: Auth): Promise<string> {
  const ip = normalizeIP(request.ip);
  const route = request.routeOptions.url;
  if (
    !auth ||
    !request.headers.cookie ||
    !(route === '/me' || route === '/organizations' || route?.startsWith('/organizations/'))
  )
    return ip;
  try {
    // Only Better Auth can establish the actor. Forwarded addresses and other
    // caller-provided identity headers never participate in this lookup.
    const session = await auth.api.getSession({
      headers: fromNodeHeaders({ cookie: request.headers.cookie }),
      query: { disableCookieCache: true },
    });
    return session?.user.emailVerified === true ? `user:${session.user.id}` : ip;
  } catch {
    // A failed authoritative lookup cannot grant a separate identity budget.
    return ip;
  }
}
