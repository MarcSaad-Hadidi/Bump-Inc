import { Resolver } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import type { TLSSocket } from 'node:tls';
import { type CyberObservation, engagementTargetSchema } from '@bump/contracts';
import { isPublicAddress } from '../scanners/loi25/http-security.js';

export function validatePassiveAddresses(addresses: string[]) {
  if (!addresses.length || addresses.some((ip) => !isPublicAddress(ip)))
    throw new Error('Unsafe DNS answer');
  return addresses[0]!;
}
export function validatePassiveRedirect(location: string, hostname: string) {
  const next = new URL(location, `https://${hostname}/`);
  if (
    next.protocol !== 'https:' ||
    next.hostname !== hostname ||
    next.username ||
    next.password ||
    next.port ||
    next.search ||
    next.hash
  )
    throw new Error('Out-of-scope redirect');
  return next;
}
export type PassiveResult = {
  addresses: string[];
  status: number;
  headers: Record<string, string>;
  tls: { protocol: string; validTo: string };
  redirect: string | null;
  spf: string[];
  dmarc: string[];
};
export function passiveObservations(result: PassiveResult): CyberObservation[] {
  const output: CyberObservation[] = [];
  for (const header of [
    'strict-transport-security',
    'content-security-policy',
    'x-content-type-options',
    'referrer-policy',
  ]) {
    const value = result.headers[header] ?? '';
    const present =
      header === 'strict-transport-security'
        ? /max-age\s*=\s*[1-9]\d*/i.test(value)
        : header === 'x-content-type-options'
          ? /^nosniff$/i.test(value)
          : value.length > 0;
    if (!present)
      output.push({
        engine: 'web-passive',
        engineVersion: 'bump-passive-1',
        ruleId: `web.header.${header}`,
        title: `Web configuration to review: ${header}`,
        severity: header === 'strict-transport-security' ? 'medium' : 'low',
        confidence: 'medium',
        location: 'HTTPS / (HEAD)',
        component: '',
        affectedVersion: '',
        fixedVersion: '',
        cve: null,
        cvss: null,
        references: ['https://owasp.org/www-project-secure-headers/'],
        evidence: `The ${header} header was missing or failed the limited syntax check on the observed HTTPS response. This is not an exploitation test.`,
        recommendation:
          'Review application compatibility and configure the relevant HTTP security policy; validate with the application owner.',
      });
  }
  for (const [key, records] of [
    ['spf', result.spf],
    ['dmarc', result.dmarc],
  ] as const)
    if (records.length === 0)
      output.push({
        engine: 'web-passive',
        engineVersion: 'bump-passive-1',
        ruleId: `dns.${key}.absent`,
        title: `No ${key.toUpperCase()} policy observed`,
        severity: 'low',
        confidence: 'medium',
        location: key === 'spf' ? 'DNS TXT' : 'DNS _dmarc TXT',
        component: '',
        affectedVersion: '',
        fixedVersion: '',
        cve: null,
        cvss: null,
        references: [],
        evidence:
          'The named DNS TXT lookup completed without a matching policy. Applicability to this exact hostname must be reviewed.',
        recommendation:
          'Confirm the authorized email-sending domains and publish the appropriate policy after reviewing legitimate senders.',
      });
  return output;
}
export async function runCyberPassive(
  hostname: string,
  signal: AbortSignal,
): Promise<PassiveResult> {
  const target = engagementTargetSchema.parse({ kind: 'hostname', value: hostname });
  if (target.kind !== 'hostname' || !target.value.includes('.'))
    throw new Error('Invalid passive target');
  const resolver = new Resolver({ timeout: 1000, tries: 1 });
  const stop = () => resolver.cancel();
  signal.addEventListener('abort', stop, { once: true });
  try {
    signal.throwIfAborted();
    const answers = await Promise.allSettled([
      resolver.resolve4(target.value),
      resolver.resolve6(target.value),
    ]);
    // Only absent address families are tolerated; timeout/SERVFAIL are unknown, not absence.
    for (const answer of answers)
      if (answer.status === 'rejected' && !['ENODATA', 'ENOTFOUND'].includes(answer.reason?.code))
        throw new Error('DNS unavailable');
    const addresses = answers.flatMap((a) => (a.status === 'fulfilled' ? a.value : []));
    const address = validatePassiveAddresses(addresses);
    signal.throwIfAborted();
    const response = await new Promise<Omit<PassiveResult, 'spf' | 'dmarc' | 'addresses'>>(
      (resolve, reject) => {
        const req = request(
          `https://${target.value}/`,
          {
            method: 'HEAD',
            signal,
            agent: false,
            family: isIP(address),
            maxHeaderSize: 16384,
            rejectUnauthorized: true,
            servername: target.value,
            lookup: (_hostname, _options, callback) => callback(null, address, isIP(address)),
            headers: {
              'user-agent': 'BumpCyber-Passive/1',
              accept: 'text/html',
              'accept-encoding': 'identity',
            },
          },
          (res) => {
            const socket = res.socket as TLSSocket;
            const certificate = socket.getPeerCertificate();
            const headers: Record<string, string> = {};
            for (const key of [
              'strict-transport-security',
              'content-security-policy',
              'x-content-type-options',
              'referrer-policy',
            ]) {
              const v = res.headers[key];
              if (typeof v === 'string') headers[key] = v.slice(0, 4096);
            }
            const status = res.statusCode ?? 0;
            let redirect: string | null = null;
            if ([301, 302, 303, 307, 308].includes(status)) {
              if (!res.headers.location) {
                res.destroy();
                reject(new Error('Invalid redirect'));
                return;
              }
              try {
                validatePassiveRedirect(res.headers.location, target.value);
                redirect = 'same-host HTTPS redirect observed; not followed';
              } catch {
                res.destroy();
                reject(new Error('Out-of-scope redirect'));
                return;
              }
            }
            if (status < 200 || status >= 400) {
              res.destroy();
              reject(new Error('HTTPS response unavailable'));
              return;
            }
            // No body, cookie, credential or arbitrary header value enters evidence.
            res.resume();
            res.once('end', () =>
              resolve({
                status,
                headers,
                tls: {
                  protocol: socket.getProtocol() ?? 'unknown',
                  validTo: certificate.valid_to ?? 'unknown',
                },
                redirect,
              }),
            );
            res.once('error', reject);
          },
        );
        req.setTimeout(2500, () => req.destroy(new Error('HTTPS timeout')));
        req.once('error', reject);
        req.end();
      },
    );
    const txt = async (name: string, prefix: string) => {
      try {
        return (await resolver.resolveTxt(name))
          .map((v) => v.join(''))
          .filter((v) => v.toLowerCase().startsWith(prefix))
          .slice(0, 10)
          .map(() => `${prefix} policy present (value withheld)`);
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          ['ENODATA', 'ENOTFOUND'].includes(String(error.code))
        )
          return [];
        throw new Error('DNS TXT unavailable');
      }
    };
    const [spf, dmarc] = await Promise.all([
      txt(target.value, 'v=spf1'),
      txt(`_dmarc.${target.value}`, 'v=dmarc1'),
    ]);
    return { addresses, ...response, spf, dmarc };
  } finally {
    signal.removeEventListener('abort', stop);
    resolver.cancel();
  }
}
