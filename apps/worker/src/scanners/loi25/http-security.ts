import { Resolver } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { Check } from './check.js';

const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) return !blocked.check(address, 'ipv4');
  // Accept only global unicast IPv6, excluding protocol assignments, documentation and 6to4.
  return isIP(address) === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

export interface Page {
  url: string;
  status: number;
  html: string;
  headers: Record<string, string>;
  cookies: string[];
  redirects: string[];
}

export function createPassiveFetcher(signal: AbortSignal) {
  const resolver = new Resolver({ timeout: 1000, tries: 1 });
  const cancel = () => resolver.cancel();
  signal.addEventListener('abort', cancel, { once: true });
  return {
    close() {
      signal.removeEventListener('abort', cancel);
      resolver.cancel();
    },
    async fetch(input: string): Promise<Page> {
      let url = new URL(input);
      const redirects: string[] = [];
      const cookies: string[] = [];
      for (let hop = 0; hop <= 3; hop++) {
        signal.throwIfAborted();
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.port
        ) {
          throw new Error('Unsafe destination');
        }
        const answers = await Promise.allSettled([
          resolver.resolve4(url.hostname),
          resolver.resolve6(url.hostname),
        ]);
        signal.throwIfAborted();
        const addresses = answers.flatMap((result) =>
          result.status === 'fulfilled' ? result.value : [],
        );
        if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) {
          throw new Error('Unsafe or unresolved destination');
        }
        const address = addresses[0]!;
        const page = await new Promise<Page & { location: string | undefined }>(
          (resolve, reject) => {
            const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
              url,
              {
                signal,
                method: 'GET',
                agent: false,
                family: isIP(address),
                headers: {
                  'user-agent': 'BumpInc-Passive-Loi25/1.0',
                  accept: 'text/html',
                  'accept-encoding': 'identity',
                },
                // Pin the validated address at connect time to prevent DNS rebinding; TLS keeps original SNI.
                lookup: (_host, _options, callback) => callback(null, address, isIP(address)),
                maxHeaderSize: 32_768,
              },
              (response) => {
                const chunks: Buffer[] = [];
                let size = 0;
                response.on('data', (chunk: Buffer) => {
                  size += chunk.length;
                  if (size > 1_048_576) {
                    request.destroy(new Error('Page too large'));
                    return;
                  }
                  chunks.push(chunk);
                });
                response.on('error', reject);
                response.on('end', () => {
                  const headers = Object.fromEntries(
                    Object.entries(response.headers).map(([key, value]) => [
                      key,
                      Array.isArray(value) ? value.join(', ') : (value ?? ''),
                    ]),
                  );
                  const status = response.statusCode ?? 0;
                  const html = /text\/html|application\/xhtml\+xml/i.test(
                    headers['content-type'] ?? '',
                  )
                    ? Buffer.concat(chunks).toString('utf8')
                    : '';
                  resolve({
                    url: url.href,
                    status,
                    html,
                    headers,
                    cookies: [...cookies, ...(response.headers['set-cookie'] ?? [])],
                    redirects: [...redirects],
                    location: response.headers.location,
                  });
                });
              },
            );
            request.setTimeout(2500, () => request.destroy(new Error('Page timeout')));
            request.on('error', reject);
            request.end();
          },
        );
        if ([301, 302, 303, 307, 308].includes(page.status) && page.location) {
          cookies.splice(0, cookies.length, ...page.cookies);
          if (hop === 3) throw new Error('Too many redirects');
          redirects.push(url.href);
          const next = new URL(page.location, url);
          if (url.protocol === 'https:' && next.protocol !== 'https:')
            throw new Error('HTTPS downgrade');
          url = next;
          continue;
        }
        if (page.status < 200 || page.status >= 300) throw new Error('Page unavailable');
        return page;
      }
      throw new Error('Too many redirects');
    },
  };
}

export function analyzeHttp(page: Page, httpRedirect: boolean | null): Check[] {
  const base = {
    category: 'FORMULAIRES_ET_COLLECTE' as const,
    severity: 'MOYEN' as const,
    lawArticle: 'Loi 25, art. 10 (mesures de sécurité)',
    businessRiskFr:
      'Une protection Web incomplète peut faciliter une fuite et nuire à la confiance des clients.',
    remediationPitchFr:
      'Bump configure les protections Web et valide leur compatibilité avec vos formulaires.',
    estimatedFixCad: 250,
  };
  const checks: Check[] = [
    {
      ...base,
      key: 'https-redirect',
      severity: 'ELEVE',
      passed: httpRedirect,
      titleFr: 'Redirection HTTP vers HTTPS',
      descriptionFr:
        'La navigation en HTTP doit mener vers une connexion chiffrée. Le certificat HTTPS est vérifié par Node.',
      evidence: { url: page.url, httpRedirect },
    },
  ];
  for (const header of [
    'strict-transport-security',
    'content-security-policy',
    'x-frame-options',
    'referrer-policy',
  ]) {
    const value = page.headers[header] ?? '';
    const passed =
      header === 'strict-transport-security'
        ? /max-age\s*=\s*[1-9]\d*/i.test(value)
        : header === 'x-frame-options'
          ? /^(deny|sameorigin)$/i.test(value) ||
            /frame-ancestors\s/i.test(page.headers['content-security-policy'] ?? '')
          : header === 'referrer-policy'
            ? /\b(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)\b/i.test(
                value,
              )
            : value.trim().length > 0;
    checks.push({
      ...base,
      key: header,
      passed,
      titleFr: `Protection Web : ${header}`,
      descriptionFr:
        'Signal technique de protection, sans conclusion juridique automatique ni validation complète de la configuration.',
      evidence: { url: page.url, header, value },
    });
  }
  const cookieFlags = page.cookies.map((cookie) => ({
    name: cookie.split('=', 1)[0] ?? '',
    secure: /;\s*Secure(?:;|$)/i.test(cookie),
    httpOnly: /;\s*HttpOnly(?:;|$)/i.test(cookie),
    sameSite: /;\s*SameSite=(Lax|Strict|None)(?:;|$)/i.test(cookie),
  }));
  checks.push({
    ...base,
    key: 'cookie-flags',
    passed: cookieFlags.every((c) => c.secure && c.httpOnly && c.sameSite),
    titleFr: 'Protection des témoins reçus',
    descriptionFr:
      'Les attributs Secure, HttpOnly et SameSite sont inspectés. Certains témoins accessibles à JavaScript ont une exception légitime à confirmer.',
    evidence: { url: page.url, cookies: cookieFlags },
  });
  return checks;
}
