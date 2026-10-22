import { describe, expect, it } from 'vitest';
import {
  auditImportInputSchema,
  canonicalObservationSchema,
  parseAuditSource,
} from './ingestion.js';

const issue = {
  kind: 'issue',
  title: 'Synthetic observation',
  reportedSeverity: 'unknown',
  sourcePointer: '/observations/0',
};
const submission = {
  engagementId: '123E4567-E89B-42D3-A456-426614174000',
  expectedRevision: 1,
  target: { kind: 'hostname', value: 'EXAMPLE.TEST' },
  format: 'bump-json-v1',
  sourceName: 'synthetic.json',
  sourceText: JSON.stringify({ version: 1, observations: [issue] }),
  idempotencyKey: 'synthetic-import_1',
};
const sarif = {
  version: '2.1.0',
  runs: [
    {
      tool: {
        driver: {
          name: 'Synthetic analyzer',
          rules: [{ id: 'SYN001', shortDescription: { text: 'Synthetic rule' } }],
        },
      },
      results: [
        {
          ruleId: 'SYN001',
          ruleIndex: 0,
          level: 'error',
          message: { text: 'Synthetic detail' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'file:///synthetic.ts' },
                region: { startLine: 2 },
              },
            },
          ],
        },
      ],
    },
  ],
};

describe('passive ingestion contracts', () => {
  it('rejects NUL in canonical strings and the source name before persistence', () => {
    for (const change of [
      { title: 'Synthetic\u0000title' },
      { description: 'Synthetic\u0000detail' },
      { ruleId: 'SYN\u0000' },
      { location: { uriText: 'synthetic\u0000.ts' } },
      { kind: 'component', component: { name: 'Synthetic\u0000component' } },
      { kind: 'component', component: { name: 'Synthetic', version: '1\u0000' } },
      { kind: 'component', component: { name: 'Synthetic', purl: 'pkg:npm/synthetic\u0000' } },
    ])
      expect(canonicalObservationSchema.safeParse({ ...issue, ...change }).success).toBe(false);
    expect(
      auditImportInputSchema.safeParse({ ...submission, sourceName: 'source\u0000.json' }).success,
    ).toBe(false);
  });

  it.each([
    ['bump-json-v1', { version: 1, observations: [{ ...issue, title: 'Synthetic\u0000title' }] }],
    [
      'sarif-2.1.0',
      {
        version: '2.1.0',
        runs: [
          {
            tool: { driver: { name: 'Synthetic' } },
            results: [{ message: { text: 'Synthetic\u0000detail' } }],
          },
        ],
      },
    ],
    [
      'cyclonedx-1.6-json',
      {
        bomFormat: 'CycloneDX',
        specVersion: '1.6',
        components: [{ type: 'library', name: 'Synthetic\u0000component' }],
      },
    ],
    ['sarif-2.1.0', { ...sarif, extension: 'Synthetic\u0000extension' }],
    [
      'cyclonedx-1.6-json',
      { bomFormat: 'CycloneDX', specVersion: '1.6', components: [], ['Synthetic\u0000key']: true },
    ],
  ] as const)(
    'rejects escaped NUL in %s source values and keys with a generic error',
    (format, source) => {
      expect(() => parseAuditSource(format, JSON.stringify(source))).toThrow(
        'Invalid audit source',
      );
    },
  );

  it('preserves bounded canonical observations without adding a security verdict', () => {
    expect(parseAuditSource('bump-json-v1', submission.sourceText)).toEqual([issue]);
    expect(parseAuditSource('bump-json-v1', '{"version":1,"observations":[]}')).toEqual([]);
    expect(canonicalObservationSchema.safeParse({ ...issue, riskScore: 10 }).success).toBe(false);
    expect(canonicalObservationSchema.safeParse({ ...issue, title: 'x'.repeat(513) }).success).toBe(
      false,
    );
  });

  it('canonicalizes submission scope and excludes server-owned provenance fields', () => {
    expect(auditImportInputSchema.parse(submission)).toMatchObject({
      engagementId: '123e4567-e89b-42d3-a456-426614174000',
      target: { value: 'example.test' },
    });
    for (const change of [
      { organizationId: submission.engagementId },
      { sourceName: '../source.json' },
      { sourceName: 'source\n.json' },
      { expectedRevision: 0 },
      { format: 'xml' },
      { sourceText: '\ud800' },
      { sourceText: 'é'.repeat(262145) },
    ]) {
      expect(auditImportInputSchema.safeParse({ ...submission, ...change }).success).toBe(false);
    }
  });

  it('retains SARIF levels as source metadata and validates consumed rule references', () => {
    expect(parseAuditSource('sarif-2.1.0', JSON.stringify(sarif))).toEqual([
      {
        kind: 'issue',
        title: 'Synthetic rule',
        description: 'Synthetic detail',
        reportedSeverity: 'unknown',
        sourceLevel: 'error',
        ruleId: 'SYN001',
        location: { uriText: 'file:///synthetic.ts', startLine: 2 },
        sourcePointer: '/runs/0/results/0',
      },
    ]);
    for (const result of [
      { ruleIndex: 1, message: { text: 'Synthetic' } },
      { ruleId: 'other', ruleIndex: 0, message: { text: 'Synthetic' } },
      { ruleId: 'other', message: { text: 'Synthetic' } },
      { level: 'critical', message: { text: 'Synthetic' } },
    ]) {
      expect(() =>
        parseAuditSource(
          'sarif-2.1.0',
          JSON.stringify({ ...sarif, runs: [{ ...sarif.runs[0], results: [result] }] }),
        ),
      ).toThrow();
    }
    expect(
      parseAuditSource(
        'sarif-2.1.0',
        '{"version":"2.1.0","runs":[{"tool":{"driver":{"name":"Synthetic"}},"results":[]}]}',
      ),
    ).toEqual([]);
  });

  it('bounds a SARIF message title without splitting a Unicode scalar', () => {
    const source = {
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'Synthetic' } },
          results: [{ message: { text: `${'x'.repeat(511)}😀` } }],
        },
      ],
    };
    expect(parseAuditSource('sarif-2.1.0', JSON.stringify(source))[0]?.title).toBe('x'.repeat(511));
  });

  it('imports nested CycloneDX components as inventory with generated provenance', () => {
    expect(
      parseAuditSource(
        'cyclonedx-1.6-json',
        JSON.stringify({
          bomFormat: 'CycloneDX',
          specVersion: '1.6',
          components: [
            {
              type: 'application',
              name: 'Synthetic app',
              version: '1',
              components: [
                { type: 'library', name: 'Synthetic library', purl: 'pkg:npm/synthetic@1' },
              ],
            },
          ],
        }),
      ),
    ).toEqual([
      {
        kind: 'component',
        title: 'Synthetic app',
        reportedSeverity: 'unknown',
        component: { name: 'Synthetic app', version: '1' },
        sourcePointer: '/components/0',
      },
      {
        kind: 'component',
        title: 'Synthetic library',
        reportedSeverity: 'unknown',
        component: { name: 'Synthetic library', purl: 'pkg:npm/synthetic@1' },
        sourcePointer: '/components/0/components/0',
      },
    ]);
    expect(() =>
      parseAuditSource(
        'cyclonedx-1.6-json',
        '{"bomFormat":"CycloneDX","specVersion":"1.5","components":[]}',
      ),
    ).toThrow();
    expect(() =>
      parseAuditSource(
        'cyclonedx-1.6-json',
        '{"bomFormat":"CycloneDX","specVersion":"1.6","components":[{"name":"Synthetic"}]}',
      ),
    ).toThrow();
  });

  it('rejects oversized, excessive, deep and malformed sources with generic errors', () => {
    let deep: unknown = {};
    for (let i = 0; i < 33; i++) deep = { nested: deep };
    for (const sourceText of [
      '{"private-synthetic-marker":',
      ' '.repeat(524289),
      `{"version":1,"observations":[],"metadata":${JSON.stringify(deep)}}`,
      `{"version":1,"observations":[],"metadata":${JSON.stringify(Array(25001).fill(null))}}`,
      JSON.stringify({ version: 1, observations: Array(1001).fill(issue) }),
      '{"version":1,"observations":[{"kind":"issue","title":"\\ud800","reportedSeverity":"unknown","sourcePointer":"/observations/0"}]}',
    ]) {
      try {
        parseAuditSource('bump-json-v1', sourceText);
        expect.unreachable('Invalid source accepted');
      } catch (error) {
        expect(error).toMatchObject({ statusCode: 400, message: 'Invalid audit source' });
        expect(JSON.stringify(error)).not.toContain('private-synthetic-marker');
      }
    }
  });
});
