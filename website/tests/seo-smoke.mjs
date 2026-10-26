import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createSiteServer} from '../scripts/serve-production.mjs';

const run = promisify(execFile), server = createSiteServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const curl = async args => (await run('curl', ['--silent', '--show-error', '--noproxy', '127.0.0.1', '--max-time', '8', ...args])).stdout;
try {
  for (const [path, accept] of [['/services/integration-ia.md'], ['/services/integration-ia', 'text/markdown;q=1,text/html;q=0.5'], ['/services/integration-ia'], ['/', '*/*'], ['/does-not-exist.md']]) {
    const output = await curl(['--head', ...(accept ? ['-H', 'Accept: ' + accept] : []), origin + path]);
    console.log(path + (accept ? ' Accept=' + accept : '') + '\n' + output.split('\n').filter(line => /^(?:HTTP|Content-Type|Content-Location|X-Markdown-Tokens|X-Robots-Tag|Vary):?/i.test(line)).join('\n').trim() + '\n');
  }
  const markdown = await curl(['-H', 'Accept: text/markdown', origin + '/services/integration-ia']);
  console.log('Negotiated content:\n' + markdown.split('\n').slice(0, 10).join('\n') + '\n');
  const catalog = JSON.parse(await curl([origin + '/api/md/_catalog']));
  console.log('Markdown catalog: ' + catalog.routes.length + ' routes');
  console.log('llms-full.txt bytes: ' + Buffer.byteLength(await curl([origin + '/llms-full.txt'])));
  console.log('llms.txt:\n' + (await curl([origin + '/llms.txt'])).split('\n').slice(0, 14).join('\n'));
  const robots = await curl([origin + '/robots.txt']);
  console.log('Search bot OAI-SearchBot allowed: ' + robots.includes('User-agent: OAI-SearchBot\nAllow: /'));
  console.log('Sitemap origin correct: ' + robots.includes('Sitemap: ' + origin + '/sitemap.xml'));
  const home = await curl([origin + '/']);
  console.log('Homepage ai-summary: ' + home.includes('name="ai-summary"'));
  console.log('Homepage JSON-LD: ' + home.includes('application/ld+json'));
  console.log('Private markdown: ' + (await curl(['--output', '/dev/null', '--write-out', '%{http_code}', origin + '/api/md/admin'])));
} finally { await new Promise(resolve => server.close(resolve)); }
