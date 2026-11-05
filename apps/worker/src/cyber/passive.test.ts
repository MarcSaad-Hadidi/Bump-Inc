import { EventEmitter } from 'node:events';
import type { ClientRequest, IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { RequestOptions } from 'node:https';
import type { LookupFunction } from 'node:net';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  passiveObservations,
  runCyberPassive,
  validatePassiveAddresses,
  validatePassiveRedirect,
} from './passive.js';

type HttpsTransport = (
  url: string | URL,
  options: RequestOptions,
  callback: (response: IncomingMessage) => void,
) => ClientRequest;

const network = vi.hoisted(() => ({
  resolverCreated: vi.fn<(options: { timeout: number; tries: number }) => void>(),
  resolve4: vi.fn<(hostname: string) => Promise<string[]>>(),
  resolve6: vi.fn<(hostname: string) => Promise<string[]>>(),
  resolveTxt: vi.fn<(hostname: string) => Promise<string[][]>>(),
  cancel: vi.fn<() => void>(),
  systemLookup: vi.fn<LookupFunction>(),
  request: vi.fn<HttpsTransport>(),
}));

vi.mock('node:dns/promises', () => ({
  Resolver: class {
    constructor(options: { timeout: number; tries: number }) {
      network.resolverCreated(options);
    }
    resolve4 = network.resolve4;
    resolve6 = network.resolve6;
    resolveTxt = network.resolveTxt;
    cancel = network.cancel;
  },
}));
vi.mock('node:https', () => ({ request: network.request }));

const hostname = 'example.test';
const publicV4 = '93.184.216.34';
const publicV6 = '2606:4700:4700::1111';
const secureHeaders = {
  'strict-transport-security': 'max-age=31536000',
  'content-security-policy': "default-src 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

function dnsError(code: string) {
  return Object.assign(new Error('synthetic resolver detail that must not become evidence'), {
    code,
  });
}

class FakeResponse extends EventEmitter {
  readonly socket = {
    getPeerCertificate: () => ({ valid_to: 'synthetic certificate expiration' }),
    getProtocol: () => 'TLSv1.3',
  };
  readonly resume = vi.fn(() => {
    queueMicrotask(() => this.emit('end'));
    return this;
  });
  readonly destroy = vi.fn(() => this);

  constructor(
    readonly statusCode: number,
    readonly headers: IncomingHttpHeaders,
  ) {
    super();
  }
}

class FakeRequest extends EventEmitter {
  readonly setTimeout = vi.fn((_milliseconds: number, _callback: () => void) => this);
  readonly end = vi.fn(() => this.connect());
  readonly destroy = vi.fn((error?: Error) => {
    if (error) queueMicrotask(() => this.emit('error', error));
    return this;
  });

  constructor(private readonly connect: () => void) {
    super();
  }
}

// No socket is opened. The simulated connection consumes the application's lookup callback,
// including its address/family result; missing pinning falls back to a private synthetic answer.
function serveHttps({
  status = 200,
  headers = secureHeaders,
  lookupAttempts = 1,
}: {
  status?: number;
  headers?: IncomingHttpHeaders;
  lookupAttempts?: number;
} = {}) {
  const response = new FakeResponse(status, headers);
  const connections: { hostname: string; address: string; family: number }[] = [];
  const requests: FakeRequest[] = [];
  network.request.mockImplementation((input, options, callback) => {
    const url = new URL(input);
    const request = new FakeRequest(() => {
      const lookup = options.lookup ?? network.systemLookup;
      const attempts = Array.from(
        { length: lookupAttempts },
        () =>
          new Promise<void>((resolve, reject) => {
            lookup(
              url.hostname,
              { family: options.family, all: false },
              (error, address, family) => {
                if (error) return reject(error);
                if (typeof address !== 'string' || (family !== 4 && family !== 6))
                  return reject(new Error('Invalid single-address lookup result'));
                connections.push({ hostname: url.hostname, address, family });
                resolve();
              },
            );
          }),
      );
      void Promise.all(attempts).then(
        () => callback(response as unknown as IncomingMessage),
        (error: unknown) => request.emit('error', error),
      );
    });
    requests.push(request);
    return request as unknown as ClientRequest;
  });
  return { response, connections, requests };
}

beforeEach(() => {
  vi.resetAllMocks();
  network.resolve4.mockResolvedValue([publicV4]);
  network.resolve6.mockRejectedValue(dnsError('ENODATA'));
  network.resolveTxt.mockImplementation(async (name) =>
    name === hostname
      ? [['unrelated synthetic record'], ['v=sp', 'f1 -all']]
      : [['v=DMARC1; p=reject']],
  );
  network.systemLookup.mockImplementation((_name, _options, callback) =>
    callback(null, '127.0.0.1', 4),
  );
  network.request.mockImplementation(() => {
    throw new Error('HTTPS transport must be explicitly simulated by this test');
  });
});

it('refuses private/mapped/mixed DNS answers and pins a validated public address', () => {
  for (const answers of [
    [],
    ['127.0.0.1'],
    ['169.254.169.254'],
    ['10.0.0.1'],
    ['::1'],
    ['::ffff:127.0.0.1'],
    ['93.184.216.34', '192.168.1.1'],
  ])
    expect(() => validatePassiveAddresses(answers)).toThrow();
  expect(validatePassiveAddresses(['93.184.216.34'])).toBe('93.184.216.34');
});
it('rejects external hosts, credentials, alternate schemes, ports and downgrades', () => {
  for (const url of [
    'http://example.test/',
    'https://attacker.test/',
    'https://user:password@example.test/',
    'https://example.test:444/',
    'https://127.0.0.1/',
    'file:///etc/passwd',
  ])
    expect(() => validatePassiveRedirect(url, 'example.test')).toThrow();
  expect(validatePassiveRedirect('/login', 'example.test').hostname).toBe('example.test');
});
it('produces observations without arbitrary header values or cookies', () => {
  const observations = passiveObservations({
    addresses: ['93.184.216.34'],
    status: 200,
    headers: { 'set-cookie': 'synthetic-private-cookie' },
    tls: { protocol: 'TLSv1.3', validTo: 'synthetic' },
    redirect: null,
    spf: [],
    dmarc: [],
  });
  expect(observations.length).toBe(6);
  expect(JSON.stringify(observations)).not.toContain('synthetic-private-cookie');
});

describe('passive DNS and HTTPS transport, entirely simulated', () => {
  it.each([
    { name: 'a second private A answer', a: [publicV4, '10.0.0.1'], aaaa: [publicV6] },
    { name: 'private AAAA alongside public A', a: [publicV4], aaaa: ['::1'] },
    { name: 'a second private AAAA answer', a: [], aaaa: [publicV6, 'fd00::1'] },
    { name: 'metadata A alongside public AAAA', a: ['169.254.169.254'], aaaa: [publicV6] },
    { name: 'mapped IPv4 alongside public A', a: [publicV4], aaaa: ['::ffff:127.0.0.1'] },
    { name: 'no addresses', a: [], aaaa: [] },
  ])('rejects $name before issuing HTTPS', async ({ a, aaaa }) => {
    serveHttps();
    network.resolve4.mockResolvedValue(a);
    network.resolve6.mockResolvedValue(aaaa);

    await expect(runCyberPassive(hostname, new AbortController().signal)).rejects.toThrow(
      'Unsafe DNS answer',
    );
    expect(network.resolve4).toHaveBeenCalledExactlyOnceWith(hostname);
    expect(network.resolve6).toHaveBeenCalledExactlyOnceWith(hostname);
    expect(network.request).not.toHaveBeenCalled();
    expect(network.systemLookup).not.toHaveBeenCalled();
    expect(network.resolveTxt).not.toHaveBeenCalled();
    expect(network.cancel).toHaveBeenCalledOnce();
  });

  it('waits for the slower address family before allowing an HTTPS connection', async () => {
    serveHttps();
    let finish: (addresses: string[]) => void = (_addresses) => {
      throw new Error('Delayed resolver was not initialized');
    };
    network.resolve6.mockReturnValueOnce(
      new Promise<string[]>((resolve) => {
        finish = resolve;
      }),
    );
    const pending = runCyberPassive(hostname, new AbortController().signal);

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(network.resolve4).toHaveBeenCalledOnce();
    expect(network.resolve6).toHaveBeenCalledOnce();
    expect(network.request).not.toHaveBeenCalled();
    finish(['::1']);

    await expect(pending).rejects.toThrow('Unsafe DNS answer');
    expect(network.request).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'A-only', a: [publicV4], aaaa: null, address: publicV4, family: 4 },
    { name: 'AAAA-only', a: null, aaaa: [publicV6], address: publicV6, family: 6 },
    {
      name: 'dual-stack with multiple public answers',
      a: [publicV4, '142.250.74.206'],
      aaaa: [publicV6],
      address: publicV4,
      family: 4,
    },
  ])('connects to the pinned $name address even if fresh DNS would rebind', async (test) => {
    const transport = serveHttps({ lookupAttempts: 2 });
    // Subsequent resolver/system answers are deliberately unsafe. The HTTPS lookup must
    // continue using the answer validated before the request, on either lookup attempt.
    if (test.a) network.resolve4.mockResolvedValueOnce(test.a);
    else network.resolve4.mockRejectedValueOnce(dnsError('ENODATA'));
    network.resolve4.mockResolvedValue(['169.254.169.254']);
    if (test.aaaa) network.resolve6.mockResolvedValueOnce(test.aaaa);
    else network.resolve6.mockRejectedValueOnce(dnsError('ENOTFOUND'));
    network.resolve6.mockResolvedValue(['::1']);
    const signal = new AbortController().signal;

    const result = await runCyberPassive(hostname, signal);

    expect(transport.connections).toEqual([
      { hostname, address: test.address, family: test.family },
      { hostname, address: test.address, family: test.family },
    ]);
    expect(result.addresses).toEqual([...(test.a ?? []), ...(test.aaaa ?? [])]);
    expect(result.tls).toEqual({
      protocol: 'TLSv1.3',
      validTo: 'synthetic certificate expiration',
    });
    expect(result.spf).toEqual(['v=spf1 policy present (value withheld)']);
    expect(result.dmarc).toEqual(['v=dmarc1 policy present (value withheld)']);
    expect(passiveObservations(result)).toEqual([]);
    expect(network.request).toHaveBeenCalledExactlyOnceWith(
      `https://${hostname}/`,
      expect.objectContaining({
        method: 'HEAD',
        family: test.family,
        agent: false,
        rejectUnauthorized: true,
        servername: hostname,
        signal,
      }),
      expect.any(Function),
    );
    expect(transport.requests[0]?.end).toHaveBeenCalledOnce();
    expect(transport.requests[0]?.setTimeout).toHaveBeenCalledWith(2500, expect.any(Function));
    expect(network.resolverCreated).toHaveBeenCalledExactlyOnceWith({ timeout: 1000, tries: 1 });
    expect(network.resolve4).toHaveBeenCalledExactlyOnceWith(hostname);
    expect(network.resolve6).toHaveBeenCalledExactlyOnceWith(hostname);
    expect(network.systemLookup).not.toHaveBeenCalled();
    expect(network.resolveTxt.mock.calls).toEqual([[hostname], [`_dmarc.${hostname}`]]);
    expect(network.cancel).toHaveBeenCalledOnce();
  });

  it.each([
    { status: 301, location: 'http://example.test/' },
    { status: 302, location: 'https://attacker.test/' },
    { status: 303, location: 'https://user:password@example.test/' },
    { status: 307, location: 'https://example.test:444/' },
    { status: 308, location: 'https://127.0.0.1/' },
    { status: 302, location: '//attacker.test/redirect' },
    { status: 302, location: 'https://example.test.attacker.test/' },
    { status: 302, location: 'file:///etc/passwd' },
    { status: 302, location: '/?private=synthetic' },
    { status: 302, location: '/#synthetic' },
  ])('rejects an unsafe $status redirect to $location without following it', async (redirect) => {
    const transport = serveHttps({
      status: redirect.status,
      headers: { ...secureHeaders, location: redirect.location },
    });

    await expect(runCyberPassive(hostname, new AbortController().signal)).rejects.toThrow(
      'Out-of-scope redirect',
    );
    expect(network.request).toHaveBeenCalledOnce();
    expect(transport.connections).toEqual([{ hostname, address: publicV4, family: 4 }]);
    expect(transport.response.destroy).toHaveBeenCalledOnce();
    expect(transport.response.resume).not.toHaveBeenCalled();
    expect(network.resolve4).toHaveBeenCalledExactlyOnceWith(hostname);
    expect(network.resolve6).toHaveBeenCalledExactlyOnceWith(hostname);
    expect(network.resolveTxt).not.toHaveBeenCalled();
    expect(network.cancel).toHaveBeenCalledOnce();
  });

  it.each([301, 302, 303, 307, 308])(
    'records a same-host HTTPS %i redirect without making another request',
    async (status) => {
      const transport = serveHttps({ status, headers: { ...secureHeaders, location: '/login' } });

      const result = await runCyberPassive(hostname, new AbortController().signal);

      expect(result.redirect).toBe('same-host HTTPS redirect observed; not followed');
      expect(result.status).toBe(status);
      expect(network.request).toHaveBeenCalledOnce();
      expect(transport.connections).toEqual([{ hostname, address: publicV4, family: 4 }]);
      expect(transport.response.resume).toHaveBeenCalledOnce();
      expect(transport.response.destroy).not.toHaveBeenCalled();
    },
  );

  it('rejects a redirect without a Location header', async () => {
    const transport = serveHttps({ status: 302 });

    await expect(runCyberPassive(hostname, new AbortController().signal)).rejects.toThrow(
      'Invalid redirect',
    );
    expect(network.request).toHaveBeenCalledOnce();
    expect(transport.response.destroy).toHaveBeenCalledOnce();
    expect(network.resolveTxt).not.toHaveBeenCalled();
  });

  it.each([
    { family: 'A', code: 'ETIMEOUT' },
    { family: 'A', code: 'ESERVFAIL' },
    { family: 'AAAA', code: 'ETIMEOUT' },
    { family: 'AAAA', code: 'ESERVFAIL' },
  ])(
    'fails closed on $family $code despite a public answer from the other family',
    async (test) => {
      serveHttps();
      network.resolve4.mockResolvedValue([publicV4]);
      network.resolve6.mockResolvedValue([publicV6]);
      (test.family === 'A' ? network.resolve4 : network.resolve6).mockRejectedValue(
        dnsError(test.code),
      );

      await expect(runCyberPassive(hostname, new AbortController().signal)).rejects.toThrow(
        'DNS unavailable',
      );
      expect(network.request).not.toHaveBeenCalled();
      expect(network.resolveTxt).not.toHaveBeenCalled();
      expect(network.cancel).toHaveBeenCalledOnce();
    },
  );

  it.each([
    { record: 'SPF', name: hostname, code: 'ETIMEOUT' },
    { record: 'SPF', name: hostname, code: 'ESERVFAIL' },
    { record: 'DMARC', name: `_dmarc.${hostname}`, code: 'ETIMEOUT' },
    { record: 'DMARC', name: `_dmarc.${hostname}`, code: 'ESERVFAIL' },
  ])('rejects $record $code instead of returning a clean or absent-policy result', async (test) => {
    serveHttps();
    network.resolveTxt.mockImplementation(async (name) => {
      if (name === test.name) throw dnsError(test.code);
      return [[name === hostname ? 'v=spf1 -all' : 'v=DMARC1; p=reject']];
    });

    await expect(runCyberPassive(hostname, new AbortController().signal)).rejects.toThrow(
      'DNS TXT unavailable',
    );
    expect(network.request).toHaveBeenCalledOnce();
    expect(network.resolveTxt.mock.calls).toEqual([[hostname], [`_dmarc.${hostname}`]]);
    expect(network.cancel).toHaveBeenCalledOnce();
  });

  it.each(['ENODATA', 'ENOTFOUND'])(
    'distinguishes completed TXT absence (%s) from resolver failure',
    async (code) => {
      serveHttps();
      network.resolveTxt.mockRejectedValue(dnsError(code));

      const result = await runCyberPassive(hostname, new AbortController().signal);

      expect(result.spf).toEqual([]);
      expect(result.dmarc).toEqual([]);
      expect(passiveObservations(result).map((observation) => observation.ruleId)).toEqual([
        'dns.spf.absent',
        'dns.dmarc.absent',
      ]);
    },
  );
});
