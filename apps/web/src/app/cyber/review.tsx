'use client';

import { useEffect, useRef, useState } from 'react';
import type { Mutation } from './forms';
import { copy, type Locale, label } from './i18n';
import { api, type FindingDetail, type ReportDetail, type Snapshot } from './types';
import {
  Badge,
  Check,
  date,
  Empty,
  errorMessage,
  Field,
  Form,
  formText,
  Icon,
  iso,
  Note,
  useAction,
} from './ui';

export type Read = <T>(path: string) => Promise<T>;
type Finding = Snapshot['findings'][number];
export function useResource<T>(path: string, read: Read, locale: Locale) {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setError('');
    setValue(null);
    read<T>(path)
      .then((result) => {
        if (live) setValue(result);
      })
      .catch((e) => {
        if (live && !(e instanceof Error && e.name === 'AbortError'))
          setError(errorMessage(e, locale));
      });
    return () => {
      live = false;
    };
  }, [path, read, revision, locale]);
  return { value, error, retry: () => setRevision(revision + 1) };
}

function ResourceState({
  error,
  retry,
  locale,
}: {
  error: string;
  retry: () => void;
  locale: Locale;
}) {
  return error ? (
    <div className="cyber-load-error">
      <div className="cyber-error" role="alert">
        {error}
      </div>
      <button className="cyber-button secondary" onClick={retry}>
        {copy[locale].refresh}
      </button>
    </div>
  ) : (
    <div className="cyber-empty">
      <span className="cyber-spinner" />
      <p>{copy[locale].loading}</p>
    </div>
  );
}

export function FindingPanel({
  id,
  data,
  locale,
  read,
  mutate,
  task,
  retest,
}: {
  id: string;
  data: Snapshot;
  locale: Locale;
  read: Read;
  mutate: Mutation;
  task: (id: string) => void;
  retest: (id: string) => void;
}) {
  const resource = useResource<FindingDetail>(`findings/${id}`, read, locale);
  const t = copy[locale];
  const [tab, setTab] = useState<'detail' | 'review' | 'history'>('detail');
  const action = useAction(locale);
  const [saved, setSaved] = useState(false);
  if (!resource.value)
    return <ResourceState error={resource.error} retry={resource.retry} locale={locale} />;
  const { finding: f, observations, history } = resource.value;
  const summary = data.findings.find((item) => item.id === id);
  const o = f.observation;
  const canReview = data.role !== 'analyst';
  const canTask =
    ['confirmed', 'planned', 'in_progress', 'to_retest'].includes(f.status) &&
    data.role !== 'reviewer';
  return (
    <div className="cyber-finding-detail">
      <div className="cyber-detail-heading">
        <div>
          <Badge value={o.severity} locale={locale} />
          <Badge value={f.status} locale={locale} />
          <h3>{o.title}</h3>
          <p>
            {data.clients.find((c) => c.id === f.clientId)?.name} <span> / </span>{' '}
            {data.assets.find((a) => a.id === f.assetId)?.label}
          </p>
        </div>
        <div className="cyber-risk-score">
          <strong>{summary?.priority.score ?? '—'}</strong>
          <span>{t.priority} / 100</span>
        </div>
      </div>
      <nav className="cyber-tabs" aria-label={t.detail}>
        {(['detail', 'review', 'history'] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-current={tab === value ? 'page' : undefined}
            onClick={() => setTab(value)}
          >
            {value === 'review' ? t.validation : t[value]}
          </button>
        ))}
      </nav>
      {tab === 'detail' && (
        <>
          <dl className="cyber-detail-grid">
            <div>
              <dt>{t.engine}</dt>
              <dd>
                {o.engine} · {o.engineVersion}
              </dd>
            </div>
            <div>
              <dt>CVSS</dt>
              <dd>{o.cvss ?? label('unknown', locale)} / 10</dd>
            </div>
            <div>
              <dt>{t.confidence}</dt>
              <dd>{label(o.confidence, locale)}</dd>
            </div>
            <div>
              <dt>CVE</dt>
              <dd>{o.cve ?? '—'}</dd>
            </div>
            <div>
              <dt>{locale === 'fr' ? 'Composant / version' : 'Component / version'}</dt>
              <dd>
                {o.component || '—'} · {o.affectedVersion || '—'}
              </dd>
            </div>
            <div>
              <dt>{locale === 'fr' ? 'Version corrigée déclarée' : 'Declared fixed version'}</dt>
              <dd>{o.fixedVersion || label('unknown', locale)}</dd>
            </div>
            <div>
              <dt>{locale === 'fr' ? 'Règle' : 'Rule'}</dt>
              <dd>
                <code>{o.ruleId}</code>
              </dd>
            </div>
            <div>
              <dt>{locale === 'fr' ? 'Localisation' : 'Location'}</dt>
              <dd>
                <code>{o.location || '—'}</code>
              </dd>
            </div>
          </dl>
          <h4>{t.evidence}</h4>
          <pre className="cyber-evidence">{o.evidence}</pre>
          <h4>{t.recommendation}</h4>
          <p className="cyber-preserve">{f.recommendation || o.recommendation}</p>
          {f.businessImpact && (
            <>
              <h4>{t.impact}</h4>
              <p className="cyber-preserve">{f.businessImpact}</p>
            </>
          )}
          <details>
            <summary>
              {locale === 'fr' ? 'Comprendre la priorité' : 'Understand the priority'}
            </summary>
            <p className="cyber-muted">{t.riskHelp}</p>
            <ul className="cyber-factor-list">
              {summary?.priority.factors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </details>
          <details>
            <summary>
              {t.observations} ({observations.length})
            </summary>
            {observations.map((item) => (
              <div className="cyber-observation" key={item.id}>
                <strong>
                  {item.data.engine} · {item.data.engineVersion}
                </strong>
                <small>
                  {date(item.createdAt, locale, true)} · audit {item.auditId}
                </small>
                <p className="cyber-preserve">{item.data.evidence}</p>
              </div>
            ))}
          </details>
          {o.references.length > 0 && (
            <details>
              <summary>{locale === 'fr' ? 'Références' : 'References'}</summary>
              <ul>
                {o.references
                  .filter((url) => /^https?:\/\//.test(url))
                  .map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer noopener">
                        {url}
                      </a>
                    </li>
                  ))}
              </ul>
            </details>
          )}
          <div className="cyber-inline-actions">
            {canTask && (
              <button className="cyber-button secondary" onClick={() => task(id)}>
                {t.createTask}
              </button>
            )}
            {canReview && (
              <button className="cyber-button secondary" onClick={() => retest(id)}>
                {t.retest}
              </button>
            )}
          </div>
          <Note>{t.human}</Note>
        </>
      )}
      {tab === 'review' &&
        (canReview ? (
          <Form
            key={f.updatedAt}
            locale={locale}
            label={t.review}
            pending={action.pending}
            error={action.error}
            action={(event) => {
              const form = event.currentTarget;
              setSaved(false);
              void action.run(async () => {
                await mutate(`findings/${id}`, 'PATCH', {
                  status: formText(form, 'status'),
                  note: formText(form, 'note'),
                  businessImpact: formText(form, 'businessImpact'),
                  recommendation: formText(form, 'recommendation'),
                  humanAdjustment: Number(formText(form, 'humanAdjustment')),
                  compensatingControls: new FormData(form).has('controls'),
                });
                setSaved(true);
                resource.retry();
              });
            }}
          >
            <Note>
              {locale === 'fr'
                ? 'Une correction vérifiée exige un retest. La clôture exige une résolution préalable.'
                : 'A verified fix requires a retest. Closure requires a prior resolution.'}
            </Note>
            <Field title={t.validation}>
              <select
                name="status"
                defaultValue={f.status === 'verified_fixed' ? 'to_review' : f.status}
              >
                {[
                  'to_review',
                  'confirmed',
                  'false_positive',
                  'planned',
                  'in_progress',
                  'to_retest',
                  'accepted_risk',
                  ...(['false_positive', 'verified_fixed', 'accepted_risk', 'closed'].includes(
                    f.status,
                  )
                    ? ['closed']
                    : []),
                ].map((status) => (
                  <option value={status} key={status}>
                    {label(status, locale)}
                  </option>
                ))}
              </select>
            </Field>
            <Field title={t.impact}>
              <textarea
                name="businessImpact"
                defaultValue={f.businessImpact}
                maxLength={4000}
                rows={3}
                required
              />
            </Field>
            <Field title={t.recommendation}>
              <textarea
                name="recommendation"
                defaultValue={f.recommendation || o.recommendation}
                maxLength={4000}
                rows={3}
                required
              />
            </Field>
            <Field title={t.note}>
              <textarea name="note" maxLength={4000} rows={3} required />
            </Field>
            <Field title={t.adjustment}>
              <input
                type="number"
                name="humanAdjustment"
                min={-20}
                max={20}
                defaultValue={f.humanAdjustment}
                required
              />
            </Field>
            <Check name="controls" defaultChecked={f.compensatingControls}>
              {t.controls}
            </Check>
            {saved && <p role="status">{t.saveSuccess}</p>}
          </Form>
        ) : (
          <Note>
            {locale === 'fr'
              ? 'La revue exige le rôle consultant, réviseur ou administrateur.'
              : 'Review requires consultant, reviewer or administrator access.'}
          </Note>
        ))}
      {tab === 'history' &&
        (history.length ? (
          <ol className="cyber-timeline">
            {history.map((event) => (
              <li key={event.id}>
                <strong>
                  {label(event.action.replace('finding.', '').replace('retest.', ''), locale)}
                </strong>
                <small>
                  {date(event.createdAt, locale, true)} · {event.actorId}
                </small>
                {event.detail && <p>{event.detail}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <Empty>{t.empty}</Empty>
        ))}
    </div>
  );
}

export function TaskForm({
  data,
  locale,
  mutate,
  close,
  findingId,
  taskId,
}: {
  data: Snapshot;
  locale: Locale;
  mutate: Mutation;
  close: () => void;
  findingId?: string;
  taskId?: string;
}) {
  const t = copy[locale];
  const action = useAction(locale);
  const task = data.tasks.find((item) => item.id === taskId);
  const eligible = data.findings.filter((f) =>
    ['confirmed', 'planned', 'in_progress', 'to_retest'].includes(f.status),
  );
  return (
    <Form
      locale={locale}
      pending={action.pending}
      error={action.error}
      cancel={close}
      action={(event) => {
        const form = event.currentTarget;
        void action.run(async () => {
          if (task)
            await mutate(`tasks/${task.id}`, 'PATCH', {
              status: formText(form, 'status'),
              note: formText(form, 'note'),
            });
          else
            await mutate('tasks', 'POST', {
              findingId: formText(form, 'findingId'),
              assignee: formText(form, 'assignee'),
              dueAt: iso(formText(form, 'dueAt')),
              description: formText(form, 'description'),
            });
          close();
        });
      }}
    >
      {task ? (
        <>
          <p>
            <strong>{data.findings.find((f) => f.id === task.findingId)?.observation.title}</strong>
          </p>
          <Field title={t.state}>
            <select name="status" defaultValue={task.status}>
              {['planned', 'in_progress', 'to_retest'].map((status) => (
                <option value={status} key={status}>
                  {label(status, locale)}
                </option>
              ))}
            </select>
          </Field>
          <Field title={t.note}>
            <textarea name="note" maxLength={4000} required rows={3} />
          </Field>
        </>
      ) : (
        <>
          <Field title={t.findings}>
            <select name="findingId" defaultValue={findingId} required>
              {eligible.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.observation.title}
                </option>
              ))}
            </select>
          </Field>
          {!eligible.length && (
            <Note warning>
              {locale === 'fr'
                ? 'Confirmez d’abord un constat lors de la revue humaine.'
                : 'Confirm a finding during human review first.'}
            </Note>
          )}
          <div className="cyber-two-fields">
            <Field title={t.assignee}>
              <input name="assignee" maxLength={160} required />
            </Field>
            <Field title={t.due}>
              <input name="dueAt" type="datetime-local" required />
            </Field>
          </div>
          <Field title={t.description}>
            <textarea name="description" rows={4} maxLength={4000} required />
          </Field>
        </>
      )}
    </Form>
  );
}

type RetestConclusion = 'present' | 'absent' | 'inconclusive';

export function retestAuditCandidates(
  data: Pick<Snapshot, 'audits' | 'scans'>,
  finding: Pick<Finding, 'clientId' | 'assetId'> | undefined,
  conclusion: RetestConclusion,
) {
  if (!finding) return [];
  return data.audits.filter((audit) => {
    if (audit.clientId !== finding.clientId) return false;
    const assetScans = data.scans.filter(
      (item) =>
        item.scan.auditId === audit.id &&
        item.scan.clientId === finding.clientId &&
        item.scan.assetId === finding.assetId,
    );
    return (
      assetScans.length > 0 &&
      assetScans.every((item) =>
        conclusion === 'inconclusive'
          ? ['succeeded', 'dead_letter', 'denied', 'cancelled'].includes(item.status)
          : item.status === 'succeeded',
      )
    );
  });
}

export function RetestForm({
  data,
  locale,
  mutate,
  close,
  findingId,
}: {
  data: Snapshot;
  locale: Locale;
  mutate: Mutation;
  close: () => void;
  findingId: string;
}) {
  const t = copy[locale];
  const action = useAction(locale);
  const finding = data.findings.find((f) => f.id === findingId);
  const [auditId, setAuditId] = useState('');
  const [conclusion, setConclusion] = useState<RetestConclusion>('inconclusive');
  const audits = retestAuditCandidates(data, finding, conclusion);
  const selectedAuditId = audits.some((audit) => audit.id === auditId) ? auditId : '';
  return (
    <Form
      locale={locale}
      pending={action.pending}
      error={action.error}
      cancel={close}
      label={t.retest}
      action={(event) => {
        if (!selectedAuditId) return;
        const note = formText(event.currentTarget, 'note');
        void action.run(async () => {
          await mutate('retests', 'POST', {
            findingId,
            auditId: selectedAuditId,
            conclusion,
            note,
          });
          close();
        });
      }}
    >
      <p>
        <strong>{finding?.observation.title}</strong>
      </p>
      <Note>
        {t.retestNotice}
        {conclusion === 'inconclusive' && (
          <>
            <br />
            {locale === 'fr'
              ? 'Une analyse en échec, refusée ou annulée peut uniquement étayer une conclusion non concluante.'
              : 'A failed, denied or cancelled scan can only support an inconclusive conclusion.'}
          </>
        )}
      </Note>
      <Field title={t.retestAudit}>
        <select
          required
          value={selectedAuditId}
          onChange={(event) => setAuditId(event.target.value)}
        >
          <option value="">
            {locale === 'fr' ? 'Choisir un audit terminé' : 'Choose a completed audit'}
          </option>
          {audits.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} · {date(a.createdAt, locale)}
            </option>
          ))}
        </select>
      </Field>
      <Field title={t.conclusion}>
        <select
          value={conclusion}
          onChange={(event) => {
            const next = event.target.value as RetestConclusion;
            setConclusion(next);
            if (!retestAuditCandidates(data, finding, next).some((audit) => audit.id === auditId))
              setAuditId('');
          }}
        >
          {(['inconclusive', 'present', 'absent'] as const).map((value) => (
            <option key={value} value={value}>
              {t[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field title={t.note}>
        <textarea name="note" rows={4} maxLength={4000} required />
      </Field>
      <Note>
        {locale === 'fr'
          ? 'Le serveur compare l’actif, le moteur, sa version et l’empreinte de couverture. Une nouvelle observation empêche une conclusion « absent ».'
          : 'The server checks asset, engine, version and coverage digest. A new observation prevents an “absent” conclusion.'}
      </Note>
    </Form>
  );
}

export function ReportForm({
  data,
  locale,
  mutate,
  close,
  created,
}: {
  data: Snapshot;
  locale: Locale;
  mutate: Mutation;
  close: () => void;
  created: (id: string) => void;
}) {
  const t = copy[locale];
  const action = useAction(locale);
  const audits = data.audits.filter((audit) => {
    const scans = data.scans.filter((item) => item.scan.auditId === audit.id);
    return (
      scans.length > 0 &&
      scans.every((item) =>
        ['succeeded', 'dead_letter', 'denied', 'cancelled'].includes(item.status),
      )
    );
  });
  return (
    <Form
      locale={locale}
      pending={action.pending}
      error={action.error}
      cancel={close}
      label={t.createReport}
      action={(event) => {
        const form = event.currentTarget;
        void action.run(async () => {
          const report = await mutate<{ id: string }>('reports', 'POST', {
            auditId: formText(form, 'auditId'),
            locale: formText(form, 'locale'),
            executiveSummary: formText(form, 'executiveSummary'),
            reviewNotes: formText(form, 'reviewNotes'),
          });
          created(report.id);
        });
      }}
    >
      <Note>
        {locale === 'fr'
          ? 'Le rapport fige un audit terminé et les constats revus. Les alertes non confirmées restent exclues de la synthèse publiée.'
          : 'Reports freeze completed audits and reviewed findings. Unconfirmed alerts remain excluded from the published findings.'}
      </Note>
      <div className="cyber-two-fields">
        <Field title={t.audits}>
          <select name="auditId" required defaultValue="">
            <option value="">{locale === 'fr' ? 'Audit terminé' : 'Completed audit'}</option>
            {audits.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
        <Field title={locale === 'fr' ? 'Langue du rapport' : 'Report language'}>
          <select name="locale" defaultValue={locale}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>
      <Field title={t.executive}>
        <textarea name="executiveSummary" rows={6} maxLength={8000} required />
      </Field>
      <Field title={t.reviewNotes}>
        <textarea name="reviewNotes" rows={4} maxLength={4000} required />
      </Field>
      {!audits.length && (
        <Note warning>
          {locale === 'fr'
            ? 'Aucun audit terminé n’est disponible.'
            : 'No completed audit is available.'}
        </Note>
      )}
    </Form>
  );
}

export function ReportPanel({
  id,
  data,
  locale,
  read,
  mutate,
  organizationId,
}: {
  id: string;
  data: Snapshot;
  locale: Locale;
  read: Read;
  mutate: Mutation;
  organizationId: string;
}) {
  const t = copy[locale];
  const resource = useResource<ReportDetail>(`reports/${id}`, read, locale);
  const action = useAction(locale);
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    controller.current = new AbortController();
    return () => controller.current?.abort();
  }, []);
  if (!resource.value)
    return <ResourceState error={resource.error} retry={resource.retry} locale={locale} />;
  const report = resource.value;
  const url = `/api/cyber/organizations/${organizationId}/cyber/reports/${id}`;
  return (
    <div className="cyber-report-detail">
      <div className="cyber-detail-heading">
        <div>
          <Badge value={report.approvedAt ? 'approved' : 'draft'} locale={locale} />
          <h3>{report.snapshot.audit.title}</h3>
          <p>
            {report.snapshot.client.name} · {report.locale.toUpperCase()} ·{' '}
            {date(report.createdAt, locale, true)}
          </p>
        </div>
        <Icon name="reports" size={36} />
      </div>
      <h4>{t.executive}</h4>
      <p className="cyber-preserve">{report.snapshot.executiveSummary}</p>
      <h4>{t.reviewNotes}</h4>
      <p className="cyber-preserve">{report.snapshot.reviewNotes}</p>
      <div className="cyber-report-counts">
        <span>
          <strong>{report.snapshot.findings.length}</strong>
          {t.findings}
        </span>
        <span>
          <strong>{report.snapshot.unreviewedCount}</strong>
          {t.toReview}
        </span>
        <span>
          <strong>{report.snapshot.scans.length}</strong>
          {t.engines}
        </span>
      </div>
      <Field title={t.reportHash}>
        <code className="cyber-hash">{report.sha256}</code>
      </Field>
      <div className="cyber-inline-actions">
        <button
          type="button"
          className="cyber-button secondary"
          onClick={() => setPreview(!preview)}
        >
          <Icon name="reports" size={17} />
          {t.preview}
        </button>
        {report.approvedAt && (
          <button
            type="button"
            className="cyber-button"
            disabled={action.pending}
            onClick={() =>
              void action.run(async () => {
                const response = await fetch(`${url}/pdf`, {
                  cache: 'no-store',
                  ...(controller.current ? { signal: controller.current.signal } : {}),
                });
                if (!response.ok) throw new Error('Download failed');
                const blob = await response.blob();
                if (controller.current?.signal.aborted) return;
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = `Bump-Cyber-${id}.pdf`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
              })
            }
          >
            <Icon name="reports" size={17} />
            {t.download}
          </button>
        )}
      </div>
      {preview && (
        <iframe className="cyber-report-preview" title={t.preview} src={`${url}/html`} sandbox="" />
      )}
      {!report.approvedAt && ['admin', 'reviewer'].includes(data.role) && (
        <Form
          locale={locale}
          pending={action.pending}
          error={action.error}
          label={t.publish}
          action={() => {
            if (!confirmed) return;
            void action.run(async () => {
              await mutate(`reports/${id}/approve`, 'POST', {
                confirm: true,
                expectedSha256: report.sha256,
              });
              resource.retry();
            });
          }}
        >
          <Check checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} required>
            {t.publishNotice}
          </Check>
        </Form>
      )}
      {report.approvedAt && action.error && (
        <div className="cyber-error" role="alert">
          {action.error}
        </div>
      )}
      <Note>
        {locale === 'fr'
          ? 'L’approbation porte sur cette empreinte exacte. Le PDF est disponible seulement après validation humaine.'
          : 'Approval covers this exact digest. PDF is available only after human approval.'}
      </Note>
    </div>
  );
}
