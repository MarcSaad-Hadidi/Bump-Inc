import { randomUUID } from 'node:crypto';
import type { Loi25AuditReport, Loi25Finding } from '@bump/contracts';
import type { Check } from './check.js';

export function scoreChecks(
  checks: Check[],
): Pick<Loi25AuditReport, 'findings' | 'score' | 'grade' | 'summaryFr'> {
  const findings: Loi25Finding[] = checks.map(({ key, passed, severity, ...check }) => ({
    ...check,
    id: randomUUID(),
    humanVerified: false,
    severity: passed === true ? 'CONFORME' : passed === null ? 'MOYEN' : severity,
    titleFr: passed === null ? `${check.titleFr} — vérification incomplète` : check.titleFr,
    evidence: {
      ...check.evidence,
      check: key,
      result: passed === null ? 'INCONNU' : passed ? 'OBSERVE' : 'A_VERIFIER',
    },
    estimatedFixCad: passed === true ? 0 : check.estimatedFixCad,
  }));
  const penalties = { CRITIQUE: 20, ELEVE: 10, MOYEN: 5, CONFORME: 0 };
  const score = checks.length
    ? Math.max(0, 100 - findings.reduce((total, f) => total + penalties[f.severity], 0))
    : 0;
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';
  const concerns = findings.filter((finding) => finding.severity !== 'CONFORME').length;
  return {
    findings,
    score,
    grade,
    summaryFr: `Indice technique indicatif : ${score}/100. ${concerns} point(s) à examiner. Ce repérage passif limité aux pages visitées ne certifie pas la conformité à la Loi 25. Les éléments non observables et les conclusions juridiques nécessitent une validation humaine.`,
  };
}
