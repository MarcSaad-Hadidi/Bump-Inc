import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Scene,Group,Mesh,PlaneGeometry,MeshBasicMaterial,PerspectiveCamera,Vector3} from 'three';
import {applySceneProjection} from '../src/bump/ui/sceneCamera.js';
import {createBumpAssetReadiness} from '../src/bump/chapters/runtime/BumpAssetReadiness.js';

const native=readFileSync('public/runtime/assets/Background-DpyJh-o1.js','utf8');
const source=readFileSync('src/bump/chapters/runtime/BumpScenePreparation.js','utf8').replace(/^import .*;\n/gm,'').replaceAll('export function','function');
function fixture(){return runInNewContext(source+';({registerBumpSceneAsset,prepareBumpSceneForRender})',{applySceneProjection,usesMobileSceneFraming:()=>true});}
function covered(mesh,camera){
 mesh.updateWorldMatrix(true,false);
 for(const x of [-1,1])for(const y of [-1,1]){
  const origin=mesh.worldToLocal(camera.getWorldPosition(new Vector3)),ray=mesh.worldToLocal(new Vector3(x,y,.5).unproject(camera)).sub(origin),t=-origin.z/ray.z,hit=origin.addScaledVector(ray,t);
  assert.ok(t>0&&Math.abs(hit.x)<=1.00001&&Math.abs(hit.y)<=1.00001,`Backdrop leaves a black border: ${hit.toArray()}`);
 }
}
function imageSize(path){
 const b=readFileSync(path);
 if(path.endsWith('.ktx2'))return[b.readUInt32LE(20),b.readUInt32LE(24)];
 const type=b.toString('ascii',12,16);
 if(type==='VP8X')return[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
 if(type==='VP8 ')return[b.readUInt16LE(26)&16383,b.readUInt16LE(28)&16383];
 if(type==='VP8L'){const v=b.readUInt32LE(21);return[(v&16383)+1,((v>>>14)&16383)+1];}
 throw new Error('Unsupported scene image: '+path);
}

test('the real seven chapter textures and Theatre transforms cover portrait screens on the first draw',()=>{
 const route=JSON.parse(readFileSync('src/bump/loader-data.json','utf8')).loaderData['routes/($locale).editions.winter2026'];
 for(const [index,chapter]of [route.hero,...route.collections].entries())for(const size of [{width:390,height:780},{width:480,height:970}]){
  const api=fixture(),scene=new Scene,group=new Group,camera=new PerspectiveCamera,mesh=new Mesh(new PlaneGeometry(2,2),new MeshBasicMaterial);
  const path=url=>'public/'+url.replace('__RENAISSANCE_ORIGIN__/','');
  const state=JSON.parse(readFileSync(path(chapter.backgroundAnimation.url),'utf8')),data=state.sheetsById.Scene.staticOverrides.byObject['asset-2'];
  const layout={position:{x:0,y:0,z:0,...data.position},scale:{x:1,y:1,z:1,...data.scale},rotation:{x:0,y:0,z:0,...data.rotation}},[w,h]=imageSize(path(chapter.backgroundAssets[1].url));
  group.position.set(...Object.values(layout.position));group.scale.set(...Object.values(layout.scale));group.rotation.set(...Object.values(layout.rotation));mesh.scale.y=h/w;group.add(mesh);scene.add(group,camera);
  api.registerBumpSceneAsset(group,{background:true,layoutRef:{current:layout},meshRef:{current:mesh}});
  api.prepareBumpSceneForRender(scene,camera,size,index);covered(mesh,camera);mesh.geometry.dispose();mesh.material.dispose();
 }
});

test('both actual compositor draws prepare all seven backdrops before any gesture or scene frame',()=>{
 const current=native.match(/\(__bumpPrepareScene\(Re,we,p,ye\),h\.render\(Re,we\)\)/)?.[0],incoming=native.match(/\(__bumpPrepareScene\(W,Ae,p,lt\),h\.render\(W,Ae\)\)/)?.[0];
 assert.ok(current&&incoming,'Current and incoming scenes both need preparation before draw');
 for(const draw of [current,incoming])for(let index=0;index<7;index++)for(const size of [{width:390,height:780},{width:480,height:970},{width:740,height:390}]){
  const api=fixture(),scene=new Scene,group=new Group,mesh=new Mesh(new PlaneGeometry(2,2),new MeshBasicMaterial),camera=new PerspectiveCamera(10,1900/900,.1,1000);
  const layout={position:{x:-.5,y:-.5,z:-25},scale:{x:8,y:8,z:8},rotation:{x:index===1?Math.PI:0,y:0,z:0}};
  group.position.set(...Object.values(layout.position));group.scale.set(8,8,8);group.rotation.set(layout.rotation.x,0,0);mesh.scale.y=.5;group.add(mesh);scene.add(group,camera);
  api.registerBumpSceneAsset(group,{background:true,layoutRef:{current:layout},meshRef:{current:mesh}});
  let draws=0;const h={render(s,c){draws++;assert.equal(s,scene);assert.equal(c,camera);assert.ok(c.fov>25);covered(mesh,camera);}};
  runInNewContext(draw,{Re:scene,we:camera,p:size,ye:index,W:scene,Ae:camera,lt:index,h,__bumpPrepareScene:api.prepareBumpSceneForRender});assert.equal(draws,1);
  // Native Theatre writes can reset the transform; the next real draw still
  // restores the fitted backdrop without waiting for a pointer invalidation.
  group.scale.set(8,8,8);api.prepareBumpSceneForRender(scene,camera,size,index);covered(mesh,camera);
  mesh.scale.y=.25;api.prepareBumpSceneForRender(scene,camera,size,index);covered(mesh,camera);
  mesh.geometry.dispose();mesh.material.dispose();
 }
});

test('a prefetched asset completes when its chapter activates, without a second loaded event',()=>{
 const scheduled=[],pending=new Set,completed=[];let notifications=0;
 const asset=name=>createBumpAssetReadiness({start:()=>pending.add(name),finish:()=>{pending.delete(name);completed.push(name);},notify:()=>{if(!pending.size)notifications++;},schedule:fn=>scheduled.push(fn)});
 const character=asset('character'),background=asset('background');character.loaded();background.loaded();
 character.enter();background.enter();assert.equal(pending.size,2);assert.equal(notifications,0);
 for(const fn of scheduled)fn();assert.deepEqual(completed,['character','background']);assert.equal(notifications,1);
 character.enter();character.loaded();assert.equal(completed.length,2);
});

test('an unfinished background keeps initial readiness pending until its own decode finishes',()=>{
 const scheduled=[],pending=new Set;let shown=false;
 const asset=name=>createBumpAssetReadiness({start:()=>pending.add(name),finish:()=>pending.delete(name),notify:()=>{if(!pending.size)shown=true;},schedule:fn=>scheduled.push(fn)});
 const a=asset('characters'),b=asset('room');a.loaded();a.enter();b.enter();for(const fn of scheduled)fn();assert.equal(shown,false);
 b.loaded();assert.equal(shown,true);
});

test('every scene module is free of independent projection assignments',()=>{
 for(const file of ['HeroScene-CQfa8zjw.js','SidekickScene-BGrFo1zW.js','AgenticScene-6ANDe0E9.js','OperationsScene-C6j68HCe.js','RetailScene-B0aB0Kby.js','DeveloperScene-lYU-7T_c.js','B2BScene-CLnkLJDW.js'])assert.doesNotMatch(readFileSync('public/runtime/assets/'+file,'utf8'),/\.fov\s*=/,file);
 const assets=readFileSync('public/runtime/assets/Butterflies-pNugjQAd.js','utf8');assert.match(assets,/bumpReadiness\.current\.loaded\(\)/);assert.match(assets,/__bumpRegisterSceneAsset\(U,\{background:a&&!o,layoutRef:A,meshRef:R\}\)/);
});

test('the compositor preserves screen-aligned fallback cameras',()=>{
 const api=fixture(),scene=new Scene,camera=new PerspectiveCamera(50,.5,.1,100);camera.position.z=2;
 api.prepareBumpSceneForRender(scene,camera,{width:390,height:780},0);
 assert.equal(camera.fov,50);assert.equal(camera.position.z,2);assert.equal(camera.userData.bumpMobileView,undefined);
});
