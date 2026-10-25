import { describe, expect, it } from 'vitest';
import { attribute, pageLinks, privacyTerms } from './check.js';
import { analyzeCookies, detectTrackers } from './cookies-and-trackers.js';
import { analyzeEmailDns } from './dns-email.js';
import { analyzeFormsAndWidgets } from './forms-and-ai-widgets.js';
import { analyzeHttp, isPublicAddress, type Page } from './http-security.js';
import { analyzePrivacy } from './privacy-policy-and-officer.js';
import { scoreChecks } from './scorer.js';

const url = 'https://example.ca/';
const page: Page = {
  url,
  status: 200,
  html: '<h1>Exemple</h1>',
  headers: {},
  cookies: [],
  redirects: [],
};

describe('passive HTML and DNS checks', () => {
  it('finds same-origin privacy links with quoted/unquoted attributes and ignores comments/external links', () => {
    expect(attribute('<a href=/privacy>', 'href')).toBe('/privacy');
    expect(
      pageLinks(
        '<!-- <a href="/politique">Test</a> --><a href="/privacy#rprp">Privacy</a><a href=/privacy>Vie privée</a><a href="https://other.ca/privacy">X</a>',
        url,
        privacyTerms,
      ),
    ).toEqual(['https://example.ca/privacy']);
  });
  it('requires officer contact proximity, detects rights and preserves incomplete status', () => {
    const html =
      '<p>Responsable de la protection des renseignements personnels : responsable@example.ca.</p><p>Accès, rectification, retrait du consentement et conservation / destruction.</p>';
    expect(analyzePrivacy([{ url, html }], true).every((c) => c.passed)).toBe(true);
    expect(
      analyzePrivacy([{ url, html: '<script>privacy officer x@example.ca</script>' }], false).every(
        (c) => !c.passed,
      ),
    ).toBe(true);
    expect(analyzePrivacy([{ url, html: '' }], false, false).every((c) => c.passed === null)).toBe(
      true,
    );
  });
  it('detects tracker code but does not equate a CMP with prior consent', () => {
    const html =
      '<script src="https://connect.facebook.net/fbevents.js"></script><script src="cookiebot.js"></script>';
    expect(detectTrackers(html)).toEqual(['Meta Pixel']);
    const [check] = analyzeCookies(url, html, ['session=do-not-store; Secure']);
    expect(check?.passed).toBe(false);
    expect(check?.evidence['cmpDetected']).toBe(true);
    expect(JSON.stringify(check)).not.toContain('do-not-store');
    expect(detectTrackers('<p>gtag()</p><!-- <script>fbq()</script> -->')).toEqual([]);
  });
  it('checks personal-data forms locally and identifies third-party widgets', () => {
    const html =
      '<form><input type="email" name="email"></form><script src="https://client.crisp.chat/l.js"></script>';
    const checks = analyzeFormsAndWidgets([{ url, html }]);
    expect(checks.every((c) => c.passed === false)).toBe(true);
    const protectedForm = '<form><input type=email><a href=/privacy>Confidentialité</a></form>';
    expect(analyzeFormsAndWidgets([{ url, html: protectedForm }])[0]?.passed).toBe(true);
    expect(analyzeFormsAndWidgets([{ url, html: '' }], false).every((c) => c.passed === null)).toBe(
      true,
    );
  });
  it.each(['none', 'quarantine', 'reject'])('parses DMARC policy %s', (policy) => {
    const checks = analyzeEmailDns('example.ca', {
      spf: ['v=spf1 -all'],
      dmarc: [`v=DMARC1; p=${policy}`],
      mx: [{ exchange: 'mail.example.ca', priority: 10 }],
    });
    expect(checks[1]?.passed).toBe(policy !== 'none');
    expect(checks[0]?.passed).toBe(true);
  });
  it('distinguishes absent, duplicate, partial and unavailable DNS records', () => {
    expect(
      analyzeEmailDns('example.ca', { spf: [], dmarc: [], mx: [] }).every(
        (c) => c.passed === false,
      ),
    ).toBe(true);
    expect(
      analyzeEmailDns('example.ca', { spf: null, dmarc: null, mx: null }).every(
        (c) => c.passed === null,
      ),
    ).toBe(true);
    for (const dmarc of [
      ['v=DMARC1; p=reject; p=none'],
      ['v=DMARC1; p=reject; p=invalid'],
      ['v=DMARC1; p=reject; pct=50'],
      ['v=DMARC1; p=reject', 'v=DMARC1; p=none'],
    ]) {
      expect(analyzeEmailDns('example.ca', { spf: [], dmarc, mx: [] })[1]?.passed).toBe(false);
    }
  });
  it('checks header semantics and cookie flags without storing cookie values', () => {
    const checks = analyzeHttp(
      {
        ...page,
        headers: {
          'strict-transport-security': 'max-age=0',
          'content-security-policy': "frame-ancestors 'none'",
        },
        cookies: ['s=secret; Secure; HttpOnly; SameSite=Lax'],
      },
      true,
    );
    expect(checks.find((c) => c.key === 'strict-transport-security')?.passed).toBe(false);
    expect(checks.find((c) => c.key === 'x-frame-options')?.passed).toBe(true);
    expect(checks.find((c) => c.key === 'cookie-flags')?.passed).toBe(true);
    expect(JSON.stringify(checks)).not.toContain('secret');
  });
  it('blocks special-purpose IPv4/IPv6 including mapped loopback and documentation networks', () => {
    for (const address of [
      '127.0.0.1',
      '10.0.0.1',
      '169.254.169.254',
      '100.64.0.1',
      '192.0.2.1',
      '::1',
      '::ffff:127.0.0.1',
      'fc00::1',
      'fe80::1',
      '2001:db8::1',
      '2002:7f00:1::',
      '2001:20::1',
    ])
      expect(isPublicAddress(address), address).toBe(false);
    expect(isPublicAddress('1.1.1.1')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });
  it('scores reproducibly, caps penalties and never automatically verifies', () => {
    const checks = analyzeHttp(page, false);
    const first = scoreChecks(checks);
    const second = scoreChecks(checks);
    expect(first.score).toBe(second.score);
    expect(first.grade).toBe(second.grade);
    expect(first.findings.every((f) => !f.humanVerified)).toBe(true);
    expect(scoreChecks(checks.map((c) => ({ ...c, passed: true }))).score).toBe(100);
    expect(scoreChecks(Array.from({ length: 30 }, () => checks[0]!)).score).toBe(0);
    expect(scoreChecks([]).score).toBe(0);
    expect(scoreChecks([{ ...checks[0]!, passed: null }]).findings[0]?.evidence['result']).toBe(
      'INCONNU',
    );
  });
});
