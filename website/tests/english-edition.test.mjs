import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';
import {translateText,translateHtml,translateValue} from '../src/bump/locales/translate.js';
import {translateModule} from '../scripts/build-bump-english.mjs';

test('English copy preserves markup geometry, identifiers and the honest future vision',()=>{
 for(const key of ['constructor','toString','__proto__','valueOf'])assert.equal(translateText(key),key,'Prototype names are code identifiers, never translation entries');
 assert.match(translateHtml("<g aria-label=\"Les réglages s'essaient à l'étape 03 · Proposition\"></g>"),/Settings can be explored/);
 assert.match(translateHtml('<svg aria-label="Préparation assistée par IA (fictive)"></svg>'),/AI-assisted preparation/);
 assert.match(translateHtml('<g aria-label="Outils du client : chacun garde son nom et sa fiche"></g>'),/Customer tools/);
 const html='<svg viewBox="0 0 760 500"><g transform="matrix(1 .5 0 1 12 30)"><text>Votre équipe</text></g></svg>';
 assert.equal(translateHtml(html),html.replace('Votre équipe','Your team'));
 const original={handle:'sidekick',locale:'fr',title:'Notre vision',descriptionHtml:'<p>À long terme, nous voulons développer des systèmes et des agents IA spécialisés. Cette infrastructure est une vision future.</p>'};
 const en=translateValue(original);assert.equal(en.handle,original.handle);assert.equal(en.locale,'en');assert.equal(original.locale,'fr');assert.equal(en.title,'Our vision');assert.match(en.descriptionHtml,/future vision/);assert.equal(translateText('  Rechercher  '),'  Search  ');
});
test('English modules keep data and animation code while routing to the matching runtime',()=>{
 const code='import x from "/runtime/assets/BumpUI.js"; const geometry=[1,2.5,-3]; const view={lang:"fr",title:"Notre méthode"}; const a=`Étape ${i}`; const selector="[data-demo-option=\\"risk-filter:Élevée\\"]";';
 const template=translateModule('const html=`<svg><text>JOURNAL DE SUIVI</text></svg>`;');assert.match(template,/FOLLOW-UP LOG/);
 const en=translateModule(code);assert.match(en,/\/runtime\/en\/assets\/BumpUI.js/);assert.match(en,/geometry=\[1,2.5,-3\]/);assert.match(en,/lang:"en"/);assert.match(en,/Our method/);assert.match(en,/`Step \$\{i\}`/);assert.match(en,/risk-filter:High/);
});
test('the English native workflow retains its real approval guard and all three scenarios',async()=>{
 const result=await build({entryPoints:['src/components/bump-anatomy/workflow/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const{createWorkflow,CARDS}=await import('data:text/javascript;base64,'+Buffer.from(translateModule(result.outputFiles[0].text)).toString('base64'));
 const flow=createWorkflow();assert.equal(flow.steps.select('resultat'),false);flow.steps.select('validation');assert.equal(flow.steps.next(),false);assert.equal(flow.accept(),true);assert.equal(flow.steps.get().id,'transmission');
 assert.equal(CARDS.devis.task[0],'Quote request');
 for(const kind of ['devis','facture','support']){flow.insert(kind);assert.equal(flow.state.decision,'pending');assert.equal(flow.steps.get().id,'reception');}
});
test('the built English document and runtime share matching language, data and route',()=>{
 const shell=readFileSync('public/en.html','utf8'),manifest=readFileSync('public/runtime/en/assets/manifest-2c6320c2.js','utf8');
 assert.match(shell,/<html lang="en"/);assert.match(shell,/<title>Bump — Technology Consulting for SMEs in Montréal<\/title>/);assert.match(readFileSync('public/runtime/en/assets/(_locale).editions.winter2026-CdSmWtXg.js','utf8'),/Your next/);assert.match(shell,/runtime\/en\/assets\/entry.client/);assert.match(manifest,/"path":"en"/);
 assert.doesNotMatch(shell,/<p[^>]*>Faites travailler/);
});

test('published French and English assets resolve every internal origin before packaging',()=>{
 function check(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
   const file=directory+'/'+entry.name;
   if(entry.isDirectory())check(file);
   else if(/\.(html|js|mjs|css|json|svg|txt)$/.test(entry.name)){
    assert.ok(!readFileSync(file,'utf8').includes('__RENAISSANCE_ORIGIN__'),file+' still contains an internal URL placeholder');
   }
  }
 }
 check('dist/client');
});


test('English security and integration keep their state identifiers and interactive controls',async()=>{
 async function load(file){const result=await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(translateModule(result.outputFiles[0].text)).toString('base64'));}
 const {createSecurityEngine}=await load('src/components/bump-anatomy/security-engine/model.ts');const vault=createSecurityEngine();
 for(let i=0;i<9;i++){vault.steps.select(i);assert.equal(vault.steps.get().index,i);assert.ok(vault.readout());assert.match(vault.inspect(3),/Data & access/);}assert.match(vault.readout(),/Scope controlled/);
 const{createToolkit}=await load('src/components/bump-anatomy/vos-outils/model.ts');const tools=createToolkit();tools.steps.select('synchronise');assert.equal(tools.toggleAdapter(3),true);assert.equal(tools.connected(3),false);assert.equal(tools.synced().length,4);assert.equal(tools.toggleAdapter(3),true);assert.equal(tools.connected(3),true);
});
