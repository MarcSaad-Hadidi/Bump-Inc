// Embedded into the retained Three runtime by stabilize-mobile-viewport.mjs.
// Its engine aliases belong to that module; desktop camera mathematics are
// retained, while each mobile camera owns one stable wide pose and projection.
export function Pa({theatreKey:n,position:e=[0,0,4],target:t=[0,0,1],rotation:r=[0,0,0],fov:s=30,near:i=.1,far:o=1e3,smoothness:c=.1,cameraName:a,targetOffset:u,freeOrbit:l=false,gaze:f=ia,bumpSceneId}){
 const {size:y,set:R}=it();
 const defaults={fov:s,position:{x:e[0],y:e[1],z:e[2]},target:{x:t[0],y:t[1],z:t[2]},rotation:{x:r[0],y:r[1],z:r[2]},freeOrbit:l,gaze:f};
 const initial=__bumpResolveSceneCamera(bumpSceneId,defaults,y,__bumpMobileScene());
 const d=p.useRef(null),h=p.useRef(initial.freeOrbit),m=p.useRef(initial.gaze),T=p.useRef(new Dn(initial.rotation.x,initial.rotation.y,initial.rotation.z)),b=bt(),_=p.useRef(null),g=p.useRef(new ve),v=p.useRef(new Wn),N=p.useRef(new Dn),M=p.useRef({x:0,y:0}),I=p.useRef({pan:0,tilt:0}),D=p.useRef(new ve(initial.position.x,initial.position.y,initial.position.z)),H=p.useRef(new ve(initial.target.x,initial.target.y,initial.target.z)),G=p.useRef(new ve),le=p.useRef(new ve),fe=p.useRef(new ve),se=p.useRef(new ve),k=p.useRef(new ve),V=p.useRef(null),[de,Y]=p.useState(false),E=p.useRef(false),liveSize=p.useRef(y);
 liveSize.current=y;
 const acceptValues=values=>{
  const view=__bumpApplySceneProjection(d.current,bumpSceneId,values,liveSize.current,__bumpMobileScene());
  h.current=view.freeOrbit;m.current=view.gaze;T.current.set(view.rotation.x,view.rotation.y,view.rotation.z);
  if(view.target)H.current.set(view.target.x,view.target.y,view.target.z);
  if((view.mobile||!a)&&view.position)D.current.set(view.position.x,view.position.y,view.position.z);
  return view;
 };
 p.useEffect(()=>{const move=event=>{M.current={x:event.clientX/window.innerWidth*2-1,y:-(event.clientY/window.innerHeight*2-1)}};window.addEventListener('pointermove',move);return()=>window.removeEventListener('pointermove',move);},[]);
 ra(a,camera=>{_.current=camera});
 p.useEffect(()=>{
  if(!b||!d.current||V.current)return;
  const config={freeOrbit:S.types.boolean(l,{label:'Free Orbit (Debug)'}),rotation:{x:S.types.number(r[0],{range:[-Math.PI,Math.PI],nudgeMultiplier:.01}),y:S.types.number(r[1],{range:[-Math.PI,Math.PI],nudgeMultiplier:.01}),z:S.types.number(r[2],{range:[-Math.PI,Math.PI],nudgeMultiplier:.01})},fov:S.types.number(s,{range:[10,120],nudgeMultiplier:1}),gaze:S.types.number(f,{range:[0,1],nudgeMultiplier:.01,label:'gaze'})};
  const values=a?{cameraSource:S.types.stringLiteral(`${a}`,{[`${a}`]:`${a}`},{label:'Camera'}),target:{x:S.types.number(t[0],{nudgeMultiplier:.01}),y:S.types.number(t[1],{nudgeMultiplier:.01}),z:S.types.number(t[2],{nudgeMultiplier:.01})},...config}:{position:{x:S.types.number(e[0],{nudgeMultiplier:.01}),y:S.types.number(e[1],{nudgeMultiplier:.01}),z:S.types.number(e[2],{nudgeMultiplier:.01})},target:{x:S.types.number(t[0],{nudgeMultiplier:.01}),y:S.types.number(t[1],{nudgeMultiplier:.01}),z:S.types.number(t[2],{nudgeMultiplier:.01})},...config};
  V.current=b.object(n,values,{reconfigure:true});
 },[b,n,a,s,e,t,r,l,f]);
 p.useEffect(()=>!V.current||!d.current?undefined:V.current.onValuesChange(values=>{
  if(!d.current)return;
  if(!E.current){E.current=true;Y(true);}
  acceptValues(values);
 }),[a]);
 const x=p.useRef(1);
 _t(()=>{
  if(!d.current)return;
  const wasMobile=d.current.userData.bumpMobileScene;
  const values=V.current?.value??defaults;
  const view=__bumpApplySceneProjection(d.current,bumpSceneId,values,liveSize.current,__bumpMobileScene());
  if(view.mobile||wasMobile)acceptValues(values);
  const {isGlobeDragging:w,globeDragVelocity:A}=Wt.getState(),J=Math.abs(A),Te=w||J>1e-4?.05+Math.max(0,.2-J*10):1;
  x.current+=(Te-x.current)*.1;
  const Z=h.current,Q=Z?1:m.current,oe=Z?-Gt:Ds[0]*Q,U=Z?Gt:Ds[1]*Q,$=Z?-Gt:Ps[0]*Q,L=Z?Gt:Ps[1]*Q,motion=__bumpScenePointer(M.current),W=motion.x,ae=motion.y,O=oe+(W*.5+.5)*(U-oe),q=$+(ae*.5+.5)*(L-$),pe=c*x.current;
  I.current.pan+=(O*x.current-I.current.pan)*pe;I.current.tilt+=(q*x.current-I.current.tilt)*pe;
  const {pan:re,tilt:ce}=I.current;
  if(_.current&&!view.mobile){
   _.current.getWorldPosition(d.current.position);_.current.getWorldQuaternion(d.current.quaternion);
   const offset=g.current;offset.set(0,0,0);offset.x+=re;offset.y+=ce;offset.applyQuaternion(d.current.quaternion);d.current.position.add(offset);
   const quaternion=v.current,euler=N.current;quaternion.identity();euler.set(-ce,re,0);const rotation=T.current;euler.x+=rotation.x;euler.y+=rotation.y;euler.z+=rotation.z;quaternion.setFromEuler(euler);d.current.quaternion.multiply(quaternion);return;
  }
  const z=u?G.current.set(...u):G.current.set(0,0,0);se.current.lerp(z,.05);k.current.copy(H.current).add(se.current);G.current.subVectors(D.current,k.current).normalize();
  const Me=D.current.distanceTo(k.current),he=G.current.x*Math.cos(-re)-G.current.z*Math.sin(-re),Oe=G.current.x*Math.sin(re)+G.current.z*Math.cos(re),K=Math.cos(-ce),De=Math.sin(-ce),Fe=he*K,Ve=G.current.y*K-De,Xe=Oe*K;
  le.current.set(Fe,Ve,Xe).normalize();fe.current.copy(k.current).add(le.current.multiplyScalar(Me));d.current.position.copy(fe.current);d.current.lookAt(k.current);
  const rotation=T.current;if(rotation.x!==0||rotation.y!==0||rotation.z!==0){d.current.rotateX(rotation.x);d.current.rotateY(rotation.y);d.current.rotateZ(rotation.z);}
  d.current.userData.bumpPoseReady=true;
 });
 p.useEffect(()=>{
  if(!d.current||!de)return;
  __bumpApplySceneProjection(d.current,bumpSceneId,V.current?.value??defaults,liveSize.current,__bumpMobileScene());
  d.current.near=i;d.current.far=o;d.current.updateProjectionMatrix();R({camera:d.current});
 },[s,i,o,y.width,y.height,R,de]);
 p.useEffect(()=>{if(d.current)__bumpApplySceneProjection(d.current,bumpSceneId,V.current?.value??defaults,liveSize.current,__bumpMobileScene());},[y.width,y.height]);
 return ee.jsx('perspectiveCamera',{ref:camera=>{d.current=camera;if(camera&&bumpSceneId)camera.userData.bumpSceneId=bumpSceneId;},position:[initial.position.x,initial.position.y,initial.position.z],fov:initial.fov});
}
