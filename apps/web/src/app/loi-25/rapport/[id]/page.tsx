import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cad, getAudit, proposalSteps, severityLabels } from '../../../../lib/loi25';
import { PrintButton } from './print-button';

export const dynamic = 'force-dynamic';

export default async function ClientReport({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const host = (await headers()).get('host') ?? '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) notFound();
  const { id } = await params;
  let report;
  try {
    report = await getAudit(id);
  } catch {
    return (
      <main>
        <h1>Rapport indisponible</h1>
        <p>
          Vérifiez que l’API locale et sa base de données sont accessibles. Un rapport temporaire
          peut avoir expiré.
        </p>
        <a href="/loi-25">Retour à la console</a>
      </main>
    );
  }
  if (!report) notFound();
  const preview = (await searchParams).preview === '1';
  const findings = report.findings.filter((finding) => preview || finding.humanVerified);
  const steps = proposalSteps(findings);
  const total = steps.reduce((sum, step) => sum + step.total, 0);
  return (
    <main className="report">
      <nav className="no-print actions">
        <a href={`/loi-25?audit=${report.auditId}`}>Console opérateur</a>
        <PrintButton />
      </nav>
      {preview && (
        <p className="preview">
          APERÇU INTERNE — contient des constats non validés. Ne pas livrer au client.
        </p>
      )}
      <section className="report-page">
        <header>
          <span className="brand">BUMP INC.</span>
          <span>01 / SYNTHÈSE DIRIGEANT</span>
        </header>
        <p className="eyebrow">Loi 25 · Diagnostic technique passif</p>
        <h1>{report.companyName}</h1>
        <p>
          {report.domain} ·{' '}
          {new Date(report.scannedAt).toLocaleDateString('fr-CA', { timeZone: 'America/Toronto' })}
        </p>
        <div className="score">
          <strong>
            {report.score}
            <small>/100</small>
          </strong>
          <span className="grade">{report.grade}</span>
          <span>
            Indice technique automatisé
            <br />
            {report.status === 'FAILED'
              ? 'Collecte Web échouée — score non interprétable'
              : 'Périmètre public limité'}
          </span>
        </div>
        <h2>Votre exposition, en clair</h2>
        <p>{report.summaryFr}</p>
        <p>
          La protection des renseignements personnels soutient la confiance de vos clients. Des avis
          compréhensibles, des formulaires protégés et une messagerie résistante à l’usurpation
          réduisent des risques concrets et facilitent la préparation à un examen de la CAI.
        </p>
        <p className="notice">
          Le score porte sur l’ensemble des signaux automatisés, y compris ceux encore non validés.{' '}
          {findings.filter((f) => f.humanVerified).length} constats ont été validés par un
          opérateur. Une validation ne constitue pas une certification juridique.
        </p>
        <p>
          Portée : HTML public, en-têtes HTTP et DNS. Aucune exécution JavaScript, aucun test de
          formulaire, aucune vérification des pratiques internes ou du lieu réel d’hébergement.
        </p>
      </section>
      <section className="report-page">
        <header>
          <span className="brand">BUMP INC.</span>
          <span>02 / CONSTATS {preview ? 'EN APERÇU' : 'VALIDÉS'}</span>
        </header>
        <h2>Des observations aux décisions</h2>
        {!findings.length && (
          <p>
            Aucun constat validé pour livraison. L’expert Bump doit terminer sa revue avant de
            préparer une proposition.
          </p>
        )}
        {findings.map((finding) => (
          <article className="finding" key={finding.id}>
            <span className={`badge ${finding.severity}`}>{severityLabels[finding.severity]}</span>
            <span className="article">{finding.lawArticle}</span>
            <h3>{finding.titleFr}</h3>
            <p>{finding.descriptionFr}</p>
            <p>
              <strong>Enjeu pour votre entreprise : </strong>
              {finding.businessRiskFr}
            </p>
            {!finding.humanVerified && <p className="notice">À valider — usage interne</p>}
            <details>
              <summary>
                {finding.humanVerified
                  ? 'Preuve technique vérifiée'
                  : 'Preuve technique à vérifier'}
              </summary>
              <pre>{JSON.stringify(finding.evidence, null, 2)}</pre>
            </details>
          </article>
        ))}
      </section>
      <section className="report-page">
        <header>
          <span className="brand">BUMP INC.</span>
          <span>03 / PLAN D’ACTION</span>
        </header>
        <h2>Une feuille de route pour avancer</h2>
        <p>
          Estimation indicative en dollars canadiens, avant taxes, à confirmer après cadrage. Les
          signaux favorables ne sont pas facturés.
        </p>
        {steps.map((step, index) => (
          <article className="finding" key={step.title}>
            <h3>
              {index + 1}. {step.title}
            </h3>
            {step.findings.length ? (
              <ul>
                {step.findings.map((finding) => (
                  <li key={finding.id}>
                    {finding.remediationPitchFr} <strong>{cad(finding.estimatedFixCad)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Aucune intervention chiffrée dans le périmètre {preview ? 'prévisualisé' : 'validé'}
                .
              </p>
            )}
            <p className="subtotal">Sous-total : {cad(step.total)}</p>
          </article>
        ))}
        <p className="proposal-total">
          Investissement estimé <strong>{cad(total)}</strong>
        </p>
        <p>
          Prochaine étape : confirmer le périmètre avec Bump Inc., prioriser les risques validés et
          convenir des livrables. Ce document n’est pas un contrat.
        </p>
        <p className="fine-print">
          Référence :{' '}
          <a href="https://www.legisquebec.gouv.qc.ca/fr/document/lc/p-39.1">
            Loi sur la protection des renseignements personnels dans le secteur privé
          </a>
          . Les références sont des pistes d’analyse à confirmer selon les activités de
          l’entreprise.
        </p>
      </section>
    </main>
  );
}
