import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from 'parse5';
import {listPages,pageFor} from '../src/bump/seo/pages.js';
import {renderHtml} from '../src/bump/seo/render.js';
import {renderStoryFigure,storyAction} from '../src/bump/seo/stories.js';
import {editorialLinks,searchEditorialPages} from '../src/bump/seo/navigation.js';
const walk=node=>[node,...(node.childNodes||[]).flatMap(walk)];
const attrs=node=>Object.fromEntries((node.attrs||[]).map(attr=>[attr.name,attr.value]));

test('every editorial page has its own visual story and an action anchored to real content', () => {
  for(const locale of ['fr','en']){
    const stories=new Set();
    for(const page of listPages().filter(p=>p.locale===locale&&p.type!=='home')){
      const markup=renderStoryFigure(page),nodes=walk(parse(markup));
      assert(markup.includes('story--'+page.id)); assert(!stories.has(markup)); stories.add(markup);
      const steps=nodes.find(node=>'data-story-steps' in attrs(node));
      assert(steps,page.id); assert.equal(steps.childNodes.filter(n=>n.tagName).length,page.id==='approach'?5:3);
      assert(!nodes.some(node=>['img','video','canvas'].includes(node.tagName)));
      const document=walk(parse(renderHtml(page,'https://bump.example')));
      const target=storyAction(page).href.slice(1);
      assert(document.some(node=>attrs(node).id===target),page.id+': action target');
      assert.equal(document.filter(node=>'data-bump-background-audio' in attrs(node)).length,1);
      assert.equal(document.filter(node=>(attrs(node).class||'').split(' ').includes('bump-background-music')).length,1);
      const back=document.find(node=>attrs(node).class==='seo-experience-return');
      assert.equal(attrs(back).href,(locale==='en'?'/en':'/')+'#'+(page.chapter||'hero'));
    }
    assert.equal(stories.size,9);
  }
});
test('the landing search reaches all editorial pages using canonical localized destinations', () => {
  for(const locale of ['fr','en']){
    assert.equal(editorialLinks(locale).length,9);
    for(const item of editorialLinks(locale))assert.equal(item.path,pageFor(item.id,locale).path);
    for(const [query,id] of [['automatisation','workflow'],['agents','ai'],['logiciel','software'],['cybersécurité','security'],['budget','faq'],['méthode','approach']]){
      assert(searchEditorialPages(query,locale).some(item=>item.id===id),query+' '+locale);
    }
    assert.deepEqual(searchEditorialPages('   ',locale),[]);
  }
});
