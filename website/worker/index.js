import {handleContentRequest} from '../src/bump/seo/http.js';
import {contactRoute} from '../src/worker/contact.js';

export function createWorker(files = {}) { return {
  async fetch(request, env) {
    const contact=await contactRoute(request,env);
    if(contact)return contact;
    const origin = typeof __BUMP_PUBLIC_ORIGIN__ === 'string' ? __BUMP_PUBLIC_ORIGIN__ : '';
    const content = await handleContentRequest(request, file => {
      if (Object.hasOwn(files, file)) return new Response(files[file]);
      if (!env.ASSETS?.fetch) return new Response('Not found', {status: 404});
      const url = new URL(request.url); url.pathname = file; url.search = '';
      return env.ASSETS.fetch(new Request(url, {method: 'GET', headers: {'Accept-Encoding': 'identity'}}));
    }, {origin});
    if (content) return content;
    const pathname = new URL(request.url).pathname;
    if (/^\/runtime\/(?:en\/)?assets\/bump-shared-[A-Z0-9]+\.js$/.test(pathname) && Object.hasOwn(files, pathname)) {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405, headers: {Allow: 'GET, HEAD'}});
      return new Response(request.method === 'HEAD' ? null : files[pathname], {headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      }});
    }
    const response = env.ASSETS?.fetch ? await env.ASSETS.fetch(request) : new Response('Not found', {status: 404});
    if (new URL(request.url).pathname.startsWith('/runtime/') && response.headers.get('Content-Type')?.includes('text/html')) {
      const headers = new Headers(response.headers); headers.set('X-Robots-Tag', 'noindex, follow');
      return new Response(response.body, {status: response.status, headers});
    }
    return response;
  },
}; }

export default createWorker();
