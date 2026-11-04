'use client';

import { useState } from 'react';
import { copy, type Locale, label } from './i18n';
import type { Read } from './review';
import type { Comparison, Snapshot } from './types';
import { Badge, Check, date, Empty, Field, Form, formText, Icon, Note, useAction } from './ui';

export function auditState(data: Snapshot, id: string) {
  const scans = data.scans.filter((s) => s.scan.auditId === id);
  return scans.some((s) => s.status === 'running')
    ? 'running'
    : scans.some((s) => s.status === 'queued' || s.status === 'retry_wait')
      ? 'queued'
      : scans.some((s) => s.status === 'dead_letter' || s.status === 'denied')
        ? 'dead_letter'
        : scans.length && scans.every((s) => s.status === 'succeeded')
          ? 'succeeded'
          : scans.some((s) => s.status === 'cancelled')
            ? 'cancelled'
            : 'unknown';
}
export function AuditTable({
  data,
  locale,
  limit,
  select,
  emptyAction,
}: {
  data: Snapshot;
  locale: Locale;
  limit?: number;
  select: (id: string) => void;
  emptyAction?: React.ReactNode;
}) {
  const t = copy[locale];
  const audits = limit ? data.audits.slice(0, limit) : data.audits;
  return (
    <div className="cyber-table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              {t.client} / {t.audits}
            </th>
            <th>{t.assets}</th>
            <th>{t.engines}</th>
            <th>{t.state}</th>
            <th>{t.date}</th>
          </tr>
        </thead>
        <tbody>
          {audits.map((audit) => {
            const scans = data.scans.filter((s) => s.scan.auditId === audit.id);
            return (
              <tr key={audit.id}>
                <td>
                  <button className="cyber-table-link" onClick={() => select(audit.id)}>
                    {audit.title}
                  </button>
                  <small>{data.clients.find((c) => c.id === audit.clientId)?.name}</small>
                </td>
                <td>{new Set(scans.map((s) => s.scan.assetId)).size}</td>
                <td>
                  <span className="cyber-table-engines">
                    {[...new Set(scans.map((s) => s.scan.engine))].join(' · ') || '—'}
                  </span>
                </td>
                <td>
                  <Badge value={auditState(data, audit.id)} locale={locale} />
                </td>
                <td className="cyber-nowrap">{date(audit.createdAt, locale)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!audits.length && <Empty action={emptyAction}>{t.noAudits}</Empty>}
    </div>
  );
}

export function TaskTable({
  data,
  locale,
  limit,
  open,
  edit,
}: {
  data: Snapshot;
  locale: Locale;
  limit?: number;
  open: (id: string) => void;
  edit: (id: string) => void;
}) {
  const t = copy[locale];
  const tasks = [...data.tasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return (
    <div className="cyber-table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              {t.client} / {t.findings}
            </th>
            <th>{t.description}</th>
            <th>{t.assignee}</th>
            <th>{t.due}</th>
            <th>{t.state}</th>
          </tr>
        </thead>
        <tbody>
          {(limit ? tasks.slice(0, limit) : tasks).map((task) => {
            const finding = data.findings.find((f) => f.id === task.findingId);
            return (
              <tr key={task.id}>
                <td>
                  <button className="cyber-table-link" onClick={() => open(task.findingId)}>
                    {finding?.observation.title ?? '—'}
                  </button>
                  <small>{data.clients.find((c) => c.id === task.clientId)?.name}</small>
                </td>
                <td className="cyber-truncate" title={task.description}>
                  {task.description}
                </td>
                <td>{task.assignee}</td>
                <td
                  className={`cyber-nowrap${new Date(task.dueAt) < new Date() && task.status !== 'to_retest' ? ' cyber-overdue' : ''}`}
                >
                  {date(task.dueAt, locale)}
                </td>
                <td>
                  {data.role !== 'reviewer' ? (
                    <button
                      className="cyber-status-button"
                      onClick={() => edit(task.id)}
                      aria-label={`${t.edit} · ${label(task.status, locale)}`}
                    >
                      <Badge value={task.status} locale={locale} />
                      <Icon name="down" size={12} />
                    </button>
                  ) : (
                    <Badge value={task.status} locale={locale} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!tasks.length && <Empty>{t.noTasks}</Empty>}
    </div>
  );
}

export function Overview({
  data,
  locale,
  newClient,
  openAudit,
  openFinding,
  editTask,
}: {
  data: Snapshot;
  locale: Locale;
  newClient: () => void;
  openAudit: (id: string) => void;
  openFinding: (id: string) => void;
  editTask: (id: string) => void;
}) {
  const t = copy[locale];
  const [checks, setChecks] = useState<string[]>([]);
  const metrics = [
    { title: t.clients, value: data.stats.clients, icon: 'clients', className: 'blue' },
    { title: t.running, value: data.stats.ongoing, icon: 'audits', className: 'violet' },
    { title: t.toReview, value: data.stats.to_review, icon: 'findings', className: 'amber' },
    { title: t.fixed, value: data.stats.fixed, icon: 'shield', className: 'green' },
  ];
  return (
    <>
      <div className="cyber-metrics">
        {metrics.map((metric) => (
          <article key={metric.title} className="cyber-metric">
            <div>
              <span>{metric.title}</span>
              <strong>{metric.value}</strong>
            </div>
            <span className={`cyber-metric-icon ${metric.className}`}>
              <Icon name={metric.icon} size={22} />
            </span>
          </article>
        ))}
      </div>
      <div className="cyber-overview-columns">
        <section className="cyber-panel">
          <div className="cyber-panel-heading">
            <h2>{t.recent}</h2>
            <span className="cyber-count">{data.audits.length}</span>
          </div>
          <AuditTable
            data={data}
            locale={locale}
            limit={5}
            select={openAudit}
            emptyAction={
              ['admin', 'consultant'].includes(data.role) ? (
                <button className="cyber-button secondary" onClick={newClient}>
                  <Icon name="plus" size={16} />
                  {t.newClient}
                </button>
              ) : undefined
            }
          />
        </section>
        <aside className="cyber-panel cyber-checklist">
          <span className="cyber-mini-icon">
            <Icon name="shield" size={21} />
          </span>
          <h2>{t.before}</h2>
          <p className="cyber-muted">
            {locale === 'fr'
              ? 'Votre liste de vérification avant de lancer un mandat.'
              : 'Your checklist before launching an engagement.'}
          </p>
          {['signed', 'scopeChecked', 'window', 'emergency'].map((value) => (
            <Check
              key={value}
              checked={checks.includes(value)}
              onChange={() =>
                setChecks(
                  checks.includes(value) ? checks.filter((v) => v !== value) : [...checks, value],
                )
              }
            >
              {t[value as keyof typeof t]}
            </Check>
          ))}
          <div className="cyber-checklist-note">
            <Icon name="info" size={18} />
            <span>{t.human}</span>
          </div>
        </aside>
      </div>
      <section className="cyber-panel">
        <div className="cyber-panel-heading">
          <h2>{t.priorities}</h2>
          <span className="cyber-muted">
            {locale === 'fr' ? 'Échéances à suivre' : 'Upcoming deadlines'}
          </span>
        </div>
        <TaskTable data={data} locale={locale} limit={5} open={openFinding} edit={editTask} />
      </section>
      <div className="cyber-bottom-grid">
        <section className="cyber-panel">
          <div className="cyber-panel-heading">
            <h2>{t.activity}</h2>
          </div>
          {data.events.length ? (
            <ol className="cyber-activity">
              {data.events.slice(0, 5).map((event) => (
                <li key={event.id}>
                  <span className="cyber-activity-dot" />
                  <div>
                    <strong>{eventLabel(event.action, locale)}</strong>
                    <small>
                      {data.clients.find((c) => c.id === event.clientId)?.name ?? 'Bump Cyber'} ·{' '}
                      {date(event.createdAt, locale, true)}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="cyber-small-empty">{t.empty}</p>
          )}
        </section>
        <section className="cyber-panel">
          <div className="cyber-panel-heading">
            <h2>{locale === 'fr' ? 'État de l’espace' : 'Workspace state'}</h2>
          </div>
          <dl className="cyber-workspace-stats">
            <div>
              <dt>{t.completed}</dt>
              <dd>{data.stats.completed}</dd>
            </div>
            <div>
              <dt>{t.critical}</dt>
              <dd>{data.stats.critical}</dd>
            </div>
            <div>
              <dt>{t.failures}</dt>
              <dd>{data.stats.failed}</dd>
            </div>
          </dl>
        </section>
      </div>
      <Note>{t.actualOnly}</Note>
    </>
  );
}

function eventLabel(action: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    'client.created': ['Client créé', 'Client created'],
    'client.updated': ['Client mis à jour', 'Client updated'],
    'asset.created': ['Actif enregistré', 'Asset recorded'],
    'mandate.recorded': ['Mandat enregistré', 'Engagement recorded'],
    'audit.launched': ['Audit lancé', 'Audit launched'],
    'source.uploaded': ['Source chiffrée importée', 'Encrypted source uploaded'],
    'remediation.assigned': ['Correction assignée', 'Remediation assigned'],
    'report.drafted': ['Rapport préparé', 'Report prepared'],
    'report.approved': ['Rapport validé', 'Report approved'],
    'scan.completed': ['Analyse terminée', 'Scan completed'],
    'role.assigned': ['Rôle Cyber affecté', 'Cyber role assigned'],
    'retention.purged': ['Rétention appliquée', 'Retention applied'],
  };
  if (labels[action]) return labels[action][locale === 'fr' ? 0 : 1];
  if (action.startsWith('finding.'))
    return `${copy[locale].findings} · ${label(action.slice(8), locale)}`;
  if (action.startsWith('retest.'))
    return `${copy[locale].retest} · ${label(action.slice(7), locale)}`;
  if (action.startsWith('remediation.'))
    return `${copy[locale].remediation} · ${label(action.slice(12), locale)}`;
  return action;
}

export function ClientsView({
  data,
  locale,
  clientId,
  setClientId,
  edit,
  asset,
  mandate,
  upload,
  approve,
  canApprove,
}: {
  data: Snapshot;
  locale: Locale;
  clientId: string;
  setClientId: (id: string) => void;
  edit: (id: string) => void;
  asset: (id: string) => void;
  mandate: (id: string) => void;
  upload: (id?: string) => void;
  approve: (id: string) => void;
  canApprove: boolean;
}) {
  const t = copy[locale];
  const [search, setSearch] = useState('');
  const clients = data.clients.filter((c) =>
    `${c.name} ${c.contact}`.toLowerCase().includes(search.toLowerCase()),
  );
  const client = data.clients.find((c) => c.id === clientId) ?? clients[0];
  const canEdit = ['admin', 'consultant'].includes(data.role);
  if (!data.clients.length)
    return (
      <section className="cyber-panel">
        <Empty>{t.empty}</Empty>
      </section>
    );
  return (
    <div className="cyber-clients-layout">
      <aside className="cyber-panel cyber-client-directory">
        <div className="cyber-search">
          <Icon name="search" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
          />
        </div>
        <div className="cyber-client-list">
          {clients.map((c) => (
            <button
              key={c.id}
              className={client?.id === c.id ? 'selected' : ''}
              onClick={() => setClientId(c.id)}
            >
              <span className="cyber-client-avatar">{c.name.slice(0, 2).toUpperCase()}</span>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {c.archivedAt
                    ? t.archived
                    : `${data.assets.filter((a) => a.clientId === c.id).length} ${t.assets.toLowerCase()}`}
                </small>
              </span>
              <Icon name="arrow" size={16} />
            </button>
          ))}
        </div>
      </aside>
      {client && (
        <div className="cyber-client-content">
          <section className="cyber-panel">
            <div className="cyber-panel-heading">
              <div>
                <span className="cyber-eyebrow">{t.client}</span>
                <h2>{client.name}</h2>
                <p className="cyber-muted">{client.contact}</p>
              </div>
              {canEdit && (
                <button className="cyber-button secondary small" onClick={() => edit(client.id)}>
                  {t.edit}
                </button>
              )}
            </div>
            <dl className="cyber-client-facts">
              <div>
                <dt>{t.criticality}</dt>
                <dd>{client.criticality} / 5</dd>
              </div>
              <div>
                <dt>{t.retention}</dt>
                <dd>{client.retentionDays}</dd>
              </div>
              <div>
                <dt>{t.state}</dt>
                <dd>
                  {client.archivedAt ? t.archived : locale === 'fr' ? 'En activité' : 'Active'}
                </dd>
              </div>
            </dl>
          </section>
          <section className="cyber-panel">
            <div className="cyber-panel-heading">
              <h2>{t.assets}</h2>
              {canEdit && !client.archivedAt && (
                <button className="cyber-button secondary small" onClick={() => asset(client.id)}>
                  <Icon name="plus" size={15} />
                  {t.addAsset}
                </button>
              )}
            </div>
            <div className="cyber-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      {t.label} / {t.target}
                    </th>
                    <th>{t.kind}</th>
                    <th>{t.exposure}</th>
                    <th>{t.source}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets
                    .filter((a) => a.clientId === client.id)
                    .map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.label}</strong>
                          <small>
                            <code>{a.target.value}</code>
                          </small>
                        </td>
                        <td>{t[a.target.kind]}</td>
                        <td>
                          {t[a.exposure as 'public' | 'internal' | 'restricted'] ?? a.exposure}
                        </td>
                        <td>
                          {data.role !== 'reviewer' && !client.archivedAt && (
                            <button className="cyber-table-link" onClick={() => upload(a.id)}>
                              <Icon name="upload" size={15} />
                              {t.upload}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!data.assets.some((a) => a.clientId === client.id) && <Empty>{t.empty}</Empty>}
            </div>
          </section>
          <section className="cyber-panel">
            <div className="cyber-panel-heading">
              <h2>{t.mandates}</h2>
              {data.role === 'admin' && !client.archivedAt && (
                <button className="cyber-button secondary small" onClick={() => mandate(client.id)}>
                  <Icon name="plus" size={15} />
                  {t.addMandate}
                </button>
              )}
            </div>
            {data.mandates
              .filter((m) => m.mandate.clientId === client.id)
              .map((m) => (
                <article className="cyber-mandate-card" key={m.mandate.id}>
                  <div className="cyber-panel-heading">
                    <div>
                      <strong>{m.mandate.reference}</strong>
                      <small>
                        {m.mandate.signedBy} · {date(m.mandate.authorizedAt, locale)}
                      </small>
                    </div>
                    <Badge value={m.approved ? 'approved' : 'pending'} locale={locale} />
                  </div>
                  <div className="cyber-mandate-window">
                    <Icon name="clock" size={15} />
                    {date(m.version.validFrom, locale, true)} →{' '}
                    {date(m.version.validUntil, locale, true)}
                  </div>
                  <small>
                    {t.engines}: {m.mandate.engines.join(' · ')}
                  </small>
                  <details>
                    <summary>{t.details}</summary>
                    <dl className="cyber-summary">
                      <div>
                        <dt>{t.assets}</dt>
                        <dd>
                          {m.mandate.assetIds
                            .map((id) => data.assets.find((a) => a.id === id)?.target.value ?? id)
                            .join(', ')}
                        </dd>
                      </div>
                      <div>
                        <dt>{t.exclusions}</dt>
                        <dd>
                          {m.mandate.excludedAssetIds
                            .map((id) => data.assets.find((a) => a.id === id)?.target.value ?? id)
                            .join(', ') || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>{t.limitations}</dt>
                        <dd>{m.mandate.limitations}</dd>
                      </div>
                      <div>
                        <dt>{t.emergency}</dt>
                        <dd>{m.mandate.emergencyContact}</dd>
                      </div>
                      <div>
                        <dt>{t.assignee}</dt>
                        <dd>{m.version.responsibleUserId}</dd>
                      </div>
                      <div>
                        <dt>{t.authorization}</dt>
                        <dd className="cyber-preserve">{m.version.authorizationText}</dd>
                      </div>
                    </dl>
                  </details>
                  {!m.approved && canApprove && (
                    <button
                      className="cyber-button secondary small"
                      onClick={() => approve(m.mandate.id)}
                    >
                      {t.approve}
                    </button>
                  )}
                  {m.revokedAt && (
                    <Note warning>{locale === 'fr' ? 'Mandat révoqué' : 'Revoked engagement'}</Note>
                  )}
                </article>
              ))}
            {!data.mandates.some((m) => m.mandate.clientId === client.id) && (
              <p className="cyber-small-empty">{t.empty}</p>
            )}
          </section>
          <section className="cyber-panel">
            <div className="cyber-panel-heading">
              <h2>{t.source}</h2>
            </div>
            <div className="cyber-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.asset}</th>
                    <th>{t.until}</th>
                    <th>{t.state}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources
                    .filter(
                      (s) => data.assets.find((a) => a.id === s.assetId)?.clientId === client.id,
                    )
                    .map((source) => (
                      <tr key={source.id}>
                        <td>
                          <strong>{source.name}</strong>
                          <small>{source.kind}</small>
                        </td>
                        <td>{data.assets.find((a) => a.id === source.assetId)?.label}</td>
                        <td>{date(source.expiresAt, locale)}</td>
                        <td>
                          {source.purgedAt ? (
                            locale === 'fr' ? (
                              'Purgée'
                            ) : (
                              'Purged'
                            )
                          ) : new Date(source.expiresAt) < new Date() ? (
                            locale === 'fr' ? (
                              'Expirée'
                            ) : (
                              'Expired'
                            )
                          ) : (
                            <span className="cyber-encrypted">
                              <Icon name="lock" size={12} />
                              {locale === 'fr' ? 'Chiffrée' : 'Encrypted'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!data.sources.some(
                (s) => data.assets.find((a) => a.id === s.assetId)?.clientId === client.id,
              ) && <p className="cyber-small-empty">{t.empty}</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function AuditsView({
  data,
  locale,
  selected,
  setSelected,
  cancel,
  read,
}: {
  data: Snapshot;
  locale: Locale;
  selected: string;
  setSelected: (id: string) => void;
  cancel: (id: string) => void;
  read: Read;
}) {
  const t = copy[locale];
  const current = data.audits.find((a) => a.id === selected);
  return (
    <>
      <section className="cyber-panel">
        <AuditTable data={data} locale={locale} select={setSelected} />
      </section>
      {current && (
        <section className="cyber-panel">
          <div className="cyber-panel-heading">
            <div>
              <span className="cyber-eyebrow">{t.audits}</span>
              <h2>{current.title}</h2>
            </div>
            <Badge value={auditState(data, current.id)} locale={locale} />
          </div>
          <div className="cyber-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    {t.asset} / {t.engine}
                  </th>
                  <th>{t.state}</th>
                  <th>{locale === 'fr' ? 'Étape réelle' : 'Recorded stage'}</th>
                  <th>{t.observations}</th>
                  <th>{locale === 'fr' ? 'Tentative' : 'Attempt'}</th>
                  <th>{t.details}</th>
                </tr>
              </thead>
              <tbody>
                {data.scans
                  .filter((s) => s.scan.auditId === current.id)
                  .map((scan) => (
                    <tr key={scan.scan.id}>
                      <td>
                        <strong>
                          {data.assets.find((a) => a.id === scan.scan.assetId)?.label}
                        </strong>
                        <small>
                          {scan.scan.engine} · {scan.scan.engineVersion}
                        </small>
                      </td>
                      <td>
                        <Badge value={scan.status} locale={locale} />
                      </td>
                      <td>{label(scan.scan.stage, locale)}</td>
                      <td>{scan.scan.observationCount ?? '—'}</td>
                      <td>{scan.attempt}</td>
                      <td>
                        {['queued', 'running', 'retry_wait'].includes(scan.status) ? (
                          scan.cancelRequestedAt ? (
                            <span className="cyber-muted">
                              {locale === 'fr' ? 'Arrêt demandé' : 'Cancellation requested'}
                            </span>
                          ) : (
                            <button
                              className="cyber-table-link"
                              onClick={() => cancel(scan.scan.executionJobId)}
                            >
                              {t.cancelScan}
                            </button>
                          )
                        ) : (
                          <span>
                            <small>{date(scan.finishedAt, locale, true)}</small>
                            {scan.errorCode && (
                              <code className="cyber-error-code">{scan.errorCode}</code>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <ComparisonForm data={data} locale={locale} read={read} />
    </>
  );
}

function ComparisonForm({ data, locale, read }: { data: Snapshot; locale: Locale; read: Read }) {
  const t = copy[locale];
  const action = useAction(locale);
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [result, setResult] = useState<Comparison | null>(null);
  const client = data.audits.find((a) => a.id === before)?.clientId;
  return (
    <section className="cyber-panel">
      <div className="cyber-panel-heading">
        <h2>{t.compare}</h2>
      </div>
      <Form
        locale={locale}
        label={t.compare}
        pending={action.pending}
        error={action.error}
        action={() => {
          if (before === after) return;
          void action.run(async () =>
            setResult(
              await read<Comparison>(
                `comparison?before=${encodeURIComponent(before)}&after=${encodeURIComponent(after)}`,
              ),
            ),
          );
        }}
      >
        <div className="cyber-two-fields">
          <Field title={t.previous}>
            <select
              value={before}
              required
              onChange={(event) => {
                setBefore(event.target.value);
                setAfter('');
                setResult(null);
              }}
            >
              <option value="">—</option>
              {data.audits.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.title} · {data.clients.find((c) => c.id === a.clientId)?.name}
                </option>
              ))}
            </select>
          </Field>
          <Field title={t.current}>
            <select
              value={after}
              required
              onChange={(event) => {
                setAfter(event.target.value);
                setResult(null);
              }}
            >
              <option value="">—</option>
              {data.audits
                .filter((a) => a.id !== before && a.clientId === client)
                .map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.title}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      </Form>
      {result && (
        <div className="cyber-comparison">
          <div className="cyber-report-counts">
            <span>
              <strong>{result.newFindings.length}</strong>
              {t.newFindings}
            </span>
            <span>
              <strong>{result.persistent.length}</strong>
              {t.persistent}
            </span>
            <span>
              <strong>{result.notObserved.length}</strong>
              {t.notObserved}
            </span>
          </div>
          {(result.coverageReduced || result.incomplete) && (
            <Note warning>
              {t.coverageReduced}
              {result.incomplete && (
                <>
                  <br />
                  {locale === 'fr'
                    ? 'Au moins une analyse est incomplète.'
                    : 'At least one scan is incomplete.'}
                </>
              )}
            </Note>
          )}
          <Note>
            {locale === 'fr'
              ? 'Non observé ne constitue pas une preuve de correction. Seul un retest humain comparable peut confirmer une correction.'
              : result.interpretation}
          </Note>
          <details>
            <summary>
              {locale === 'fr' ? 'Évolution de la couverture' : 'Coverage changes'} (+
              {result.addedCoverage.length} / −{result.removedCoverage.length})
            </summary>
            <ul className="cyber-coverage-list">
              {result.removedCoverage.map((value) => (
                <li key={`removed-${value}`}>− {value}</li>
              ))}
              {result.addedCoverage.map((value) => (
                <li key={`added-${value}`}>+ {value}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}

export function FindingsView({
  data,
  locale,
  open,
}: {
  data: Snapshot;
  locale: Locale;
  open: (id: string) => void;
}) {
  const t = copy[locale];
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('');
  const [state, setState] = useState('');
  const [engine, setEngine] = useState('');
  const [client, setClient] = useState('');
  const [sort, setSort] = useState('priority');
  const findings = data.findings
    .filter(
      (f) =>
        `${f.observation.title} ${f.observation.component} ${f.observation.cve ?? ''} ${data.assets.find((a) => a.id === f.assetId)?.label ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!severity || f.observation.severity === severity) &&
        (!state || f.status === state) &&
        (!engine || f.observation.engine === engine) &&
        (!client || f.clientId === client),
    )
    .sort((a, b) =>
      sort === 'priority'
        ? b.priority.score - a.priority.score
        : sort === 'cvss'
          ? (b.observation.cvss ?? -1) - (a.observation.cvss ?? -1)
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <>
      <div className="cyber-filters">
        <div className="cyber-search">
          <Icon name="search" size={18} />
          <input
            aria-label={t.search}
            placeholder={
              locale === 'fr' ? 'Titre, CVE, composant, actif…' : 'Title, CVE, component, asset…'
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          value={severity}
          aria-label={t.severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="">
            {t.severity} · {t.all}
          </option>
          {['critical', 'high', 'medium', 'low', 'info', 'unknown'].map((value) => (
            <option key={value} value={value}>
              {label(value, locale)}
            </option>
          ))}
        </select>
        <select value={state} aria-label={t.validation} onChange={(e) => setState(e.target.value)}>
          <option value="">
            {t.validation} · {t.all}
          </option>
          {[
            'to_review',
            'confirmed',
            'false_positive',
            'planned',
            'in_progress',
            'to_retest',
            'verified_fixed',
            'accepted_risk',
            'closed',
          ].map((value) => (
            <option key={value} value={value}>
              {label(value, locale)}
            </option>
          ))}
        </select>
        <select value={engine} aria-label={t.engine} onChange={(e) => setEngine(e.target.value)}>
          <option value="">
            {t.engine} · {t.all}
          </option>
          {[...new Set(data.findings.map((f) => f.observation.engine))].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={client} aria-label={t.client} onChange={(e) => setClient(e.target.value)}>
          <option value="">
            {t.client} · {t.all}
          </option>
          {data.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={sort} aria-label={t.sort} onChange={(e) => setSort(e.target.value)}>
          <option value="priority">{t.priority}</option>
          <option value="cvss">CVSS</option>
          <option value="newest">{t.newest}</option>
        </select>
      </div>
      <section className="cyber-panel">
        <div className="cyber-panel-heading">
          <h2>{t.findings}</h2>
          <span className="cyber-count">{findings.length}</span>
        </div>
        <div className="cyber-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.title}</th>
                <th>{t.severity} / CVSS</th>
                <th>{t.engine}</th>
                <th>{t.validation}</th>
                <th>{t.priority}</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id}>
                  <td>
                    <button className="cyber-table-link" onClick={() => open(f.id)}>
                      {f.observation.title}
                    </button>
                    <small>
                      {data.clients.find((c) => c.id === f.clientId)?.name} ·{' '}
                      {data.assets.find((a) => a.id === f.assetId)?.label}
                    </small>
                    {f.observation.cve && <code>{f.observation.cve}</code>}
                  </td>
                  <td>
                    <Badge value={f.observation.severity} locale={locale} />
                    <small>CVSS {f.observation.cvss ?? '—'}</small>
                  </td>
                  <td>
                    {f.observation.engine}
                    <small>{f.observation.engineVersion}</small>
                  </td>
                  <td>
                    <Badge value={f.status} locale={locale} />
                  </td>
                  <td>
                    <span className={`cyber-priority${f.priority.score >= 70 ? ' high' : ''}`}>
                      {f.priority.score}
                      <small>/100</small>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!findings.length && (
            <Empty>
              {data.findings.length
                ? locale === 'fr'
                  ? 'Aucun constat ne correspond aux filtres.'
                  : 'No findings match these filters.'
                : t.empty}
            </Empty>
          )}
        </div>
      </section>
      <Note>{t.riskHelp}</Note>
    </>
  );
}
