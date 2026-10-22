import { Writable } from 'node:stream';
import pino from 'pino';
import { expect, it } from 'vitest';
import { loggerOptions } from './index.js';

it('keeps operational fields while removing secrets, URLs and downstream errors', () => {
  let output = '';
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  const log = pino(loggerOptions('test'), sink);
  log.error(
    {
      password: 'top-secret',
      token: 'access-secret',
      err: new Error('postgres://user:db-secret@host/db'),
      req: {
        method: 'GET',
        url: '/?token=query-secret',
        headers: { authorization: 'Bearer header-secret' },
        body: { secret: 'body-secret' },
        routeOptions: { url: '/health/ready' },
      },
      res: { statusCode: 503 },
      reqId: 'correlation-id',
    },
    'Dependency unavailable',
  );
  expect(output).not.toMatch(
    /top-secret|access-secret|db-secret|query-secret|header-secret|body-secret/,
  );
  expect(JSON.parse(output)).toMatchObject({
    service: 'test',
    reqId: 'correlation-id',
    req: { method: 'GET', route: '/health/ready' },
    res: { statusCode: 503 },
    err: { type: 'Error' },
  });
});
