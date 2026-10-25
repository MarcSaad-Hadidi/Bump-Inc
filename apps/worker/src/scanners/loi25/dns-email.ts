import { Resolver } from 'node:dns/promises';
import type { Check } from './check.js';

export interface EmailDns {
  spf: string[] | null;
  dmarc: string[] | null;
  mx: { exchange: string; priority: number }[] | null;
}

export async function collectEmailDns(domain: string, signal: AbortSignal): Promise<EmailDns> {
  const resolver = new Resolver({ timeout: 1200, tries: 1 });
  const cancel = () => resolver.cancel();
  signal.throwIfAborted();
  signal.addEventListener('abort', cancel, { once: true });
  async function query<T>(operation: Promise<T>, absent: T): Promise<T | null> {
    try {
      return await operation;
    } catch (error) {
      return error instanceof Error &&
        'code' in error &&
        ['ENODATA', 'ENOTFOUND'].includes(String(error.code))
        ? absent
        : null;
    }
  }
  try {
    const [txt, dmarc, mx] = await Promise.all([
      query(resolver.resolveTxt(domain), []),
      query(resolver.resolveTxt(`_dmarc.${domain}`), []),
      query(resolver.resolveMx(domain), []),
    ]);
    return {
      spf: txt?.map((parts) => parts.join('')).filter((s) => /^v=spf1(?:\s|$)/i.test(s)) ?? null,
      dmarc: dmarc?.map((parts) => parts.join('')).filter((s) => /^v=DMARC1\s*;/i.test(s)) ?? null,
      mx,
    };
  } finally {
    signal.removeEventListener('abort', cancel);
    resolver.cancel();
  }
}

export function analyzeEmailDns(domain: string, data: EmailDns): Check[] {
  const base = {
    category: 'SECURITE_COURRIEL_DNS' as const,
    severity: 'ELEVE' as const,
    lawArticle: 'Loi 25, art. 10 (mesures de sécurité)',
    businessRiskFr:
      'L’usurpation de courriels peut tromper vos clients et exposer leurs renseignements personnels.',
    remediationPitchFr:
      'Bump inventorie les expéditeurs, configure SPF et déploie DMARC progressivement avec suivi.',
    estimatedFixCad: 350,
  };
  const record = data.dmarc?.length === 1 ? data.dmarc[0] : undefined;
  const policy =
    record?.match(/(?:^|;)\s*p=/gi)?.length === 1
      ? record.match(/(?:^|;)\s*p=(none|quarantine|reject)\s*(?:;|$)/i)?.[1]?.toLowerCase()
      : undefined;
  const pct = record?.match(/(?:^|;)\s*pct=(\d+)\s*(?:;|$)/i)?.[1];
  return [
    {
      ...base,
      key: 'spf',
      passed:
        data.spf === null
          ? null
          : data.spf.length === 1 && /\s[-~]all\s*$/i.test(data.spf[0] ?? ''),
      titleFr: 'Expéditeurs de courriel encadrés par SPF',
      descriptionFr:
        'Vérification du TXT SPF et de sa terminaison. La résolution complète des mécanismes SPF reste à valider.',
      evidence: { domain, records: data.spf },
    },
    {
      ...base,
      key: 'dmarc',
      passed:
        data.dmarc === null
          ? null
          : !!policy && policy !== 'none' && (pct === undefined || pct === '100'),
      titleFr: 'Protection DMARC contre l’usurpation',
      descriptionFr:
        'Une politique absente, en observation (p=none), multiple ou partielle ne protège pas pleinement le domaine.',
      evidence: {
        domain,
        records: data.dmarc,
        policy: policy ?? 'absent ou invalide',
        pct: pct ?? '100',
      },
    },
    {
      ...base,
      key: 'mx',
      severity: 'MOYEN',
      passed: data.mx === null ? null : data.mx.some((mx) => mx.exchange && mx.exchange !== '.'),
      titleFr: 'Service de réception des courriels',
      descriptionFr:
        'L’absence de MX peut être volontaire pour un domaine sans courriel. DKIM n’est pas testé : le sélecteur doit être fourni par le service de messagerie.',
      evidence: { domain, mx: data.mx, dkim: 'NON_TESTE_SELECTEUR_INCONNU' },
      estimatedFixCad: 150,
    },
  ];
}
