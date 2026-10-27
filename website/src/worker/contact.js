const DESTINATION = 'contactmarchadidi@gmail.com';
const FROM = 'contact@bumpconsultation.ca';
const MAX_BYTES = 12_000;
const EXPERTISE = new Map([
  ['process', 'Optimisation des processus'],
  ['software', 'IA et développement logiciel'],
  ['security', 'Cybersécurité'],
  ['advisory', 'Je souhaite être conseillé'],
]);

export function sanitizeContact(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  // Hidden field intentionally left blank by people using the real form.
  if (body.website) return null;
  const clean = (name, max) => typeof body[name] === 'string' ? body[name].trim().slice(0, max + 1) : '';
  const company = clean('company', 120);
  const name = clean('name', 100);
  const email = clean('email', 254);
  const expertise = clean('expertise', 100);
  const message = clean('message', 3000);
  if (!name || name.length > 100 || !email || email.length > 254 || !EXPERTISE.has(expertise) || message.length < 10 || message.length > 3000 || company.length > 120) return null;
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n\0]/.test(name + email + company)) return null;
  return {company, name, email, expertise, message};
}

const asText = (value) => value.replace(/[<>]/g, '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/g, '');
const reply = (body, status = 200) => Response.json(body, {
  status,
  headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'},
});

export async function handleContact(request, env) {
  if (request.method !== 'POST') return reply({error:'method_not_allowed'}, 405);
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (!['https://bumpconsultation.ca','https://www.bumpconsultation.ca'].includes(origin) || url.hostname !== 'bumpconsultation.ca') return reply({error:'forbidden'}, 403);
  if (!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json')) return reply({error:'unsupported_type'}, 415);
  const len = Number(request.headers.get('Content-Length')||0);
  if (len > MAX_BYTES) return reply({error:'too_large'}, 413);
  let raw, body;
  try {
    raw = await request.text();
    if (raw.length > MAX_BYTES) return reply({error:'too_large'}, 413);
    body = JSON.parse(raw);
  } catch { return reply({error:'invalid_json'}, 400); }
  if (body?.website) return reply({ok:true}); // silent bot trap
  const details = sanitizeContact(body);
  if (!details) return reply({error:'invalid_fields'}, 400);
  if (!env.EMAIL?.send) return reply({error:'email_not_configured'}, 503);
  const text = [
    'Nouvelle demande Bump','',
    'Nom : '+asText(details.name),
    'Entreprise : '+asText(details.company||'Non précisée'),
    'Courriel : '+asText(details.email),
    'Expertise : '+asText(EXPERTISE.get(details.expertise)),'',
    'Message :','',asText(details.message),
  ].join('\n');
  try {
    await env.EMAIL.send({
      from: FROM,
      to: DESTINATION,
      subject: 'Bump — nouvelle demande de '+asText(details.name).replace(/[\r\n]/g,' '),
      replyTo: details.email,
      text,
    });
    return reply({ok:true});
  } catch (e) {
    console.error('Bump contact email delivery rejected', e?.name || 'Error');
    return reply({error:'delivery_failed'}, 502);
  }
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/contact') return handleContact(request, env);
    if (pathname.startsWith('/api/')) return reply({error:'not_found'},404);
    return env.ASSETS.fetch(request);
  },
};
