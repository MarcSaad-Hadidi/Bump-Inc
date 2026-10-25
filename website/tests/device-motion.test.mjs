import test from 'node:test';
import assert from 'node:assert/strict';
import {orientationPointer,fitPortraitFieldOfView,installDeviceMotion,getDeviceMotionState,getBumpScenePointer,toggleDeviceMotion,usesMobileSceneFraming} from '../src/bump/ui/deviceMotion.js';

function fixture({permission,coarse=true,width=390,reduced=false,preference=null}={}){
 const events=new Map(),docEvents=new Map(),frames=new Map(),mediaEvents=new Map();let requests=0,id=0;
 const motion={matches:reduced,addEventListener:(type,fn)=>mediaEvents.set('motion',fn),removeEventListener:()=>mediaEvents.delete('motion')};
 const input={matches:coarse,addEventListener:(type,fn)=>mediaEvents.set('input',fn),removeEventListener:()=>mediaEvents.delete('input')};
 const style=new Map();const doc={hidden:false,documentElement:{dataset:{},style:{setProperty:(k,v)=>style.set(k,v),removeProperty:k=>style.delete(k)}},addEventListener:(name,fn)=>docEvents.set(name,fn),removeEventListener:name=>docEvents.delete(name)};
 const win={isSecureContext:true,innerWidth:width,screen:{orientation:{angle:0}},performance:{now:()=>1000},DeviceOrientationEvent:class{},localStorage:{getItem:()=>preference,setItem:(k,v)=>{preference=v;}},matchMedia:q=>q.includes('reduced')?motion:input,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:n=>frames.delete(n)};
 if(permission)win.DeviceOrientationEvent.requestPermission=async()=>{requests++;return permission;};
 const stop=installDeviceMotion(win,doc);
 return{win,doc,style,events,motion,stop,get requests(){return requests;},sample(beta,gamma){events.get('deviceorientation')?.({beta,gamma});for(const fn of frames.values())fn();frames.clear();},fire(name){events.get(name)?.();},visibility(hidden){doc.hidden=hidden;docEvents.get('visibilitychange')?.();},reduce(){motion.matches=true;mediaEvents.get('motion')?.();}};
}
test('orientation is calibrated to the holding pose, bounded and remapped in landscape',()=>{
 const base={beta:45,gamma:0};assert.deepEqual(orientationPointer(base,base),{x:0,y:0});
 assert.ok(orientationPointer({beta:45,gamma:11},base).x>.3);
 assert.equal(orientationPointer({beta:45,gamma:90},base).x,1);assert.ok(orientationPointer({beta:45,gamma:9},base).x>.6);assert.ok(Math.abs(orientationPointer({beta:54,gamma:0},base).y)>.4);
 const rotated=orientationPointer({beta:56,gamma:0},base,90);assert.ok(rotated.x>.3);assert.equal(rotated.y,0);
 assert.deepEqual(orientationPointer({beta:null,gamma:0},base),{x:0,y:0});
});

test('portrait cameras preserve the complete horizontal scene without changing desktop framing',()=>{
 for(const [width,height]of [[360,700],[390,780],[430,820]])for(const base of [20,30,90,120]){
  const fitted=fitPortraitFieldOfView(base,width,height);
  assert.ok(fitted>base&&fitted<175);
  const horizontal=2*Math.atan(Math.tan(fitted*Math.PI/360)*width/height);
  const reference=2*Math.atan(Math.tan(base*Math.PI/360)*1900/900);
  assert.ok(Math.abs(horizontal-reference)<1e-8);
 }
 assert.equal(fitPortraitFieldOfView(30,1363,936),30);assert.equal(fitPortraitFieldOfView(30,740,390),30);
});
test('Android orientation drives the existing scene pointer, with no page input events',async()=>{
 const f=fixture();try{
  assert.equal(getDeviceMotionState().status,'waiting');f.sample(45,0);f.sample(45,11);
  assert.ok(getBumpScenePointer({x:-1,y:-1}).x>.3);assert.equal(f.doc.documentElement.dataset.bumpGyro,'active');
  assert.equal(f.events.has('pointermove'),false);assert.equal(f.events.has('touchmove'),false);
  await toggleDeviceMotion();assert.equal(getDeviceMotionState().status,'off');assert.deepEqual(getBumpScenePointer({x:1,y:1}),{x:0,y:0});
 }finally{f.stop();assert.equal(f.events.size,0);}
});
test('iPhone permission is requested only by activation, and denial stays neutral',async()=>{
 let f=fixture({permission:'denied'});try{assert.equal(f.requests,0);assert.equal(getDeviceMotionState().status,'permission');assert.equal(await toggleDeviceMotion(),false);assert.equal(f.requests,1);assert.equal(f.events.has('deviceorientation'),false);assert.equal(getDeviceMotionState().status,'denied');}finally{f.stop();}
 f=fixture({permission:'granted'});try{assert.equal(f.requests,0);assert.equal(await toggleDeviceMotion(),true);f.sample(50,3);f.sample(50,14);assert.ok(getBumpScenePointer({x:0,y:0}).x>.3);}finally{f.stop();}
});
test('hidden tabs and rotation reset calibration; reduced motion stops the stream',()=>{
 const f=fixture();try{
  f.sample(45,0);f.sample(45,11);f.visibility(true);assert.equal(f.events.has('deviceorientation'),false);assert.deepEqual(getBumpScenePointer({}),{x:0,y:0});
  f.visibility(false);f.sample(80,12);assert.deepEqual(getBumpScenePointer({}),{x:0,y:0});f.sample(80,23);assert.ok(getBumpScenePointer({}).x>.3);
  f.fire('orientationchange');f.sample(80,23);assert.deepEqual(getBumpScenePointer({}),{x:0,y:0});
  f.reduce();assert.equal(f.events.has('deviceorientation'),false);assert.equal(getDeviceMotionState().status,'reduced');
 }finally{f.stop();}
});
test('desktop keeps its exact mouse input and a remembered off choice stays off',()=>{
 let f=fixture({coarse:false,width:1363});try{const mouse={x:.32,y:-.7};assert.equal(getBumpScenePointer(mouse),mouse);assert.equal(f.events.has('deviceorientation'),false);}finally{f.stop();}
 f=fixture({preference:'off'});try{assert.equal(getDeviceMotionState().status,'off');assert.equal(f.events.has('deviceorientation'),false);}finally{f.stop();}
});

test('mobile framing and neutral input are available before the motion permission effect mounts',()=>{
 const previous=globalThis.window;globalThis.window={innerWidth:390,matchMedia:()=>({matches:false})};
 try{assert.equal(usesMobileSceneFraming(),true);assert.deepEqual(getBumpScenePointer({x:1,y:-1}),{x:0,y:0});}
 finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
