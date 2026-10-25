import {readFileSync,writeFileSync,readdirSync,mkdirSync,rmSync} from 'node:fs';
import {parse} from '@babel/parser';
import {translateText,translateHtml,translateValue} from '../src/bump/locales/translate.js';

const source='public/runtime/assets',destination='public/runtime/en/assets';
// Only text literals change. Vertex data, animation code, timing, shared media
// and every supplied source file stay identical to the French edition.
export function translateModule(code,{manifest=false}={}){
 const ast=parse(code,{sourceType:'module'}),edits=[];
 const modules=value=>value.replace(/\/runtime\/assets\/([^\s"'<>]*\.js)(?=$|[?#"'<>\s])/g,'/runtime/en/assets/$1');
 function visit(node,parent){
  if(!node||typeof node!=='object')return;
  if(node.type==='StringLiteral'){
   if(parent?.type==='ObjectProperty'&&parent.key===node)return;
   let next=modules(node.value.includes('<')?translateHtml(node.value):translateText(node.value));
   if(parent?.type==='ObjectProperty'&&['lang','locale'].includes(parent.key?.name??parent.key?.value)&&node.value==='fr')next='en';
   if(parent?.type==='ObjectProperty'&&['href','to'].includes(parent.key?.name??parent.key?.value)&&node.value==='/')next='/en';
   if(parent?.type==='ObjectProperty'&&(parent.key?.name??parent.key?.value)==='suffix'&&node.value===' j')next=' d';
   if(next.startsWith('/#'))next='/en'+next.slice(1);
   if(next!==node.value)edits.push({start:node.start,end:node.end,text:JSON.stringify(next)});
  }else if(node.type==='TemplateElement'){
   const value=node.value.cooked??node.value.raw,next=modules(value.includes('<')?translateHtml(value):translateText(value));
   if(next!==value)edits.push({start:node.start,end:node.end,text:next.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')});
  }
  for(const[k,value]of Object.entries(node)){if(['loc','extra','comments','tokens'].includes(k))continue;if(Array.isArray(value))value.forEach(child=>visit(child,node));else if(value&&typeof value==='object')visit(value,node);}
 }
 visit(ast.program,null);
 let out=code;for(const edit of edits.sort((a,b)=>b.start-a.start))out=out.slice(0,edit.start)+edit.text+out.slice(edit.end);
 if(manifest){const prefix='window.__remixManifest=',data=JSON.parse(out.slice(prefix.length).replace(/;\s*$/,''));data.routes['routes/($locale).editions.winter2026'].path='en';out=prefix+JSON.stringify(data)+';';}
 return out;
}

export function encodeStream(data){
 const slots=[],memo=new Map();
 const encode=value=>{if(value===null)return -5;if(typeof value!=='object'){const key=typeof value+':'+value;if(memo.has(key))return memo.get(key);const i=slots.length;slots.push(value);memo.set(key,i);return i;}const i=slots.length;slots.push(null);slots[i]=Array.isArray(value)?value.map(encode):Object.fromEntries(Object.entries(value).map(([k,v])=>['_'+encode(k),encode(v)]));return i;};
 encode(data);return JSON.stringify(JSON.stringify(slots)+'\n').replaceAll('</','<\\/');
}

export function buildEnglishEdition(){
 rmSync(destination,{recursive:true,force:true});mkdirSync(destination,{recursive:true});
 let count=0;for(const file of readdirSync(source).filter(n=>n.endsWith('.js'))){const code=readFileSync(source+'/'+file,'utf8');writeFileSync(destination+'/'+file,translateModule(code,{manifest:file.startsWith('manifest-')}));count++;}
 const data=translateValue(JSON.parse(readFileSync('src/bump/loader-data.json','utf8')));
 data.loaderData.root.canonicalUrl='__RENAISSANCE_ORIGIN__/en';
 const route=data.loaderData['routes/($locale).editions.winter2026'];route.baseUrlWithLocale='/en';route.storeURL='/en';
 route.hero.subtitle=route.hero.subtitle.replace(/\. +/g,'.\n');
 let shell=readFileSync('src/reference-shell.html','utf8');
 // Keep scripts out of the markup translator; the complete English loader
 // stream uses the same deterministic encoder as the retained React shell.
 shell=shell.split(/(<script\b[\s\S]*?<\/script>)/gi).map(part=>part.startsWith('<script')?part:translateHtml(part)).join('');
 shell=shell.replace('<html lang="fr"','<html lang="en"').replace(/\/runtime\/assets\/([^\s"'<>]*\.js)/g,'/runtime/en/assets/$1');
 shell=shell.replace(/window\.__remixContext\.streamController\.enqueue\([\s\S]*?\);<\/script>/,()=>`window.__remixContext.streamController.enqueue(${encodeStream(data)});</script>`);
 // Heading fragments and description markup are already localized above.
 writeFileSync('public/en.html',shell);
 console.log(`Built English Bump edition (${count} JavaScript modules; shared original media).`);
}
if(process.argv[1]?.endsWith('build-bump-english.mjs'))buildEnglishEdition();
