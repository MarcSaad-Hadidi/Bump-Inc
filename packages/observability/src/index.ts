import type { LoggerOptions } from 'pino';

export function loggerOptions(serviceName: string, level = 'info'): LoggerOptions {
  return {
    level,
    base: { service: serviceName },
    redact: {
      paths: [
        'password',
        'token',
        'secret',
        'authorization',
        'cookie',
        '*.password',
        '*.token',
        '*.secret',
        'req.headers',
        'req.body',
        'res.headers',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      // Downstream errors can embed SQL, credentials or payloads in message/stack/cause.
      err: () => ({ type: 'Error' }),
      req: (request: { method?: string; routeOptions?: { url?: string } }) => ({
        method: request.method,
        route: request.routeOptions?.url ?? 'unmatched',
      }),
      res: (response: { statusCode?: number }) => ({ statusCode: response.statusCode }),
    },
  };
}
