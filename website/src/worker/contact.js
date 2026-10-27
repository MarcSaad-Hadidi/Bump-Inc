import {CONTACT_EMAIL,CONTACT_ORIGINS} from '../bump/contact.js';

const DESTINATION='contactmarchadidi@gmail.com';
const MAX_BYTES=12000;
const EXPERTISE=new Map([
  ['process','Optimisation des processus'],['software','IA et développement logiciel'],
  ['security','Cybersécurité'],['advisory','Je souhaite être conseillé'],
]);

export function sanitizeContact(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||body.website)return null;
  const clean=(key,max)=>typeof body[key]==='string'?body[key].trim().slice(0,max+1):'';
  const company=clean('company',120),name=clean('name',100),email=clean('email',254);
  const expertise=clean('expertise',100),message=clean('message',3000);
  if(!name||name.length>100||!email||email.length>254||!EXPERTISE.has(expertise)||message.length<10||message.length>3000||company.length>120)return null;
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||/[\r\n\0]/.test(name+email+company))return null;
  if(/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(message))return null;
  return {company,name,email,expertise,message};
}

const asText=value=>value.replace(/[<>]/g,'').replace(/\r/g,'').replace(/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/g,'');
const reply=(body,status=200,headers={})=>Response.json(body,{status,headers:{
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers,
}});

async function readBody(request){
  const reader=request.body?.getReader();
  if(!reader)return '';
  const chunks=[];let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      total+=value.byteLength;
      if(total>MAX_BYTES){await reader.cancel();return null;}
      chunks.push(value);
    }
    const bytes=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  }finally{reader.releaseLock();}
}

export async function handleContact(request,env={}){
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405,{Allow:'POST'});
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if(!CONTACT_ORIGINS.includes(origin)||!CONTACT_ORIGINS.includes(url.origin))return reply({error:'forbidden'},403);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return reply({error:'unsupported_type'},415);
  if(Number(request.headers.get('Content-Length')||0)>MAX_BYTES)return reply({error:'too_large'},413);
  let body;
  try{
    const raw=await readBody(request);if(raw===null)return reply({error:'too_large'},413);
    body=JSON.parse(raw);
  }catch{return reply({error:'invalid_json'},400);}
  if(body?.website)return reply({ok:true}); // Ignore automated honeypot submissions.
  const details=sanitizeContact(body);
  if(!details)return reply({error:'invalid_fields'},400);
  if(!env.TURNSTILE_SECRET||!env.EMAIL?.send||!env.CONTACT_RATE_LIMITER?.limit)return reply({error:'contact_not_configured'},503);
  const ip=request.headers.get('CF-Connecting-IP');
  if(!ip)return reply({error:'forbidden'},403);
  try{
    const limit=await env.CONTACT_RATE_LIMITER.limit({key:'contact:'+ip});
    if(!limit.success)return reply({error:'rate_limited'},429,{'Retry-After':'60'});
  }catch{return reply({error:'verification_unavailable'},503);}
  if(typeof body.turnstileToken!=='string'||body.turnstileToken.length<20||body.turnstileToken.length>2048)return reply({error:'verification_required'},403);
  let verification;
  try{
    const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:body.turnstileToken,remoteip:ip}),
      signal:AbortSignal.timeout(8000),
    });
    if(!result.ok)throw new Error('Verification unavailable');
    verification=await result.json();
  }catch{return reply({error:'verification_unavailable'},503);}
  if(verification?.success!==true||verification.hostname!==new URL(origin).hostname||verification.action!=='contact')return reply({error:'verification_failed'},403);
  const text=[
    'Nouvelle demande Bump','','Nom : '+asText(details.name),
    'Entreprise : '+asText(details.company||'Non précisée'),'Courriel : '+asText(details.email),
    'Expertise : '+EXPERTISE.get(details.expertise),'','Message :','',asText(details.message),
  ].join('\n');
  try{
    await env.EMAIL.send({from:CONTACT_EMAIL,to:DESTINATION,
      subject:'Bump — nouvelle demande de '+asText(details.name).replace(/[\r\n]/g,' '),
      replyTo:details.email,text,
    });
    return reply({ok:true});
  }catch{
    console.error('Bump contact delivery failed');
    return reply({error:'delivery_failed'},502);
  }
}

export function contactRoute(request,env){
  const pathname=new URL(request.url).pathname;
  if(pathname==='/api/contact')return handleContact(request,env);
  if(pathname.startsWith('/api/')&&!pathname.startsWith('/api/md/'))return reply({error:'not_found'},404);
  return null;
}
