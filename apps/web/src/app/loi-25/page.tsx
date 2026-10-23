'use client';

import {
  type Loi25AuditReport,
  Loi25AuditReportSchema,
  type Loi25Finding,
  type UpdateLoi25Finding,
} from '@bump/contracts';
import { type FormEvent, useEffect, useState } from 'react';
import { cad, severityLabels } from '../../lib/loi25';

function FindingEditor({
  finding,
  auditId,
  onSaved,
}: {
  finding: Loi25Finding;
  auditId: string;
  onSaved(report: Loi25AuditReport): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch: UpdateLoi25Finding = {
      humanVerified: data.has('verified'),
      estimatedFixCad: Number(data.get('price')),
      remediationPitchFr: String(data.get('pitch')),
    };
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/audits/${auditId}/findings/${finding.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error();
      onSaved(Loi25AuditReportSchema.parse(await response.json()));
    } catch {
      setError('Enregistrement impossible. Vos modifications restent dans le formulaire.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="finding">
      <span className={`badge ${finding.severity}`}>{severityLabels[finding.severity]}</span>
      <span className="article">{finding.lawArticle}</span>
      <h3>{finding.titleFr}</h3>
      <p>{finding.descriptionFr}</p>
      <details>
        <summary>Preuve technique à valider</summary>
        <pre>{JSON.stringify(finding.evidence, null, 2)}</pre>
      </details>
      <form onSubmit={save}>
        <label className="checkbox">
          <input type="checkbox" name="verified" defaultChecked={finding.humanVerified} />
          Vérifié par un expert Bump (Human-in-the-loop)
        </label>
        <label>
          Estimation (CAD)
          <input
            name="price"
            type="number"
            min="0"
            max="10000000"
            step="1"
            required
            defaultValue={finding.estimatedFixCad}
          />
        </label>
        <label>
          Intervention proposée
          <textarea
            name="pitch"
            rows={3}
            maxLength={5000}
            required
            defaultValue={finding.remediationPitchFr}
          />
        </label>
        <button disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer la validation'}</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </article>
  );
}

export default function Loi25Console() {
  const [report, setReport] = useState<Loi25AuditReport>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storage, setStorage] = useState('');
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('audit');
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    const controller = new AbortController();
    setBusy(true);
    fetch(`/api/audits/${id}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const report = Loi25AuditReportSchema.parse(await response.json());
        if (!controller.signal.aborted) {
          setReport(report);
          setStorage(response.headers.get('x-audit-storage') ?? '');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Rapport introuvable ou service indisponible.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, []);
  async function scan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setReport(undefined);
    try {
      const response = await fetch('/api/audits/loi25', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companyName: data.get('company'), domain: data.get('domain') }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 400
            ? 'Vérifiez le nom et le domaine public, sans chemin ni port.'
            : 'Audit indisponible. Vérifiez l’API locale et réessayez.',
        );
      setStorage(response.headers.get('x-audit-storage') ?? '');
      const report = Loi25AuditReportSchema.parse(await response.json());
      setReport(report);
      window.history.replaceState(null, '', `/loi-25?audit=${report.auditId}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Audit impossible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <a className="brand" href="/">
          BUMP INC.
        </a>
        <span>CONSOLE INTERNE · LOI 25</span>
      </header>
      <p className="eyebrow">La confiance commence par la transparence</p>
      <h1>
        Voyez les risques.
        <br />
        Priorisez les actions.
      </h1>
      <p>
        Repérage technique passif pour PME québécoises. Lecture de pages publiques et DNS, sans
        exploitation ni soumission de formulaire.
      </p>
      <p className="notice">
        Développement local uniquement. La livraison client exige une validation humaine. Cet indice
        ne constitue pas un avis juridique.
      </p>
      <form className="scan-form" onSubmit={scan}>
        <label>
          Nom de l’entreprise
          <input name="company" required maxLength={200} autoComplete="organization" />
        </label>
        <label>
          Domaine (ex: clinique-exemple.ca)
          <input
            name="domain"
            required
            maxLength={300}
            placeholder="clinique-exemple.ca"
            autoCapitalize="none"
          />
        </label>
        <button disabled={busy}>
          {busy ? 'Analyse des pages publiques et du DNS…' : 'Lancer l’audit Loi 25 (Passif)'}
        </button>
      </form>
      <div aria-live="polite">
        {busy && (
          <p>
            Analyse en cours. La collecte est limitée à 12 secondes; l’enregistrement peut prendre
            quelques secondes de plus.
          </p>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {report && (
        <section aria-label="Résultats de l’audit">
          {storage === 'memory' && (
            <p className="notice">
              Mémoire temporaire : rapport perdu au redémarrage ou après 24 heures. Aucune
              sauvegarde PostgreSQL.
            </p>
          )}
          <div className="score">
            <strong>
              {report.score}
              <small>/100</small>
            </strong>
            <span className="grade">{report.grade}</span>
            <div>
              <h2>{report.companyName}</h2>
              <p>
                {report.domain} ·{' '}
                {report.status === 'FAILED' ? 'Échec de collecte' : 'Collecte terminée'}
              </p>
            </div>
          </div>
          <p>{report.summaryFr}</p>
          <p>
            {report.findings.filter((f) => f.humanVerified).length} / {report.findings.length}{' '}
            constats validés · Proposition validée :{' '}
            {cad(
              report.findings
                .filter((f) => f.humanVerified && f.severity !== 'CONFORME')
                .reduce((sum, f) => sum + f.estimatedFixCad, 0),
            )}
          </p>
          <nav className="actions">
            <a className="button" href={`/loi-25/rapport/${report.auditId}`}>
              Ouvrir le rapport client (PDF / Partage)
            </a>
            <a href={`/loi-25/rapport/${report.auditId}?preview=1`}>
              Aperçu interne — tous les constats
            </a>
          </nav>
          {(['CRITIQUE', 'ELEVE', 'MOYEN', 'CONFORME'] as const).map((severity) => {
            const findings = report.findings.filter((f) => f.severity === severity);
            return findings.length ? (
              <section key={severity}>
                <h2>
                  {severityLabels[severity]} · {findings.length}
                </h2>
                {findings.map((finding) => (
                  <FindingEditor
                    key={`${report.auditId}/${finding.id}`}
                    finding={finding}
                    auditId={report.auditId}
                    onSaved={setReport}
                  />
                ))}
              </section>
            ) : null;
          })}
        </section>
      )}
    </main>
  );
}
