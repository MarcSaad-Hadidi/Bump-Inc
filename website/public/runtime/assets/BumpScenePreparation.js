import {applySceneProjection} from './BumpSceneCamera.js';
import {usesMobileSceneFraming} from './BumpDeviceMotion.js';

const ids=['hero','workflow','software','security','method','vision','company'];
const assets=new WeakMap(),lists=new WeakMap(),fits=new WeakMap();
let revision=0;

export function registerBumpSceneAsset(group,record){
 if(!group)return;
 if(record)assets.set(group,record);else assets.delete(group);
 revision++;
}

function backdrops(scene){
 let list=lists.get(scene);
 if(!list||list.revision!==revision){
  const entries=[];scene.traverse(group=>{const record=assets.get(group);if(record?.background)entries.push({group,...record});});
  list={revision,entries};lists.set(scene,list);
 }
 return list.entries;
}

// This runs immediately before the compositor's actual draw, using the camera
// it will render. A portal's inherited/default camera is not authoritative.
export function prepareBumpSceneForRender(scene,camera,size,index){
 if(!scene||!camera?.isPerspectiveCamera||!usesMobileSceneFraming()||!(size?.width>0&&size?.height>0))return;
 const records=backdrops(scene);
 // Flat fallback scenes have their own screen-aligned camera and shader.
 if(!camera.userData.bumpSceneId&&!records.length)return;
 const id=ids[index??scene.userData.sectionIndex];if(!id)return;
 const authored=camera.userData.bumpMobileView||{fov:camera.fov,freeOrbit:false};
 const view=applySceneProjection(camera,id,authored,size,true);
 if(!camera.userData.bumpPoseReady){
  camera.position.set(view.position.x,view.position.y,view.position.z);
  camera.lookAt(view.target.x,view.target.y,view.target.z);
 }
 camera.updateMatrixWorld(true);
 for(const record of records)fitBackdrop(record,camera,view,size,id);
}

function fitBackdrop({group,layoutRef,meshRef},camera,view,size,id){
 const layout=layoutRef.current,mesh=meshRef.current;if(!layout||!mesh)return;
 if(id==='company')group.rotation.set(0,0,0);
 const key=[id,size.width,size.height,view.fov,mesh.scale.x,mesh.scale.y,...Object.values(layout.scale),...Object.values(layout.position),...Object.values(layout.rotation)].join(':');
 const previous=fits.get(group);
 if(previous?.key===key){group.scale.set(...previous.scale);return;}
 group.scale.set(layout.scale.x,layout.scale.y,layout.scale.z);
 group.updateWorldMatrix(true,true);
 const neutral=camera.clone();
 neutral.position.set(view.position.x,view.position.y,view.position.z);
 neutral.lookAt(view.target.x,view.target.y,view.target.z);neutral.updateMatrixWorld(true);
 const origin=mesh.worldToLocal(neutral.getWorldPosition(neutral.position.clone()));
 let cover=1;
 for(const x of [-1,1])for(const y of [-1,1]){
  const local=mesh.worldToLocal(neutral.position.clone().set(x,y,.5).unproject(neutral)),ray=local.sub(origin);
  if(Math.abs(ray.z)<1e-7)continue;
  const distance=-origin.z/ray.z;if(distance<=0)continue;
  local.multiplyScalar(distance).add(origin);cover=Math.max(cover,Math.abs(local.x),Math.abs(local.y));
 }
 const halfY=view.fov*Math.PI/360,halfX=Math.atan(Math.tan(halfY)*camera.aspect),margin=.16;
 cover*=Math.max(1.25,Math.tan(halfY+margin)/Math.tan(halfY),Math.tan(halfX+margin)/Math.tan(halfX));
 const scale=[layout.scale.x*cover,layout.scale.y*cover,layout.scale.z*cover];
 group.scale.set(...scale);fits.set(group,{key,scale});
}
