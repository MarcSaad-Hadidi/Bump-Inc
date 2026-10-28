import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'parse5';
import {pageFor} from '../src/bump/seo/pages.js';
import {homeQuestions,casePreviews} from '../src/bump/seo/home-content.js';
import {renderHtml,renderMarkdown,schemaFor} from '../src/bump/seo/render.js';
import {homeFallback} from '../scripts/build-seo.mjs';

const walk=node=>[node,...(node.childNodes||[]).flatMap(walk)];
const attrs=node=>Object.fromEntries((node.attrs||[]).map(item=>[item.name,item.value]));
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join(' ');

test('the landing FAQ has the same real answers in initial HTML, markdown and JSON-LD in both languages',()=>{
  for(const locale of ['fr','en']){
    const page=pageFor('home',locale),source=homeFallback('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',page);
    const nodes=walk(parse(source)),faq=nodes.find(n=>attrs(n).id==='bump-home-questions');
    assert(faq);assert.equal(walk(faq).filter(n=>n.tagName==='details').length,4);
    const schema=schemaFor(page,'https://bump.example')['@graph'].find(n=>n['@type']==='FAQPage');
    assert.equal(schema['@id'],'https://bump.example'+page.path+'#bump-home-questions');
    for(const [i,item]of homeQuestions[locale].entries()){
      assert(text(faq).includes(item.q));assert(text(faq).includes(item.a));
      assert(renderMarkdown(page,'https://bump.example').includes(item.a));
      assert.equal(schema.mainEntity[i].acceptedAnswer.text,item.a);
    }
  }
});

test('four case scenarios are explicitly fictional and every landing target resolves to its localized section',()=>{
  for(const locale of ['fr','en']){
    const page=pageFor('cases',locale),nodes=walk(parse(renderHtml(page,'https://bump.example'))),markdown=renderMarkdown(page,'https://bump.example');
    assert.equal(page.published,'2026-10-27');assert.equal(page.sections.length,4);
    for(const preview of casePreviews){
      const section=nodes.find(n=>n.tagName==='section'&&attrs(n).id===preview.id);
      assert(section);assert(text(section).includes(locale==='fr'?'scénario fictif':'fictional scenario'));
      assert.equal(walk(section).filter(n=>n.tagName==='tbody')[0].childNodes.filter(n=>n.tagName==='tr').length,4);
      assert(markdown.includes(preview[locale].title));
    }
    assert(page.answer.includes(locale==='fr'?'ni gains mesurés':'measured improvements'));
  }
});

test('critical landing geometry and font preloads precede the scene bootstrap without duplicating metadata or editing scripts',()=>{
  const body='<script>const preserve="<head> and </head> are data";</script><div id="scene">Keep the scene</div>';
  const original='<!doctype html><html><head><meta charset="utf-8"><script src="/runtime/opening-start.js"></script></head><body>'+body+'</body></html>';
  const output=homeFallback(original,pageFor('home'));
  assert.equal(homeFallback(output,pageFor('home')),output);
  assert(output.includes(body));assert(output.indexOf('charset=')<1024);
  assert(output.indexOf('data-bump-startup')<output.indexOf('/runtime/opening-start.js'));
  const tree=parse(output),head=walk(tree).find(n=>n.tagName==='head');
  assert.equal(head.childNodes.filter(n=>'data-bump-startup' in attrs(n)).length,1);
  assert.equal(head.childNodes.filter(n=>'data-bump-initial-style' in attrs(n)).length,1);
  assert.equal(head.childNodes.filter(n=>'data-bump-startup-font' in attrs(n)).length,2);
  assert(text(head.childNodes.find(n=>'data-bump-startup' in attrs(n))).includes('margin:0'));
  for(const href of head.childNodes.filter(n=>'data-bump-startup-font' in attrs(n)).map(n=>attrs(n).href))assert(readFileSync(new URL('../public'+href,import.meta.url)).length);
});
