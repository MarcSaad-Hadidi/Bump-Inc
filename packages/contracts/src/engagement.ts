import { isIP } from 'node:net';
import { z } from 'zod';

const hostname = z
  .string()
  .min(1)
  .max(253)
  .refine((value) => {
    if (!value.split('.').every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label)))
      return false;
    if (!URL.canParse(`http://${value}`)) return false;
    const parsed = new URL(`http://${value}`).hostname;
    // Reject IP literals and alternate numeric URL forms, including octal/hex hosts.
    return parsed === value.toLowerCase() && isIP(parsed) === 0;
  }, 'Must be an ASCII hostname without a trailing dot or IP literal')
  .transform((value) => value.toLowerCase());

const ip = z
  .string()
  .min(1)
  .max(45)
  .refine((value) => {
    if (isIP(value) === 4) return true;
    if (isIP(value) !== 6 || value.includes('%') || !URL.canParse(`http://[${value}]/`))
      return false;
    return !new URL(`http://[${value}]/`).hostname.startsWith('[::ffff:');
  }, 'Must be an IPv4 or IPv6 address; mapped IPv4 and zone identifiers are unsupported')
  .transform((value) =>
    isIP(value) === 4 ? value : new URL(`http://[${value}]/`).hostname.slice(1, -1),
  );

// The accepted repository string is a literal GitHub owner/name, never a URL.
const repository = z
  .string()
  .min(3)
  .max(140)
  .refine((value) => {
    const parts = value.split('/');
    const [owner, name] = parts;
    return (
      parts.length === 2 &&
      !/\s/.test(value) &&
      owner !== undefined &&
      name !== undefined &&
      /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner) &&
      !owner.includes('--') &&
      /^[a-z\d._-]{1,100}$/i.test(name) &&
      name !== '.' &&
      name !== '..' &&
      !name.toLowerCase().endsWith('.git')
    );
  }, 'Must be a literal GitHub owner/name')
  .transform((value) => value.toLowerCase());

export const engagementTargetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('hostname'), value: hostname }),
  z.strictObject({ kind: z.literal('ip'), value: ip }),
  z.strictObject({ kind: z.literal('repository'), value: repository }),
]);
export const engagementActionSchema = z.enum([
  'configuration.read',
  'network.scan',
  'repository.read',
  'code.scan',
  'dependencies.scan',
  'secrets.scan',
  'audit.import',
]);
export type EngagementTarget = z.infer<typeof engagementTargetSchema>;
export type EngagementAction = z.infer<typeof engagementActionSchema>;

export function isEngagementActionCompatible(
  kind: EngagementTarget['kind'],
  action: EngagementAction,
): boolean {
  if (action === 'audit.import') return true;
  return kind === 'repository'
    ? ['repository.read', 'code.scan', 'dependencies.scan', 'secrets.scan'].includes(action)
    : ['configuration.read', 'network.scan'].includes(action);
}

export const engagementScopeSchema = z
  .strictObject({
    assets: z.array(engagementTargetSchema).min(1).max(100),
    actions: z.array(engagementActionSchema).min(1).max(20),
    exclusions: z.array(engagementTargetSchema).max(100),
  })
  .superRefine((scope, ctx) => {
    for (const field of ['assets', 'exclusions'] as const) {
      const keys = scope[field].map((target) => `${target.kind}:${target.value}`);
      if (new Set(keys).size !== keys.length)
        ctx.addIssue({ code: 'custom', path: [field], message: 'Duplicate canonical targets' });
    }
    if (new Set(scope.actions).size !== scope.actions.length)
      ctx.addIssue({ code: 'custom', path: ['actions'], message: 'Duplicate actions' });
    for (const action of scope.actions) {
      if (!scope.assets.some((asset) => isEngagementActionCompatible(asset.kind, action))) {
        ctx.addIssue({
          code: 'custom',
          path: ['actions'],
          message: 'Action has no compatible declared asset',
        });
      }
    }
  });
export type EngagementScope = z.infer<typeof engagementScopeSchema>;

export const engagementRevisionInputSchema = z
  .strictObject({
    objective: z.string().trim().min(1).max(2000),
    responsibleUserId: z.uuid(),
    scope: engagementScopeSchema,
    authorizationText: z
      .string()
      .min(10)
      .max(20000)
      .refine((value) => value.trim().length >= 10),
    sourceReference: z
      .string()
      .min(1)
      .max(512)
      .refine(
        (value) => !/[\u0000-\u001f\u007f]/.test(value),
        'Must not contain control characters',
      )
      .optional(),
    validFrom: z.iso.datetime({ offset: true }),
    validUntil: z.iso.datetime({ offset: true }),
  })
  .refine((input) => Date.parse(input.validFrom) < Date.parse(input.validUntil), {
    path: ['validUntil'],
    message: 'Validity must end after it starts',
  });
export type EngagementRevisionInput = z.infer<typeof engagementRevisionInputSchema>;
