export function publicOrigin(value = process.env.SITE_PUBLIC_ORIGIN) {
  if (!value?.trim()) return '';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_PUBLIC_ORIGIN must be an HTTP(S) origin, for example https://bump.example');
  }
  return url.origin;
}
