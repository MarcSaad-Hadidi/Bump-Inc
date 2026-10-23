import { randomUUID } from 'node:crypto';
import {
  type CreateLoi25Audit,
  CreateLoi25AuditSchema,
  type Loi25AuditReport,
  Loi25AuditReportSchema,
} from '@bump/contracts';
import { pageLinks, privacyTerms } from './check.js';
import { analyzeCookies } from './cookies-and-trackers.js';
import { analyzeEmailDns, collectEmailDns } from './dns-email.js';
import { analyzeFormsAndWidgets } from './forms-and-ai-widgets.js';
import { analyzeHttp, createPassiveFetcher } from './http-security.js';
import { analyzePrivacy } from './privacy-policy-and-officer.js';
import { scoreChecks } from './scorer.js';

export async function runLoi25Audit(
  input: CreateLoi25Audit,
  auditId: string = randomUUID(),
): Promise<Loi25AuditReport> {
  const { companyName, domain } = CreateLoi25AuditSchema.parse(input);
  const signal = AbortSignal.timeout(12_000);
  const fetcher = createPassiveFetcher(signal);
  try {
    const [homeResult, dnsResult, redirectResult] = await Promise.allSettled([
      fetcher.fetch(`https://${domain}`),
      collectEmailDns(domain, signal),
      fetcher.fetch(`http://${domain}`),
    ]);
    const dns =
      dnsResult.status === 'fulfilled' ? dnsResult.value : { spf: null, dmarc: null, mx: null };
    const checks = analyzeEmailDns(domain, dns);
    let status: 'COMPLETED' | 'FAILED' = 'FAILED';
    if (homeResult.status === 'fulfilled' && homeResult.value.html) {
      const home = homeResult.value;
      const policies = pageLinks(home.html, home.url, privacyTerms).slice(0, 2);
      const contacts = pageLinks(home.html, home.url, /contact|nous[- ]joindre/i).slice(0, 1);
      const urls = [...new Set([...policies, ...contacts])].filter((url) => url !== home.url);
      const extra = await Promise.allSettled(urls.map((url) => fetcher.fetch(url)));
      const complete = extra.every((page) => page.status === 'fulfilled' && !!page.value.html);
      const pages = [
        home,
        ...extra.flatMap((page) => (page.status === 'fulfilled' ? [page.value] : [])),
      ];
      checks.push(
        ...analyzeHttp(
          home,
          redirectResult.status === 'fulfilled'
            ? redirectResult.value.url.startsWith('https:') &&
                redirectResult.value.redirects.length > 0
            : null,
        ),
        ...analyzePrivacy(
          pages,
          policies.some((url) => pages.some((p) => p.url === url)),
          complete,
        ),
        ...analyzeCookies(home.url, home.html, home.cookies),
        ...analyzeFormsAndWidgets(pages, complete),
      );
      status = 'COMPLETED';
    }
    const result = scoreChecks(checks);
    if (status === 'FAILED')
      Object.assign(result, {
        score: 0,
        grade: 'F',
        summaryFr:
          'Analyse Web impossible ou bloquée. Le score 0 signale un échec de collecte, pas une non-conformité. Les observations DNS disponibles sont conservées. Réessayer après vérification du domaine.',
      });
    return Loi25AuditReportSchema.parse({
      auditId,
      companyName,
      domain,
      status,
      ...result,
      scannedAt: new Date().toISOString(),
    });
  } finally {
    fetcher.close();
  }
}
