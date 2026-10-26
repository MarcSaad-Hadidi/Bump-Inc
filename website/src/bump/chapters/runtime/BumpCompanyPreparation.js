// Upload the company's unique paint and compile its programs while the
// neighbouring chapter is still visible, rather than in its first real draw.
export function prepareCompanyResources(renderer,scene,camera,{
 schedule=fn=>typeof requestIdleCallback==='function'?requestIdleCallback(fn,{timeout:1000}):setTimeout(fn,0),
 cancel=id=>typeof cancelIdleCallback==='function'?cancelIdleCallback(id):clearTimeout(id),
}={}){
 let disposed=false;
 const task=schedule(()=>{
  if(disposed)return;
  const textures=new Set();
  scene.traverse(object=>{
   if(!object.isMesh)return;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
   }
  });
  for(const texture of textures){try{renderer.initTexture?.(texture);}catch{/* Normal rendering still owns recovery after context loss. */}}
  // KHR_parallel_shader_compile is used when the renderer supports it. Never
  // fall back to synchronous compilation inside an animation frame.
  try{if(renderer.compileAsync)Promise.resolve(renderer.compileAsync(scene,camera)).catch(()=>{});}catch{/* Keep the normal render path available. */}
 });
 return()=>{disposed=true;cancel(task);};
}

// Keep a backdrop fitted while avoiding bounds traversal and four frustum
// unprojections on every frame when its camera and authored layout are stable.
export function createCompanyRoomFitter({Vector3,Box3}){
 const origin=new Vector3,ray=new Vector3,size=new Vector3,center=new Vector3,box=new Box3;
 const entries=new WeakMap(),view=new Float64Array(44);
 return(group,mesh,camera,layout,viewport)=>{
  group.rotation.set(0,0,0);
  camera.updateMatrixWorld();
  view.set(camera.matrixWorld.elements,0);view.set(camera.projectionMatrix.elements,16);
  view[32]=viewport.width;view[33]=viewport.height;view[34]=layout.responsive==='cover'?1:0;
  view[35]=layout.scale.x;view[36]=layout.scale.y;view[37]=layout.scale.z;
  view[38]=group.position.x;view[39]=group.position.y;view[40]=group.position.z;
  view[41]=mesh.scale.x;view[42]=mesh.scale.y;view[43]=mesh.scale.z;
  const previous=entries.get(group);
  let same=!!previous;
  if(previous)for(let index=0;index<view.length;index++)if(previous.view[index]!==view[index]){same=false;break;}
  if(same){group.scale.set(...previous.scale);return false;}
  const q=layout.responsive==='cover'?Math.max(1,viewport.width/viewport.height):1;
  group.scale.set(layout.scale.x*q,layout.scale.y*q,layout.scale.z*q);
  group.updateWorldMatrix(true,true);box.setFromObject(mesh);box.getSize(size);box.getCenter(center);camera.getWorldPosition(origin);
  const halfX=size.x/2,halfY=size.y/2;
  if(!halfX||!halfY)return false;
  let cover=0;
  for(const x of [-1,1])for(const y of [-1,1]){
   ray.set(x,y,.5).unproject(camera).sub(origin).normalize();
   if(Math.abs(ray.z)<1e-6)continue;
   const distance=(center.z-origin.z)/ray.z;
   if(distance<=0)continue;
   cover=Math.max(cover,Math.abs(origin.x+ray.x*distance-center.x)/halfX,Math.abs(origin.y+ray.y*distance-center.y)/halfY);
  }
  group.scale.multiplyScalar(Math.max(1,cover)*1.015);
  const entry=previous??{view:new Float64Array(44),scale:[0,0,0]};
  entry.view.set(view);group.scale.toArray(entry.scale);entries.set(group,entry);return true;
 };
}
