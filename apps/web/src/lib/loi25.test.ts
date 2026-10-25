import type { Loi25Finding } from '@bump/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditApiOrigin, proposalSteps } from './loi25';

afterEach(() => vi.unstubAllEnvs());
describe('report data', () => {
  it('only contacts a configured loopback API', () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://127.0.0.1:3001');
    expect(auditApiOrigin()).toBe('http://127.0.0.1:3001');
    vi.stubEnv('API_INTERNAL_URL', 'https://other.example');
    expect(() => auditApiOrigin()).toThrow();
  });
  it('groups each remediation once and omits favorable observations from pricing', () => {
    const findings = [
      { category: 'SECURITE_COURRIEL_DNS', severity: 'ELEVE', estimatedFixCad: 100 },
      { category: 'FORMULAIRES_ET_COLLECTE', severity: 'ELEVE', estimatedFixCad: 200 },
      { category: 'TRANSPARENCE_IA_CHATBOT', severity: 'MOYEN', estimatedFixCad: 300 },
      { category: 'RESPONSABLE_ET_POLITIQUE', severity: 'CONFORME', estimatedFixCad: 900 },
    ] as Loi25Finding[];
    expect(proposalSteps(findings).map((step) => step.total)).toEqual([100, 200, 300]);
  });
});
