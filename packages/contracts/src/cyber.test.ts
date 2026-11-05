import { expect, it } from 'vitest';
import {
  cyberMandateInputSchema,
  cyberObservationSchema,
  cyberSourceInputSchema,
} from './cyber.js';

it('refuses traversal, unbounded source content and shell-like configuration', () => {
  const source = {
    assetId: '00000000-0000-4000-8000-000000000001',
    name: 'Synthetic snapshot',
    files: [{ path: 'app.py', content: 'print(1)' }],
  };
  expect(cyberSourceInputSchema.safeParse(source).success).toBe(true);
  for (const path of ['../etc/passwd', '/etc/passwd', 'a//b', 'a/./b', '-v', 'file;sh'])
    expect(
      cyberSourceInputSchema.safeParse({ ...source, files: [{ path, content: 'x' }] }).success,
    ).toBe(false);
  expect(
    cyberSourceInputSchema.safeParse({ ...source, command: 'touch /tmp/injected' }).success,
  ).toBe(false);
  expect(
    cyberSourceInputSchema.safeParse({
      ...source,
      files: [{ path: 'x', content: 'a'.repeat(131073) }],
    }).success,
  ).toBe(false);
  expect(cyberMandateInputSchema.safeParse({ mode: 'active' }).success).toBe(false);
  expect(cyberObservationSchema.safeParse({ title: 'not a complete observation' }).success).toBe(
    false,
  );
});

it('enforces source file limits in UTF-8 bytes, including multi-byte text', () => {
  const source = {
    assetId: '00000000-0000-4000-8000-000000000001',
    name: 'Synthetic Unicode',
    files: [{ path: 'app.py', content: 'é'.repeat(65536) }],
  };
  expect(cyberSourceInputSchema.safeParse(source).success).toBe(true);
  expect(
    cyberSourceInputSchema.safeParse({
      ...source,
      files: [{ path: 'app.py', content: 'é'.repeat(65537) }],
    }).success,
  ).toBe(false);
});

it('rejects embedded NUL source bytes', () => {
  expect(
    cyberSourceInputSchema.safeParse({
      assetId: '00000000-0000-4000-8000-000000000001',
      name: 'Synthetic',
      files: [{ path: 'app.py', content: String.fromCharCode(0) }],
    }).success,
  ).toBe(false);
});
