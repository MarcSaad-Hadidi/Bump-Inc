import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ReportForm, RetestForm, retestAuditCandidates } from './review';
import type { Snapshot } from './types';

const at = '2026-11-01T12:00:00.000Z';
const finding: Snapshot['findings'][number] = {
  id: 'synthetic-finding',
  organizationId: 'synthetic-org',
  clientId: 'client-a',
  assetId: 'asset-a',
  firstAuditId: 'audit-original',
  lastAuditId: 'audit-original',
  fingerprint: 'a'.repeat(64),
  status: 'confirmed',
  businessImpact: 'Synthetic impact',
  recommendation: 'Synthetic remediation',
  humanAdjustment: 0,
  compensatingControls: false,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: at,
  updatedAt: at,
  priority: { score: 20, factors: [] },
  observation: {
    engine: 'json',
    engineVersion: 'synthetic-import-1',
    ruleId: 'synthetic.rule',
    title: 'Synthetic finding',
    severity: 'low',
    confidence: 'medium',
    location: '',
    component: '',
    affectedVersion: '',
    fixedVersion: '',
    cve: null,
    cvss: null,
    references: [],
    evidence: 'Synthetic minimized evidence',
    recommendation: 'Synthetic recommendation',
  },
};
function audit(id: string, clientId = 'client-a'): Snapshot['audits'][number] {
  return {
    id,
    clientId,
    organizationId: 'synthetic-org',
    mandateId: 'synthetic-mandate',
    requestedBy: 'synthetic-reviewer',
    title: id,
    idempotencyKey: id,
    requestHash: 'a'.repeat(64),
    createdAt: at,
  };
}
function scan(
  auditId: string,
  status: Snapshot['scans'][number]['status'],
  assetId = 'asset-a',
  clientId = 'client-a',
): Snapshot['scans'][number] {
  return {
    scan: {
      id: `${auditId}-${assetId}-${status}`,
      organizationId: 'synthetic-org',
      clientId,
      auditId,
      assetId,
      sourceId: null,
      executionJobId: `${auditId}-job`,
      engine: 'json',
      engineVersion: 'synthetic-import-1',
      stage: 'completed',
      observationCount: null,
      coverageHash: null,
      createdAt: at,
    },
    status,
    errorCode: null,
    attempt: 1,
    startedAt: at,
    finishedAt: at,
    cancelRequestedAt: null,
  };
}
function snapshot(audits: Snapshot['audits'], scans: Snapshot['scans']): Snapshot {
  return {
    role: 'reviewer',
    stats: { clients: 1, ongoing: 0, completed: 1, critical: 0, fixed: 0, failed: 1, to_review: 0 },
    clients: [],
    assets: [],
    mandates: [],
    audits,
    scans,
    sources: [],
    findings: [finding],
    tasks: [],
    retests: [],
    reports: [],
    events: [],
    limits: { clients: 200, audits: 200, findings: 1000, scans: 2000 },
  };
}

it('offers failed, denied and cancelled asset audits for an inconclusive retest', () => {
  const data = snapshot(
    ['succeeded', 'dead_letter', 'denied', 'cancelled'].map((status) => audit(`audit-${status}`)),
    (['succeeded', 'dead_letter', 'denied', 'cancelled'] as const).map((status) =>
      scan(`audit-${status}`, status),
    ),
  );
  const html = renderToStaticMarkup(
    createElement(RetestForm, {
      data,
      locale: 'en',
      mutate: vi.fn(),
      close: vi.fn(),
      findingId: finding.id,
    }),
  );
  for (const candidate of data.audits) expect(html).toContain(`<option value="${candidate.id}">`);
});

it.each(['present', 'absent'] as const)(
  'offers only successful asset scans for a %s conclusion',
  (conclusion) => {
    const data = snapshot(
      ['succeeded', 'dead_letter', 'denied', 'cancelled', 'mixed'].map((status) =>
        audit(`audit-${status}`),
      ),
      [
        ...(['succeeded', 'dead_letter', 'denied', 'cancelled'] as const).map((status) =>
          scan(`audit-${status}`, status),
        ),
        scan('audit-mixed', 'succeeded'),
        scan('audit-mixed', 'cancelled'),
      ],
    );
    expect(
      retestAuditCandidates(data, finding, conclusion).map((candidate) => candidate.id),
    ).toEqual(['audit-succeeded']);
  },
);

it.each(['queued', 'running', 'retry_wait'] as const)(
  'excludes a still-%s asset audit even for an inconclusive conclusion',
  (status) => {
    const data = snapshot(
      [audit('audit-active')],
      [scan('audit-active', 'succeeded'), scan('audit-active', status)],
    );
    expect(retestAuditCandidates(data, finding, 'inconclusive')).toEqual([]);
  },
);

it('keeps retest candidates scoped to this finding’s client and asset with a recorded scan', () => {
  const data = snapshot(
    [
      audit('audit-other-client', 'client-b'),
      audit('audit-other-asset'),
      audit('audit-foreign-scan'),
      audit('audit-no-scan'),
      audit('audit-matching'),
    ],
    [
      scan('audit-other-client', 'succeeded', 'asset-a', 'client-b'),
      scan('audit-other-asset', 'cancelled', 'asset-b'),
      scan('audit-foreign-scan', 'succeeded', 'asset-a', 'client-b'),
      scan('audit-matching', 'cancelled'),
      scan('audit-matching', 'running', 'asset-b'),
    ],
  );
  expect(
    retestAuditCandidates(data, finding, 'inconclusive').map((candidate) => candidate.id),
  ).toEqual(['audit-matching']);
  expect(retestAuditCandidates(data, undefined, 'inconclusive')).toEqual([]);
});

it('offers terminal audits including mixed successful and failed scans in report creation', () => {
  const data = snapshot(
    ['succeeded', 'dead_letter', 'denied', 'cancelled', 'mixed'].map((status) =>
      audit(`audit-${status}`),
    ),
    [
      ...(['succeeded', 'dead_letter', 'denied', 'cancelled'] as const).map((status) =>
        scan(`audit-${status}`, status),
      ),
      scan('audit-mixed', 'succeeded'),
      scan('audit-mixed', 'dead_letter'),
    ],
  );
  const html = renderToStaticMarkup(
    createElement(ReportForm, {
      data,
      locale: 'en',
      mutate: vi.fn(),
      close: vi.fn(),
      created: vi.fn(),
    }),
  );
  for (const candidate of data.audits) expect(html).toContain(`<option value="${candidate.id}">`);
});

it.each(['queued', 'running', 'retry_wait'] as const)(
  'excludes audits with a %s scan and audits without scans from report creation',
  (status) => {
    const data = snapshot(
      [audit('audit-active'), audit('audit-mixed-active'), audit('audit-no-scan')],
      [
        scan('audit-active', status),
        scan('audit-mixed-active', 'succeeded'),
        scan('audit-mixed-active', status),
      ],
    );
    const html = renderToStaticMarkup(
      createElement(ReportForm, {
        data,
        locale: 'en',
        mutate: vi.fn(),
        close: vi.fn(),
        created: vi.fn(),
      }),
    );
    for (const candidate of data.audits)
      expect(html).not.toContain(`<option value="${candidate.id}">`);
  },
);
