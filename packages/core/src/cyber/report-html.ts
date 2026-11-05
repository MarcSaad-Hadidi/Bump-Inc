import { type CyberReportSnapshot, cyberReportSnapshotSchema } from '@bump/contracts';
export const reportLabels = {
  fr: {
    title: 'Rapport d’audit cybersécurité',
    confidential: 'CONFIDENTIEL — DIFFUSION RESTREINTE',
    draft: 'BROUILLON — VALIDATION HUMAINE REQUISE',
    approved: 'VALIDÉ POUR DIFFUSION AUTORISÉE',
    client: 'Client',
    mandate: 'Mandat',
    date: 'Date du rapport',
    responsible: 'Responsable',
    scope: 'Périmètre examiné',
    limits: 'Limites et exclusions',
    executive: 'Résumé exécutif',
    method: 'Méthodologie',
    tools: 'Outils et versions',
    coverage: 'Couverture des tests',
    confirmed: 'Résultats examinés et confirmés',
    risks: 'Risques prioritaires',
    technical: 'Constats techniques',
    recommendations: 'Recommandations',
    remediation: 'Plan de remédiation',
    retests: 'Vérifications et retests',
    annex: 'Annexes techniques',
    none: 'Aucun élément enregistré.',
    unknown:
      'Une absence de constat confirmé ne certifie ni la sécurité du système ni l’absence de vulnérabilités.',
    unreviewed: 'Constats à examiner, exclus des résultats confirmés',
    falsePositive: 'Faux positifs exclus',
    human:
      'Les alertes automatiques ont été distinguées des constats examinés par un humain. Aucun test d’exploitation n’est attesté automatiquement.',
    methodBody:
      'Analyse des actifs explicitement autorisés, contrôles passifs ou analyses hors ligne de fichiers fournis, normalisation des sorties, corrélation technique puis revue humaine. Les rapports importés sont identifiés comme tels et leurs versions sont déclarées. Les résultats ne couvrent que les méthodes, fichiers et moteurs indiqués.',
    severity: 'Sévérité technique',
    priority: 'Priorité métier',
    confidence: 'Confiance',
    evidence: 'Preuves minimisées',
    selectedEvidence: 'Preuves de l’audit sélectionné',
    historicalEvidence:
      'Preuves historiques d’un audit antérieur — aucune détection attestée dans l’audit sélectionné',
    resolution: 'Résolution enregistrée',
    resolutionAudit: 'Audit de la résolution',
    retestAudit: 'Audit du retest',
    resolutions: {
      verified_fixed: 'Correction vérifiée',
      accepted_risk: 'Risque accepté',
      false_positive: 'Faux positif',
    },
    impact: 'Impact métier évalué',
    fix: 'Correction recommandée',
    source: 'Origine',
    state: 'État',
    owner: 'Responsable',
    deadline: 'Échéance',
    refs: 'Références',
    integrity: 'Empreintes SHA-256 des sources et de couverture',
    noSecrets:
      'Aucun secret complet, code source brut ou identifiant cloud ne figure dans ce rapport.',
    coverageWarning:
      'Un test échoué, annulé, absent ou de couverture différente ne constitue pas un contrôle favorable. « Non observé » ne signifie pas « corrigé ». EPSS et CISA KEV restent inconnus tant qu’aucune source vérifiée n’est intégrée.',
  },
  en: {
    title: 'Cybersecurity audit report',
    confidential: 'CONFIDENTIAL — RESTRICTED DISTRIBUTION',
    draft: 'DRAFT — HUMAN APPROVAL REQUIRED',
    approved: 'APPROVED FOR AUTHORIZED DISTRIBUTION',
    client: 'Client',
    mandate: 'Engagement',
    date: 'Report date',
    responsible: 'Consultant',
    scope: 'Examined scope',
    limits: 'Limits and exclusions',
    executive: 'Executive summary',
    method: 'Methodology',
    tools: 'Tools and versions',
    coverage: 'Test coverage',
    confirmed: 'Human-reviewed findings',
    risks: 'Priority risks',
    technical: 'Technical findings',
    recommendations: 'Recommendations',
    remediation: 'Remediation plan',
    retests: 'Verification and retests',
    annex: 'Technical appendix',
    none: 'No recorded items.',
    unknown:
      'The absence of confirmed findings certifies neither system security nor the absence of vulnerabilities.',
    unreviewed: 'Unreviewed findings excluded from confirmed results',
    falsePositive: 'Excluded false positives',
    human:
      'Automated alerts were distinguished from human-reviewed findings. Successful exploitation is never asserted automatically.',
    methodBody:
      'Analysis of explicitly authorized assets, passive checks or offline analysis of provided files, output normalization, technical correlation and human review. Imported reports and their declared versions are identified. Results cover only the listed methods, files and engines.',
    severity: 'Technical severity',
    priority: 'Business priority',
    confidence: 'Confidence',
    evidence: 'Minimized evidence',
    selectedEvidence: 'Evidence from the selected audit',
    historicalEvidence:
      'Historical evidence from an earlier audit — not a detection in the selected audit',
    resolution: 'Recorded resolution',
    resolutionAudit: 'Resolution audit',
    retestAudit: 'Retest audit',
    resolutions: {
      verified_fixed: 'Verified correction',
      accepted_risk: 'Accepted risk',
      false_positive: 'False positive',
    },
    impact: 'Assessed business impact',
    fix: 'Recommended correction',
    source: 'Source',
    state: 'State',
    owner: 'Assignee',
    deadline: 'Due date',
    refs: 'References',
    integrity: 'Source and coverage SHA-256 digests',
    noSecrets: 'No complete secret, raw source code or cloud credential appears in this report.',
    coverageWarning:
      'Failed, cancelled, missing or different coverage is not a favorable result. Not observed does not mean fixed. EPSS and CISA KEV remain unknown until a verified source is integrated.',
  },
} as const;
type ReportFinding = CyberReportSnapshot['findings'][number];
export function isPriorityCyberReportFinding(finding: ReportFinding) {
  return ['confirmed', 'planned', 'in_progress', 'to_retest'].includes(finding.status);
}
export function reportEvidenceLabel(
  finding: ReportFinding,
  selectedAuditId: string,
  locale: CyberReportSnapshot['locale'],
) {
  const t = reportLabels[locale];
  // v1 only contained observations from its selected audit.
  const auditId = 'evidenceAuditId' in finding ? finding.evidenceAuditId : selectedAuditId;
  const historical = 'evidenceFromSelectedAudit' in finding && !finding.evidenceFromSelectedAudit;
  return `${historical ? t.historicalEvidence : t.selectedEvidence}: ${auditId}`;
}
export function reportResolutionLabel(
  finding: ReportFinding,
  locale: CyberReportSnapshot['locale'],
) {
  if (!('resolution' in finding) || !finding.resolution) return null;
  const t = reportLabels[locale];
  const r = finding.resolution;
  return `${t.resolution}: ${t.resolutions[r.kind]} · ${r.reviewedAt} · ${r.reviewerId}${r.auditId ? `\n${t.resolutionAudit}: ${r.auditId}` : ''}\n${r.note}`;
}
export function escapeReport(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
export function renderCyberReportHtml(input: CyberReportSnapshot, approved: boolean) {
  const s = cyberReportSnapshotSchema.parse(input),
    t = reportLabels[s.locale],
    e = escapeReport;
  const p = (text: string) => `<p>${e(text)}</p>`;
  const section = (title: string, body: string) => `<section><h2>${e(title)}</h2>${body}</section>`;
  const table = (headers: string[], rows: unknown[][]) =>
    rows.length
      ? `<table><thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${e(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : p(t.none);
  const cover = `<header class="cover"><div class="brand">bump<span>.</span></div><div>BUMP CONSULTATION · BUMP CYBER</div><h1>${e(t.title)}</h1><h2>${e(s.client.name)}</h2><dl><dt>${e(t.mandate)}</dt><dd>${e(s.mandate.reference)}</dd><dt>${e(t.date)}</dt><dd>${e(s.createdAt)}</dd><dt>${e(t.responsible)}</dt><dd>${e(s.audit.responsible)}</dd></dl><p class="stamp">${e(approved ? t.approved : t.draft)}</p><small>${e(t.confidential)}<br>${e(s.reportId)}</small></header>`;
  const findings = s.findings
    .map(
      (f, i) =>
        `<article><h3>${i + 1}. ${e(f.observation.title)}</h3><p class="meta">${e(f.id)} · ${e(f.status)}</p>${reportResolutionLabel(f, s.locale) ? p(reportResolutionLabel(f, s.locale)!) : ''}${table([t.severity, t.priority, t.confidence], [[f.observation.severity, f.priority.score, f.observation.confidence]])}${p(s.assets.find((a) => a.id === f.assetId)?.label ?? f.assetId)}${p(reportEvidenceLabel(f, s.audit.id, s.locale))}${p(`${t.source}: ${f.sources.map((v) => `${v.engine} ${v.version} · ${v.detectedAt}`).join('; ')}`)}${p(`${f.observation.location} · ${f.observation.component} ${f.observation.affectedVersion}`)}${p(`${f.observation.cve ?? ''}${f.observation.cvss === null ? '' : ` · CVSS ${f.observation.cvss}`}`)}<h4>${e(t.evidence)}</h4>${p(f.observation.evidence)}<h4>${e(t.impact)}</h4>${p(f.businessImpact)}${p(f.priority.factors.join('; '))}<h4>${e(t.fix)}</h4>${p(f.recommendation)}<h4>${e(t.refs)}</h4>${f.observation.references.length ? `<ul>${f.observation.references.map((url) => `<li><a href="${e(url)}" rel="noreferrer">${e(url)}</a></li>`).join('')}</ul>` : p(t.none)}</article>`,
    )
    .join('');
  const body =
    cover +
    section(
      t.executive,
      p(s.executiveSummary) +
        p(t.unknown) +
        p(`${t.unreviewed}: ${s.unreviewedCount}. ${t.falsePositive}: ${s.falsePositiveCount}.`),
    ) +
    section(
      t.scope,
      table(
        [t.client, 'Actif / Asset', 'Type', 'Cible / Target'],
        s.assets.map((a) => [s.client.name, a.label, a.kind, a.target]),
      ) +
        p(
          `${t.mandate}: ${s.mandate.reference} · ${s.mandate.signedBy} · ${s.mandate.authorizedAt}`,
        ) +
        p(`${s.mandate.validFrom} → ${s.mandate.validUntil}`),
    ) +
    section(
      t.limits,
      p(s.mandate.limitations) +
        s.mandate.exclusions.map((a) => p(`${a.label} · ${a.target}`)).join('') +
        p(s.reviewNotes) +
        p(t.coverageWarning),
    ) +
    section(t.method, p(t.methodBody) + p(t.human)) +
    section(
      t.tools,
      table(
        ['Moteur / Engine', 'Version', t.state, 'Observations'],
        s.scans.map((v) => [v.engine, v.version, v.state, v.observationCount ?? 'unknown']),
      ),
    ) +
    section(
      t.coverage,
      p(t.coverageWarning) +
        table(
          ['Scan', t.state, 'Code'],
          s.scans.map((v) => [v.id, v.state, v.errorCode ?? '—']),
        ),
    ) +
    section(
      t.confirmed,
      table(
        ['ID', 'Constat / Finding', t.severity, t.state],
        s.findings.map((f) => [f.id, f.observation.title, f.observation.severity, f.status]),
      ),
    ) +
    section(
      t.risks,
      table(
        ['Constat / Finding', t.priority, t.impact],
        s.findings
          .filter(isPriorityCyberReportFinding)
          .map((f) => [f.observation.title, f.priority.score, f.businessImpact]),
      ),
    ) +
    section(t.technical, findings || p(t.none)) +
    section(
      t.recommendations,
      s.findings.map((f) => `<h3>${e(f.observation.title)}</h3>${p(f.recommendation)}`).join('') ||
        p(t.none),
    ) +
    section(
      t.remediation,
      table(
        ['ID', t.owner, t.deadline, 'Action', t.state],
        s.tasks.map((v) => [v.findingId, v.assignee, v.dueAt, v.description, v.status]),
      ),
    ) +
    section(
      t.retests,
      table(
        ['ID', t.retestAudit, t.state, 'Note'],
        s.retests.map((v) => [v.findingId, v.auditId, v.conclusion, v.note]),
      ),
    ) +
    section(
      t.annex,
      p(t.noSecrets) +
        `<h3>${e(t.integrity)}</h3>` +
        s.scans
          .map(
            (v) =>
              `<p><strong>${e(v.engine)} · ${e(v.id)}</strong><br><code>${e(v.sourceSha256 ?? 'not applicable')}</code><br><code>${e(v.coverageHash ?? 'unknown')}</code></p>`,
          )
          .join(''),
    );
  return `<!doctype html><html lang="${s.locale}"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Bump Cyber — ${e(s.client.name)}</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font:11pt/1.55 Arial,sans-serif;color:#15223a;margin:0}h1{font-size:36pt;line-height:1.1}h2{font-size:20pt;color:#123ac7;margin-top:28pt;break-after:avoid}h3{font-size:14pt;break-after:avoid}h4{margin-bottom:0}p,td,dd{overflow-wrap:anywhere;white-space:pre-wrap}.brand{font-weight:800;font-size:64pt;letter-spacing:-4pt}.brand span{color:#1649df}.cover{min-height:90vh;display:flex;flex-direction:column;justify-content:center;break-after:page}.cover h2{font-size:26pt;color:#15223a}.stamp{border-left:4px solid #1649df;padding:12pt;color:#123ac7;font-size:12pt}dt{font-weight:bold}dd{margin:0 0 12pt}table{width:100%;border-collapse:collapse;margin:12pt 0;font-size:9pt}th{text-align:left;background:#eef2f9}td,th{padding:8pt;border-bottom:1px solid #dae1ed;vertical-align:top}article{padding:8pt 0 16pt;border-bottom:1px solid #dae1ed}.meta,small{font-size:8pt;color:#55647c}code{font:8pt/1.5 monospace;overflow-wrap:anywhere}a{color:#123ac7}section{margin-bottom:22pt}tr{break-inside:avoid}@media screen{body{max-width:850px;margin:32px auto;padding:36px;background:white}html{background:#eef1f6}.cover{min-height:800px}}</style></head><body>${body}</body></html>`;
}
