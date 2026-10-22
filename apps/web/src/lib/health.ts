import { z } from 'zod';

const originSchema = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    ['http:', 'https:'].includes(url.protocol) &&
    url.username === '' &&
    url.password === '' &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === ''
  );
}, 'API_INTERNAL_URL must be an HTTP(S) origin without credentials, path, query or fragment');

export function getApiOrigin(): string {
  return originSchema.parse(process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001');
}

export async function getHealth(
  origin: string,
  check: 'live' | 'ready',
): Promise<'Available' | 'Unavailable'> {
  try {
    const response = await fetch(new URL(`/health/${check}`, origin), {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(1_500),
    });
    return response.ok ? 'Available' : 'Unavailable';
  } catch {
    return 'Unavailable';
  }
}
