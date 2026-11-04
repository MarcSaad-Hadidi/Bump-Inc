'use client';

import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { copy, type Locale, label } from './i18n';
import { CyberApiError } from './types';

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    overview: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h5v-7h4v7h5V9" />
      </>
    ),
    clients: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3ZM16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2" />
      </>
    ),
    audits: (
      <>
        <path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5" />
      </>
    ),
    findings: (
      <>
        <path d="M8 5h13M8 12h13M8 19h13" />
        <circle cx="3" cy="5" r=".7" />
        <circle cx="3" cy="12" r=".7" />
        <circle cx="3" cy="19" r=".7" />
      </>
    ),
    remediation: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m7 12 3 3 7-7" />
      </>
    ),
    reports: (
      <>
        <path d="M6 2h8l5 5v15H6ZM14 2v6h5M9 12h7M9 16h7" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="12" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    down: <path d="m6 9 6 6 6-6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v1" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5 8a8 8 0 0 1 14-3l1 7M4 12l1 7a8 8 0 0 0 14-3" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5M13 7l5 5-5 5M8 12h13" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2ZM12 9v5m0 3v1" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.info}
    </svg>
  );
}

export function Brand() {
  return (
    <div className="cyber-brand">
      <span>bump.</span>
      <small>CYBER</small>
    </div>
  );
}
export function Language({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="cyber-language" aria-label="Language / Langue">
      {(['fr', 'en'] as const).map((value) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={locale === value}
          onClick={() => onChange(value)}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
export function Badge({ value, locale }: { value: string; locale: Locale }) {
  return <span className={`cyber-badge cyber-badge-${value}`}>{label(value, locale)}</span>;
}
export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="cyber-empty">
      <span className="cyber-empty-icon">
        <Icon name="audits" size={27} />
      </span>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Note({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return (
    <div className={`cyber-note${warning ? ' warning' : ''}`}>
      <Icon name={warning ? 'alert' : 'info'} />
      <div>{children}</div>
    </div>
  );
}
export function Field({
  title,
  children,
  hint,
}: {
  title: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <label className="cyber-field">
      <span>{title}</span>
      {children}
      {hint && <small id={id}>{hint}</small>}
    </label>
  );
}
export function Check({
  children,
  ...props
}: { children: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="cyber-check">
      <input type="checkbox" {...props} />
      <span>{children}</span>
    </label>
  );
}
export function Dialog({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`cyber-dialog${wide ? ' cyber-dialog-wide' : ''}`}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            close();
        }
      }}
    >
      <header>
        <div>
          <span className="cyber-eyebrow">BUMP CYBER</span>
          <h2 id={id}>{title}</h2>
        </div>
        <button
          type="button"
          className="cyber-icon-button"
          aria-label="Fermer / Close"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="cyber-dialog-body">{children}</div>
    </dialog>
  );
}

export function errorMessage(error: unknown, locale: Locale) {
  const fr = locale === 'fr';
  if (error instanceof CyberApiError) {
    const messages: Record<string, [string, string]> = {
      cyber_permission_denied: [
        'Votre rôle ne permet pas cette action.',
        'Your role does not allow this action.',
      ],
      email_not_verified: [
        'Vérifiez votre adresse courriel avant de vous connecter.',
        'Verify your email before signing in.',
      ],
      EMAIL_NOT_VERIFIED: [
        'Vérifiez votre adresse courriel avant de vous connecter.',
        'Verify your email before signing in.',
      ],
      INVALID_EMAIL_OR_PASSWORD: [
        'Courriel ou mot de passe incorrect.',
        'Incorrect email or password.',
      ],
      engine_unavailable: [
        'Ce moteur est actuellement indisponible. Actualisez ses capacités.',
        'This engine is currently unavailable. Refresh its capabilities.',
      ],
      source_required: [
        'Une source compatible et non expirée est requise pour chaque actif.',
        'Each asset requires a compatible source that has not expired.',
      ],
      cyber_vault_unavailable: [
        'Le coffre privé est indisponible. Contactez l’opérateur.',
        'The private vault is unavailable. Contact the operator.',
      ],
      comparable_coverage_required: [
        'La couverture de ce retest ne permet pas cette conclusion.',
        'This retest does not have comparable coverage for this conclusion.',
      ],
      report_approval_required: [
        'Ce rapport doit être approuvé avant téléchargement.',
        'Approve this report before downloading it.',
      ],
      mandate_responsible_mismatch: [
        'Seul le responsable désigné peut lancer cet audit.',
        'Only the designated engagement owner may launch this audit.',
      ],
    };
    const message =
      messages[error.code]?.[fr ? 0 : 1] ??
      (error.status === 401
        ? fr
          ? 'Votre session a expiré. Reconnectez-vous.'
          : 'Your session expired. Sign in again.'
        : error.status === 403
          ? fr
            ? 'Accès refusé. Vérifiez votre rôle et le mandat.'
            : 'Access denied. Check your role and engagement.'
          : error.status === 400
            ? fr
              ? 'Les champs transmis sont invalides. Vérifiez le formulaire.'
              : 'Some fields are invalid. Check this form.'
            : copy[locale].error);
    return `${message}${error.requestId ? ` (${error.requestId})` : ''}`;
  }
  return error instanceof Error && error.name === 'UploadValidationError'
    ? error.message
    : copy[locale].error;
}

export function useAction(locale: Locale) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  return {
    pending,
    error,
    clearError: () => setError(''),
    run: async (action: () => Promise<unknown>) => {
      if (pending) return;
      setPending(true);
      setError('');
      try {
        await action();
      } catch (e) {
        if (live.current && !(e instanceof Error && e.name === 'AbortError'))
          setError(errorMessage(e, locale));
      } finally {
        if (live.current) setPending(false);
      }
    },
  };
}
export function Form({
  children,
  action,
  pending,
  error,
  label: buttonLabel,
  locale,
  cancel,
}: {
  children: ReactNode;
  action: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  error: string;
  label?: string | undefined;
  locale: Locale;
  cancel?: (() => void) | undefined;
}) {
  return (
    <form
      className="cyber-form"
      onSubmit={(event) => {
        event.preventDefault();
        action(event);
      }}
    >
      {children}
      {error && (
        <div className="cyber-error" role="alert">
          {error}
        </div>
      )}
      <footer className="cyber-form-actions">
        {cancel && (
          <button type="button" className="cyber-button secondary" onClick={cancel}>
            {copy[locale].cancel}
          </button>
        )}
        <button className="cyber-button" type="submit" disabled={pending}>
          {pending ? <span className="cyber-spinner" /> : null}
          {buttonLabel ?? copy[locale].save}
        </button>
      </footer>
    </form>
  );
}
export function formText(form: HTMLFormElement, name: string) {
  return formValue(form, name).trim();
}
export function formValue(form: HTMLFormElement, name: string) {
  return String(new FormData(form).get(name) ?? '');
}
export function iso(value: string) {
  return new Date(value).toISOString();
}
export function date(value: string | null | undefined, locale: Locale, time = false) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? '—'
    : new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
        dateStyle: 'medium',
        ...(time ? { timeStyle: 'short' as const } : {}),
      }).format(parsed);
}
export function localDate(value = new Date()) {
  const shifted = new Date(value.valueOf() - value.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}
