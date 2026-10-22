import { z } from 'zod';
import { engagementTargetSchema } from './engagement.js';

export const INGESTION_IMPORTER_VERSION = 'bump-ingestion-v1';
export const INGESTION_MAX_SOURCE_BYTES = 524_288;
export const INGESTION_MAX_OBSERVATIONS = 1_000;
export const INGESTION_TENANT_QUOTA_BYTES = 67_108_864;
export const auditFormatSchema = z.enum(['bump-json-v1', 'sarif-2.1.0', 'cyclonedx-1.6-json']);
export type AuditFormat = z.infer<typeof auditFormatSchema>;

function wellFormed(value: string): boolean {
  return !value.includes('\u0000') && Buffer.from(value, 'utf8').toString('utf8') === value;
}
const text = (max: number) => z.string().min(1).max(max).refine(wellFormed);
const shortText = text(512);
const description = text(8_192);
const severity = z.enum(['unknown', 'info', 'low', 'medium', 'high', 'critical']);
const sourceLevel = z.enum(['none', 'note', 'warning', 'error']);
const component = z.strictObject({
  name: shortText,
  version: text(256).optional(),
  purl: text(2_048).optional(),
});
export const canonicalObservationSchema = z
  .strictObject({
    kind: z.enum(['issue', 'component']),
    title: shortText,
    description: description.optional(),
    reportedSeverity: severity,
    sourceLevel: sourceLevel.optional(),
    ruleId: text(256).optional(),
    location: z
      .strictObject({
        uriText: text(2_048),
        startLine: z.number().int().min(1).max(2_147_483_647).optional(),
      })
      .optional(),
    component: component.optional(),
    sourcePointer: text(512).regex(/^(?:\/(?:[^~\u0000-\u001f\u007f]|~[01])*)*$/),
  })
  .refine((value) => (value.kind === 'component') === Boolean(value.component), {
    message: 'Component observations require component inventory data',
  });
export type CanonicalObservation = z.infer<typeof canonicalObservationSchema>;

const sourceTextSchema = z
  .string()
  .min(1)
  .max(INGESTION_MAX_SOURCE_BYTES)
  .refine(
    (value) => wellFormed(value) && Buffer.byteLength(value, 'utf8') <= INGESTION_MAX_SOURCE_BYTES,
    'Source must be bounded well-formed UTF-8',
  );
export const auditImportInputSchema = z.strictObject({
  engagementId: z.uuid().transform((value) => value.toLowerCase()),
  expectedRevision: z.number().int().min(1).max(2_147_483_646),
  target: engagementTargetSchema,
  format: auditFormatSchema,
  sourceName: text(255).refine((value) => !/[\/\\\u0000-\u001f\u007f]/.test(value)),
  sourceText: sourceTextSchema,
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
});
export type AuditImportInput = z.infer<typeof auditImportInputSchema>;

const bumpSource = z.strictObject({
  version: z.literal(1),
  observations: z.array(canonicalObservationSchema).max(INGESTION_MAX_OBSERVATIONS),
});
const sarifMessage = z.object({ text: description });
const sarifSource = z.object({
  version: z.literal('2.1.0'),
  runs: z
    .array(
      z.object({
        tool: z.object({
          driver: z.object({
            name: shortText,
            rules: z
              .array(
                z.object({
                  id: text(256),
                  name: shortText.optional(),
                  shortDescription: z.object({ text: shortText }).optional(),
                }),
              )
              .max(INGESTION_MAX_OBSERVATIONS)
              .default([]),
          }),
        }),
        results: z
          .array(
            z.object({
              ruleId: text(256).optional(),
              ruleIndex: z
                .number()
                .int()
                .min(0)
                .max(INGESTION_MAX_OBSERVATIONS - 1)
                .optional(),
              level: sourceLevel.optional(),
              message: sarifMessage,
              locations: z
                .array(
                  z.object({
                    physicalLocation: z.object({
                      artifactLocation: z.object({ uri: text(2_048) }),
                      region: z
                        .object({
                          startLine: z.number().int().min(1).max(2_147_483_647).optional(),
                        })
                        .optional(),
                    }),
                  }),
                )
                .max(100)
                .optional(),
            }),
          )
          .max(INGESTION_MAX_OBSERVATIONS)
          .default([]),
      }),
    )
    .max(100),
});
const cycloneSource = z.object({
  bomFormat: z.literal('CycloneDX'),
  specVersion: z.literal('1.6'),
  components: z.array(z.unknown()).max(INGESTION_MAX_OBSERVATIONS).default([]),
});
const cycloneComponent = z.object({
  type: z.enum([
    'application',
    'framework',
    'library',
    'container',
    'platform',
    'operating-system',
    'device',
    'device-driver',
    'firmware',
    'file',
    'machine-learning-model',
    'data',
    'cryptographic-asset',
  ]),
  name: shortText,
  version: text(256).optional(),
  purl: text(2_048).optional(),
  description: description.optional(),
  components: z.array(z.unknown()).max(INGESTION_MAX_OBSERVATIONS).default([]),
});

function checkJsonBounds(input: unknown): void {
  const pending: { value: unknown; depth: number }[] = [{ value: input, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const current = pending.pop();
    if (!current) break;
    if (++nodes > 25_000 || current.depth > 32) throw new Error();
    if (typeof current.value === 'string' && !wellFormed(current.value)) throw new Error();
    if (current.value !== null && typeof current.value === 'object') {
      for (const [key, value] of Object.entries(current.value)) {
        if (!wellFormed(key)) throw new Error();
        pending.push({ value, depth: current.depth + 1 });
      }
    }
  }
}

export function parseAuditSource(format: AuditFormat, sourceText: string): CanonicalObservation[] {
  try {
    auditFormatSchema.parse(format);
    const input: unknown = JSON.parse(sourceTextSchema.parse(sourceText));
    checkJsonBounds(input);
    if (format === 'bump-json-v1') return bumpSource.parse(input).observations;
    const observations: CanonicalObservation[] = [];
    if (format === 'sarif-2.1.0') {
      const source = sarifSource.parse(input);
      for (const [runIndex, run] of source.runs.entries()) {
        const rules = run.tool.driver.rules;
        if (new Set(rules.map((rule) => rule.id)).size !== rules.length) throw new Error();
        for (const [resultIndex, result] of run.results.entries()) {
          const rule =
            result.ruleIndex === undefined
              ? rules.find((candidate) => candidate.id === result.ruleId)
              : rules[result.ruleIndex];
          if (
            (result.ruleIndex !== undefined && !rule) ||
            (result.ruleId !== undefined && rules.length > 0 && rule?.id !== result.ruleId)
          )
            throw new Error();
          const location = result.locations?.[0]?.physicalLocation;
          observations.push(
            canonicalObservationSchema.parse({
              kind: 'issue',
              title:
                rule?.shortDescription?.text ??
                rule?.name ??
                rule?.id ??
                result.message.text.slice(0, 512).replace(/[\ud800-\udbff]$/, ''),
              description: result.message.text,
              reportedSeverity: 'unknown',
              ...(result.level === undefined ? {} : { sourceLevel: result.level }),
              ...((result.ruleId ?? rule?.id) === undefined
                ? {}
                : { ruleId: result.ruleId ?? rule?.id }),
              ...(location === undefined
                ? {}
                : {
                    location: {
                      uriText: location.artifactLocation.uri,
                      ...(location.region?.startLine === undefined
                        ? {}
                        : { startLine: location.region.startLine }),
                    },
                  }),
              sourcePointer: `/runs/${runIndex}/results/${resultIndex}`,
            }),
          );
          if (observations.length > INGESTION_MAX_OBSERVATIONS) throw new Error();
        }
      }
    } else {
      const source = cycloneSource.parse(input);
      const pending = source.components
        .map((value, index) => ({ value, pointer: `/components/${index}` }))
        .reverse();
      while (pending.length) {
        const current = pending.pop();
        if (!current) break;
        const value = cycloneComponent.parse(current.value);
        observations.push(
          canonicalObservationSchema.parse({
            kind: 'component',
            title: value.name,
            reportedSeverity: 'unknown',
            ...(value.description === undefined ? {} : { description: value.description }),
            component: {
              name: value.name,
              ...(value.version === undefined ? {} : { version: value.version }),
              ...(value.purl === undefined ? {} : { purl: value.purl }),
            },
            sourcePointer: current.pointer,
          }),
        );
        if (observations.length > INGESTION_MAX_OBSERVATIONS) throw new Error();
        for (let index = value.components.length - 1; index >= 0; index--)
          pending.push({
            value: value.components[index],
            pointer: `${current.pointer}/components/${index}`,
          });
      }
    }
    return observations;
  } catch {
    throw Object.assign(new Error('Invalid audit source'), { statusCode: 400 });
  }
}
