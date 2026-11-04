import { createHash } from 'node:crypto';
import {
  engagementActionSchema,
  engagementScopeSchema,
  engagementTargetSchema,
  isEngagementActionCompatible,
} from '@bump/contracts';
import { z } from 'zod';

const policyInputSchema = z
  .strictObject({
    scope: engagementScopeSchema,
    responsibleUserId: z.uuid(),
    actorUserId: z.uuid(),
    validFrom: z.date(),
    validUntil: z.date(),
    authorizationText: z.string().min(10).max(20000),
    authorizationSha256: z.string().regex(/^[a-f0-9]{64}$/),
    target: engagementTargetSchema,
    action: engagementActionSchema,
  })
  .refine((input) => input.validFrom < input.validUntil);

export type EngagementPolicyInput = z.input<typeof policyInputSchema>;
export type EngagementPolicyDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | 'invalid_input'
        | 'not_responsible'
        | 'not_yet_valid'
        | 'expired'
        | 'document_integrity'
        | 'excluded'
        | 'out_of_scope'
        | 'action_not_allowed';
    };

export function authorizationDigest(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Pure scope decision. The caller must also verify current tenant, revision and approval authority. */
export function evaluateEngagementPolicy(input: unknown, now: Date): EngagementPolicyDecision {
  const parsed = policyInputSchema.safeParse(input);
  if (!parsed.success || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return { allowed: false, reason: 'invalid_input' };
  }
  const value = parsed.data;
  const matches = (target: { kind: string; value: string }) =>
    target.kind === value.target.kind && target.value === value.target.value;
  if (value.scope.exclusions.some(matches)) return { allowed: false, reason: 'excluded' };
  if (value.actorUserId !== value.responsibleUserId)
    return { allowed: false, reason: 'not_responsible' };
  if (now < value.validFrom) return { allowed: false, reason: 'not_yet_valid' };
  if (now >= value.validUntil) return { allowed: false, reason: 'expired' };
  if (authorizationDigest(value.authorizationText) !== value.authorizationSha256)
    return { allowed: false, reason: 'document_integrity' };
  if (!value.scope.assets.some(matches)) return { allowed: false, reason: 'out_of_scope' };
  if (
    !value.scope.actions.includes(value.action) ||
    !isEngagementActionCompatible(value.target.kind, value.action)
  ) {
    return { allowed: false, reason: 'action_not_allowed' };
  }
  return { allowed: true };
}
