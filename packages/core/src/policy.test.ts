import { describe, expect, it } from 'vitest';
import { authorizationDigest, evaluateEngagementPolicy } from './policy.js';

const actorUserId = 'b31903b5-8335-40fa-a65d-b867797c52bc';
const authorizationText = 'Written authorization for the exact declared assets.';
const now = new Date('2026-10-22T12:00:00Z');
const hostname = { kind: 'hostname', value: 'api.example.test' };
const repository = { kind: 'repository', value: 'example/repo' };
const input = {
  scope: { assets: [hostname, repository], actions: ['network.scan', 'code.scan'], exclusions: [] },
  responsibleUserId: actorUserId,
  actorUserId,
  validFrom: new Date('2026-10-22T12:00:00Z'),
  validUntil: new Date('2026-10-23T12:00:00Z'),
  authorizationText,
  authorizationSha256: authorizationDigest(authorizationText),
  target: hostname,
  action: 'network.scan',
};

describe('engagement policy boundary', () => {
  it('allows only an exact compatible target and action for the responsible actor', () => {
    expect(evaluateEngagementPolicy(input, now)).toEqual({ allowed: true });
    expect(
      evaluateEngagementPolicy(
        { ...input, target: { ...hostname, value: 'API.EXAMPLE.TEST' } },
        now,
      ),
    ).toEqual({ allowed: true });
    expect(
      evaluateEngagementPolicy({ ...input, target: repository, action: 'code.scan' }, now),
    ).toEqual({ allowed: true });
  });
  it('matches canonical IPv6 spellings and lets an exclusion win', () => {
    const target = { kind: 'ip', value: '2001:db8::1' };
    const declaration = {
      ...input,
      target,
      scope: {
        assets: [{ ...target, value: '2001:0DB8:0:0:0:0:0:1' }],
        actions: ['network.scan'],
        exclusions: [],
      },
    };
    expect(evaluateEngagementPolicy(declaration, now)).toEqual({ allowed: true });
    expect(
      evaluateEngagementPolicy(
        { ...declaration, scope: { ...declaration.scope, exclusions: [target] } },
        now,
      ),
    ).toEqual({ allowed: false, reason: 'excluded' });
  });
  it('checks exclusions before allowlists and other eligibility checks', () => {
    expect(
      evaluateEngagementPolicy(
        {
          ...input,
          actorUserId: '3c44bc95-11bd-401e-9eb2-8325c96acb53',
          scope: { ...input.scope, exclusions: [hostname] },
        },
        now,
      ),
    ).toEqual({ allowed: false, reason: 'excluded' });
  });
  it.each([
    { kind: 'hostname', value: 'sub.api.example.test' },
    { kind: 'hostname', value: 'api.example.test.attacker.test' },
    { kind: 'repository', value: 'example/repo-other' },
    { kind: 'repository', value: 'other/repo' },
    { kind: 'ip', value: '192.0.2.1' },
  ])('denies a neighboring undeclared target $value', (target) => {
    expect(evaluateEngagementPolicy({ ...input, target }, now)).toEqual({
      allowed: false,
      reason: 'out_of_scope',
    });
  });
  it('denies cross-kind actions even when that action is in the scope', () => {
    expect(evaluateEngagementPolicy({ ...input, action: 'code.scan' }, now)).toEqual({
      allowed: false,
      reason: 'action_not_allowed',
    });
    expect(evaluateEngagementPolicy({ ...input, target: repository }, now)).toEqual({
      allowed: false,
      reason: 'action_not_allowed',
    });
    expect(evaluateEngagementPolicy({ ...input, action: 'configuration.read' }, now)).toEqual({
      allowed: false,
      reason: 'action_not_allowed',
    });
  });
  it('uses inclusive start and exclusive expiry', () => {
    expect(evaluateEngagementPolicy(input, new Date(input.validFrom.getTime() - 1))).toEqual({
      allowed: false,
      reason: 'not_yet_valid',
    });
    expect(evaluateEngagementPolicy(input, input.validFrom)).toEqual({ allowed: true });
    expect(evaluateEngagementPolicy(input, new Date(input.validUntil.getTime() - 1))).toEqual({
      allowed: true,
    });
    expect(evaluateEngagementPolicy(input, input.validUntil)).toEqual({
      allowed: false,
      reason: 'expired',
    });
  });
  it('denies a different responsible actor', () => {
    expect(
      evaluateEngagementPolicy(
        { ...input, actorUserId: '3c44bc95-11bd-401e-9eb2-8325c96acb53' },
        now,
      ),
    ).toEqual({ allowed: false, reason: 'not_responsible' });
  });
  it('detects altered evidence bytes or a substituted digest', () => {
    expect(authorizationDigest('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    for (const mutation of [
      { authorizationText: `${authorizationText}\n` },
      { authorizationSha256: '0'.repeat(64) },
    ]) {
      expect(evaluateEngagementPolicy({ ...input, ...mutation }, now)).toEqual({
        allowed: false,
        reason: 'document_integrity',
      });
    }
  });
  it('fails closed on corrupt stored scope, invalid requests and dates', () => {
    for (const invalid of [
      null,
      {},
      { ...input, action: 'shell.execute' },
      { ...input, scope: { ...input.scope, assets: [] } },
      { ...input, extra: true },
      { ...input, validFrom: new Date('invalid') },
      { ...input, validUntil: input.validFrom },
      { ...input, target: { kind: 'ip', value: '::ffff:192.0.2.1' } },
      { ...input, target: { kind: 'hostname', value: '127.1' } },
    ])
      expect(evaluateEngagementPolicy(invalid, now)).toEqual({
        allowed: false,
        reason: 'invalid_input',
      });
    expect(evaluateEngagementPolicy(input, new Date('invalid'))).toEqual({
      allowed: false,
      reason: 'invalid_input',
    });
  });
});
