import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Vector3,Euler,Quaternion,PerspectiveCamera,Group,Mesh,PlaneGeometry,MeshBasicMaterial} from 'three';
import {resolveSceneCamera,applySceneProjection,mobileSceneViews} from '../src/bump/ui/sceneCamera.js';

const runtime=readFileSync('public/runtime/assets/Butterflies-pNugjQAd.js','utf8');
const shipped=runtime.slice(runtime.indexOf('function Pa('),runtime.indexOf('function Oa('));
const previous=readFileSync('tests/fixtures/native-camera-v44.js','utf8');
const base={freeOrbit:false,rotation:{x:0,y:0,z:0},position:{x:0,y:.7,z:2},target:{x:0,y:0,z:1},fov:17,gaze:.5};

// Execute the actual shipped React camera hook with real Three matrices. The
// renderer's lifecycle is driven explicitly so a one-frame close lens cannot
// hide behind the final position of an otherwise passing screenshot.
function mountCamera(source,{id='hero',mobile=true,width=390,height=780}={}){
 let cursor=0,dirty=false,camera,values=structuredClone(base);
 const slots=[],effects=[],frames=[],callbacks=new Set(),pointer={x:0,y:0},size={width,height};
 const p={
  useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],next=>{if(next!==slots[i]){slots[i]=next;dirty=true;}}];},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}}
 };
 const object={get value(){return values;},onValuesChange(callback){callbacks.add(callback);callback(values);return()=>callbacks.delete(callback);}};
 const set=()=>{};
 const context={p,ve:Vector3,Dn:Euler,Wn:Quaternion,ia:.5,Gt:Math.PI/2,Ds:[-.1,.1],Ps:[-.1,.1],
  it:()=>({size,set}),bt:()=>({object:()=>object}),ra:()=>{},
  S:{types:{number:v=>v,boolean:v=>v,stringLiteral:v=>v}},
  _t(fn){const ref=p.useRef(null);if(!ref.current)frames.push(()=>ref.current());ref.current=fn;},
  Wt:{getState:()=>({isGlobeDragging:false,globeDragVelocity:0})},
  __bumpResolveSceneCamera:resolveSceneCamera,__bumpApplySceneProjection:applySceneProjection,
  __bumpMobileScene:()=>mobile,__bumpScenePointer:()=>pointer,__bumpPortraitFov:()=>{throw new Error('legacy portrait lens');},
  window:{innerWidth:width,innerHeight:height,addEventListener(){},removeEventListener(){}},
  ee:{jsx:(type,props)=>({type,props})}
 };
 const component=runInNewContext(source+';Pa',context);
 function render(){
  do{dirty=false;cursor=0;const {props}=component({theatreKey:'camera',bumpSceneId:id});
   camera??=new PerspectiveCamera(props.fov??50,width/height,.1,1000);
   camera.position.fromArray(props.position);if(props.fov!==undefined)camera.fov=props.fov;props.ref(camera);
   while(effects.length)effects.shift()();
  }while(dirty);
 }
 render();
 const frame=()=>{for(const fn of frames)fn();camera.updateMatrixWorld();};
 return{camera,pointer,frame,resize(w,h){size.width=w;size.height=h;render();},update(next){values=structuredClone(next);for(const callback of callbacks)callback(values);},mode(value){mobile=value;},size};
}
const snapshot=camera=>[camera.fov,camera.aspect,...camera.position.toArray(),...camera.quaternion.toArray(),...camera.projectionMatrix.elements];
const same=(a,b)=>{assert.equal(a.length,b.length);a.forEach((value,i)=>assert.ok(Math.abs(value-b[i])<1e-10,`camera component ${i}: ${value} vs ${b[i]}`));};

test('all seven shipped mobile cameras start wide and ignore close lens/dolly tracks throughout transitions',()=>{
 for(const id of Object.keys(mobileSceneViews)){
  const h=mountCamera(shipped,{id});h.frame();const stable=snapshot(h.camera),lens=h.camera.projectionMatrix.elements.slice();
  assert.ok(h.camera.fov>90,id+' must start zoomed out');
  for(let i=0;i<30;i++){
   h.update({...base,fov:i%2?10:32,position:{x:i*.1,y:3-i*.2,z:i%2?1:14},target:{x:.2,y:-.1,z:-2}});
   // Projection is already correct before the next animation frame.
   same(h.camera.projectionMatrix.elements,lens);h.frame();same(snapshot(h.camera),stable);
  }
 }
});

test('mobile phone motion visibly changes perspective without changing lens or camera distance',()=>{
 for(const id of Object.keys(mobileSceneViews)){
  const h=mountCamera(shipped,{id});h.frame();const lens=h.camera.fov,profile=mobileSceneViews[id],target=new Vector3(...Object.values(profile.target));
  const distance=h.camera.position.distanceTo(target),point=target.clone().add(new Vector3(0,0,-12)),before=point.clone().project(h.camera);
  h.pointer.x=1;h.pointer.y=.9;for(let i=0;i<90;i++)h.frame();
  const after=point.clone().project(h.camera);
  assert.ok(Math.abs(after.x-before.x)*390/2>9,id+' needs visible depth movement');
  assert.equal(h.camera.fov,lens);assert.ok(Math.abs(h.camera.position.distanceTo(target)-distance)<1e-10,id+' must not dolly');
 }
});

test('desktop replays the accepted camera exactly, including its authored entrance and free orbit',()=>{
 const original=mountCamera(previous,{mobile:false,width:1363,height:936}),updated=mountCamera(shipped,{mobile:false,width:1363,height:936});
 for(let i=0;i<30;i++){
  const values={...base,fov:22+i*.3,freeOrbit:i>20,position:{x:Math.sin(i),y:i*.08,z:4+i*.1},target:{x:.1,y:-.3,z:1},rotation:{x:.01,y:.02,z:0}};
  original.update(values);updated.update(values);original.pointer.x=updated.pointer.x=.5;original.pointer.y=updated.pointer.y=-.3;
  original.frame();updated.frame();same(snapshot(original.camera),snapshot(updated.camera));
 }
});

test('resize and leaving mobile cannot restore a stale close projection',()=>{
 const h=mountCamera(shipped,{id:'software'});h.frame();h.update({...base,fov:10});
 h.resize(430,820);h.frame();const wide=h.camera.fov;h.update({...base,fov:19});assert.equal(h.camera.fov,wide);
 h.mode(false);h.resize(1363,936);h.frame();assert.equal(h.camera.fov,19);
});

test('chapter-specific first-camera writers are absent and every visible scene names its camera owner',()=>{
 for(const file of ['AgenticScene-6ANDe0E9.js','OperationsScene-C6j68HCe.js','B2BScene-CLnkLJDW.js']){
  const source=readFileSync('public/runtime/assets/'+file,'utf8');assert.doesNotMatch(source,/camera\.fov\s*=/);
 }
 for(const [file,id]of Object.entries({'HeroScene-CQfa8zjw.js':'hero','SidekickScene-BGrFo1zW.js':'workflow','AgenticScene-6ANDe0E9.js':'software','OperationsScene-C6j68HCe.js':'security','RetailScene-B0aB0Kby.js':'method','DeveloperScene-lYU-7T_c.js':'vision','B2BScene-CLnkLJDW.js':'company'}))assert.ok(readFileSync('public/runtime/assets/'+file,'utf8').includes('bumpSceneId:"'+id+'"'));
});

test('the shipped scenery fit stays fixed and covers the full phone tilt range in both orientations',()=>{
 const source=runtime.slice(runtime.indexOf('function coverBumpLandscape('),runtime.indexOf('function Qo('));
 const fit=runInNewContext(source+';coverBumpLandscape',{bumpLandscapeOrigin:new Vector3,bumpLandscapeRay:new Vector3});
 for(const [width,height]of [[390,780],[740,390]])for(const id of Object.keys(mobileSceneViews)){
  const h=mountCamera(shipped,{id,width,height});h.frame();
  const group=new Group,mesh=new Mesh(new PlaneGeometry(2,2),new MeshBasicMaterial),layout={position:{x:0,y:0,z:-20},scale:{x:8,y:8,z:8}};
  mesh.scale.y=.5;group.add(mesh);group.position.set(0,0,-20);
  fit(group,mesh,layout,h.camera,{width,height});const fixed=group.scale.toArray();
  for(const [x,y]of [[1,.9],[-1,-.9],[1,-.9],[-1,.9]]){
   h.pointer.x=x;h.pointer.y=y;for(let i=0;i<90;i++)h.frame();fit(group,mesh,layout,h.camera,{width,height});same(group.scale.toArray(),fixed);
   group.updateMatrixWorld(true);
   for(const cx of [-1,1])for(const cy of [-1,1]){
    const ray=new Vector3(cx,cy,.5).unproject(h.camera).sub(h.camera.position).normalize(),distance=(-20-h.camera.position.z)/ray.z;
    const local=mesh.worldToLocal(h.camera.position.clone().addScaledVector(ray,distance));
    assert.ok(Math.abs(local.x)<=1&&Math.abs(local.y)<=1,`${id} ${width}×${height}: scenery edge at ${local.toArray()}`);
   }
  }
  mesh.geometry.dispose();mesh.material.dispose();
 }
});
