'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { copy, type Locale } from './i18n';
import { api, CyberApiError, type Organization, type Person } from './types';
import {
  Brand,
  errorMessage,
  Field,
  Form,
  formText,
  formValue,
  Icon,
  Language,
  Note,
  useAction,
} from './ui';
import { Workspace } from './workspace';

function Authentication({
  locale,
  changeLocale,
  authenticated,
}: {
  locale: Locale;
  changeLocale: (locale: Locale) => void;
  authenticated: () => Promise<void>;
}) {
  const [signup, setSignup] = useState(false);
  const [challenge, setChallenge] = useState(false);
  const [backup, setBackup] = useState(false);
  const [notice, setNotice] = useState('');
  const action = useAction(locale);
  const t = copy[locale];
  return (
    <div className="cyber-auth">
      <aside className="cyber-auth-brand">
        <Brand />
        <div className="cyber-auth-message">
          <div className="cyber-auth-emblem">
            <Icon name="shield" size={64} />
          </div>
          <span className="cyber-eyebrow">BUMP CONSULTATION</span>
          <h1>{t.loginTitle}</h1>
          <p>{t.loginLead}</p>
          <div className="cyber-auth-features">
            <span>
              <Icon name="lock" /> {t.private}
            </span>
            <span>
              <Icon name="check" /> {t.passiveOnly}
            </span>
          </div>
        </div>
        <p className="cyber-auth-caption">{t.noFake}</p>
      </aside>
      <section className="cyber-auth-content">
        <div className="cyber-auth-language">
          <Language locale={locale} onChange={changeLocale} />
        </div>
        <div className="cyber-auth-form">
          <span className="cyber-eyebrow">
            {locale === 'fr' ? 'L’EXPERTISE. EN CONFIANCE.' : 'EXPERTISE. WITH CONFIDENCE.'}
          </span>
          <h2>{challenge ? t.mfa : signup ? t.signup : t.login}</h2>
          <p className="cyber-muted">
            {challenge
              ? locale === 'fr'
                ? 'Confirmez votre identité pour ouvrir votre espace.'
                : 'Confirm your identity to open your workspace.'
              : t.workspaceLead}
          </p>
          {notice && <Note>{notice}</Note>}
          <Form
            locale={locale}
            pending={action.pending}
            error={action.error}
            label={challenge ? t.verify : signup ? t.signup : t.login}
            action={(event) => {
              const form = event.currentTarget;
              void action.run(async () => {
                if (challenge) {
                  await api(
                    `api/auth/two-factor/${backup ? 'verify-backup-code' : 'verify-totp'}`,
                    'POST',
                    { code: formText(form, 'code'), ...(!backup ? { trustDevice: false } : {}) },
                  );
                  await authenticated();
                  return;
                }
                if (signup) {
                  await api('api/auth/sign-up/email', 'POST', {
                    name: formText(form, 'name'),
                    email: formText(form, 'email'),
                    password: formValue(form, 'password'),
                  });
                  setNotice(t.verifyEmail);
                  setSignup(false);
                  form.reset();
                  return;
                }
                const result = await api<{ twoFactorRedirect?: boolean }>(
                  'api/auth/sign-in/email',
                  'POST',
                  { email: formText(form, 'email'), password: formValue(form, 'password') },
                );
                if (result.twoFactorRedirect) {
                  setChallenge(true);
                  form.reset();
                } else await authenticated();
              });
            }}
          >
            {challenge ? (
              <Field
                title={
                  backup ? (locale === 'fr' ? 'Code de récupération' : 'Recovery code') : t.otp
                }
              >
                <input
                  name="code"
                  autoComplete="one-time-code"
                  inputMode={backup ? 'text' : 'numeric'}
                  pattern={backup ? undefined : '[0-9]{6}'}
                  minLength={backup ? 1 : 6}
                  maxLength={backup ? 100 : 6}
                  required
                  autoFocus
                />
              </Field>
            ) : (
              <>
                {signup && (
                  <Field title={t.name}>
                    <input name="name" autoComplete="name" maxLength={100} required />
                  </Field>
                )}
                <Field title={t.email}>
                  <input name="email" type="email" autoComplete="email" maxLength={254} required />
                </Field>
                <Field title={t.password}>
                  <input
                    name="password"
                    type="password"
                    autoComplete={signup ? 'new-password' : 'current-password'}
                    minLength={signup ? 12 : 1}
                    maxLength={128}
                    required
                  />
                </Field>
              </>
            )}
          </Form>
          {challenge ? (
            <button
              className="cyber-text-button"
              onClick={() => {
                setBackup(!backup);
                action.clearError();
              }}
            >
              {backup
                ? locale === 'fr'
                  ? 'Utiliser le code TOTP'
                  : 'Use TOTP code'
                : locale === 'fr'
                  ? 'Utiliser un code de récupération'
                  : 'Use a recovery code'}
            </button>
          ) : (
            <button
              className="cyber-text-button"
              onClick={() => {
                setSignup(!signup);
                setNotice('');
                action.clearError();
              }}
            >
              {signup ? t.login : t.signup}
              <Icon name="arrow" size={16} />
            </button>
          )}
          <div className="cyber-auth-security">
            <Icon name="lock" size={16} />
            <span>
              {locale === 'fr'
                ? 'Accès par session privée · autorisations vérifiées côté serveur'
                : 'Private session access · server verified permissions'}
            </span>
          </div>
        </div>
        <span className="cyber-auth-copyright">© {new Date().getFullYear()} Bump Consultation</span>
      </section>
    </div>
  );
}

function CreateOrganization({
  locale,
  created,
  cancel,
}: {
  locale: Locale;
  created: (org: Organization) => void;
  cancel?: (() => void) | undefined;
}) {
  const action = useAction(locale);
  const t = copy[locale];
  return (
    <div className="cyber-onboarding">
      <Icon name="clients" size={38} />
      <h1>{t.createWorkspace}</h1>
      <p className="cyber-muted">{t.workspaceLead}</p>
      <Form
        locale={locale}
        pending={action.pending}
        error={action.error}
        cancel={cancel}
        label={t.createWorkspace}
        action={(event) => {
          const name = formText(event.currentTarget, 'name');
          const custom = formText(event.currentTarget, 'slug');
          void action.run(async () => {
            const org = await api<Organization>('organizations', 'POST', {
              name,
              slug: custom,
              locale,
            });
            created(org);
          });
        }}
      >
        <Field title={t.workspaceName}>
          <input name="name" required maxLength={100} />
        </Field>
        <Field
          title={locale === 'fr' ? 'Identifiant unique de l’espace' : 'Unique workspace identifier'}
          hint={
            locale === 'fr'
              ? 'Lettres minuscules, chiffres et tirets.'
              : 'Lowercase letters, numbers and hyphens.'
          }
        >
          <input name="slug" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
      </Form>
    </div>
  );
}

export default function CyberPage() {
  const [locale, setLocale] = useState<Locale>('fr');
  const [person, setPerson] = useState<Person | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'anonymous' | 'error'>('loading');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const changeLocale = (value: Locale) => {
    setLocale(value);
    try {
      localStorage.setItem('bump-cyber-locale', value);
    } catch {}
  };
  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState('loading');
    try {
      const me = await api<Person>('me', 'GET', undefined, current.signal);
      const orgs = await api<Organization[]>('organizations', 'GET', undefined, current.signal);
      if (current.signal.aborted) return;
      setPerson(me);
      setOrganizations(orgs);
      setOrganizationId((previous) =>
        orgs.some((org) => org.id === previous) ? previous : (orgs[0]?.id ?? ''),
      );
      setState('ready');
    } catch (e) {
      if (current.signal.aborted) return;
      if (e instanceof CyberApiError && (e.status === 401 || e.status === 403)) {
        setPerson(null);
        setOrganizations([]);
        setOrganizationId('');
        setState('anonymous');
      } else {
        setError(errorMessage(e, locale));
        setState('error');
      }
    }
  }, [locale]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bump-cyber-locale');
      if (stored === 'fr' || stored === 'en') setLocale(stored);
    } catch {}
    void load();
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const loggedOut = () => {
    controller.current?.abort();
    setPerson(null);
    setOrganizations([]);
    setOrganizationId('');
    setState('anonymous');
  };
  if (state === 'loading')
    return (
      <div className="cyber-screen-state">
        <Brand />
        <span className="cyber-spinner" />
        <p>{copy[locale].loading}</p>
      </div>
    );
  if (state === 'error')
    return (
      <div className="cyber-screen-state">
        <Brand />
        <div className="cyber-error" role="alert">
          {error}
        </div>
        <button className="cyber-button" onClick={() => void load()}>
          {copy[locale].refresh}
        </button>
      </div>
    );
  if (!person)
    return <Authentication locale={locale} changeLocale={changeLocale} authenticated={load} />;
  if (!organizations.length || creating)
    return (
      <div className="cyber-create-screen">
        <header>
          <Brand />
          <Language locale={locale} onChange={changeLocale} />
        </header>
        <CreateOrganization
          locale={locale}
          cancel={organizations.length ? () => setCreating(false) : undefined}
          created={(org) => {
            setOrganizations([...organizations, org]);
            setOrganizationId(org.id);
            setCreating(false);
          }}
        />
      </div>
    );
  return (
    <Workspace
      key={organizationId}
      locale={locale}
      changeLocale={changeLocale}
      person={person}
      updatePerson={setPerson}
      organizations={organizations}
      organizationId={organizationId}
      selectOrganization={setOrganizationId}
      createOrganization={() => setCreating(true)}
      loggedOut={loggedOut}
    />
  );
}
