import { getApiOrigin, getHealth } from '../lib/health';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const origin = getApiOrigin();
  const [live, ready] = await Promise.all([getHealth(origin, 'live'), getHealth(origin, 'ready')]);

  return (
    <main>
      <p>Bump OS · PR 01</p>
      <h1>Foundation diagnostics</h1>
      <p>
        Internal development environment. Authentication and tenant isolation are not implemented.
      </p>
      <table>
        <caption>API health at page load</caption>
        <thead>
          <tr>
            <th scope="col">Check</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">API liveness</th>
            <td>{live}</td>
          </tr>
          <tr>
            <th scope="row">Database and Redis readiness</th>
            <td>{ready}</td>
          </tr>
        </tbody>
      </table>
      {ready === 'Unavailable' && (
        <p role="status">
          The API or one of its dependencies is unavailable. Check the API, PostgreSQL and Redis
          logs.
        </p>
      )}
      <p>
        <a href="/">Refresh health checks</a>
      </p>
      <p>This page contains no client data or administrative actions.</p>
    </main>
  );
}
