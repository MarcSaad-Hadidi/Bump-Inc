'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AssetForm,
  AuditWizard,
  ClientForm,
  type FormContext,
  MandateForm,
  type Mutation,
  UploadForm,
} from './forms';
import { copy, type Locale } from './i18n';
import { FindingPanel, type Read, ReportForm, ReportPanel, RetestForm, TaskForm } from './review';
import { Confirmation, ExecutionForm, Settings } from './settings';
import {
  api,
  type Capability,
  CyberApiError,
  type ExecutionControl,
  type Member,
  type Organization,
  type Person,
  type Snapshot,
  type View,
} from './types';
import { Badge, Brand, Dialog, date, Empty, errorMessage, Icon, Language, Note } from './ui';
import { AuditsView, ClientsView, FindingsView, Overview, TaskTable } from './views';

type Modal = {
  kind:
    | 'client'
    | 'asset'
    | 'mandate'
    | 'upload'
    | 'audit'
    | 'finding'
    | 'task'
    | 'task-edit'
    | 'retest'
    | 'report-create'
    | 'report'
    | 'settings'
    | 'purge'
    | 'control'
    | 'approve-mandate'
    | 'cancel-job'
    | 'sessions';
  id?: string;
} | null;
type Props = {
  locale: Locale;
  changeLocale: (locale: Locale) => void;
  person: Person;
  updatePerson: (person: Person) => void;
  organizations: Organization[];
  organizationId: string;
  selectOrganization: (id: string) => void;
  createOrganization: () => void;
  loggedOut: () => void;
};

export function Workspace({
  locale,
  changeLocale,
  person,
  updatePerson,
  organizations,
  organizationId,
  selectOrganization,
  createOrganization,
  loggedOut,
}: Props) {
  const t = copy[locale];
  const [view, setView] = useState<View>('overview');
  const [data, setData] = useState<Snapshot | null>(null);
  const [engines, setEngines] = useState<Capability[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<{ userId: string; role: string }[]>([]);
  const [control, setControl] = useState<ExecutionControl | null>(null);
  const [loadError, setLoadError] = useState('');
  const [engineError, setEngineError] = useState('');
  const [accessError, setAccessError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [clientId, setClientId] = useState('');
  const [auditId, setAuditId] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState('');
  const requests = useRef(new Set<AbortController>());
  const live = useRef(true);
  const pollRequest = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const accessGeneration = useRef(0);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebar = useRef<HTMLElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const root = `organizations/${organizationId}`;
  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const buttons = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
      );
    buttons()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
      } else if (event.key === 'Tab') {
        const choices = buttons();
        const first = choices[0];
        const last = choices[choices.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      menuToggle.current?.focus();
    };
  }, [isMobile, mobileOpen]);
  const request = useCallback(async <T,>(path: string, method = 'GET', body?: unknown) => {
    const controller = new AbortController();
    requests.current.add(controller);
    try {
      return await api<T>(path, method, body, controller.signal);
    } finally {
      requests.current.delete(controller);
    }
  }, []);
  const read: Read = useCallback(
    <T,>(path: string) => request<T>(`${root}/cyber/${path}`),
    [request, root],
  );
  const refreshAccess = useCallback(async () => {
    const sequence = ++accessGeneration.current;
    const result = await Promise.allSettled([
      request<Member[]>(`${root}/members`),
      read<{ userId: string; role: string }[]>('roles'),
    ]);
    if (!live.current || sequence !== accessGeneration.current) return;
    if (result[0].status === 'fulfilled') setMembers(result[0].value);
    if (result[1].status === 'fulfilled') setRoles(result[1].value);
    setAccessError(
      result.some(
        (r) =>
          r.status === 'rejected' &&
          !(r.reason instanceof CyberApiError && r.reason.status === 403),
      )
        ? locale === 'fr'
          ? 'Impossible de charger les membres ou leurs rôles. Actualisez pour réessayer.'
          : 'Could not load members or their roles. Refresh to retry.'
        : '',
    );
  }, [read, request, root, locale]);
  const refresh = useCallback(
    async (scope: 'all' | 'snapshot' = 'all') => {
      pollRequest.current?.abort();
      const controller = new AbortController();
      pollRequest.current = controller;
      requests.current.add(controller);
      const sequence = ++generation.current;
      setRefreshing(true);
      const result = await Promise.allSettled([
        api<Snapshot>(`${root}/cyber/snapshot`, 'GET', undefined, controller.signal),
        scope === 'all'
          ? api<Capability[]>(`${root}/cyber/engines`, 'GET', undefined, controller.signal)
          : null,
        scope === 'all'
          ? api<ExecutionControl>(`${root}/execution-control`, 'GET', undefined, controller.signal)
          : null,
      ]);
      requests.current.delete(controller);
      if (!live.current || controller.signal.aborted || sequence !== generation.current) return;
      const [snapshot, capabilities, execution] = result;
      if (snapshot.status === 'fulfilled') {
        setData(snapshot.value);
        setLoadError('');
        setUpdated(new Date().toISOString());
      } else {
        setLoadError(errorMessage(snapshot.reason, locale));
        if (snapshot.reason instanceof CyberApiError && snapshot.reason.status === 401) {
          setData(null);
          loggedOut();
          return;
        }
        if (snapshot.reason instanceof CyberApiError && snapshot.reason.status === 403)
          setData(null);
      }
      // A business mutation refreshes its snapshot; polling and explicit refreshes
      // also revalidate engine capabilities and the current execution policy.
      if (scope === 'all') {
        if (capabilities.status === 'fulfilled' && capabilities.value !== null) {
          setEngines(capabilities.value);
          setEngineError('');
        } else {
          setEngines([]);
          setEngineError(
            locale === 'fr'
              ? 'Les capacités des moteurs ne peuvent pas être vérifiées.'
              : 'Engine capabilities could not be verified.',
          );
        }
        if (execution.status === 'fulfilled' && execution.value !== null)
          setControl(execution.value);
        else setControl(null);
      }
      setRefreshing(false);
    },
    [root, locale, loggedOut],
  );
  useEffect(() => {
    live.current = true;
    setNotification('');
    void refresh();
    void refreshAccess();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5000);
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      live.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      for (const controller of requests.current) controller.abort();
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
    };
  }, [refresh, refreshAccess]);
  const notify = (message: string) => {
    setNotification(message);
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setNotification(''), 4500);
  };
  const mutate: Mutation = useCallback(
    async <T = unknown>(path: string, method = 'POST', body?: unknown) => {
      const result = await request<T>(`${root}/cyber/${path}`, method, body);
      if (live.current) {
        await refresh('snapshot');
        if (path.startsWith('roles/')) await refreshAccess();
        notify(copy[locale].saveSuccess);
      }
      return result;
    },
    [request, root, refresh, refreshAccess, locale],
  );
  const signOut = async () => {
    await request('api/auth/sign-out', 'POST', {});
    loggedOut();
  };
  const close = () => setModal(null);
  const openAudit = (id: string) => {
    setAuditId(id);
    setView('audits');
  };
  const openFinding = (id: string) => setModal({ kind: 'finding', id });
  const context: FormContext | null = data
    ? { data, locale, person, engines, members, mutate, close }
    : null;
  const selectedId = modal?.id ?? '';
  const organization = organizations.find((o) => o.id === organizationId);
  const canWrite = !!data && ['admin', 'consultant'].includes(data.role);
  const canLaunch = !!data && data.role !== 'reviewer';
  const roleText =
    data?.role === 'admin'
      ? locale === 'fr'
        ? 'Administrateur'
        : 'Administrator'
      : data?.role === 'reviewer'
        ? locale === 'fr'
          ? 'Réviseur'
          : 'Reviewer'
        : data?.role === 'consultant'
          ? 'Consultant'
          : locale === 'fr'
            ? 'Analyste'
            : 'Analyst';
  const titles: Record<NonNullable<Modal>['kind'], string> = {
    client: selectedId ? t.edit : t.newClient,
    asset: t.addAsset,
    mandate: t.addMandate,
    upload: t.upload,
    audit: t.newAudit,
    finding: t.detail,
    task: t.createTask,
    'task-edit': t.edit,
    retest: t.retest,
    'report-create': t.createReport,
    report: t.reports,
    settings: t.settings,
    purge: t.purge,
    control: control?.emergencyStop ? t.resume : t.stop,
    'approve-mandate': t.approve,
    'cancel-job': t.cancelScan,
    sessions: locale === 'fr' ? 'Révoquer les autres sessions' : 'Revoke other sessions',
  };
  return (
    <div className="cyber-shell">
      <a className="cyber-skip" href="#cyber-main">
        {locale === 'fr' ? 'Aller au contenu' : 'Skip to content'}
      </a>
      {mobileOpen && (
        <button
          className="cyber-sidebar-backdrop"
          aria-label={t.close}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        className={`cyber-sidebar${mobileOpen ? ' open' : ''}`}
        inert={isMobile && !mobileOpen}
        aria-hidden={isMobile && !mobileOpen ? true : undefined}
      >
        {isMobile && (
          <button
            type="button"
            className="cyber-icon-button cyber-mobile-sidebar-close"
            aria-label={t.close}
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="close" />
          </button>
        )}
        <Brand />
        <div className="cyber-nav-label">{locale === 'fr' ? 'ESPACE DE TRAVAIL' : 'WORKSPACE'}</div>
        <nav aria-label={locale === 'fr' ? 'Navigation principale' : 'Main navigation'}>
          {(['overview', 'clients', 'audits', 'findings', 'remediation', 'reports'] as const).map(
            (item) => (
              <button
                key={item}
                aria-current={view === item ? 'page' : undefined}
                onClick={() => {
                  setView(item);
                  setMobileOpen(false);
                }}
              >
                <Icon name={item} />
                <span>{t[item]}</span>
                {item === 'findings' && !!data?.stats.to_review && <b>{data.stats.to_review}</b>}
              </button>
            ),
          )}
        </nav>
        <div className="cyber-sidebar-bottom">
          <div className="cyber-private">
            <Icon name="lock" size={17} />
            <span>{t.private}</span>
            <span className="cyber-private-dot" />
          </div>
          <button
            className="cyber-profile"
            onClick={() => setModal({ kind: 'settings' })}
            disabled={!data}
          >
            <span className="cyber-avatar">{person.name.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{person.name}</strong>
              <small>{roleText}</small>
            </span>
            <Icon name="settings" size={17} />
          </button>
        </div>
      </aside>
      <div
        className="cyber-main-column"
        inert={isMobile && mobileOpen}
        aria-hidden={isMobile && mobileOpen ? true : undefined}
      >
        <header className="cyber-topbar">
          <button
            ref={menuToggle}
            className="cyber-icon-button cyber-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={locale === 'fr' ? 'Ouvrir la navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
          >
            <Icon name="findings" />
          </button>
          <div className="cyber-organization">
            <span className="cyber-org-mark">B</span>
            <select
              aria-label={locale === 'fr' ? 'Organisation active' : 'Active organization'}
              value={organizationId}
              onChange={(event) => {
                if (event.target.value === '__create__') createOrganization();
                else selectOrganization(event.target.value);
              }}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
              <option value="__create__">+ {t.createWorkspace}</option>
            </select>
            <span className="cyber-topbar-divider" />
            <span className="cyber-product-label">
              {locale === 'fr' ? 'Espace Cyber' : 'Cyber workspace'}
            </span>
          </div>
          <div className="cyber-topbar-actions">
            <span className="cyber-sync" title={updated ? date(updated, locale, true) : ''}>
              <span className={refreshing ? 'loading' : ''} />
              {locale === 'fr' ? 'Données réelles' : 'Live records'}
            </span>
            <button
              className="cyber-icon-button"
              aria-label={t.refresh}
              disabled={refreshing}
              onClick={() => {
                void refresh();
                void refreshAccess();
              }}
            >
              <Icon name="refresh" size={17} />
            </button>
            <Language locale={locale} onChange={changeLocale} />
          </div>
        </header>
        <main className="cyber-main" id="cyber-main">
          <div className="cyber-page-heading">
            <div>
              <div className="cyber-breadcrumb">
                {organization?.name}
                <span>/</span>
                {t[view]}
              </div>
              <h1>{t[view]}</h1>
              <p>
                {view === 'overview'
                  ? t.overviewLead
                  : view === 'clients'
                    ? locale === 'fr'
                      ? 'Chaque intervention commence par un périmètre clair.'
                      : 'Every engagement begins with a clear scope.'
                    : view === 'audits'
                      ? locale === 'fr'
                        ? 'Des analyses autorisées, de leur lancement à leur résultat.'
                        : 'Authorized analyses, from launch to result.'
                      : view === 'findings'
                        ? t.human
                        : view === 'remediation'
                          ? locale === 'fr'
                            ? 'Transformez les constats validés en actions vérifiables.'
                            : 'Turn validated findings into verifiable actions.'
                          : locale === 'fr'
                            ? 'Des livrables revus, figés et prêts à partager.'
                            : 'Reviewed, frozen deliverables ready to share.'}
              </p>
            </div>
            <div className="cyber-page-actions">
              {view === 'clients' && canWrite ? (
                <button className="cyber-button" onClick={() => setModal({ kind: 'client' })}>
                  <Icon name="plus" size={18} />
                  {t.newClient}
                </button>
              ) : view === 'reports' && data?.role !== 'analyst' ? (
                <button
                  className="cyber-button"
                  disabled={!data}
                  onClick={() => setModal({ kind: 'report-create' })}
                >
                  <Icon name="plus" size={18} />
                  {t.createReport}
                </button>
              ) : view === 'remediation' && canLaunch ? (
                <button className="cyber-button" onClick={() => setModal({ kind: 'task' })}>
                  <Icon name="plus" size={18} />
                  {t.createTask}
                </button>
              ) : canLaunch ? (
                <button
                  className="cyber-button"
                  disabled={!data || !!control?.emergencyStop}
                  onClick={() => setModal({ kind: 'audit' })}
                >
                  <Icon name="plus" size={18} />
                  {t.newAudit}
                </button>
              ) : null}
            </div>
          </div>
          {control?.emergencyStop && (
            <Note warning>
              <strong>{t.stopped}.</strong>{' '}
              {locale === 'fr' ? 'Les nouveaux jobs sont bloqués.' : 'New jobs are blocked.'}
            </Note>
          )}
          {loadError && (
            <div className="cyber-error cyber-load-banner" role="alert">
              <span>
                {loadError}
                {data && (
                  <small>
                    {locale === 'fr'
                      ? 'Les dernières données chargées restent affichées.'
                      : 'The last loaded data remains displayed.'}
                  </small>
                )}
              </span>
              <button className="cyber-button secondary small" onClick={() => void refresh()}>
                {t.refresh}
              </button>
            </div>
          )}
          {!data ? (
            loadError ? null : (
              <div className="cyber-skeleton" aria-busy="true">
                <div className="cyber-skeleton-metrics">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} />
                  ))}
                </div>
                <div />
                <p>{t.loading}</p>
              </div>
            )
          ) : (
            <>
              <div className="cyber-content" key={view}>
                {view === 'overview' && (
                  <Overview
                    data={data}
                    locale={locale}
                    newClient={() => setModal({ kind: 'client' })}
                    openAudit={openAudit}
                    openFinding={openFinding}
                    editTask={(id) => setModal({ kind: 'task-edit', id })}
                  />
                )}
                {view === 'clients' && (
                  <ClientsView
                    data={data}
                    locale={locale}
                    clientId={clientId}
                    canApprove={members.some(
                      (member) => member.userId === person.id && member.role === 'owner',
                    )}
                    setClientId={setClientId}
                    edit={(id) => setModal({ kind: 'client', id })}
                    asset={(id) => setModal({ kind: 'asset', id })}
                    mandate={(id) => setModal({ kind: 'mandate', id })}
                    upload={(id) => setModal(id ? { kind: 'upload', id } : { kind: 'upload' })}
                    approve={(id) => setModal({ kind: 'approve-mandate', id })}
                  />
                )}
                {view === 'audits' && (
                  <AuditsView
                    data={data}
                    locale={locale}
                    selected={auditId}
                    setSelected={setAuditId}
                    cancel={(id) => setModal({ kind: 'cancel-job', id })}
                    read={read}
                  />
                )}
                {view === 'findings' && (
                  <FindingsView data={data} locale={locale} open={openFinding} />
                )}
                {view === 'remediation' && (
                  <>
                    <section className="cyber-panel">
                      <div className="cyber-panel-heading">
                        <h2>{t.priorities}</h2>
                      </div>
                      <TaskTable
                        data={data}
                        locale={locale}
                        open={openFinding}
                        edit={(id) => setModal({ kind: 'task-edit', id })}
                      />
                    </section>
                    <section className="cyber-panel">
                      <div className="cyber-panel-heading">
                        <h2>{t.retest}</h2>
                      </div>
                      <div className="cyber-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>{t.findings}</th>
                              <th>{t.retestAudit}</th>
                              <th>{t.conclusion}</th>
                              <th>{t.date}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.retests.map((retest) => (
                              <tr key={retest.id}>
                                <td>
                                  <button
                                    className="cyber-table-link"
                                    onClick={() => openFinding(retest.findingId)}
                                  >
                                    {data.findings.find((f) => f.id === retest.findingId)
                                      ?.observation.title ?? '—'}
                                  </button>
                                </td>
                                <td>{data.audits.find((a) => a.id === retest.auditId)?.title}</td>
                                <td>
                                  {t[retest.conclusion as 'present' | 'absent' | 'inconclusive'] ??
                                    retest.conclusion}
                                  <small>{retest.note}</small>
                                </td>
                                <td>{date(retest.createdAt, locale)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!data.retests.length && <Empty>{t.empty}</Empty>}
                      </div>
                    </section>
                  </>
                )}
                {view === 'reports' && (
                  <section className="cyber-panel">
                    <div className="cyber-panel-heading">
                      <h2>{t.reports}</h2>
                      <span className="cyber-count">{data.reports.length}</span>
                    </div>
                    <div className="cyber-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>
                              {t.client} / {t.audits}
                            </th>
                            <th>{locale === 'fr' ? 'Langue' : 'Language'}</th>
                            <th>{t.state}</th>
                            <th>{t.date}</th>
                            <th>{t.details}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.reports.map((report) => (
                            <tr key={report.id}>
                              <td>
                                <button
                                  className="cyber-table-link"
                                  onClick={() => setModal({ kind: 'report', id: report.id })}
                                >
                                  {data.audits.find((a) => a.id === report.auditId)?.title ??
                                    report.id}
                                </button>
                                <small>
                                  {data.clients.find((c) => c.id === report.clientId)?.name}
                                </small>
                              </td>
                              <td>{report.locale.toUpperCase()}</td>
                              <td>
                                <Badge
                                  value={report.approvedAt ? 'approved' : 'draft'}
                                  locale={locale}
                                />
                              </td>
                              <td>{date(report.createdAt, locale)}</td>
                              <td>
                                <button
                                  className="cyber-table-link"
                                  onClick={() => setModal({ kind: 'report', id: report.id })}
                                >
                                  {t.details}
                                  <Icon name="arrow" size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!data.reports.length && <Empty>{t.empty}</Empty>}
                    </div>
                  </section>
                )}
              </div>
              <footer className="cyber-page-footer">
                <span>
                  <Icon name="lock" size={13} />
                  {t.noFake}
                </span>
                <span>{t.limitNotice}</span>
                {data.role === 'admin' && (
                  <button
                    className="cyber-text-button cyber-emergency-button"
                    disabled={!control}
                    title={
                      !control
                        ? locale === 'fr'
                          ? 'Contrôle d’exécution indisponible'
                          : 'Execution control unavailable'
                        : undefined
                    }
                    onClick={() => setModal({ kind: 'control' })}
                  >
                    <Icon name="alert" size={14} />
                    {control?.emergencyStop ? t.resume : t.stop}
                  </button>
                )}
              </footer>
            </>
          )}
        </main>
      </div>
      {notification && (
        <div className="cyber-toast" role="status">
          <Icon name="check" size={18} />
          {notification}
        </div>
      )}
      {modal && data && context && (
        <Dialog
          key={`${modal.kind}-${selectedId}`}
          title={titles[modal.kind]}
          close={close}
          wide={['audit', 'mandate', 'finding', 'report', 'settings'].includes(modal.kind)}
        >
          {modal.kind === 'client' && (
            <ClientForm
              locale={locale}
              mutate={mutate}
              close={close}
              {...(selectedId ? { client: data.clients.find((c) => c.id === selectedId) } : {})}
              created={setClientId}
            />
          )}
          {modal.kind === 'asset' && (
            <AssetForm
              locale={locale}
              data={data}
              mutate={mutate}
              close={close}
              clientId={selectedId || clientId || data.clients[0]?.id || ''}
            />
          )}
          {modal.kind === 'mandate' && (
            <MandateForm
              {...context}
              clientId={selectedId || clientId || data.clients[0]?.id || ''}
            />
          )}
          {modal.kind === 'upload' && (
            <UploadForm
              data={data}
              locale={locale}
              mutate={mutate}
              close={close}
              {...(selectedId ? { assetId: selectedId } : {})}
            />
          )}
          {modal.kind === 'audit' && (
            <>
              {engineError && <Note warning>{engineError}</Note>}
              <AuditWizard {...context} launched={() => setView('audits')} />
            </>
          )}
          {modal.kind === 'finding' && (
            <FindingPanel
              id={selectedId}
              data={data}
              locale={locale}
              read={read}
              mutate={mutate}
              task={(id) => setModal({ kind: 'task', id })}
              retest={(id) => setModal({ kind: 'retest', id })}
            />
          )}
          {(modal.kind === 'task' || modal.kind === 'task-edit') && (
            <TaskForm
              data={data}
              locale={locale}
              mutate={mutate}
              close={close}
              {...(modal.kind === 'task-edit'
                ? { taskId: selectedId }
                : selectedId
                  ? { findingId: selectedId }
                  : {})}
            />
          )}
          {modal.kind === 'retest' && (
            <RetestForm
              data={data}
              locale={locale}
              mutate={mutate}
              close={close}
              findingId={selectedId}
            />
          )}
          {modal.kind === 'report-create' && (
            <ReportForm
              data={data}
              locale={locale}
              mutate={mutate}
              close={close}
              created={(id) => setModal({ kind: 'report', id })}
            />
          )}
          {modal.kind === 'report' && (
            <ReportPanel
              id={selectedId}
              data={data}
              locale={locale}
              read={read}
              mutate={mutate}
              organizationId={organizationId}
            />
          )}
          {modal.kind === 'settings' && (
            <>
              {accessError && (
                <Note warning>
                  {accessError}{' '}
                  <button
                    type="button"
                    className="cyber-text-button"
                    onClick={() => void refreshAccess()}
                  >
                    {t.refresh}
                  </button>
                </Note>
              )}
              <Settings
                locale={locale}
                person={person}
                updatePerson={updatePerson}
                members={members}
                roles={roles}
                role={data.role}
                mutate={mutate}
                purge={() => setModal({ kind: 'purge' })}
                sessions={() => setModal({ kind: 'sessions' })}
                signOut={signOut}
              />
            </>
          )}
          {modal.kind === 'purge' && (
            <Confirmation
              locale={locale}
              close={close}
              label={t.purge}
              message={t.purgeNotice}
              action={() => mutate('retention/purge', 'POST', { confirm: true })}
            />
          )}
          {modal.kind === 'sessions' && (
            <Confirmation
              locale={locale}
              close={close}
              label={locale === 'fr' ? 'Révoquer les autres sessions' : 'Revoke other sessions'}
              message={
                locale === 'fr'
                  ? 'Tous vos autres appareils devront se reconnecter. Cette session reste ouverte.'
                  : 'All other devices will need to sign in again. This session stays open.'
              }
              action={() => request('api/auth/revoke-other-sessions', 'POST', {})}
            />
          )}
          {modal.kind === 'control' && control && (
            <ExecutionForm
              locale={locale}
              control={control}
              close={close}
              save={async (value) => {
                await request(`${root}/execution-control`, 'PUT', value);
                await refresh();
              }}
            />
          )}
          {modal.kind === 'approve-mandate' && (
            <Confirmation
              locale={locale}
              close={close}
              label={t.approve}
              message={`${data.mandates.find((m) => m.mandate.id === selectedId)?.mandate.reference ?? ''} — ${locale === 'fr' ? 'Je valide l’autorisation écrite, le responsable, la fenêtre, le périmètre exact et les exclusions de ce mandat.' : 'I approve this written authorization, designated owner, time window, exact scope and exclusions.'}`}
              action={() => mutate(`mandates/${selectedId}/approve`, 'POST', { confirm: true })}
            />
          )}
          {modal.kind === 'cancel-job' && (
            <Confirmation
              locale={locale}
              close={close}
              label={t.cancelScan}
              message={
                locale === 'fr'
                  ? 'La demande est transmise au worker. Le statut affiché changera uniquement après confirmation du serveur.'
                  : 'The request is sent to the worker. The displayed state changes only when confirmed by the server.'
              }
              action={() => mutate(`jobs/${selectedId}/cancel`, 'POST', { confirm: true })}
            />
          )}
        </Dialog>
      )}
    </div>
  );
}
