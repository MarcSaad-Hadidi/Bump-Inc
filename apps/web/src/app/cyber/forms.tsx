'use client';

import { useRef, useState } from 'react';
import { copy, engineReason, type Locale } from './i18n';
import {
  type Capability,
  type Engine,
  engineCategory,
  engineCompatible,
  type Member,
  type Person,
  type Snapshot,
} from './types';
import {
  Badge,
  Check,
  date,
  Empty,
  Field,
  Form,
  formText,
  Icon,
  iso,
  localDate,
  Note,
  useAction,
} from './ui';

export type Mutation = <T = unknown>(path: string, method?: string, body?: unknown) => Promise<T>;
export type FormContext = {
  data: Snapshot;
  locale: Locale;
  person: Person;
  engines: Capability[];
  members: Member[];
  mutate: Mutation;
  close: () => void;
};
type Client = Snapshot['clients'][number];
const allEngines: Engine[] = ['semgrep', 'trivy', 'gitleaks', 'web-passive', 'json', 'sarif'];
export function ClientForm({
  locale,
  mutate,
  close,
  client,
  created,
}: {
  locale: Locale;
  mutate: Mutation;
  close: () => void;
  client?: Client | undefined;
  created?: (id: string) => void;
}) {
  const action = useAction(locale);
  const t = copy[locale];
  return (
    <Form
      locale={locale}
      cancel={close}
      pending={action.pending}
      error={action.error}
      action={(event) => {
        const f = event.currentTarget;
        void action.run(async () => {
          const result = await mutate<{ id: string }>(
            client ? `clients/${client.id}` : 'clients',
            client ? 'PATCH' : 'POST',
            {
              name: formText(f, 'name'),
              contact: formText(f, 'contact'),
              criticality: Number(formText(f, 'criticality')),
              retentionDays: Number(formText(f, 'retentionDays')),
              ...(client ? { archived: new FormData(f).has('archived') } : {}),
            },
          );
          created?.(result.id);
          close();
        });
      }}
    >
      <div className="cyber-two-fields">
        <Field title={t.name}>
          <input name="name" defaultValue={client?.name} maxLength={160} required autoFocus />
        </Field>
        <Field title={t.contact}>
          <input name="contact" defaultValue={client?.contact} maxLength={254} required />
        </Field>
        <Field title={t.criticality}>
          <select name="criticality" defaultValue={client?.criticality ?? 3}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </Field>
        <Field title={t.retention}>
          <input
            type="number"
            name="retentionDays"
            min={1}
            max={365}
            defaultValue={client?.retentionDays ?? 90}
            required
          />
        </Field>
      </div>
      {client && (
        <Check name="archived" defaultChecked={!!client.archivedAt}>
          {t.archived}
        </Check>
      )}
      <Note>
        {locale === 'fr'
          ? 'La criticité contribue à la priorité métier. La rétention s’applique aux nouveaux contenus chiffrés.'
          : 'Criticality contributes to business priority. Retention applies to newly encrypted content.'}
      </Note>
    </Form>
  );
}

export function AssetForm({
  locale,
  data,
  mutate,
  close,
  clientId,
}: {
  locale: Locale;
  data: Snapshot;
  mutate: Mutation;
  close: () => void;
  clientId: string;
}) {
  const action = useAction(locale);
  const t = copy[locale];
  const [kind, setKind] = useState<'repository' | 'hostname' | 'ip'>('repository');
  return (
    <Form
      locale={locale}
      cancel={close}
      pending={action.pending}
      error={action.error}
      action={(event) => {
        const f = event.currentTarget;
        void action.run(async () => {
          await mutate('assets', 'POST', {
            clientId: formText(f, 'clientId'),
            label: formText(f, 'label'),
            target: { kind, value: formText(f, 'target') },
            exposure: formText(f, 'exposure'),
          });
          close();
        });
      }}
    >
      <Field title={t.client}>
        <select name="clientId" defaultValue={clientId} required>
          {data.clients
            .filter((c) => !c.archivedAt)
            .map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </Field>
      <Field title={t.label}>
        <input name="label" maxLength={160} required autoFocus />
      </Field>
      <div className="cyber-two-fields">
        <Field title={t.kind}>
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="repository">{t.repository}</option>
            <option value="hostname">{t.hostname}</option>
            <option value="ip">{t.ip}</option>
          </select>
        </Field>
        <Field title={t.exposure}>
          <select name="exposure" defaultValue="internal">
            {(['public', 'internal', 'restricted'] as const).map((value) => (
              <option value={value} key={value}>
                {t[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        title={t.target}
        hint={
          kind === 'repository'
            ? locale === 'fr'
              ? 'Identifiant propriétaire/nom uniquement. Aucun clonage distant.'
              : 'An owner/name identifier only. No remote cloning.'
            : locale === 'fr'
              ? 'Valeur exacte, sans URL, port ni chemin.'
              : 'Exact value, without URL, port or path.'
        }
      >
        <input
          key={kind}
          name="target"
          maxLength={kind === 'hostname' ? 253 : kind === 'ip' ? 45 : 140}
          placeholder={
            kind === 'repository'
              ? 'organisation/depot'
              : kind === 'hostname'
                ? 'app.example.test'
                : '192.0.2.10'
          }
          required
        />
      </Field>
    </Form>
  );
}

export function MandateForm({
  data,
  locale,
  person,
  members,
  engines,
  mutate,
  close,
  clientId,
}: FormContext & { clientId: string }) {
  const action = useAction(locale);
  const t = copy[locale];
  const [client, setClient] = useState(clientId);
  const [assets, setAssets] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [selectedEngines, setSelectedEngines] = useState<Engine[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const relevant = data.assets.filter((asset) => asset.clientId === client && !asset.archivedAt);
  const toggle = (values: string[], value: string) =>
    values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  return (
    <Form
      locale={locale}
      cancel={close}
      pending={action.pending}
      error={action.error}
      action={(event) => {
        const f = event.currentTarget;
        if (!confirmed || !assets.length || !selectedEngines.length) return;
        void action.run(async () => {
          await mutate('mandates', 'POST', {
            clientId: client,
            reference: formText(f, 'reference'),
            signedBy: formText(f, 'signedBy'),
            authorizedAt: iso(formText(f, 'authorizedAt')),
            responsibleUserId: formText(f, 'responsibleUserId'),
            authorizationText: formText(f, 'authorizationText'),
            emergencyContact: formText(f, 'emergencyContact'),
            validFrom: iso(formText(f, 'validFrom')),
            validUntil: iso(formText(f, 'validUntil')),
            assetIds: assets,
            excludedAssetIds: excluded,
            engines: selectedEngines,
            mode: 'passive',
            limitations: formText(f, 'limitations'),
          });
          close();
        });
      }}
    >
      <Note>
        {t.passiveOnly}{' '}
        {locale === 'fr'
          ? 'L’enregistrement sera suivi d’une approbation explicite du propriétaire.'
          : 'An explicit owner approval follows registration.'}
      </Note>
      <div className="cyber-two-fields">
        <Field title={t.client}>
          <select
            value={client}
            onChange={(e) => {
              setClient(e.target.value);
              setAssets([]);
              setExcluded([]);
            }}
            required
          >
            {data.clients
              .filter((c) => !c.archivedAt)
              .map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <Field title={t.reference}>
          <input name="reference" maxLength={120} required />
        </Field>
        <Field title={t.signedBy}>
          <input name="signedBy" maxLength={160} required />
        </Field>
        <Field title={locale === 'fr' ? 'Autorisation signée le' : 'Authorization signed at'}>
          <input
            type="datetime-local"
            name="authorizedAt"
            defaultValue={localDate()}
            max={localDate()}
            required
          />
        </Field>
        <Field
          title={locale === 'fr' ? 'Responsable de l’exécution' : 'Authorized execution owner'}
        >
          <select name="responsibleUserId" defaultValue={person.id} required>
            {members.length ? (
              members.map((m) => (
                <option value={m.userId} key={m.userId}>
                  {m.name} · {m.email}
                </option>
              ))
            ) : (
              <option value={person.id}>{person.name}</option>
            )}
          </select>
        </Field>
        <Field title={t.emergency}>
          <input name="emergencyContact" maxLength={254} required />
        </Field>
        <Field title={t.from}>
          <input type="datetime-local" name="validFrom" defaultValue={localDate()} required />
        </Field>
        <Field title={t.until}>
          <input type="datetime-local" name="validUntil" required />
        </Field>
      </div>
      <Field title={t.authorization}>
        <textarea name="authorizationText" maxLength={20000} rows={4} required />
      </Field>
      <fieldset>
        <legend>
          {t.assets} · {assets.length}/20
        </legend>
        {relevant.length ? (
          relevant.map((a) => (
            <Check
              key={a.id}
              checked={assets.includes(a.id)}
              disabled={excluded.includes(a.id) || (!assets.includes(a.id) && assets.length >= 20)}
              onChange={() => setAssets(toggle(assets, a.id))}
            >
              {a.label}
              <small>{a.target.value}</small>
            </Check>
          ))
        ) : (
          <p className="cyber-muted">{t.empty}</p>
        )}
      </fieldset>
      <fieldset>
        <legend>{t.exclusions}</legend>
        {relevant.map((a) => (
          <Check
            key={a.id}
            checked={excluded.includes(a.id)}
            disabled={assets.includes(a.id) || (!excluded.includes(a.id) && excluded.length >= 20)}
            onChange={() => setExcluded(toggle(excluded, a.id))}
          >
            {a.label}
          </Check>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t.engines}</legend>
        <div className="cyber-choice-grid">
          {allEngines.map((engine) => (
            <Check
              key={engine}
              checked={selectedEngines.includes(engine)}
              onChange={() => setSelectedEngines(toggle(selectedEngines, engine) as Engine[])}
            >
              <strong>{engine}</strong>
              <small>
                {engines.find((e) => e.id === engine)?.available ? t.available : t.unavailable}
              </small>
            </Check>
          ))}
        </div>
      </fieldset>
      <Field title={t.limitations}>
        <textarea name="limitations" maxLength={4000} rows={3} required />
      </Field>
      <Check checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} required>
        {locale === 'fr'
          ? 'Je dispose de cette autorisation écrite, et le périmètre affiché correspond au mandat.'
          : 'I hold this written authorization and the displayed scope matches the engagement.'}
      </Check>
      {(!assets.length || !selectedEngines.length) && (
        <p className="cyber-muted">
          {locale === 'fr'
            ? 'Sélectionnez au moins un actif et un moteur.'
            : 'Select at least one asset and one engine.'}
        </p>
      )}
    </Form>
  );
}

export function UploadForm({
  data,
  locale,
  mutate,
  close,
  assetId,
}: {
  data: Snapshot;
  locale: Locale;
  mutate: Mutation;
  close: () => void;
  assetId?: string;
}) {
  const action = useAction(locale);
  const t = copy[locale];
  const [format, setFormat] = useState<'files' | 'json' | 'sarif'>('files');
  const [files, setFiles] = useState<File[]>([]);
  const folder = useRef<HTMLInputElement>(null);
  const invalid = (message: string) => {
    const e = new Error(message);
    e.name = 'UploadValidationError';
    throw e;
  };
  const read = async (file: File, max: number) => {
    if (file.size > max)
      invalid(
        locale === 'fr'
          ? 'Le fichier dépasse la taille permise.'
          : 'The file exceeds the size limit.',
      );
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      invalid(
        locale === 'fr'
          ? 'Le fichier doit être un texte UTF-8 valide.'
          : 'The file must contain valid UTF-8 text.',
      );
      return '';
    }
  };
  return (
    <Form
      locale={locale}
      cancel={close}
      pending={action.pending}
      error={action.error}
      label={t.upload}
      action={(event) => {
        const f = event.currentTarget;
        void action.run(async () => {
          const name = formText(f, 'name');
          const asset = formText(f, 'assetId');
          if (format === 'files') {
            if (!files.length || files.length > 100) invalid(t.fileHelp);
            const content = await Promise.all(
              files.map(async (file) => {
                const path = file.webkitRelativePath || file.name;
                if (
                  !/^[a-zA-Z0-9_.\/-]+$/.test(path) ||
                  path.startsWith('/') ||
                  path.startsWith('-') ||
                  path.length > 200 ||
                  path.split('/').some((p) => !p || p === '.' || p === '..')
                )
                  invalid(
                    locale === 'fr'
                      ? 'Un chemin de fichier est invalide. Renommez le fichier sans espace ni caractère spécial.'
                      : 'A file path is invalid. Rename it without spaces or special characters.',
                  );
                const text = await read(file, 131072);
                if (text.includes('\0'))
                  invalid(
                    locale === 'fr'
                      ? 'Les fichiers binaires sont refusés.'
                      : 'Binary files are not accepted.',
                  );
                return { path, content: text };
              }),
            );
            if (
              new Set(content.map((file) => file.path)).size !== content.length ||
              new TextEncoder().encode(JSON.stringify(content)).byteLength > 524288
            )
              invalid(t.fileHelp);
            await mutate('sources', 'POST', { assetId: asset, name, files: content });
          } else {
            const sourceText = files[0] ? await read(files[0], 524288) : formText(f, 'sourceText');
            if (new TextEncoder().encode(sourceText).byteLength > 524288)
              invalid(
                locale === 'fr' ? 'Le rapport dépasse 512 Kio.' : 'The report exceeds 512 KiB.',
              );
            try {
              JSON.parse(sourceText);
            } catch {
              invalid(
                locale === 'fr'
                  ? 'Le rapport ne contient pas de JSON valide.'
                  : 'The report is not valid JSON.',
              );
            }
            await mutate('imports', 'POST', { assetId: asset, name, format, sourceText });
          }
          close();
        });
      }}
    >
      <Field title={t.asset}>
        <select name="assetId" defaultValue={assetId} required>
          {data.assets
            .filter(
              (a) => !a.archivedAt && !data.clients.find((c) => c.id === a.clientId)?.archivedAt,
            )
            .map((a) => (
              <option value={a.id} key={a.id}>
                {data.clients.find((c) => c.id === a.clientId)?.name} · {a.label}
              </option>
            ))}
        </select>
      </Field>
      <div className="cyber-two-fields">
        <Field title={t.sourceName}>
          <input name="name" maxLength={160} required />
        </Field>
        <Field title={t.source}>
          <select
            value={format}
            onChange={(event) => {
              setFormat(event.target.value as typeof format);
              setFiles([]);
            }}
          >
            <option value="files">{t.snapshot}</option>
            <option value="json">{t.importJson}</option>
            <option value="sarif">{t.importSarif}</option>
          </select>
        </Field>
      </div>
      <div className="cyber-upload-area">
        <Icon name="upload" size={30} />
        <strong>{format === 'files' ? t.files : t.reportFile}</strong>
        <p>{format === 'files' ? t.fileHelp : 'JSON / SARIF · 512 KiB max · UTF-8'}</p>
        <input
          key={format}
          type="file"
          multiple={format === 'files'}
          accept={format === 'files' ? undefined : '.json,.sarif,application/json'}
          aria-label={format === 'files' ? t.files : t.reportFile}
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        {format === 'files' && (
          <>
            <button
              type="button"
              className="cyber-button secondary"
              onClick={() => {
                folder.current?.setAttribute('webkitdirectory', '');
                folder.current?.click();
              }}
            >
              {t.folder}
            </button>
            <input
              type="file"
              ref={folder}
              multiple
              hidden
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </>
        )}
      </div>
      {files.length > 0 && (
        <div className="cyber-upload-list">
          {files.map((f, index) => (
            <div key={`${f.name}-${index}`}>
              <span>{f.webkitRelativePath || f.name}</span>
              <small>{Math.ceil(f.size / 1024)} KiB</small>
            </div>
          ))}
        </div>
      )}
      {format !== 'files' && (
        <>
          <Note>
            {format === 'json' ? (
              <>
                <code>
                  {
                    '{version:1, engine:"semgrep"|"trivy"|"gitleaks", engineVersion:"x.y.z", report: ...}'
                  }
                </code>
                <br />
                {locale === 'fr'
                  ? 'Enveloppe native. Le moteur et la version importés sont déclarés, non installés.'
                  : 'Native envelope. Imported engine and version are declared, not installed.'}
              </>
            ) : (
              <>
                SARIF 2.1.0 ·{' '}
                {locale === 'fr'
                  ? 'L’import conserve les alertes à examiner, sans exécuter d’URI ni de code.'
                  : 'Imports remain alerts to review; no URI or code is executed.'}
              </>
            )}
          </Note>
          {!files.length && (
            <Field
              title={locale === 'fr' ? 'Ou coller le rapport JSON' : 'Or paste the JSON report'}
            >
              <textarea name="sourceText" rows={6} maxLength={524288} required />
            </Field>
          )}
        </>
      )}
      <Note>
        {locale === 'fr'
          ? 'Les contenus sont chiffrés côté serveur. Les sources brutes ne sont jamais incluses dans les rapports.'
          : 'Content is encrypted on the server. Raw sources are never included in reports.'}
      </Note>
    </Form>
  );
}

export function AuditWizard({
  data,
  locale,
  person,
  engines,
  mutate,
  close,
  launched,
}: FormContext & { launched: () => void }) {
  const t = copy[locale];
  const action = useAction(locale);
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState('');
  const [mandateId, setMandateId] = useState('');
  const [assets, setAssets] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<Engine[]>([]);
  const [title, setTitle] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const steps = [
    t.client,
    t.mandates,
    t.assets,
    t.categories,
    t.engines,
    t.parameters,
    t.validationStep,
  ];
  const mandate = data.mandates.find((m) => m.mandate.id === mandateId);
  const relevant = data.assets.filter((a) => a.clientId === clientId && !a.archivedAt);
  const usable = (m: Snapshot['mandates'][number]) =>
    !!m.approved &&
    !m.revokedAt &&
    m.currentRevision === 1 &&
    new Date(m.version.validFrom) <= new Date() &&
    new Date(m.version.validUntil) > new Date() &&
    m.version.responsibleUserId === person.id;
  const compatible = (engine: Engine) =>
    assets.every((id) => {
      const asset = relevant.find((a) => a.id === id);
      return !!asset && engineCompatible(engine, asset.target.kind);
    });
  const sourceFor = (assetId: string, engine: Engine) =>
    data.sources.find(
      (s) =>
        s.assetId === assetId &&
        s.kind === (engine === 'json' || engine === 'sarif' ? engine : 'files') &&
        !s.purgedAt &&
        new Date(s.expiresAt) > new Date(),
    );
  const sourcesReady = selected.every(
    (engine) => engine === 'web-passive' || assets.every((asset) => !!sourceFor(asset, engine)),
  );
  const enginesReady =
    selected.length > 0 &&
    selected.every(
      (engine) =>
        engines.find((e) => e.id === engine)?.available &&
        mandate?.mandate.engines.includes(engine) &&
        compatible(engine),
    );
  const ready = [
    !!clientId,
    !!mandate && usable(mandate),
    assets.length > 0,
    categories.length > 0,
    enginesReady,
    sourcesReady && !!title.trim(),
    confirm && enginesReady && sourcesReady && !!mandate && usable(mandate),
  ][step];
  const toggle = (list: string[], item: string) =>
    list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
  return (
    <div className="cyber-wizard">
      <ol className="cyber-steps">
        {steps.map((name, index) => (
          <li
            key={name}
            aria-current={index === step ? 'step' : undefined}
            className={index < step ? 'done' : ''}
          >
            <span>{index < step ? <Icon name="check" size={14} /> : index + 1}</span>
            <small>{name}</small>
          </li>
        ))}
      </ol>
      <div className="cyber-step-content">
        {step === 0 && (
          <>
            <h3>
              {locale === 'fr'
                ? 'Pour quel client intervenez-vous ?'
                : 'Which client are you working with?'}
            </h3>
            <Field title={t.client}>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setMandateId('');
                  setAssets([]);
                  setSelected([]);
                }}
                required
              >
                <option value="">
                  {locale === 'fr' ? 'Sélectionner un client' : 'Select a client'}
                </option>
                {data.clients
                  .filter((c) => !c.archivedAt)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            {!data.clients.filter((c) => !c.archivedAt).length && <Empty>{t.newClient}</Empty>}
          </>
        )}
        {step === 1 && (
          <>
            <h3>
              {locale === 'fr'
                ? 'Une autorisation valide, avant toute analyse.'
                : 'Valid authorization before every analysis.'}
            </h3>
            <p className="cyber-muted">
              {locale === 'fr'
                ? 'Seul le responsable désigné peut lancer un mandat approuvé pendant sa fenêtre de validité.'
                : 'Only the designated owner can launch an approved engagement during its authorized time window.'}
            </p>
            {data.mandates
              .filter((m) => m.mandate.clientId === clientId)
              .map((m) => (
                <label className={`cyber-choice${usable(m) ? '' : ' disabled'}`} key={m.mandate.id}>
                  <input
                    type="radio"
                    name="mandate"
                    value={m.mandate.id}
                    checked={mandateId === m.mandate.id}
                    disabled={!usable(m)}
                    onChange={() => {
                      setMandateId(m.mandate.id);
                      setAssets([]);
                      setSelected([]);
                    }}
                  />
                  <span>
                    <strong>{m.mandate.reference}</strong>
                    <small>
                      {date(m.version.validFrom, locale, true)} →{' '}
                      {date(m.version.validUntil, locale, true)}
                    </small>
                    <small>
                      {m.approved ? t.approved : t.pending} · {m.mandate.emergencyContact}
                    </small>
                    {m.version.responsibleUserId !== person.id && (
                      <small>
                        {locale === 'fr'
                          ? 'Réservé au responsable désigné'
                          : 'Reserved for the designated owner'}
                      </small>
                    )}
                    {m.revokedAt && (
                      <small>{locale === 'fr' ? 'Mandat révoqué' : 'Revoked engagement'}</small>
                    )}
                  </span>
                </label>
              ))}
            {!data.mandates.some((m) => m.mandate.clientId === clientId) && (
              <Empty>
                {locale === 'fr'
                  ? 'Enregistrez et approuvez un mandat dans la fiche client.'
                  : 'Record and approve an engagement in the client page.'}
              </Empty>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <h3>{t.scopeChecked}</h3>
            {relevant
              .filter((a) => mandate?.mandate.assetIds.includes(a.id))
              .map((a) => (
                <Check
                  key={a.id}
                  checked={assets.includes(a.id)}
                  disabled={
                    mandate?.mandate.excludedAssetIds.includes(a.id) ||
                    (!assets.includes(a.id) && assets.length >= 20)
                  }
                  onChange={() => {
                    setAssets(toggle(assets, a.id));
                    setSelected([]);
                  }}
                >
                  <strong>{a.label}</strong>
                  <small>
                    {a.target.kind} · {a.target.value}
                  </small>
                </Check>
              ))}
            <Note>
              <strong>{t.limitations}</strong>
              <br />
              {mandate?.mandate.limitations}
              <br />
              {t.exclusions}:{' '}
              {mandate?.mandate.excludedAssetIds
                .map((id) => data.assets.find((a) => a.id === id)?.label ?? id)
                .join(', ') || '—'}
            </Note>
          </>
        )}
        {step === 3 && (
          <>
            <h3>
              {locale === 'fr'
                ? 'Choisissez la couverture de cet audit.'
                : 'Choose this audit’s coverage.'}
            </h3>
            <div className="cyber-choice-grid">
              {(['code', 'dependencies', 'secrets', 'web', 'import'] as const).map((category) => (
                <Check
                  key={category}
                  checked={categories.includes(category)}
                  onChange={() => {
                    const next = toggle(categories, category);
                    setCategories(next);
                    setSelected(selected.filter((engine) => next.includes(engineCategory[engine])));
                  }}
                >
                  <strong>{t[category]}</strong>
                </Check>
              ))}
            </div>
            <Note>{t.future}</Note>
          </>
        )}
        {step === 4 && (
          <>
            <h3>{t.engines}</h3>
            <div className="cyber-engine-grid">
              {allEngines
                .filter((engine) => categories.includes(engineCategory[engine]))
                .map((engine) => {
                  const capability = engines.find((e) => e.id === engine);
                  const allowed = mandate?.mandate.engines.includes(engine) && compatible(engine);
                  const available = !!capability?.available;
                  return (
                    <label
                      key={engine}
                      className={`cyber-engine${!available || !allowed ? ' disabled' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(engine)}
                        disabled={!available || !allowed}
                        onChange={() => setSelected(toggle(selected, engine) as Engine[])}
                      />
                      <span>
                        <strong>
                          {engine}
                          <span className={`cyber-availability${available ? ' available' : ''}`}>
                            {available ? t.available : t.unavailable}
                          </span>
                        </strong>
                        <small>{capability?.version ?? '—'}</small>
                        <small>
                          {!allowed
                            ? locale === 'fr'
                              ? 'Hors du mandat ou incompatible avec le périmètre.'
                              : 'Outside this engagement or incompatible with this scope.'
                            : !available
                              ? engineReason(capability?.reason, locale)
                              : engine === 'json' || engine === 'sarif'
                                ? locale === 'fr'
                                  ? 'Import déclaré · aucune installation de moteur revendiquée.'
                                  : 'Declared import · no native engine installation claimed.'
                                : t.passiveOnly}
                        </small>
                      </span>
                    </label>
                  );
                })}
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <h3>
              {locale === 'fr'
                ? 'Paramètres révisés et sources privées.'
                : 'Reviewed parameters and private sources.'}
            </h3>
            <Field title={t.auditTitle}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                required
              />
            </Field>
            <Note>
              {t.passiveOnly}
              <br />
              {t.duration}
              <br />
              {locale === 'fr'
                ? 'Profils fixes, aucun argument ni commande libre. Les moteurs hors ligne utilisent des conteneurs sans réseau.'
                : 'Fixed profiles with no arbitrary arguments or commands. Offline engines use containers without a network.'}
            </Note>
            <h4>{t.source}</h4>
            {assets.map((assetId) => (
              <div className="cyber-source-check" key={assetId}>
                <strong>{relevant.find((a) => a.id === assetId)?.label}</strong>
                {selected.map((engine) => (
                  <span key={engine}>
                    {engine} ·{' '}
                    {engine === 'web-passive'
                      ? locale === 'fr'
                        ? 'HEAD HTTPS / et TXT DNS uniquement'
                        : 'HTTPS HEAD / and DNS TXT only'
                      : (sourceFor(assetId, engine)?.name ??
                        (locale === 'fr'
                          ? 'Source compatible manquante'
                          : 'Missing compatible source'))}
                  </span>
                ))}
              </div>
            ))}
            {!sourcesReady && <Note warning>{t.chooseSource}</Note>}
          </>
        )}
        {step === 6 && (
          <>
            <h3>{locale === 'fr' ? 'Vérifiez. Confirmez. Lancez.' : 'Review. Confirm. Launch.'}</h3>
            <dl className="cyber-summary">
              <div>
                <dt>{t.client}</dt>
                <dd>{data.clients.find((c) => c.id === clientId)?.name}</dd>
              </div>
              <div>
                <dt>{t.reference}</dt>
                <dd>{mandate?.mandate.reference}</dd>
              </div>
              <div>
                <dt>{t.window}</dt>
                <dd>
                  {date(mandate?.version.validFrom, locale, true)} →{' '}
                  {date(mandate?.version.validUntil, locale, true)}
                </dd>
              </div>
              <div>
                <dt>{t.assets}</dt>
                <dd>
                  {assets.map((id) => relevant.find((a) => a.id === id)?.target.value).join(', ')}
                </dd>
              </div>
              <div>
                <dt>{t.engines}</dt>
                <dd>{selected.join(', ')}</dd>
              </div>
              <div>
                <dt>{t.limitations}</dt>
                <dd>{mandate?.mandate.limitations}</dd>
              </div>
              <div>
                <dt>{t.emergency}</dt>
                <dd>{mandate?.mandate.emergencyContact}</dd>
              </div>
            </dl>
            <Note>{t.human}</Note>
            <Check checked={confirm} onChange={(e) => setConfirm(e.target.checked)}>
              {t.confirmLaunch}
            </Check>
          </>
        )}
      </div>
      {action.error && (
        <div className="cyber-error" role="alert">
          {action.error}
        </div>
      )}
      <footer className="cyber-form-actions">
        <span className="cyber-muted cyber-step-counter">{step + 1} / 7</span>
        <button
          type="button"
          className="cyber-button secondary"
          onClick={() => (step ? setStep(step - 1) : close())}
          disabled={action.pending}
        >
          {step ? t.back : t.cancel}
        </button>
        <button
          type="button"
          className="cyber-button"
          disabled={!ready || action.pending}
          onClick={() => {
            if (step < 6) {
              setStep(step + 1);
              return;
            }
            void action.run(async () => {
              await mutate('audits', 'POST', {
                clientId,
                mandateId,
                assetIds: assets,
                engines: selected,
                idempotencyKey,
                title: title.trim(),
              });
              launched();
              close();
            });
          }}
        >
          {action.pending ? <span className="cyber-spinner" /> : null}
          {step === 6 ? t.start : t.next}
          {step < 6 && <Icon name="arrow" size={17} />}
        </button>
      </footer>
    </div>
  );
}
