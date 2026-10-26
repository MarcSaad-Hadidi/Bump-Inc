import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Box3,Group,Mesh,PlaneGeometry,MeshBasicMaterial,PerspectiveCamera} from 'three';
import {prepareCompanyResources,createCompanyRoomFitter} from '../src/bump/chapters/runtime/BumpCompanyPreparation.js';

test('company preparation defers unique texture uploads and asynchronous shader compilation', async () => {
  let task,uploads=0,compiles=0,cancelled=false;
  const texture={isTexture:true},material={map:texture,normalMap:texture};
  const scene={traverse(callback){callback({isMesh:true,material:[material,material]});callback({isMesh:true,material});}};
  const stop=prepareCompanyResources({initTexture(){uploads++;},compileAsync(){compiles++;return Promise.resolve();}},scene,{},
    {schedule(fn){task=fn;return 7;},cancel(id){assert.equal(id,7);cancelled=true;}});
  assert.equal(uploads,0);assert.equal(compiles,0);
  task(); await Promise.resolve();assert.equal(uploads,1);assert.equal(compiles,1);
  stop();assert(cancelled);
});

test('cancelled preparation does no work; unsupported and failing warmups retain normal rendering', async () => {
  let task,uploads=0;
  const scene={traverse(callback){callback({isMesh:true,material:{map:{isTexture:true}}});}};
  const options={schedule(fn){task=fn;return 1;},cancel(){}};
  const stop=prepareCompanyResources({initTexture(){uploads++;}},scene,{},options);stop();task();assert.equal(uploads,0);
  prepareCompanyResources({initTexture(){throw Error('context lost');},compileAsync(){return Promise.reject(Error('not ready'));}},scene,{},options);
  task();await Promise.resolve();await Promise.resolve();
  prepareCompanyResources({},scene,{},options);task();
});

test('stable company frames reuse the fitted backdrop and changing views refit without changing the camera', () => {
  let bounds=0;
  class CountedBounds extends Box3{setFromObject(...args){bounds++;return super.setFromObject(...args);}}
  const fit=createCompanyRoomFitter({Vector3,Box3:CountedBounds});
  const group=new Group,mesh=new Mesh(new PlaneGeometry(2,2),new MeshBasicMaterial),camera=new PerspectiveCamera(42,16/9,.1,100);
  group.add(mesh);camera.position.set(0,0,5);camera.lookAt(0,0,0);
  const layout={scale:{x:1,y:1,z:1},responsive:'cover'},viewport={width:16,height:9};
  const lens=camera.fov;
  assert.equal(fit(group,mesh,camera,layout,viewport),true);
  const scale=group.scale.toArray();
  for(let frame=0;frame<1000;frame++){
    group.scale.set(1,1,1);group.rotation.x=Math.PI;
    assert.equal(fit(group,mesh,camera,layout,viewport),false);
    assert.deepEqual(group.scale.toArray(),scale);assert.equal(group.rotation.x,0);
  }
  assert.equal(bounds,1,'Stable frames must not traverse geometry bounds');
  camera.position.x=1;assert.equal(fit(group,mesh,camera,layout,viewport),true);
  viewport.width=12;assert.equal(fit(group,mesh,camera,layout,viewport),true);
  layout.scale.x=2;assert.equal(fit(group,mesh,camera,layout,viewport),true);
  assert.equal(bounds,4);assert.equal(camera.fov,lens);
  mesh.geometry.dispose();mesh.material.dispose();
});
