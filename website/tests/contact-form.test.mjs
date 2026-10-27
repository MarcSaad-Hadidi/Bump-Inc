import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {translateModule} from '../scripts/build-bump-english.mjs';
import {CONTACT_EMAIL,CONTACT_SITE_KEY,contactIsAvailable} from '../src/bump/contact.js';

const walk=node=>node&&typeof node==='object'?[node,...[].concat(node.props?.children||[]).flatMap(walk)]:[];
const copy=node=>typeof node==='string'?node:[].concat(node?.props?.children||[]).map(copy).join(' ');
const good={name:'Personne fictive',email:'person@example.com',company:'Exemple',expertise:'security',message:'Une demande fictive pour ce test seulement.'};
function formHarness(locale,send,origin='https://bumpconsultation.ca'){
  let source=readFileSync('src/bump/ui/ProjectForm.js','utf8');
  if(locale==='en')source=translateModule(source);
  source=source.replace(/^import [^\n]+\n/gm,'').replace(/export function /g,'function ');
  const slots=[],pending=[];let cursor=0,tree,options,resets=0,scripts=0;
  const sdk={render:(_host,value)=>{options=value;return 'unit-widget';},reset:()=>resets++,remove:()=>{}};
  const React={
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
    useEffect(effect,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((value,n)=>previous.deps[n]!==value)){previous?.cleanup?.();slots[i]={deps};pending.push(()=>{slots[i].cleanup=effect();});}},
  };
  const context={React,R:{jsxs:(type,props)=>({type,props})},ArrowUpRight:()=>null,CloseIcon:()=>null,useAnimatedDialog:()=>{},
    CONTACT_EMAIL,CONTACT_SITE_KEY,contactIsAvailable,postContact:send,
    loadTurnstile:()=>{scripts++;return Promise.resolve(sdk);},
    document:{documentElement:{lang:locale}},window:{location:{origin},matchMedia:()=>({matches:false}),turnstile:sdk},
    FormData:class{constructor(form){this.website=form.website||'';}get(){return this.website;}},
  };
  vm.createContext(context);vm.runInContext(source+';this.makeForm=Brief;',context);
  const render=()=>{
    cursor=0;tree=context.makeForm({open:true,onClose:()=>{}});
    for(const node of walk(tree))if(node.props?.ref&&node.props?.['aria-label'])node.props.ref.current={};
    pending.splice(0).forEach(effect=>effect());return tree;
  };
  const nodes=()=>walk(render());
  const form=()=>nodes().find(node=>node.type==='form');
  const fill=()=>{for(const [name,value]of Object.entries(good))nodes().find(node=>node.props?.name===name).props.onChange({target:{value}});render();};
  return {render,nodes,form,fill,verify:()=>{options.callback('unit-human-token');render();},expire:()=>{options['expired-callback']();render();},
    text:()=>copy(render()),resets:()=>resets,scripts:()=>scripts,
    submit:()=>form().props.onSubmit({preventDefault(){},currentTarget:{website:''}}),
    unmount:()=>slots.filter(value=>value?.cleanup).forEach(value=>value.cleanup()),
  };
}

test('FR and EN forms require verification, prevent duplicate sends and reset for a second request',async()=>{
  for(const locale of ['fr','en']){
    let release,calls=0;
    const response=new Promise(resolve=>{release=resolve;});
    const ui=formHarness(locale,async(values,token)=>{calls++;assert.equal(values.expertise,'security');assert.equal(token,'unit-human-token');await response;});
    ui.render();await new Promise(resolve=>setImmediate(resolve));ui.fill();
    await ui.submit();assert.equal(calls,0);
    assert(ui.text().includes(locale==='fr'?'Veuillez terminer':'Please complete'));
    ui.verify();const first=ui.submit();await ui.submit();assert.equal(calls,1);
    assert(ui.nodes().find(node=>node.props?.name==='name').props.disabled);
    release();await first;
    assert(ui.text().includes(locale==='fr'?'Votre demande a bien été envoyée':'Your request has been sent'));
    assert.equal(ui.resets(),1);assert.equal(ui.nodes().find(node=>node.props?.name==='name').props.value,'');
    ui.fill();ui.verify();await ui.submit();assert.equal(calls,2);assert.equal(ui.resets(),2);
    ui.fill();ui.verify();ui.expire();await ui.submit();assert.equal(calls,2);ui.unmount();
  }
});

test('a failed contact request preserves entered values and resets the challenge',async()=>{
  const ui=formHarness('fr',async()=>{throw Object.assign(new Error('Not sent'),{code:'rate_limited'});});
  ui.render();await new Promise(resolve=>setImmediate(resolve));ui.fill();ui.verify();await ui.submit();
  assert(ui.text().includes('Veuillez patienter une minute'));
  assert.equal(ui.nodes().find(node=>node.props?.name==='name').props.value,good.name);
  assert.equal(ui.resets(),1);ui.unmount();
});

test('preview hosts expose the real email address without loading an invalid production challenge',()=>{
  const ui=formHarness('en',()=>assert.fail('Preview must not send'),'https://preview.example');
  const nodes=ui.nodes();assert(nodes.some(node=>node.type==='a'&&node.props.href==='mailto:'+CONTACT_EMAIL));
  assert(nodes.find(node=>node.type==='button'&&node.props.type==='submit').props.disabled);
  assert(ui.text().includes('email us directly'));assert.equal(ui.scripts(),0);ui.unmount();
});

test('navigation defers the form until requested and retains it through closing and reopening',()=>{
  const source=readFileSync('src/bump/ui/BumpNav.js','utf8').replace(/^import[^\n]+\n/gm,'').replace('export default function BumpNav','function BumpNav');
  const slots=[];let cursor=0;
  const marker=()=>null;
  const context={
    React:{Fragment:'fragment',useEffect(){},useRef:initial=>({current:initial}),useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];}},
    R:{jsxs:(type,props)=>({type,props})},Brief:marker,
    MotionPanel:'panel',LocationPopover:'location',ArrowUpRight:'arrow',CloseIcon:'close',BackgroundMusic:'music',DeviceMotionControl:'motion',BumpClarityConsent:'consent',
    document:{documentElement:{lang:'fr'}},window:{location:{hostname:'preview.example'}},location:{hash:''},
    content:{chapters:[]},useChapterNav:()=>({}),useSceneStore:read=>read({activeSection:0}),
    expertiseLinks:()=>[],searchEditorialPages:()=>[],isBumpProductionHost:()=>false,
  };
  vm.createContext(context);vm.runInContext(source+';this.makeNav=BumpNav;',context);
  const nodes=()=>{cursor=0;return walk(context.makeNav({navItems:[]}));};
  const form=()=>nodes().find(node=>node.type===marker);
  const open=()=>nodes().find(node=>node.props?.className==='bump-project-button').props.onClick();
  assert.equal(form(),undefined);
  open();assert.equal(form().props.open,true);
  form().props.onClose();assert.equal(form().props.open,false);
  open();assert.equal(form().props.open,true);
});
