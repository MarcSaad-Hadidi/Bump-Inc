'use client';

import { useState } from 'react';
import type { Mutation } from './forms';
import { copy, type Locale } from './i18n';
import { api, type ExecutionControl, type Member, type Person, type Role } from './types';
import { Badge, Check, Field, Form, formText, formValue, Icon, Note, useAction } from './ui';

export function Confirmation({
  locale,
  message,
  action: operation,
  close,
  label,
}: {
  locale: Locale;
  message: string;
  action: () => Promise<unknown>;
  close: () => void;
  label?: string;
}) {
  const action = useAction(locale);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Form
      locale={locale}
      pending={action.pending}
      error={action.error}
      cancel={close}
      label={label}
      action={() => {
        if (!confirmed) return;
        void action.run(async () => {
          await operation();
          close();
        });
      }}
    >
      <Note warning>{message}</Note>
      <Check checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required>
        {copy[locale].confirm}
      </Check>
    </Form>
  );
}

export function ExecutionForm({
  locale,
  control,
  save,
  close,
}: {
  locale: Locale;
  control: ExecutionControl;
  save: (control: ExecutionControl) => Promise<unknown>;
  close: () => void;
}) {
  const t = copy[locale];
  const action = useAction(locale);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Form
      locale={locale}
      pending={action.pending}
      error={action.error}
      cancel={close}
      label={control.emergencyStop ? t.resume : t.stop}
      action={() => {
        if (!confirmed) return;
        void action.run(async () => {
          await save({
            emergencyStop: !control.emergencyStop,
            concurrencyLimit: control.concurrencyLimit,
            rateLimit: control.rateLimit,
          });
          close();
        });
      }}
    >
      <Note warning>
        {control.emergencyStop
          ? locale === 'fr'
            ? 'Cette action autorise de nouveaux jobs selon les mandats valides. Les analyses annulées ne redémarrent pas.'
            : 'This permits new jobs under valid engagements. Cancelled analyses do not restart.'
          : locale === 'fr'
            ? 'Les jobs de l’organisation seront bloqués et les analyses en cours recevront un signal d’arrêt.'
            : 'Organization jobs will be blocked and running analyses will receive a stop signal.'}
      </Note>
      <dl className="cyber-summary">
        <div>
          <dt>
            {locale === 'fr' ? 'Limite de concurrence actuelle' : 'Current concurrency limit'}
          </dt>
          <dd>{control.concurrencyLimit}</dd>
        </div>
        <div>
          <dt>{locale === 'fr' ? 'Limite de fréquence actuelle' : 'Current rate limit'}</dt>
          <dd>{control.rateLimit}</dd>
        </div>
      </dl>
      <Check checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required>
        {t.confirm}
      </Check>
    </Form>
  );
}

export function Settings({
  locale,
  person,
  updatePerson,
  members,
  roles,
  role,
  mutate,
  purge,
  sessions,
  signOut,
}: {
  locale: Locale;
  person: Person;
  updatePerson: (person: Person) => void;
  members: Member[];
  roles: { userId: string; role: string }[];
  role: Role;
  mutate: Mutation;
  purge: () => void;
  sessions: () => void;
  signOut: () => Promise<unknown>;
}) {
  const t = copy[locale];
  const action = useAction(locale);
  const mfaAction = useAction(locale);
  const [enrollment, setEnrollment] = useState<{ totpURI: string; backupCodes: string[] } | null>(
    null,
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [tab, setTab] = useState<'account' | 'access' | 'retention'>('account');
  const [saved, setSaved] = useState(false);
  return (
    <>
      <div className="cyber-account-heading">
        <span className="cyber-avatar">{person.name.slice(0, 2).toUpperCase()}</span>
        <div>
          <strong>{person.name}</strong>
          <small>{person.email}</small>
        </div>
        <Badge value={role} locale={locale} />
      </div>
      <nav className="cyber-tabs" aria-label={t.settings}>
        {(['account', ...(role === 'admin' ? ['access', 'retention'] : [])] as const).map(
          (value) => (
            <button
              key={value}
              aria-current={tab === value ? 'page' : undefined}
              onClick={() => setTab(value as typeof tab)}
            >
              {value === 'account' ? t.mfa : value === 'access' ? t.members : t.retention}
            </button>
          ),
        )}
      </nav>
      {tab === 'account' && (
        <>
          <h3>{t.mfa}</h3>
          {person.twoFactorEnabled ? (
            <>
              <Note>
                <strong>{t.mfaEnabled}</strong>
              </Note>
              <Form
                locale={locale}
                pending={mfaAction.pending}
                error={mfaAction.error}
                label={locale === 'fr' ? 'Désactiver le TOTP' : 'Disable TOTP'}
                action={(event) => {
                  const f = event.currentTarget;
                  void mfaAction.run(async () => {
                    await api('api/auth/two-factor/disable', 'POST', {
                      password: formValue(f, 'password'),
                    });
                    f.reset();
                    updatePerson(await api<Person>('me'));
                  });
                }}
              >
                <Field title={t.password}>
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                  />
                </Field>
                <Check required>
                  {locale === 'fr'
                    ? 'Je confirme la désactivation du second facteur.'
                    : 'I confirm disabling the second factor.'}
                </Check>
              </Form>
            </>
          ) : enrollment ? (
            <>
              <Note>{t.mfaSecret}</Note>
              <Field title="TOTP URI">
                <textarea
                  className="cyber-secret"
                  value={enrollment.totpURI}
                  readOnly
                  rows={4}
                  spellCheck={false}
                />
              </Field>
              <h4>{locale === 'fr' ? 'Codes de récupération' : 'Recovery codes'}</h4>
              <div className="cyber-backup-codes">
                {enrollment.backupCodes.map((code) => (
                  <code key={code}>{code}</code>
                ))}
              </div>
              <Form
                locale={locale}
                pending={mfaAction.pending}
                error={mfaAction.error}
                label={t.verify}
                action={(event) => {
                  if (!acknowledged) return;
                  const f = event.currentTarget;
                  void mfaAction.run(async () => {
                    await api('api/auth/two-factor/verify-totp', 'POST', {
                      code: formText(f, 'code'),
                      trustDevice: false,
                    });
                    f.reset();
                    setEnrollment(null);
                    updatePerson(await api<Person>('me'));
                  });
                }}
              >
                <Check
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  required
                >
                  {locale === 'fr'
                    ? 'J’ai conservé les codes de récupération dans un endroit privé.'
                    : 'I have saved the recovery codes in a private location.'}
                </Check>
                <Field title={t.otp}>
                  <input
                    name="code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    required
                  />
                </Field>
              </Form>
            </>
          ) : (
            <Form
              locale={locale}
              pending={mfaAction.pending}
              error={mfaAction.error}
              label={t.enableMfa}
              action={(event) => {
                const f = event.currentTarget;
                void mfaAction.run(async () => {
                  const result = await api<{ totpURI: string; backupCodes: string[] }>(
                    'api/auth/two-factor/enable',
                    'POST',
                    { password: formValue(f, 'password') },
                  );
                  f.reset();
                  setEnrollment(result);
                });
              }}
            >
              <p className="cyber-muted">
                {locale === 'fr'
                  ? 'Protégez votre session avec un code généré par votre application d’authentification.'
                  : 'Protect your session with a code generated by your authenticator app.'}
              </p>
              <Field title={t.password}>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </Field>
            </Form>
          )}
          <div className="cyber-settings-signout">
            <button type="button" className="cyber-button secondary" onClick={sessions}>
              {locale === 'fr' ? 'Révoquer les autres sessions' : 'Revoke other sessions'}
            </button>
            <button
              type="button"
              className="cyber-button secondary"
              disabled={action.pending}
              onClick={() => void action.run(signOut)}
            >
              <Icon name="logout" size={17} />
              {t.logout}
            </button>
            {action.error && (
              <div role="alert" className="cyber-error">
                {action.error}
              </div>
            )}
          </div>
        </>
      )}
      {tab === 'access' && (
        <>
          <Note>
            {locale === 'fr'
              ? 'Les propriétaires et administrateurs ont le rôle Cyber administrateur. Les autres membres sont analystes tant qu’aucun rôle n’est affecté.'
              : 'Owners and organization administrators are Cyber administrators. Other members default to analyst until a role is assigned.'}
          </Note>
          <Form
            locale={locale}
            pending={action.pending}
            error={action.error}
            action={(event) => {
              const form = event.currentTarget;
              setSaved(false);
              void action.run(async () => {
                for (const member of members.filter((m) => !['owner', 'admin'].includes(m.role))) {
                  const selected = formText(form, member.userId);
                  if (
                    selected !== (roles.find((r) => r.userId === member.userId)?.role ?? 'analyst')
                  )
                    await mutate(`roles/${member.userId}`, 'PUT', { role: selected });
                }
                setSaved(true);
              });
            }}
          >
            <div className="cyber-member-list">
              {members.map((member) => (
                <div key={member.userId}>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.email}</small>
                  </div>
                  {['owner', 'admin'].includes(member.role) ? (
                    <Badge value="admin" locale={locale} />
                  ) : (
                    <select
                      name={member.userId}
                      defaultValue={
                        roles.find((r) => r.userId === member.userId)?.role ?? 'analyst'
                      }
                      aria-label={`${t.role} · ${member.name}`}
                    >
                      <option value="analyst">{locale === 'fr' ? 'Analyste' : 'Analyst'}</option>
                      <option value="consultant">Consultant</option>
                      <option value="reviewer">{locale === 'fr' ? 'Réviseur' : 'Reviewer'}</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
            {saved && <p role="status">{t.saveSuccess}</p>}
          </Form>
        </>
      )}
      {tab === 'retention' && (
        <>
          <h3>{t.purge}</h3>
          <p className="cyber-muted">{t.purgeNotice}</p>
          <button type="button" className="cyber-button danger" onClick={purge}>
            {t.purge}
          </button>
        </>
      )}
    </>
  );
}
