import {createSiteServer} from './serve-production.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const server = createSiteServer('public', {homeFile: 'src/reference-shell.html', development: true});
const port = Number(option('--port', '4173'));
server.listen(port, option('--host', '0.0.0.0'), () => console.log('Bump preview listening on ' + port));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(() => process.exit(0)); server.closeIdleConnections();
});
