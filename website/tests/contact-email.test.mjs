import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleContact,sanitizeContact} from '../src/worker/contact.js';

const good={
 company:'Bump Client Inc',name:'Client Test',email:'client@example.com',
 expertise:'security',message:'Bonjour, je veux discuter de mon projet cybersécurité.'
};
const url='https://bumpconsultation.ca/api/contact';
const request=(payload,origin='https://bumpconsultation.ca')=>new Request(url,{
 method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
 body:JSON.stringify(payload)
});

test('rejects invalid fields and accepts a normal contact request',()=>{
 assert.equal(sanitizeContact({...good,message:''}),null);
 assert.equal(sanitizeContact({...good,email:'not-an-email'}),null);
 assert.equal(sanitizeContact({...good,expertise:'OTHER'}),null);
 assert.equal(sanitizeContact({...good,website:'spam'}),null);
 assert.deepEqual(sanitizeContact(good),good);
});

test('real verified email destination is only sent by Worker after successful validation',async()=>{
 const messages=[];
 const env={EMAIL:{async send(email){messages.push(email);return {messageId:'test'};}}};
 const response=await handleContact(request(good),env);
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{ok:true});
 assert.equal(messages.length,1);
 assert.equal(messages[0].from,'contact@bumpconsultation.ca');
 assert.equal(messages[0].to,'contactmarchadidi@gmail.com');
 assert.equal(messages[0].replyTo,good.email);
 assert.match(messages[0].text,/Client Test/);
});

test('rejects foreign-origin posts before sending any message',async()=>{
 let called=false;
 const env={EMAIL:{async send(){called=true;}}};
 const response=await handleContact(request(good,'https://malicious.test'),env);
 assert.equal(response.status,403);
 assert.equal(called,false);
});

test('honeypot requests are ignored without sending an email',async()=>{
 let called=false;
 const env={EMAIL:{async send(){called=true;}}};
 const response=await handleContact(request({...good,website:'scambot.test'}),env);
 assert.equal(response.status,200);
 assert.equal(called,false);
});

test('provider errors cannot display fake success and are not leaked',async()=>{
 const result=await handleContact(request(good),{EMAIL:{async send(){throw new Error('private email failure');}}});
 assert.equal(result.status,502);
 assert.deepEqual(await result.json(),{error:'delivery_failed'});
});

test('frontend uses real API response instead of success-only demonstration',()=>{
 const src=readFileSync('src/bump/ui/ProjectForm.js','utf8');
 assert.match(src,/fetch\('\/api\/contact'/);
 assert.match(src,/if\(!response\.ok\)throw/);
 assert.match(src,/setStatus\('sent'\)/);
 assert.match(src,/setStatus\('error'\)/);
 assert.doesNotMatch(src,/Votre demande est prête/);
 const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
 assert.equal(config.main,'./src/worker/contact.js');
 assert.deepEqual(config.assets.run_worker_first,['/api/*']);
 assert.equal(config.send_email[0].name,'EMAIL');
});

test('stable option IDs work for French and translated English labels', () => {
  const source=readFileSync('src/bump/ui/ProjectForm.js','utf8');
  assert.match(source,/id:'security',label:'Cybersécurité'/);
  assert.match(source,/value:option\.id/);
  assert.match(source,/option\.label/);
  assert.match(source,/FormData\(event\.currentTarget\)\.get\('website'\)/);
  assert.deepEqual(sanitizeContact({...good,expertise:'software'}).expertise,'software');
});
