import {usesMobileSceneFraming} from "./BumpDeviceMotion.js";
import {j as jsx,r as React} from './components-BdJai906.js';
import {u as useTheatre,S as Sheet,E as Effects} from './Effects-Co92NzQw.js';
import {E as Environment,P as Particles,B as Butterflies,C as Camera,a as Light,A as Asset} from './Butterflies-pNugjQAd.js';
import {u as useThree,d as useFrame} from './Background-DpyJh-o1.js';

// Frame the existing scene in portrait; keep the woman and table together.


// The atelier behind the frame follows the existing camera. Fit the opaque
// background to its frustum so the approach never exposes black plane edges.
function AtelierBackgroundFit({holder}){
 useFrame(({scene})=>{
  const parent=holder.current,group=parent?.children[0],mesh=group?.children.find(o=>o.isMesh);
  const camera=scene.getObjectByProperty('type','PerspectiveCamera');
  if(!mesh||!camera)return;
  // Grade only the distant room material; keep white editorial type legible
  // against its window without introducing a separate overlay over the scene.
  mesh.material.color?.setRGB(.24,.24,.24);
  if(usesMobileSceneFraming())return;
  camera.updateMatrixWorld();parent.updateWorldMatrix(true,true);
  const origin=camera.getWorldPosition(camera.position.clone());
  const center=mesh.getWorldPosition(mesh.position.clone()),scale=parent.getWorldScale(parent.scale.clone());
  const halfX=8*Math.abs(scale.x*mesh.scale.x),halfY=8*Math.abs(scale.y*mesh.scale.y);
  if(!halfX||!halfY)return;
  let cover=1;
  for(const x of [-1,1])for(const y of [-1,1]){
   const ray=origin.clone().set(x,y,.5).unproject(camera).sub(origin).normalize();
   if(Math.abs(ray.z)<1e-6)continue;
   const distance=(center.z-origin.z)/ray.z;if(distance<=0)continue;
   cover=Math.max(cover,Math.abs(origin.x+ray.x*distance-center.x)/halfX,Math.abs(origin.y+ray.y*distance-center.y)/halfY);
  }
  group.scale.setScalar(8*cover*1.015);
 });return null;
}

// Retain the library's native camera and skinned book. Small screens keep the
// main book, rather than letting the secondary flying folios cross the copy.
export function AgenticScene({sectionIndex,data}){
 const background=React.useRef(null);
 const sheet=useTheatre({name:'AgenticScene',stateUrl:data.backgroundAnimation?.url,sectionIndex});
 if(!sheet)return null;
 return jsx.jsxs(Sheet,{sheet,children:[
  jsx.jsx(Environment,{}),jsx.jsx(Effects,{theatreKey:'effects'}),
  jsx.jsx(Particles,{theatreKey:'particles'}),jsx.jsx(Butterflies,{theatreKey:'butterflies'}),
  jsx.jsx(Camera,{theatreKey:'camera',position:[0,0,4],cameraName:data.customCameraName}),

  jsx.jsx(Light,{theatreKey:'light-1',position:[-.5,0,.5],color:'#ff0000',intensity:0}),
  jsx.jsx(Light,{theatreKey:'light-2',position:[.5,0,.5],color:'#0000ff',intensity:0}),
  ...data.backgroundAssets.map((asset,index)=>jsx.jsx('group',{ref:index===1?background:undefined,visible:index!==3,children:jsx.jsx(Asset,{url:asset.url,theatreKey:`asset-${index+1}`,sectionIndex})},asset.id)),
  jsx.jsx(AtelierBackgroundFit,{holder:background})
 ]});
}
