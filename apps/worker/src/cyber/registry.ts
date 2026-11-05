import type { CyberEngine } from '@bump/contracts';
export const SCANNER_IMAGES = {
  semgrep:
    'semgrep/semgrep:1.183.0@sha256:2e45517a85e13a9cca14a2a00df6bb48affd66b8ebfae1b0991cd57578362fb0',
  trivy:
    'aquasec/trivy:0.76.1@sha256:790fd66d1697395d8693d1acaa1ea702406a20f109b6fc7bac8db623eca6c06c',
  gitleaks:
    'ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f',
} as const;
export type NativeEngine = keyof typeof SCANNER_IMAGES;
export const SCANNER_EXECUTABLES = {
  semgrep: '/usr/bin/semgrep',
  trivy: '/usr/local/bin/trivy',
  gitleaks: '/usr/bin/gitleaks',
} as const;
export const NATIVE_RUNNER_PROFILE = 'reviewed-native-v2-init-busybox-hard-deadline';
export const SCANNER_VERSIONS = {
  semgrep: '1.183.0',
  trivy: '0.76.1',
  gitleaks: '8.30.1',
  'web-passive': 'bump-passive-1',
  json: 'bump-json-import-1',
  sarif: 'sarif-import-1',
} as const;
export const SEMGREP_RULES = `rules:
  - id: bump.python.dynamic-eval
    languages: [python]
    severity: ERROR
    message: Dynamic evaluation requires human security review.
    pattern: eval(...)
  - id: bump.python.shell-command
    languages: [python]
    severity: ERROR
    message: Review shell execution and data origins.
    pattern: subprocess.$FUNC(..., shell=True, ...)
  - id: bump.javascript.dynamic-eval
    languages: [javascript, typescript]
    severity: ERROR
    message: Review dynamic JavaScript evaluation.
    pattern: eval(...)
`;
export const GITLEAKS_RULES = '# Bump Cyber gitleaks profile v2\n[extend]\nuseDefault = true\n';
export const TRIVY_PROFILE = 'reviewed-default-v3-native-package-and-executed-check-inventory';
export const SCANNER_DESCRIPTORS = (Object.keys(SCANNER_VERSIONS) as CyberEngine[]).map((id) => ({
  id,
  version: SCANNER_VERSIONS[id],
  categories:
    id === 'semgrep'
      ? ['code']
      : id === 'trivy'
        ? ['dependencies', 'configuration']
        : id === 'gitleaks'
          ? ['secrets']
          : id === 'web-passive'
            ? ['web', 'dns', 'tls']
            : ['import'],
  assetKinds: ['json', 'sarif'].includes(id)
    ? ['repository', 'hostname', 'ip']
    : id === 'web-passive'
      ? ['hostname']
      : ['repository'],
  intrusiveness: 'passive',
  requirements:
    id in SCANNER_IMAGES
      ? [
          'Linux Docker',
          'cgroups CPU/memory/PIDs',
          'pinned official image',
          ...(id === 'trivy' ? ['offline vulnerability database'] : []),
        ]
      : [],
  timeoutMs: 30000,
  cpu: 1,
  memoryMiB: 1536,
  network: id === 'web-passive' ? 'pinned public DNS/HTTPS HEAD only' : 'none',
  parameters: { profile: 'reviewed-defaults-only' },
}));
