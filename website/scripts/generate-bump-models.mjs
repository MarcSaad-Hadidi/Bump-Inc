/** Self-contained Bump sculptures. True GLB geometry; no remote model dependencies. */
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {writeFile,mkdir} from 'node:fs/promises';

if(!globalThis.FileReader) globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();this.onload?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onloadend?.();this.onload?.();});}
};
const OUT=new URL('../public/bump/models/',import.meta.url);
await mkdir(OUT,{recursive:true});
const palette={bronze:0xb88b49,brass:0xd6b672,ivory:0xe9dfbe,cream:0xf7f0d9,burgundy:0x753d40,dark:0x3f4b42,teal:0x596d64};
const materials=Object.fromEntries(Object.entries(palette).map(([n,color])=>[n,new THREE.MeshStandardMaterial({name:`Bump_${n}`,color,vertexColors:true,roughness:n==='brass'?.38:.7,metalness:['bronze','brass'].includes(n)?.68:.08})]));
let counter=0;
function colored(geometry){
  const p=geometry.attributes.position,n=geometry.attributes.normal,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    // Low-amplitude patina and warm directional brush variation remain baked into geometry.
    const light=.82+.16*Math.max(0,n.getX(i)*-.35+n.getY(i)*.7+n.getZ(i)*.6);
    const grain=.025*Math.sin(x*41+y*19+z*31)+.014*Math.sin(x*87-y*49+z*22);
    colors[i*3]=light+grain+.035;colors[i*3+1]=light+grain+.018;colors[i*3+2]=light+grain-.012;
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
}
function mesh(g,mat='bronze',name='detail') {const m=new THREE.Mesh(colored(g),materials[mat]);m.name=`${name}_${++counter}`;return m;}
function add(parent,g,mat,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1],name){const m=mesh(g,mat,name);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);parent.add(m);return m;}
function torus(parent,r=.6,t=.045,mat='brass',pos=[0,0,0],rot=[0,0,0],arc=Math.PI*2){return add(parent,new THREE.TorusGeometry(r,t,10,56,arc),mat,pos,rot);}
function sphere(parent,r=.15,mat='burgundy',pos=[0,0,0]){return add(parent,new THREE.SphereGeometry(r,r<.09?10:20,r<.09?8:14),mat,pos);}
function box(parent,w,h,d,mat='ivory',pos=[0,0,0],rot=[0,0,0],radius=.08){return add(parent,new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w/3,h/3,d/3)),mat,pos,rot);}
function tube(parent,points,mat='brass',radius=.036){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return add(parent,new THREE.TubeGeometry(curve,64,radius,8,false),mat);}
function disk(parent,r=.42,h=.16,mat='ivory',pos=[0,0,0],rot=[Math.PI/2,0,0]){return add(parent,new THREE.CylinderGeometry(r,r,h,64,1),mat,pos,rot);}
function details(parent,r=.6,mat='brass',z=.04,count=16){for(let i=0;i<count;i++){const a=i/count*Math.PI*2; sphere(parent,.018,mat,[Math.cos(a)*r,Math.sin(a)*r,z]);}}
function gear(parent,r=.5,mat='bronze',pos=[0,0,0],rot=[0,0,0],teeth=20){
  const group=new THREE.Group();group.name=`gear_${++counter}`;parent.add(group);group.position.set(...pos);group.rotation.set(...rot);
  const shape=new THREE.Shape();
  for(let i=0;i<teeth*4;i++){const a=i/(teeth*4)*Math.PI*2,rad=r*([0,3].includes(i%4)?.88:1);const x=Math.cos(a)*rad,y=Math.sin(a)*rad;i?shape.lineTo(x,y):shape.moveTo(x,y);}
  shape.closePath();const hole=new THREE.Path();hole.absarc(0,0,r*.46,0,Math.PI*2,true);shape.holes.push(hole);
  const geom=new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:true,bevelSize:.016,bevelThickness:.012,bevelSegments:1,curveSegments:12});
  add(group,geom,mat,[0,0,-.04]);torus(group,r*.48,.025,'brass');torus(group,r*.75,.012,'brass',[0,0,.065]);
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;box(group,r*.5,.055,.045,mat,[Math.cos(a)*r*.27,Math.sin(a)*r*.27,.02],[0,0,a],.01);}
  disk(group,r*.11,.16,'brass',[0,0,.035]);return group;
}
function plinth(parent,x,y,w=1.15){
  add(parent,new THREE.CylinderGeometry(w*.5,w*.54,.12,64),'ivory',[x,y,0],[0,0,0],[1,1,.22]);
  add(parent,new THREE.CylinderGeometry(w*.51,w*.51,.035,64),'bronze',[x,y+.065,0],[0,0,0],[1,1,.22]);
}
function medallion(parent,x,y,r=.34,kind=0){
  const group=new THREE.Group();group.name=`station_${++counter}`;group.position.set(x,y,0);parent.add(group);
  disk(group,r,.16,'ivory');torus(group,r*.94,.025,'bronze',[0,0,.095]);torus(group,r*.74,.008,'brass',[0,0,.12]);
  if(kind%3===0){torus(group,r*.42,.035,'bronze',[0,0,.15]);sphere(group,r*.1,'burgundy',[0,0,.19]);}
  else if(kind%3===1){for(let j=0;j<3;j++)box(group,r*.14,r*(.36+j*.16),.045,j===1?'burgundy':'bronze',[(j-1)*r*.27,0,.16],undefined,.008);}
  else {for(let j=0;j<3;j++){const a=j*2.094;disk(group,r*.12,.045,'bronze',[Math.cos(a)*r*.32,Math.sin(a)*r*.32,.16]);}torus(group,r*.33,.012,'brass',[0,0,.16]);}
  return group;
}
function scene(name){const s=new THREE.Scene();s.name=`Bump_${name}`;const sculpt=new THREE.Group();sculpt.name='BumpSculpture';s.add(sculpt);return {scene:s,g:sculpt,clips:[]};}
function animateRotor(ctx,obj,seconds=10,direction=1){const q0=obj.quaternion.clone();const values=[];for(let i=0;i<5;i++){const q=q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),direction*i*Math.PI/2));values.push(q.x,q.y,q.z,q.w);}ctx.clips.push(new THREE.QuaternionKeyframeTrack(`${obj.name}.quaternion`,[0,seconds/4,seconds/2,seconds*3/4,seconds],values));}
function animateFloat(ctx,obj,amp=.09,seconds=10){const p=obj.position;ctx.clips.push(new THREE.VectorKeyframeTrack(`${obj.name}.position`,[0,seconds/4,seconds/2,seconds*3/4,seconds],[p.x,p.y,p.z,p.x,p.y+amp,p.z,p.x,p.y,p.z,p.x,p.y-amp,p.z,p.x,p.y,p.z]));}
function hero(){
 const c=scene('hero'),g=c.g;
 const left=new THREE.Group();left.name='hero_left_instrument';left.position.set(-2.05,.15,0);left.rotation.set(.12,-.24,-.18);g.add(left);
 torus(left,.8,.065,'ivory');torus(left,.72,.023,'bronze',[0,0,.11]);torus(left,.57,.022,'brass',[0,0,.13],[.75,.2,0]);torus(left,.57,.022,'brass',[0,0,.13],[-.7,-.2,0]);sphere(left,.21,'burgundy',[0,0,.08]);details(left,.79,'brass',.08,28);
 const r=gear(left,.37,'bronze',[0,-1.05,.1],[0,0,0],22);animateRotor(c,r,12);
 box(left,.07,.42,.09,'bronze',[0,-.82,0]);plinth(g,-2.05,-1.54,1.2);
 const right=new THREE.Group();right.name='hero_right_collaboration';right.position.set(2.05,-.1,0);right.rotation.set(-.13,.32,.1);g.add(right);
 for(let i=0;i<3;i++)torus(right,.78,.13,i===1?'ivory':'bronze',[0,0,(i-1)*.07],[i*.65,.6+i*.5,i*.7]);
 torus(right,1.01,.018,'brass',[0,0,-.12]);details(right,1.01,'brass',-.12,20);plinth(g,2.05,-1.54,1.2);animateFloat(c,right,.09,12);
 // The connection runs below the central hero panel, leaving its reading area open.
 tube(g,[[-2.05,-1.35,-.1],[-1.35,-1.7,.1],[0,-1.78,.32],[1.35,-1.7,.1],[2.05,-1.35,-.1]],'brass',.035);
 return c;
}
function workflow(){
 const c=scene('workflow'),g=c.g;const positions=[[-2.4,.8],[-1.2,-.15],[0,.6],[1.25,-.4],[2.4,.5]];
 tube(g,positions.map(([x,y],i)=>[x,y,-.1+Math.sin(i)*.15]),'bronze',.07);
 tube(g,positions.map(([x,y],i)=>[x,y-.1,-.09+Math.sin(i)*.15]),'brass',.018);
 positions.forEach(([x,y],i)=>{medallion(g,x,y,.39,i);const rotor=gear(g,.17,'bronze',[x,y,.24],undefined,16);animateRotor(c,rotor,12,i%2?-1:1);});
 for(let i=0;i<4;i++){const [a,b]=[positions[i],positions[i+1]];const x=(a[0]+b[0])*.5,y=(a[1]+b[1])*.5;const diamond=box(g,.14,.14,.1,'burgundy',[x,y,.04],[0,0,Math.PI/4],.025);animateFloat(c,diamond,.04,8);}
 plinth(g,0,-1.15,3.7);
 return c;
}
function software(){
 const c=scene('software'),g=c.g;
 const chassis=new THREE.Group();chassis.name='software_assembled_core';chassis.rotation.set(.12,-.28,-.05);g.add(chassis);
 for(let i=0;i<3;i++){
  box(chassis,2.1,1.3,.16,i===1?'burgundy':'ivory',[0,0,-.35+i*.32],[0,0,0],.12);
  for(let j=0;j<6;j++)sphere(chassis,.025,'brass',[-.88+j*.35,-.52,.34-i*.02]);
 }
 const rotor=gear(chassis,.54,'bronze',[0,0,.42],[0,0,0],28);animateRotor(c,rotor,12);
 torus(chassis,.72,.025,'brass',[0,0,.4]);sphere(chassis,.18,'ivory',[0,0,.53]);
 for(let side of [-1,1]){
  const x=side*2.1;medallion(g,x,side*.58,.35,side===1?1:2);
  tube(g,[[side*1.05,0,-.1],[side*1.45,0,.18],[side*1.6,side*.58,.2],[x,side*.58,.1]],'brass',.055);
  const chip=box(g,.65,.28,.17,'burgundy',[x,-side*.6,.02],[0,0,side*.14],.06);animateFloat(c,chip,.09,10);
  tube(g,[[x,-side*.6,.02],[side*1.6,-side*.6,-.1],[side*1.4,-.25,-.15],[side*1.05,-.25,-.1]],'bronze',.035);
 }
 plinth(g,0,-1.25,2.6);return c;
}
function shieldGeometry(){const s=new THREE.Shape();s.moveTo(0,1.25);s.bezierCurveTo(.3,1.1,.7,1.04,.92,.9);s.lineTo(.85,-.1);s.bezierCurveTo(.79,-.65,.32,-1.08,0,-1.3);s.bezierCurveTo(-.32,-1.08,-.79,-.65,-.85,-.1);s.lineTo(-.92,.9);s.bezierCurveTo(-.7,1.04,-.3,1.1,0,1.25);return new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.07,bevelThickness:.06,curveSegments:24});}
function security(){
 const c=scene('security'),g=c.g;
 for(let i=0;i<3;i++){
  const r=1.5+i*.3;torus(g,r,.075,i===1?'ivory':'bronze',[0,-.2,-.5-i*.03],[0,0,0],Math.PI);
  for(let side of [-1,1]){box(g,.14,1.48,.15,i===1?'ivory':'bronze',[side*r,-.94,-.5-i*.03]);disk(g,.16,.1,'brass',[side*r,-1.68,-.5-i*.03],[0,0,0]);}
 }
 const shield=add(g,shieldGeometry(),'ivory',[0,0,0],[0,.15,-.08]);shield.name='security_shield';animateFloat(c,shield,.045,12);
 const inner=add(shield,shieldGeometry(),'burgundy',[0,0,.2],[0,0,0],[.8,.8,.45]);
 torus(shield,.31,.055,'bronze',[0,.12,.42]);box(shield,.17,.32,.1,'bronze',[0,-.15,.42]);sphere(shield,.08,'brass',[0,.12,.48]);
 for(let side of [-1,1])for(let j=0;j<4;j++)sphere(shield,.025,'brass',[side*(.52-j*.07),.6-j*.36,.38]);
 plinth(g,0,-1.85,3.8);return c;
}
function method(){
 const c=scene('method'),g=c.g;const points=[];
 for(let i=0;i<5;i++){
  const x=(i-2)*1.08,y=.25+Math.sin(i*.78)*.3;points.push([x,y,.04]);
  medallion(g,x,y,.32,i);
  const height=.28+i*.22;box(g,.51,height,.4,i%2?'burgundy':'ivory',[x,-.48-height*.5,-.09],[0,.1,0],.05);
  torus(g,.38,.018,'brass',[x,y,.14]);
 }
 tube(g,points,'bronze',.045);
 const orb=sphere(g,.075,'burgundy',points[0]);orb.name='method_progress';
 const times=[],values=[];for(let i=0;i<5;i++){times.push(i*2);values.push(...points[i]);}times.push(10);values.push(...points[0]);
 c.clips.push(new THREE.VectorKeyframeTrack('method_progress.position',times,values));plinth(g,0,-1.83,5.2);return c;
}
function vision(){
 const c=scene('vision'),g=c.g;
 for(let i=0;i<3;i++){
  const x=(i-1)*1.75;const a=new THREE.Group();a.name=`vision_future_${i}`;a.position.set(x,.15+i*.13,0);a.rotation.set(.15,(i-1)*.22,(i-1)*-.12);g.add(a);
  torus(a,.62,.075,'ivory',[0,0,0],[0,0,.1],Math.PI*1.65);torus(a,.45,.03,'bronze',[0,0,.05],[.5,.4,.5],Math.PI*1.6);
  torus(a,.27,.022,'brass',[0,0,.12],[.7,-.4,-.3],Math.PI*1.45);
  for(let j=0;j<3;j++){const theta=j*Math.PI*.7+.1;box(a,.12,.24,.1,j===1?'burgundy':'bronze',[Math.cos(theta)*.77,Math.sin(theta)*.77,.05],[0,0,theta],.035);}
  sphere(a,.11,'burgundy',[0,0,.13]);animateFloat(c,a,.09,12);
  plinth(g,x,-1.3,1.08);
 }
 return c;
}
function contact(){
 const c=scene('contact'),g=c.g;
 const l=new THREE.Group();l.name='contact_left';l.position.set(-.72,.15,0);l.rotation.set(.26,.5,-.35);g.add(l);
 const r=new THREE.Group();r.name='contact_right';r.position.set(.72,-.15,.1);r.rotation.set(-.26,-.5,.35);g.add(r);
 torus(l,1,.18,'ivory');torus(l,1,.03,'brass',[0,0,.2]);torus(r,1,.18,'bronze');torus(r,1,.025,'brass',[0,0,.2]);
 details(l,1,'bronze',.19,32);details(r,1,'ivory',.19,32);
 animateFloat(c,l,.055,12);animateFloat(c,r,.055,12);
 tube(g,[[-2.2,-1.18,0],[-1.4,-1.5,.1],[0,-1.55,.2],[1.4,-1.5,.1],[2.2,-1.18,0]],'brass',.045);
 plinth(g,0,-1.75,3.8);return c;
}

const factories={hero,workflow,software,security,method,vision,contact};
const report=[];
for(const[name,build]of Object.entries(factories)){
 const c=build();c.scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(c.g);const size=bounds.getSize(new THREE.Vector3());const center=bounds.getCenter(new THREE.Vector3());
 const scale=Math.min(5.6/size.x,3.7/size.y);
 const depthScale=Math.min(1,1.55/(size.z*scale));
 // Root transform keeps animation node names and local tracks intact.
 c.g.scale.set(scale,scale,scale*depthScale);c.g.position.copy(center.multiply(c.g.scale).negate());c.scene.updateMatrixWorld(true);
 const clips=c.clips.length?[new THREE.AnimationClip('BumpAmbient',-1,c.clips)]:[];
 const buffer=await new GLTFExporter().parseAsync(c.scene,{binary:true,animations:clips,onlyVisible:true});
 await writeFile(new URL(`${name}.glb`,OUT),Buffer.from(buffer));
 const b=new THREE.Box3().setFromObject(c.g),s=b.getSize(new THREE.Vector3());let meshes=0,vertices=0;c.g.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;}});
 report.push({name,bytes:buffer.byteLength,meshes,vertices,min:b.min.toArray(),max:b.max.toArray(),size:s.toArray(),animations:clips.map(a=>({name:a.name,duration:a.duration}))});
 console.log(name,buffer.byteLength,'bytes',meshes,'meshes',s.toArray().map(n=>n.toFixed(3)).join(' × '));
}
await writeFile(new URL('asset-report.json',OUT),JSON.stringify({generator:'Three.js GLTFExporter',palette,models:report},null,2)+'\n');
