import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {parse,parseFragment,serialize} from 'parse5';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {seoFigures,figureProps,sharingFigure,caseFigureIds} from '../src/bump/seo/figures.js';
import {figureMarkup} from '../src/bump/seo/figure-markup.js';
import {pageFor} from '../src/bump/seo/pages.js';
import {renderHtml} from '../src/bump/seo/render.js';
import {installSeoFigureLoading} from '../src/bump/seo/figure-loading.js';
const walk=node=>[node,...(node.childNodes||[]).flatMap(walk)];
const attrs=node=>Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
const text=node=>(node.childNodes||[]).map(n=>n.value||text(n)).join('');

test('all 39 native sources and all 14 supplied images retain their delivered bytes',async()=>{
 const m=JSON.parse(readFileSync('src/components/bump-seo-source.json','utf8'));
 assert.equal(Object.keys(m.sha256).length,39);assert.equal(Object.keys(m.assets).length,14);
 for(const[base,entries]of [['src/components/bump-anatomy/',m.sha256],['public/',m.assets]])for(const[file,hash]of Object.entries(entries)){
  assert.equal(createHash('sha256').update(readFileSync(base+file)).digest('hex'),hash,file);
 }
 for(const spec of Object.values(seoFigures)){
  const {FIGURE_HTML}=await import('../src/components/bump-anatomy/'+spec.model+'/art.generated.ts');
  const svg=walk(parseFragment(FIGURE_HTML)).find(n=>n.tagName==='svg');
  assert.equal(attrs(svg).viewBox,'0 0 '+spec.drawingWidth+' '+spec.drawingHeight,'Host sizing must follow the native viewBox');
  const png=readFileSync('public/og/'+spec.slug+'.png');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
});

test('the seven page figures follow En clair, preserve exact poster props and never enter the initial SVG or title',()=>{
 for(const locale of ['fr','en'])for(const id of Object.keys(seoFigures)){
  const page=pageFor(id,locale),source=renderHtml(page,'https://bump.example'),nodes=walk(parse(source)),spec=figureProps(id,locale);
  const figures=nodes.filter(n=>'data-seo-figure'in attrs(n));assert.equal(figures.length,1,page.path);
  const figure=figures[0],siblings=figure.parentNode.childNodes.filter(n=>n.tagName),position=siblings.indexOf(figure);
  assert.equal(attrs(siblings[position-1]).id,'en-clair',page.path);
  const descendants=walk(figure),image=descendants.find(n=>n.tagName==='img');
  for(const[name,value]of Object.entries({src:spec.poster,alt:spec.alt,width:spec.width,height:spec.height,loading:'lazy'}))assert.equal(attrs(image)[name],String(value));
  assert.equal(text(descendants.find(n=>n.tagName==='figcaption')),spec.caption);
  assert.equal('data-poster-only'in attrs(figure),locale==='en');
  assert.doesNotMatch(source,/iso-figure|data-calibration-model/);
  assert(!descendants.some(n=>n.tagName==='svg'));
  assert.equal(nodes.filter(n=>n.tagName==='h1').length,1);
 }
});

test('four case studies get the appropriate individual poster and FAQ gets none',()=>{
 for(const locale of ['fr','en']){
  const source=renderHtml(pageFor('cases',locale),'https://bump.example'),nodes=walk(parse(source));
  assert.equal(nodes.filter(n=>'data-seo-figure'in attrs(n)).length,4);
  for(const[section,id]of Object.entries(caseFigureIds)){
   const article=nodes.find(n=>attrs(n).id===section),figures=walk(article).filter(n=>'data-seo-figure'in attrs(n));
   assert.equal(figures.length,1);assert.equal(attrs(figures[0])['data-seo-figure'],id);
  }
  assert.doesNotMatch(source,/iso-figure/);
  assert.doesNotMatch(renderHtml(pageFor('faq',locale),'https://bump.example'),/data-seo-figure|iso-figure/);
 }
});

test('each localized social card uses the supplied PNG and its declared dimensions and alt',()=>{
 for(const locale of ['fr','en'])for(const id of [...Object.keys(seoFigures),'cases','faq']){
  const page=pageFor(id,locale),share=sharingFigure(page),nodes=walk(parse(renderHtml(page,'https://bump.example')));
  const metadata=new Map(nodes.filter(n=>n.tagName==='meta').map(n=>{const a=attrs(n);return[a.property||a.name,a.content];}));
  for(const name of ['og:image','og:image:secure_url','twitter:image'])assert.equal(metadata.get(name),'https://bump.example'+share.url);
  assert.equal(metadata.get('og:image:type'),'image/png');assert.equal(metadata.get('og:image:width'),'1200');assert.equal(metadata.get('og:image:height'),'630');
  assert.equal(metadata.get('og:image:alt'),share.alt);assert.equal(metadata.get('twitter:image:alt'),share.alt);
 }
});

test('static poster markup matches the real supplied LazyFigure server rendering',async()=>{
 const built=await build({entryPoints:['src/components/bump-anatomy/shared/LazyFigure.tsx'],bundle:true,jsx:'automatic',format:'esm',platform:'node',write:false,plugins:[{name:'same-server-react',setup(b){b.onResolve({filter:/^react(?:\/jsx-runtime)?$/},args=>({path:pathToFileURL(resolve('node_modules',args.path,args.path==='react'?'index.js':'../jsx-runtime.js')).href,external:true}));}}]});
 const {LazyFigure}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 for(const locale of ['fr','en'])for(const id of Object.keys(seoFigures)){
  const expected=renderToStaticMarkup(createElement(LazyFigure,{...figureProps(id,locale),load:async()=>({default:()=>null})}));
  const initial=parseFragment(figureMarkup(id,locale)).childNodes[0].childNodes[0];
  const container={nodeName:'#document-fragment',childNodes:[initial]};
  assert.equal(serialize(container),serialize(parseFragment(expected)),id+' '+locale);
 }
});

test('English loading cannot create an observer or import a native bundle; French waits for approach',async()=>{
 let imports=0,emit,stopped=0;
 const doc={documentElement:{lang:'en-CA'},querySelectorAll(){throw Error('English should remain static');}};
 const load=async()=>{imports++;return{mountSeoFigures:()=>()=>{stopped++;}};};
 installSeoFigureLoading(doc,load,()=>{throw Error('No English observer');})();assert.equal(imports,0);
 doc.documentElement.lang='fr-CA';doc.querySelectorAll=()=>[{}];
 const stop=installSeoFigureLoading(doc,load,fn=>{emit=fn;return{observe(){},disconnect(){}};});
 assert.equal(imports,0);emit([{isIntersecting:false}]);assert.equal(imports,0);
 emit([{isIntersecting:true}]);await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(imports,1);
 stop();assert.equal(stopped,1);
 let resolveModule;const cleanup=installSeoFigureLoading(doc,()=>new Promise(resolve=>{resolveModule=resolve;}),fn=>{emit=fn;return{observe(){},disconnect(){}};});
 emit([{isIntersecting:true}]);cleanup();let mounts=0;resolveModule({mountSeoFigures(){mounts++;return()=>{};}});
 await Promise.resolve();await Promise.resolve();assert.equal(mounts,0,'Leaving before import resolves does not mount a hidden illustration');
});
