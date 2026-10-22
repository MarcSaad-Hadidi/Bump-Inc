import { describe, expect, it } from 'vitest';
import {
  engagementRevisionInputSchema,
  engagementScopeSchema,
  engagementTargetSchema,
  isEngagementActionCompatible,
} from './engagement.js';

const asset = { kind: 'hostname', value: 'api.example.test' };
const scope = { assets: [asset], actions: ['network.scan'], exclusions: [] };
const revision = {
  objective: 'Review the declared service',
  responsibleUserId: 'b31903b5-8335-40fa-a65d-b867797c52bc',
  scope,
  authorizationText: 'Written authorization for the declared scope.',
  validFrom: '2026-10-22T12:00:00-04:00',
  validUntil: '2026-10-23T12:00:00-04:00',
};

describe('exact engagement targets', () => {
  it.each([
    ['hostname', 'API.Example.TEST', 'api.example.test'],
    ['ip', '192.0.2.1', '192.0.2.1'],
    ['ip', '2001:0DB8:0000:0000:0000:0000:0000:0001', '2001:db8::1'],
    ['repository', 'Example-Org/Repo.Name', 'example-org/repo.name'],
  ])('canonicalizes %s %s', (kind, value, canonical) => {
    expect(engagementTargetSchema.parse({ kind, value })).toEqual({ kind, value: canonical });
  });
  it.each([
    ['hostname', '*.example.test'],
    ['hostname', 'example.test.'],
    ['hostname', 'https://example.test'],
    ['hostname', 'éxample.test'],
    ['hostname', '127.0.0.1'],
    ['hostname', '127.1'],
    ['hostname', '2130706433'],
    ['hostname', '0x7f000001'],
    ['hostname', '0177.0.0.1'],
    ['hostname', ' example.test'],
    ['hostname', '-bad.example'],
    ['hostname', 'a..example'],
    ['ip', '192.168.001.1'],
    ['ip', '192.0.2.0/24'],
    ['ip', '[::1]'],
    ['ip', 'fe80::1%eth0'],
    ['ip', '::ffff:127.0.0.1'],
    ['ip', '::ffff:7f00:1'],
    ['repository', 'https://github.com/org/repo'],
    ['repository', 'org/repo/tree/main'],
    ['repository', 'org/..'],
    ['repository', 'org/repo.git'],
    ['repository', 'org/repo.GIT'],
    ['repository', 'org/repo\n'],
    ['repository', 'org\n/repo'],
    ['repository', 'org/repo?ref=main'],
    ['repository', 'org/repo#ref'],
    ['repository', '/repo'],
    ['domain', 'example.test'],
  ])('rejects ambiguous or unsupported %s %s', (kind, value) => {
    expect(engagementTargetSchema.safeParse({ kind, value }).success).toBe(false);
  });
});

describe('engagement declarations', () => {
  it('allows passive import on every exact target without changing scanner compatibility', () => {
    for (const kind of ['hostname', 'ip', 'repository'] as const)
      expect(isEngagementActionCompatible(kind, 'audit.import')).toBe(true);
    expect(engagementScopeSchema.safeParse({ ...scope, actions: ['audit.import'] }).success).toBe(
      true,
    );
    expect(isEngagementActionCompatible('repository', 'network.scan')).toBe(false);
  });
  it('rejects canonical duplicates in either target list and duplicate actions', () => {
    for (const field of ['assets', 'exclusions']) {
      expect(
        engagementScopeSchema.safeParse({
          ...scope,
          [field]: [asset, { ...asset, value: 'API.EXAMPLE.TEST' }],
        }).success,
      ).toBe(false);
    }
    expect(
      engagementScopeSchema.safeParse({
        ...scope,
        assets: [
          { kind: 'ip', value: '2001:db8::1' },
          { kind: 'ip', value: '2001:0db8:0:0:0:0:0:1' },
        ],
      }).success,
    ).toBe(false);
    expect(
      engagementScopeSchema.safeParse({ ...scope, actions: ['network.scan', 'network.scan'] })
        .success,
    ).toBe(false);
  });
  it('permits exclusions to override a declared asset', () => {
    expect(engagementScopeSchema.safeParse({ ...scope, exclusions: [asset] }).success).toBe(true);
  });
  it('requires each action to have a compatible declared asset', () => {
    expect(engagementScopeSchema.safeParse({ ...scope, actions: ['code.scan'] }).success).toBe(
      false,
    );
    expect(
      engagementScopeSchema.safeParse({
        ...scope,
        assets: [asset, { kind: 'repository', value: 'org/repo' }],
        actions: ['code.scan', 'network.scan'],
      }).success,
    ).toBe(true);
  });
  it('rejects missing exclusions, unknown fields, empty assets and unknown actions', () => {
    for (const invalid of [
      { assets: [asset], actions: ['network.scan'] },
      { ...scope, extra: true },
      { ...scope, assets: [] },
      { ...scope, actions: ['shell.execute'] },
      { ...scope, assets: [{ ...asset, url: 'http://example.test' }] },
    ])
      expect(engagementScopeSchema.safeParse(invalid).success).toBe(false);
  });
  it('preserves offset timestamps and the exact authorization bytes', () => {
    const input = {
      ...revision,
      authorizationText: '  Written authorization.\n',
      sourceReference: 'internal record 42',
    };
    expect(engagementRevisionInputSchema.parse(input)).toEqual(input);
  });
  it('requires a strict bounded declaration with a positive validity window', () => {
    for (const invalid of [
      { ...revision, validUntil: revision.validFrom },
      { ...revision, validUntil: '2026-10-22T15:59:59Z' },
      { ...revision, validFrom: '2026-10-22T12:00:00' },
      { ...revision, responsibleUserId: 'operator' },
      { ...revision, approvalLevel: 'owner' },
      { ...revision, objective: ' ' },
      { ...revision, authorizationText: ' '.repeat(10) },
      { ...revision, sourceReference: 'source\nforged' },
      { ...revision, sourceReference: 'source\n' },
      { ...revision, sourceReference: 'x'.repeat(513) },
      { ...revision, authorizationText: 'x'.repeat(20001) },
    ])
      expect(engagementRevisionInputSchema.safeParse(invalid).success).toBe(false);
  });
});
