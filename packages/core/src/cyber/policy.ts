import { createHash } from 'node:crypto';
import type { CyberObservation } from '@bump/contracts';
import { z } from 'zod';

export function cyberFingerprint(input: {
  assetId: string;
  ruleId: string;
  component: string;
  affectedVersion: string;
  location: string;
  cve: string | null;
}) {
  const identity =
    input.cve && input.component
      ? [input.assetId, input.component, input.affectedVersion, input.cve]
      : [input.assetId, input.component, input.affectedVersion, input.ruleId, input.location];
  return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}
const riskSchema = z.strictObject({
  severity: z.enum(['unknown', 'info', 'low', 'medium', 'high', 'critical']),
  cvss: z.number().min(0).max(10).nullable(),
  epss: z.number().min(0).max(1).nullable(),
  kev: z.boolean().nullable(),
  exposure: z.enum(['public', 'internal', 'restricted']),
  criticality: z.number().int().min(1).max(5),
  confidence: z.enum(['low', 'medium', 'high']),
  humanAdjustment: z.number().int().min(-20).max(20),
  compensatingControls: z.boolean(),
});
export function prioritizeCyber(input: z.infer<typeof riskSchema>) {
  const v = riskSchema.parse(input);
  const base =
    v.cvss ?? { unknown: 0, info: 0, low: 2, medium: 5, high: 8, critical: 10 }[v.severity];
  const exposure = { public: 10, internal: 3, restricted: 0 }[v.exposure];
  const confidence = { low: 0.6, medium: 0.8, high: 1 }[v.confidence];
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (base * 6 + exposure + v.criticality * 3 + (v.epss ?? 0) * 10 + (v.kev ? 10 : 0)) *
          confidence +
          (v.compensatingControls ? -10 : 0) +
          v.humanAdjustment,
      ),
    ),
  );
  return {
    score,
    factors: [
      `Technical base: ${base} × 6`,
      `Exposure: +${exposure}`,
      `Business criticality: ${v.criticality} × 3`,
      `EPSS: ${v.epss === null ? 'unknown' : v.epss}`,
      `KEV: ${v.kev === null ? 'unknown' : v.kev}`,
      `Confidence: ×${confidence}`,
      `Compensating controls: ${v.compensatingControls ? '-10' : '0'}`,
      `Human adjustment: ${v.humanAdjustment}`,
    ],
  };
}
export function compareCyberCoverage(
  before: string[],
  after: string[],
  previous: string[],
  current: string[],
) {
  return {
    coverageReduced: before.some((k) => !after.includes(k)),
    removedCoverage: before.filter((k) => !after.includes(k)),
    addedCoverage: after.filter((k) => !before.includes(k)),
    newFindings: current.filter((k) => !previous.includes(k)),
    persistent: current.filter((k) => previous.includes(k)),
    notObserved: previous.filter((k) => !current.includes(k)),
  };
}
export function engineAction(engine: CyberObservation['engine']) {
  return (
    {
      semgrep: 'code.scan',
      trivy: 'dependencies.scan',
      gitleaks: 'secrets.scan',
      'web-passive': 'configuration.read',
      json: 'audit.import',
      sarif: 'audit.import',
    } as const
  )[engine];
}
