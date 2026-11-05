import type { CyberEngine, CyberRole } from '@bump/contracts';
import type {
  compareCyberAudits,
  readCyberFinding,
  readCyberReport,
  readCyberSnapshot,
} from '@bump/core';

type Json<T> = T extends Date
  ? string
  : T extends readonly (infer U)[]
    ? Json<U>[]
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;
export type Snapshot = Json<Awaited<ReturnType<typeof readCyberSnapshot>>>;
export type FindingDetail = Json<Awaited<ReturnType<typeof readCyberFinding>>>;
export type ReportDetail = Json<Awaited<ReturnType<typeof readCyberReport>>>;
export type Comparison = Json<Awaited<ReturnType<typeof compareCyberAudits>>>;
export type Engine = CyberEngine;
export type Role = CyberRole;
export type Person = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
};
export type Organization = { id: string; name: string };
export type Member = { id: string; userId: string; name: string; email: string; role: string };
export type ExecutionControl = {
  emergencyStop: boolean;
  concurrencyLimit: number;
  rateLimit: number;
};
export type Capability = {
  id: Engine;
  available: boolean;
  version: string;
  reason?: string | null;
};
export type View = 'overview' | 'clients' | 'audits' | 'findings' | 'remediation' | 'reports';
export class CyberApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public requestId?: string,
  ) {
    super(code);
  }
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/cyber/${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const e = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    throw new CyberApiError(
      response.status,
      typeof e['code'] === 'string'
        ? e['code']
        : typeof e['error'] === 'string'
          ? e['error']
          : 'request_failed',
      typeof e['requestId'] === 'string' ? e['requestId'] : undefined,
    );
  }
  return data as T;
}
export const engineCategory: Record<Engine, string> = {
  semgrep: 'code',
  trivy: 'dependencies',
  gitleaks: 'secrets',
  'web-passive': 'web',
  json: 'import',
  sarif: 'import',
};
export const engineCompatible = (engine: Engine, kind: string) =>
  engine === 'web-passive'
    ? kind === 'hostname'
    : ['json', 'sarif'].includes(engine) || kind === 'repository';
