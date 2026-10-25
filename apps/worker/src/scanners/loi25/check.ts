import type { Loi25Category, Severity } from '@bump/contracts';

export interface Check {
  key: string;
  category: Loi25Category;
  severity: Exclude<Severity, 'CONFORME'>;
  passed: boolean | null;
  titleFr: string;
  lawArticle: string;
  descriptionFr: string;
  evidence: Record<string, unknown>;
  businessRiskFr: string;
  remediationPitchFr: string;
  estimatedFixCad: number;
}

// ponytail: bounded static HTML heuristics miss malformed markup and rendered DOM; use a parser/browser if needed.
export function elements(html: string, tag: string): string[] {
  return [
    ...html
      .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
      .matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?(?:<\\/${tag}\\s*>|$)`, 'gi')),
  ].map((match) => match[0]);
}

export function attribute(tag: string, name: string): string {
  return (
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
      .exec(tag.slice(0, tag.indexOf('>') + 1))
      ?.slice(1)
      .find((value) => value !== undefined) ?? ''
  );
}

export function visibleText(html: string): string {
  return html
    .replace(
      /<!--[\s\S]*?(?:-->|$)|<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)|<style\b[^>]*>[\s\S]*?(?:<\/style\s*>|$)/gi,
      ' ',
    )
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ');
}

export const privacyTerms = /confidentialit|privacy|vie[- _]priv[ée]e|loi[- _]?25|politique/i;

export function pageLinks(html: string, base: string, terms: RegExp): string[] {
  return [
    ...new Set(
      elements(html, 'a').flatMap((tag) => {
        const href = attribute(tag, 'href').replace(/&amp;/g, '&');
        if (!href || !terms.test(`${href} ${visibleText(tag)}`)) return [];
        try {
          const url = new URL(href, base);
          const origin = new URL(base);
          if (url.origin !== origin.origin || url.search || url.username || url.password) return [];
          url.hash = '';
          return [url.href];
        } catch {
          return [];
        }
      }),
    ),
  ];
}
