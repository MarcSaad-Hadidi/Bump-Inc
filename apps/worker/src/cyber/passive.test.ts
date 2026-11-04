import { expect, it, vi } from 'vitest';
import {
  passiveObservations,
  validatePassiveAddresses,
  validatePassiveRedirect,
} from './passive.js';

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
