import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleContact,sanitizeContact,contactRoute} from '../src/worker/contact.js';
import {postContact} from '../src/bump/ui/contactRequest.js';
import {createWorker} from '../worker/index.js';
import {CONTACT_EMAIL} from '../src/bump/contact.js';

const good={company:'Exemple fictif',name:'Demande de test',email:'person@example.com',expertise:'security',message:'Un projet fictif utilisé uniquement dans ce test.'};
const origin='https://bumpconsultation.ca';
const request=(payload=good,source=origin,host=origin)=>new Request(host+'/api/contact',{
  method:'POST',headers:{Origin:source,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.7'},
  body:JSON.stringify({...payload,turnstileToken:'test-token-with-enough-characters'}),
});
const configured=(send=async()=>({messageId:'test-only'}))=>({TURNSTILE_SECRET:'unit-test-secret',EMAIL:{send},CONTACT_RATE_LIMITER:{limit:async()=>({success:true})}});
async function verification(run,result={success:true,hostname:'bumpconsultation.ca',action:'contact'}){
  const original=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(options.body.get('remoteip'),'203.0.113.7');
    return Response.json(result);
  };
  try{return await run();}finally{globalThis.fetch=original;}
}

test('contact validation accepts stable identifiers and rejects injection or invalid fields',()=>{
  assert.deepEqual(sanitizeContact(good),good);
  for(const expertise of ['process','software','security','advisory'])assert.equal(sanitizeContact({...good,expertise}).expertise,expertise);
  for(const invalid of [{email:'not-an-email'},{name:'Name\r\nBcc: anyone@example.com'},{message:'short'},{message:'a'.repeat(3001)},{message:'\0'.repeat(20)},{expertise:'Cybersecurity'},{company:'a'.repeat(121)},null])assert.equal(sanitizeContact(invalid===null?null:{...good,...invalid}),null);
});

test('a verified contact request always targets the configured inbox and uses prospect reply-to',async()=>{
  const messages=[];
  const response=await verification(()=>handleContact(request({...good,to:'other@example.com'}),configured(async message=>messages.push(message))));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
  assert.equal(messages.length,1);assert.equal(messages[0].from,CONTACT_EMAIL);
  const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
  assert.equal(messages[0].to,config.send_email[0].destination_address);
  assert.equal(messages[0].replyTo,good.email);assert(messages[0].text.includes(good.message));
});

test('foreign origins and unsupported deployments cannot use the sending endpoint',async()=>{
  let sends=0;const env=configured(async()=>sends++);
  for(const [source,host]of [['https://foreign.test',origin],[null,origin],[origin,'https://preview.example'],['http://bumpconsultation.ca',origin]]){
    const response=await handleContact(request(good,source,host),env);assert.equal(response.status,403);
  }
  assert.equal(sends,0);
});

test('www deployments accept only a challenge issued for that same host and contact action',async()=>{
  const www='https://www.bumpconsultation.ca';let sends=0;
  const result=await verification(()=>handleContact(request(good,www,www),configured(async()=>sends++)),{success:true,hostname:'www.bumpconsultation.ca',action:'contact'});
  assert.equal(result.status,200);assert.equal(sends,1);
  for(const bad of [{success:false},{success:true,hostname:'other.test',action:'contact'},{success:true,hostname:'bumpconsultation.ca',action:'login'}]){
    assert.equal((await verification(()=>handleContact(request(),configured()),bad)).status,403);
  }
});

test('missing configuration fails closed and the honeypot never sends',async()=>{
  for(const missing of ['TURNSTILE_SECRET','EMAIL','CONTACT_RATE_LIMITER']){
    const env=configured();delete env[missing];
    assert.equal((await handleContact(request(),env)).status,503);
  }
  assert.deepEqual(await (await handleContact(request({...good,website:'bot.test'}),{})).json(),{ok:true});
});

test('rate limiting returns a retry deadline before any verification or email',async()=>{
  const env=configured(async()=>assert.fail('Must not send'));
  env.CONTACT_RATE_LIMITER.limit=async()=>({success:false});
  const response=await handleContact(request(),env);
  assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');
});

test('the request byte limit applies even without Content-Length and with multibyte input',async()=>{
  const req=request({...good,message:'é'.repeat(6100)});
  assert.equal(req.headers.has('Content-Length'),false);
  assert.equal((await handleContact(req,configured())).status,413);
  const huge=new Request(origin+'/api/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Content-Length':'12001'},body:'{}'});
  assert.equal((await handleContact(huge,configured())).status,413);
});

test('provider rejection has no fake success and exposes no internal details',async()=>{
  const response=await verification(()=>handleContact(request(),configured(async()=>{throw new Error('private provider details');})));
  assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'delivery_failed'});
});

test('success waits for provider acceptance rather than the start of a send',async()=>{
  let release,started=false,finished=false;
  const pending=new Promise(resolve=>{release=resolve;});
  await verification(async()=>{
    const response=handleContact(request(),configured(async()=>{started=true;await pending;})).then(r=>{finished=true;return r;});
    while(!started)await new Promise(resolve=>setImmediate(resolve));
    assert.equal(finished,false);release();assert.equal((await response).status,200);
  });
});

test('the unified Worker retains Markdown routing and rejects unknown API routes',async()=>{
  const worker=createWorker({'/services/integration-ia.md':'# Real Markdown route\n'});
  const response=await worker.fetch(new Request(origin+'/api/md/services/integration-ia'),{});
  assert.equal(response.status,200);assert((await response.text()).includes('Real Markdown'));
  assert.equal(contactRoute(new Request(origin+'/bump/art/image.webp'),{}),null);
  assert.equal((await worker.fetch(new Request(origin+'/api/unknown'),{})).status,404);
  const method=await worker.fetch(new Request(origin+'/api/contact'),{});
  assert.equal(method.status,405);assert.equal(method.headers.get('Allow'),'POST');
  const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
  assert.equal(config.main,'./dist/server/index.js');assert.equal(config.assets.run_worker_first,true);
  assert.equal(config.assets.html_handling,'none');assert.equal(config.ratelimits[0].simple.limit,5);
});

test('the browser client requires confirmed JSON success and preserves stable field values',async()=>{
  let payload;
  await postContact(good,'test-token','bot-field',async(url,options)=>{
    assert.equal(url,'/api/contact');payload=JSON.parse(options.body);return Response.json({ok:true});
  });
  assert.equal(payload.expertise,'security');assert.equal(payload.website,'bot-field');
  for(const response of [new Response('<html>SPA fallback</html>'),Response.json({ok:false}),Response.json({error:'delivery_failed'},{status:502}),Response.json({error:'rate_limited'},{status:429})]){
    await assert.rejects(postContact(good,'test-token','',async()=>response));
  }
});
