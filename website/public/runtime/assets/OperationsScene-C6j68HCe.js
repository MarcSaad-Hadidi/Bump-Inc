import {usesMobileSceneFraming} from "./BumpDeviceMotion.js";
import{styleSecurityGazeMaterial}from'./BumpGaze.js';
import{BUMP_PLAYBACK_RATE}from'./BumpPlayback.js';
import{r as t,j as n}from"./components-BdJai906.js";import{u as L,S as k,E as K}from"./Effects-Co92NzQw.js";import{u as N,E as B,P as F,B as V,C as W,a as T,A as X}from"./Butterflies-pNugjQAd.js";import{u as A,V as U,f as G,S as I,A as Y,C as _,g as R,M as $,h as J,i as Q,B as Z,d as ee}from"./Background-DpyJh-o1.js";import{a as re}from"./(_locale).editions.winter2026-CdSmWtXg.js";import{u as te}from"./useObjectInteraction-BF-epfZF.js";import"./rive-DN8nxF7J.js";import"./index-CMQ6Y8fQ.js";import"./index-BYdhAta1.js";import"./constants-AgmyR9jG.js";import"./Button-uHjSK4Hu.js";import"./useLogError-Do9VTLkp.js";import"./meta-CwiYJk4F.js";const oe=`
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,ne=`
  uniform float uTime;
  uniform vec3 uColor;
  uniform sampler2D uColorMap;
  uniform float uOpacity;
  uniform float uHueShift;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  vec3 rgb2hsl(vec3 c) {
    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float l = (maxC + minC) / 2.0;
    if (maxC == minC) return vec3(0.0, 0.0, l);
    float d = maxC - minC;
    float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
    float h;
    if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    return vec3(h / 6.0, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 c) {
    if (c.y == 0.0) return vec3(c.z);
    float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
    float p = 2.0 * c.z - q;
    return vec3(
      hue2rgb(p, q, c.x + 1.0/3.0),
      hue2rgb(p, q, c.x),
      hue2rgb(p, q, c.x - 1.0/3.0)
    );
  }

  void main() {
    vec3 texColor = texture2D(uColorMap, vUv).rgb;
    texColor = pow(texColor, vec3(3.2));

    float scanline = sin(vUv.y * 300.0 + uTime * 10.0) * 0.3 + 0.5;
    scanline = mix(0.5, 1.0, pow(scanline, 2.0));

    float sweep = fract(-uTime * 0.15);
    float sweepLine = smoothstep(0.2, -0.2, abs(vUv.y + vPosition.z * 0.4 - sweep));
    sweepLine = pow(sweepLine, 2.0) * 1.0;

    float land = 1.0 - length(texColor);
    vec3 finalColor = vec3(0.2 + land) * uColor;
    finalColor *= scanline;
    finalColor += sweepLine * uColor;

    finalColor += land * (0.5 + sin(uTime * 2.5 + vPosition.z * 5.0 + length(vPosition.xy) * 10.0) * 0.5) * 0.3 * uColor;

    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 4.0);

    finalColor = pow(finalColor, vec3(1.2));

    vec3 finalHsl = rgb2hsl(finalColor);
    finalHsl.x = fract(finalHsl.x + 0.8 + vUv.y * 0.2 + 0.55);
    finalColor = hsl2rgb(finalHsl);

    finalColor *= mix(0.9, 1.25, uHover) + sin(uTime * 2.0 + vPosition.y * 0.2) * 0.5;

    finalColor.rgb += length(texColor) * uColor * 0.5;

    vec3 lines = vec3(pow(fresnel, 2.0)) * 0.2 * smoothstep(0.5, 0.0, abs(vPosition));
    vec3 linesHsl = rgb2hsl(lines);
    linesHsl.x = fract(linesHsl.x * mix(0.05, 0.2, uHover) + 0.02);
    lines = hsl2rgb(linesHsl);
    lines *= mix(1.0, 0.0, smoothstep(0.5, 0.1, vUv.y));
    lines *= mix(0.5, 1.5, uHover);

    finalColor = mix(pow(finalColor, vec3(1.0)) * 0.8, lines, 0.2);

    finalColor *= mix(1.0, 0.0, smoothstep(0.8, 0.2, vUv.y));

    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;function ie({objectName:d,speed:i=.2,friction:g=.95,returnSpeed:h=.02,customAssets:a}){const[e,w]=t.useState(null),{scene:S}=A(),o=t.useRef(null),y=t.useMemo(()=>new U,[]),j=t.useMemo(()=>new U,[]),x=t.useMemo(()=>new G,[]),s=t.useRef(!1),P=t.useRef(0),c=t.useRef(0),C=t.useRef(i),b=t.useRef(0),f=t.useRef(1),M=t.useRef(0),p=t.useMemo(()=>new I({uniforms:{uTime:{value:0},uColor:{value:new _(.2,.5,1)},uColorMap:{value:null},uOpacity:{value:.8},uHueShift:{value:0},uHover:{value:0}},vertexShader:oe,fragmentShader:ne,transparent:!0,blending:Y,depthWrite:!1,depthTest:!0}),[]);N(d,r=>{w(r)}),t.useEffect(()=>{e&&e.traverse(r=>{r instanceof R&&r.material instanceof $&&(r.material.metalness=.9,r.material.roughness=.2,r.material.envMapIntensity=3,r.material.needsUpdate=!0)})},[e]),t.useEffect(()=>{var z;if(!e)return;const r=(z=a==null?void 0:a[0])==null?void 0:z.url;r&&(p.uniforms.uColorMap.value=J(r));const l=51.3685,u=.98,m=new Q(l*u,64,64),v=new R(m,p);return v.renderOrder=2,S.add(v),o.current=v,()=>{S.remove(v),m.dispose(),e&&(e.visible=!0)}},[e,p,S,a]);const E=t.useCallback(()=>{typeof window>"u"||!document.body||s.current||(document.body.style.cursor="grab")},[]),q=t.useCallback(()=>{typeof window>"u"||!document.body||s.current||(document.body.style.cursor="")},[]),O=t.useCallback(r=>{typeof window>"u"||!document.body||(s.current=!0,P.current=r.clientX,c.current=0,document.body.style.cursor="grabbing")},[]),D=t.useCallback(r=>{const l=r.clientX-P.current;c.current=l*.005,P.current=r.clientX,b.current+=c.current},[]),{isHovered:H}=te(e,{onPointerEnter:E,onPointerLeave:q,onPointerDown:O,onPointerUp:()=>{typeof window>"u"||!document.body||s.current&&(s.current=!1,document.body.style.cursor=H()?"grab":"")},onDrag:D});return t.useEffect(()=>{e&&(new Z().setFromObject(e).getBoundingSphere(x),x.radius*=.7,e.raycast=(r,l)=>{const u=r.ray.intersectSphere(x,y);u&&l.push({object:e,point:u.clone(),distance:r.ray.origin.distanceTo(u),face:null})})},[e,x,y]),ee(({clock:r},l)=>{if(!e)return;p.uniforms.uTime.value=r.elapsedTime*BUMP_PLAYBACK_RATE;const u=H()?1:0;if(M.current+=(u-M.current)*.1,p.uniforms.uHover.value=M.current,re.getState().setGlobeInteraction(s.current,c.current),s.current?(C.current*=.85,f.current+=(1-f.current)*.2):(Math.abs(c.current)>1e-4&&(b.current+=c.current,c.current*=g),C.current+=(i-C.current)*h,b.current+=l*C.current*BUMP_PLAYBACK_RATE,f.current+=(.2-f.current)*.05),e.rotation.y+=(b.current-e.rotation.y)*f.current,o.current){e.getWorldPosition(y),o.current.position.copy(y);const m=f.current*.5,v=e.rotation.y+Math.PI*1.49;o.current.rotation.x+=(e.rotation.x-o.current.rotation.x)*m,o.current.rotation.y+=(v-o.current.rotation.y)*m,o.current.rotation.z+=(e.rotation.z-o.current.rotation.z)*m,e.getWorldScale(j),o.current.scale.copy(j).multiplyScalar(1.1)}}),null}// Cover the native moving camera with the new opaque Bump room. The foreground
// consultants and the original articulated globe keep their existing transforms.
function SecurityRoomFit({holder,sheet}){
 const origin=t.useMemo(()=>new U,[]),ray=t.useMemo(()=>new U,[]),size=t.useMemo(()=>new U,[]),center=t.useMemo(()=>new U,[]),box=t.useMemo(()=>new Z,[]);
 ee(({scene,viewport})=>{
  const parent=holder.current,group=parent?.children[0],camera=scene.getObjectByProperty('type','PerspectiveCamera');
  let mesh;group?.traverse(object=>{if(object.isMesh&&!mesh)mesh=object});
  const layout=sheet.__experimental_getExistingObject('asset-2')?.value;
  if(!mesh||!camera||!layout)return;
  if(usesMobileSceneFraming())return;
  const q=layout.responsive==='cover'?Math.max(1,viewport.width/viewport.height):1;
  group.scale.set(layout.scale.x*q,layout.scale.y*q,layout.scale.z*q);
  camera.updateMatrixWorld();group.updateWorldMatrix(true,true);box.setFromObject(mesh);box.getSize(size);box.getCenter(center);camera.getWorldPosition(origin);
  const halfX=size.x/2,halfY=size.y/2;if(!halfX||!halfY)return;
  let cover=0;
  for(const x of [-1,1])for(const y of [-1,1]){
   ray.set(x,y,.5).unproject(camera).sub(origin).normalize();
   if(Math.abs(ray.z)<1e-6)continue;
   const distance=(center.z-origin.z)/ray.z;if(distance<=0)continue;
   cover=Math.max(cover,Math.abs(origin.x+ray.x*distance-center.x)/halfX,Math.abs(origin.y+ray.y*distance-center.y)/halfY);
  }
  group.scale.multiplyScalar(cover*1.015);
 });return null;
}

// A smoothed pointer target drives the registered eye interiors on the real
// skinned face material. No independently timed blinking or eyelid overlay.
function SecurityGaze({sectionIndex}){
 const target=t.useRef([.5,.5,0]),current=t.useRef([.5,.5,0]),previous=t.useRef('');
 t.useEffect(()=>{const move=e=>{if(e.pointerType==='touch')return;target.current=[e.clientX/innerWidth,1-e.clientY/innerHeight,1];},leave=()=>{target.current[2]=0;};window.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',leave);return()=>{window.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',leave);};},[]);
 ee(({scene,gl},delta)=>{const faces=scene.getObjectByName('Bump_Security_Faces_v21');if(!faces?.material)return;const material=faces.material;if(!material.userData.bumpGaze)styleSecurityGazeMaterial(material);const active=re.getState().activeSection===sectionIndex&&!document.hidden;const blend=1-Math.exp(-delta*10);for(let i=0;i<3;i++)current.current[i]+=((active?target.current[i]:i===2?0:.5)-current.current[i])*blend;const gaze=material.userData.bumpGaze;gaze.pointer.value=[current.current[0],current.current[1]];gaze.resolution.value=[gl.domElement.width,gl.domElement.height];gaze.strength.value=current.current[2];const label=current.current.map(v=>v.toFixed(1)).join(',');if(label!==previous.current){previous.current=label;const section=document.getElementById('operations');if(section)section.dataset.bumpGaze=label;}});return null;
}

function xe({sectionIndex,data}){
 const room=t.useRef(null),sheet=L({name:'OperationsScene',stateUrl:data.backgroundAnimation?.url,sectionIndex});
 return sheet?n.jsxs(k,{sheet,children:[
  n.jsx(ie,{objectName:'earth',speed:.2,customAssets:data.backgroundCustomAssets}),
  n.jsx(B,{}),n.jsx(K,{theatreKey:'effects'}),n.jsx(F,{theatreKey:'particles'}),n.jsx(V,{theatreKey:'butterflies'}),
  n.jsx(W,{theatreKey:"camera",bumpSceneId:"security",position:[0,0,4],cameraName:data.customCameraName}),
  n.jsx(SecurityGaze,{sectionIndex}),
  n.jsx(T,{theatreKey:'light-1',position:[-.5,0,.5],color:'#ff0000',intensity:0}),
  n.jsx(T,{theatreKey:'light-2',position:[.5,0,.5],color:'#0000ff',intensity:0}),
  ...data.backgroundAssets.map((asset,index)=>n.jsx('group',{ref:index===1?room:undefined,children:n.jsx(X,{url:asset.url,theatreKey:`asset-${index+1}`,sectionIndex})},asset.id)),
  n.jsx(SecurityRoomFit,{holder:room,sheet})
 ]}):null;
}
export{xe as OperationsScene};
