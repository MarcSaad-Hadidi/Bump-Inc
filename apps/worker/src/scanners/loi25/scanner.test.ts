import { Resolver } from 'node:dns/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dns from './dns-email.js';
import * as http from './http-security.js';
import { runLoi25Audit } from './index.js';

const home = {
  url: 'https://example.com/',
  status: 200,
  html: '<a href=/privacy>Confidentialité</a><a href=/contact>Contact</a>',
  headers: {},
  cookies: [],
  redirects: [],
};
describe('scanner orchestration and network boundaries', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('rejects private DNS answers before opening a connection', async () => {
    vi.spyOn(Resolver.prototype, 'resolve4').mockResolvedValue(['127.0.0.1']);
    vi.spyOn(Resolver.prototype, 'resolve6').mockResolvedValue([]);
    const fetcher = http.createPassiveFetcher(AbortSignal.timeout(500));
    try {
      await expect(fetcher.fetch('https://example.com')).rejects.toThrow('Unsafe');
    } finally {
      fetcher.close();
    }
  });
  it('cancels work before DNS after its deadline', async () => {
    const resolve = vi.spyOn(Resolver.prototype, 'resolve4');
    const fetcher = http.createPassiveFetcher(AbortSignal.abort());
    try {
      await expect(fetcher.fetch('https://example.com')).rejects.toThrow();
    } finally {
      fetcher.close();
    }
    expect(resolve).not.toHaveBeenCalled();
  });
  it('reads bounded linked pages, returns validated findings and closes the fetcher', async () => {
    const fetch = vi.fn(async (url: string) => ({
      ...home,
      url,
      html: url.endsWith('/privacy') ? '<p>Politique</p>' : home.html,
      redirects: url.startsWith('http:') ? ['http://example.com/'] : [],
    }));
    const close = vi.fn();
    vi.spyOn(http, 'createPassiveFetcher').mockReturnValue({ fetch, close });
    vi.spyOn(dns, 'collectEmailDns').mockResolvedValue({ spf: [], dmarc: [], mx: [] });
    const report = await runLoi25Audit({ companyName: 'Exemple', domain: 'example.com' });
    expect(report.status).toBe('COMPLETED');
    expect(report.findings.length).toBeGreaterThan(10);
    expect(report.findings.every((finding) => !finding.humanVerified)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(close).toHaveBeenCalledOnce();
  });
  it('marks failed HTTP collection as failed rather than implying compliance', async () => {
    const close = vi.fn();
    vi.spyOn(http, 'createPassiveFetcher').mockReturnValue({
      fetch: vi.fn().mockRejectedValue(new Error('downstream sensitive error')),
      close,
    });
    vi.spyOn(dns, 'collectEmailDns').mockResolvedValue({ spf: null, dmarc: null, mx: null });
    const report = await runLoi25Audit({ companyName: 'Exemple', domain: 'example.com' });
    expect(report).toMatchObject({ status: 'FAILED', score: 0, grade: 'F' });
    expect(JSON.stringify(report)).not.toContain('sensitive error');
    expect(close).toHaveBeenCalledOnce();
  });
});
