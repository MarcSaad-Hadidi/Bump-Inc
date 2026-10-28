import {usesMobileSceneFraming} from "./BumpDeviceMotion.js";
import {j as jsx,r as React} from './components-BdJai906.js';
import {u as useTheatre,S as Sheet,E as Effects} from './Effects-Co92NzQw.js';
import {E as Environment,C as Camera,a as Light,A as Asset} from './Butterflies-pNugjQAd.js';
import {u as useThree,d as useFrame,V as Vector3,B as Box3} from './Background-DpyJh-o1.js';
import {companyScrollProgress,seekCompanyAnimation,applyCompanyAnimationValues} from './BumpCompanyScroll.js';
import {companyMaterialKind,styleCompanyMaterial} from './BumpCompanyAppearance.js';
import {prepareCompanyResources,createCompanyRoomFitter} from './BumpCompanyPreparation.js';
import {sceneFrameNeeded} from './BumpSceneBudget.js';
import {a as useSceneStore} from './(_locale).editions.winter2026-CdSmWtXg.js';

function getNative(root){let found=null;root?.traverse(object=>{if(object.userData.bumpAnimation?.actions.size)found={root:object,...object.userData.bumpAnimation}});return found;}
function CompanyScrollPerformance({holder,sheet}){
 const {gl,scene}=useThree();
 const state=React.useRef({native:null,progress:NaN,visible:false,hidden:document.hidden,reduced:false});
 React.useEffect(()=>{
  const s=state.current,section=document.getElementById('b2b'),painting=section?.querySelector('[data-nav-theme]');s.section=section;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),setMotion=()=>{s.reduced=motion.matches;s.progress=NaN;},setHidden=()=>{s.hidden=document.hidden;if(!s.hidden)s.progress=NaN;};setMotion();
  motion.addEventListener('change',setMotion);document.addEventListener('visibilitychange',setHidden);
  const observer=painting?new IntersectionObserver(entries=>{s.visible=entries[0].isIntersecting;if(s.visible)s.progress=NaN;},{threshold:0}):null;
  if(painting)observer.observe(painting);else s.visible=true;
  return()=>{s.cancelPreparation?.();observer?.disconnect();motion.removeEventListener('change',setMotion);document.removeEventListener('visibilitychange',setHidden);if(s.native){delete s.native.applyTheatreAnimations;s.native.manual=false;s.native.mixer.timeScale=1;}if(s.section)delete s.section.__bumpNativeCompany;};
 },[]);
 useFrame(()=>{
  const s=state.current;
  if(!s.native){
   const result=getNative(holder.current);if(!result)return;
   // Retain the actual shared Asset record, so its wall-clock update is disabled
   // before evaluating the first pose. Four native skins remain fully active.
   s.native=result.root.userData.bumpAnimation;s.root=result.root;
   s.native.applyTheatreAnimations=animations=>{
    const progress=s.reduced?1:Math.min(1,Math.max(0,animations?.Scene?.progress??0));
    if(s.progress===progress)return;
    s.progress=applyCompanyAnimationValues(s.native,animations,s.reduced);
    if(s.section)s.section.dataset.companyPose=s.progress.toFixed(5);
   };
   result.root.traverse(object=>{if(!object.isMesh)return;const kind=companyMaterialKind(object);if(kind)for(const material of Array.isArray(object.material)?object.material:[object.material])styleCompanyMaterial(material,kind);});
   seekCompanyAnimation(s.native,s.reduced?1:companyScrollProgress(sheet));
   const camera=scene.getObjectByProperty('type','PerspectiveCamera');
   if(camera)s.cancelPreparation=prepareCompanyResources(gl,scene,camera);
   if(s.section){s.section.dataset.companyAnimation='scroll';s.section.dataset.companyFaces='registered-v22';s.section.__bumpNativeCompany={native:s.native,root:s.root};}
  }
  if(s.hidden||!s.visible)return;
  const progress=s.reduced?1:companyScrollProgress(sheet);
  const changed=s.progress!==progress,overridden=[...s.native.actions.values()].some(action=>!action.paused||action.timeScale!==0||action.loop!==2200);
  if(!changed&&!overridden)return;
  seekCompanyAnimation(s.native,progress);s.progress=progress;
  if(s.section)s.section.dataset.companyPose=progress.toFixed(5);
 });return null;
}

function CompanyRoomFit({holder,sheet}){
 const fit=React.useMemo(()=>createCompanyRoomFitter({Vector3,Box3}),[]);
 const cached=React.useRef({group:null,mesh:null,camera:null});
 useFrame(({scene,viewport})=>{
  if(usesMobileSceneFraming()||!sceneFrameNeeded(scene.userData.sectionIndex,useSceneStore.getState(),document.hidden))return;
  const group=holder.current?.children[0],layout=sheet.__experimental_getExistingObject('asset-2')?.value;
  if(!group||!layout)return;
  const state=cached.current;
  if(state.group!==group||!state.mesh){state.group=group;state.mesh=null;group.traverse(object=>{if(object.isMesh&&!state.mesh)state.mesh=object;});}
  state.camera??=scene.getObjectByProperty('type','PerspectiveCamera');
  const {mesh,camera}=state;if(!mesh||!camera)return;
  // The previous KTX2 courtyard used an inverted plane. The new authored WebP
  // is upright; keep native position/scale and fit it to the moving frustum.
  fit(group,mesh,camera,layout,viewport);mesh.material.color?.setRGB(.58,.58,.58);
 });return null;
}
export function B2BScene({sectionIndex,data}){
 const people=React.useRef(null),room=React.useRef(null);
 const sheet=useTheatre({name:'B2BScene',stateUrl:data.backgroundAnimation?.url,sectionIndex});if(!sheet)return null;
 return jsx.jsxs(Sheet,{sheet,children:[
  jsx.jsx(Environment,{}),jsx.jsx(Effects,{theatreKey:'effects'}),
  jsx.jsx(Camera,{theatreKey:"camera",bumpSceneId:"company",position:[0,0,4],cameraName:data.customCameraName}),

  jsx.jsx(Light,{theatreKey:'light-1',position:[-.5,0,.5],color:'#ff0000',intensity:0}),
  jsx.jsx(Light,{theatreKey:'light-2',position:[.5,0,.5],color:'#0000ff',intensity:0}),
  ...data.backgroundAssets.map((asset,index)=>jsx.jsx('group',{ref:index===0?people:index===1?room:undefined,children:jsx.jsx(Asset,{url:asset.url,theatreKey:`asset-${index+1}`,sectionIndex})},asset.id)),
  jsx.jsx(CompanyScrollPerformance,{holder:people,sheet}),jsx.jsx(CompanyRoomFit,{holder:room,sheet})
 ]});
}
