const uuid = '[0-9a-f-]{36}';
export function cyberProxyAllowed(method: string, path: string) {
  if (
    method === 'GET' &&
    [
      'me',
      'organizations',
      'api/auth/get-session',
      'api/auth/verify-email',
      'api/auth/list-sessions',
    ].includes(path)
  )
    return true;
  if (
    method === 'POST' &&
    [
      'organizations',
      'api/auth/sign-up/email',
      'api/auth/sign-in/email',
      'api/auth/sign-out',
      'api/auth/revoke-other-sessions',
      'api/auth/two-factor/enable',
      'api/auth/two-factor/disable',
      'api/auth/two-factor/verify-totp',
      'api/auth/two-factor/verify-backup-code',
    ].includes(path)
  )
    return true;
  if (
    method === 'GET' &&
    new RegExp(
      `^organizations/${uuid}/(members|execution-control|cyber/(snapshot|engines|roles|comparison|findings/${uuid}|reports/${uuid}(?:/(?:html|pdf))?))$`,
      'i',
    ).test(path)
  )
    return true;
  if (
    method === 'POST' &&
    new RegExp(
      `^organizations/${uuid}/(invitations|cyber/(clients|assets|mandates|sources|imports|audits|tasks|retests|reports|retention/purge|mandates/${uuid}/approve|jobs/${uuid}/cancel|reports/${uuid}/approve))$`,
      'i',
    ).test(path)
  )
    return true;
  if (
    method === 'PATCH' &&
    new RegExp(`^organizations/${uuid}/cyber/(clients|findings|tasks)/${uuid}$`, 'i').test(path)
  )
    return true;
  return (
    method === 'PUT' &&
    new RegExp(`^organizations/${uuid}/(execution-control|cyber/roles/${uuid})$`, 'i').test(path)
  );
}
