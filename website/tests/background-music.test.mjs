import test from 'node:test';
import assert from 'node:assert/strict';
import {installBackgroundMusic,MUSIC_PREFERENCE,MUSIC_POSITION} from '../src/bump/ui/musicController.js';

class Target {
  listeners = new Map();
  addEventListener(type, handler) {if (!this.listeners.has(type)) this.listeners.set(type,new Set()); this.listeners.get(type).add(handler);}
  removeEventListener(type, handler) {this.listeners.get(type)?.delete(handler);}
  emit(type, values = {}) {for (const handler of [...(this.listeners.get(type) || [])]) handler({type,target:this,stopPropagation(){},...values});}
}
function storage() {
  const values = new Map();
  return {getItem:key => values.get(key) ?? null,setItem:(key,value) => values.set(key,String(value))};
}
function harness({win,lang='fr',blocked=false,readyState=1} = {}) {
  win ||= Object.assign(new Target(),{localStorage:storage(),sessionStorage:storage()});
  const doc = Object.assign(new Target(),{hidden:false,documentElement:{lang}});
  const track = Object.assign(new Target(),{paused:true,currentTime:0,readyState,duration:180,error:null,calls:0,
    play(){this.calls++;if(blocked)return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));this.paused=false;this.emit('playing');return Promise.resolve();},
    pause(){const was=this.paused;this.paused=true;if(!was)this.emit('pause');},load(){this.error=null;}});
  const waves={setAttribute(){}},status={textContent:''};
  const button = Object.assign(new Target(),{hidden:true,dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;},querySelector(selector){return selector.includes('waves')?waves:status;}});
  const player=installBackgroundMusic(track,button,{doc,win});
  return {win,doc,track,button,player,status};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('a blocked autoplay choice can be muted before any gesture and stays off on the next page', async () => {
  const ui=harness({blocked:true}); await flush();
  assert.equal(ui.button.dataset.state,'armed'); assert.equal(ui.button.attrs['aria-pressed'],'true');
  ui.button.emit('click'); ui.doc.emit('click'); ui.doc.emit('pointerup'); ui.doc.emit('keydown',{key:'a'});
  assert.equal(ui.win.localStorage.getItem(MUSIC_PREFERENCE),'off');
  assert.equal(ui.track.calls,1); assert.equal(ui.button.attrs['aria-pressed'],'false');
  const editorial=harness({win:ui.win,lang:'en-CA',readyState:0});
  assert.equal(editorial.track.calls,0); assert.equal(editorial.button.attrs['aria-label'],'Enable background music');
  editorial.button.emit('click'); assert.equal(editorial.track.calls,1);
  assert.equal(editorial.win.localStorage.getItem(MUSIC_PREFERENCE),'on');
  ui.player.destroy(); editorial.player.destroy();
});

test('landing → editorial → cached landing keeps the chosen sound state and position', () => {
  const landing=harness(); landing.track.currentTime=37.5; landing.win.emit('pagehide');
  assert.equal(landing.win.sessionStorage.getItem(MUSIC_POSITION),'37.5'); assert(landing.track.paused);
  const editorial=harness({win:landing.win,lang:'en',readyState:0});
  editorial.track.readyState=1; editorial.track.emit('loadedmetadata');
  assert.equal(editorial.track.currentTime,37.5);
  editorial.track.currentTime=51; editorial.button.emit('click'); editorial.win.emit('pagehide');
  assert.equal(landing.win.sessionStorage.getItem(MUSIC_POSITION),'51');
  landing.win.emit('pageshow',{persisted:true});
  assert.equal(landing.track.currentTime,51); assert(landing.track.paused);
  assert.equal(landing.button.attrs['aria-label'],'Activer la musique d’ambiance');
  landing.button.emit('click'); assert(!landing.track.paused); assert.equal(landing.track.currentTime,51);
  landing.player.destroy(); editorial.player.destroy();
});

test('muted uninitialized pages do not overwrite a saved track position; hidden pages and storage changes are respected', () => {
  const ui=harness(); ui.track.currentTime=64; ui.button.emit('click'); ui.win.emit('pagehide');
  const next=harness({win:ui.win,readyState:0}); next.win.emit('pagehide');
  assert.equal(ui.win.sessionStorage.getItem(MUSIC_POSITION),'64');
  next.win.emit('pageshow',{persisted:true}); next.button.emit('click');
  next.track.readyState=1; next.track.emit('loadedmetadata'); assert.equal(next.track.currentTime,64);
  next.doc.hidden=true; next.doc.emit('visibilitychange'); assert(next.track.paused);
  next.doc.hidden=false; next.doc.emit('visibilitychange'); assert(!next.track.paused);
  next.win.localStorage.setItem(MUSIC_PREFERENCE,'off'); next.win.emit('storage',{key:MUSIC_PREFERENCE});
  assert(next.track.paused); assert.equal(next.button.attrs['aria-pressed'],'false');
  ui.player.destroy(); next.player.destroy();
});

test('one controller owns each audio element and a late play promise cannot restart muted audio', async () => {
  const ui=harness(); assert.equal(installBackgroundMusic(ui.track,ui.button,{doc:ui.doc,win:ui.win}),ui.player);
  ui.button.emit('click');
  let resolve;
  ui.track.play=function(){this.calls++;return new Promise(done=>{resolve=done;});};
  ui.button.emit('click'); ui.button.emit('click');
  resolve(); await flush(); assert(ui.track.paused); assert.equal(ui.button.attrs['aria-pressed'],'false');
  ui.player.destroy(); const calls=ui.track.calls;
  ui.doc.emit('click'); ui.win.emit('pageshow',{persisted:true}); ui.button.emit('click');
  assert.equal(ui.track.calls,calls);
});
