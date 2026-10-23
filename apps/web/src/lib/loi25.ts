import { type Loi25AuditReport, Loi25AuditReportSchema, type Loi25Finding } from '@bump/contracts';
import { getApiOrigin } from './health';

export function auditApiOrigin() {
  const origin = getApiOrigin();
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) {
    throw new Error('Audits require a local API until tenant authorization is available');
  }
  return origin;
}

export async function getAudit(id: string): Promise<Loi25AuditReport | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const response = await fetch(`${auditApiOrigin()}/api/audits/${id}`, {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('Audit unavailable');
  return Loi25AuditReportSchema.parse(await response.json());
}

export const severityLabels = {
  CRITIQUE: 'Critique',
  ELEVE: 'Élevé',
  MOYEN: 'Moyen',
  CONFORME: 'Signal favorable',
};
export const cad = (amount: number) =>
  new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amount);
export function proposalSteps(findings: Loi25Finding[]) {
  const steps = [
    { title: 'Mise en conformité urgente Loi 25 & DNS', findings: [] as Loi25Finding[] },
    {
      title: 'Sécurisation des formulaires & workflows de consentement',
      findings: [] as Loi25Finding[],
    },
    { title: 'Gouvernance IA & suivi continu', findings: [] as Loi25Finding[] },
  ];
  for (const finding of findings.filter((f) => f.severity !== 'CONFORME')) {
    const step =
      finding.category === 'RESPONSABLE_ET_POLITIQUE' ||
      finding.category === 'SECURITE_COURRIEL_DNS'
        ? 0
        : finding.category === 'FORMULAIRES_ET_COLLECTE' ||
            finding.category === 'CONSENTEMENT_COOKIES_PROFILAGE'
          ? 1
          : 2;
    steps[step]!.findings.push(finding);
  }
  return steps.map((step) => ({
    ...step,
    total: step.findings.reduce((sum, f) => sum + f.estimatedFixCad, 0),
  }));
}
