import * as T from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {readFileSync} from 'node:fs';

const v=a=>new T.Vector3(...a);
const brass={name:'Bump_Engraved_Brass',pbrMetallicRoughness:{baseColorFactor:[.78,.55,.23,1],metallicFactor:.78,roughnessFactor:.28}};
function quad(corners,normal,offset=0,inset=1){
 const center=corners.map(v).reduce((s,p)=>s.add(p),new T.Vector3()).multiplyScalar(.25);
 const points=corners.map(p=>v(p).sub(center).multiplyScalar(inset).add(center).addScaledVector(normal,offset));
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
 const winding=new T.Vector3().subVectors(points[1],points[0]).cross(new T.Vector3().subVectors(points[2],points[0])).dot(normal);
 g.setIndex(winding>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.computeVertexNormals();return g;
}

export function brandingGeometry(input){
 const patches=[];
 if(input==='sidekick-1.glb'){
  // A real face plate and raised B inherit the original armillary node's rig.
  const corners=[[-1.087424,.913975,1.340973],[1.679437,1.025986,.738251],[1.197074,-1.450762,-.957904],[-1.502071,-1.262919,-.151801]],normal=v([.19584,-.57904,.79143]).normalize();
  patches.push({parent:'shiny-ring6',name:'Bump_Armillary_Face',geometry:quad(corners,normal,.038),material:{name:'Bump_Armillary_Enamel',pbrMetallicRoughness:{baseColorFactor:[.025,.10,.105,1],metallicFactor:.28,roughnessFactor:.4}}});
  const font=new FontLoader().parse(JSON.parse(readFileSync(new URL('../../../../node_modules/three/examples/fonts/gentilis_bold.typeface.json',import.meta.url))));
  const letter=new TextGeometry('B',{font,size:1,depth:.05,curveSegments:10,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2});letter.computeBoundingBox();const box=letter.boundingBox,center=box.getCenter(new T.Vector3()),height=box.max.y-box.min.y;letter.translate(-center.x,-center.y,0);letter.scale(1.65/height,1.65/height,1);
  const right=v(corners[1]).sub(v(corners[0])).normalize(),up=new T.Vector3().crossVectors(normal,right).normalize(),origin=corners.map(v).reduce((s,p)=>s.add(p),new T.Vector3()).multiplyScalar(.25).addScaledVector(normal,.054);
  letter.applyMatrix4(new T.Matrix4().makeBasis(right,up,normal)).translate(...origin.toArray());
  patches.push({parent:'shiny-ring6',name:'Bump_Armillary_B',geometry:letter,material:brass});
 }
 if(input==='retail-2.glb'){
  const outline=JSON.parse(readFileSync(new URL('./symbol-outline.json',import.meta.url))),shape=new T.Shape(outline.map(p=>new T.Vector2(...p))),g=new T.ExtrudeGeometry(shape,{depth:.00035,steps:1,bevelEnabled:false,curveSegments:2});
  g.scale(.0248,.0248,1);g.rotateX(-Math.PI/2);g.translate(0,.00025,0);
  patches.push({replace:'pos-logo',name:'Bump_Hardware_Emblem',geometry:g,material:{name:'Bump_Hardware_Emblem',pbrMetallicRoughness:{baseColorFactor:[.025,.07,.065,1],metallicFactor:.35,roughnessFactor:.48}}});
 }
 if(input==='online-1.glb'){
  // These are the monitor's four inner display vertices, in its own mesh space.
  // No independent world-space image: the UI follows the physical monitor.
  const corners=[[-3.712114,5.827981,-.145475],[4.104704,6.122628,-.253801],[4.230362,1.155511,-1.391948],[-3.586455,.860864,-1.283622]],normal=v([-.021903,.222768,-.974625]);
  const display=quad(corners,normal,.015,.986),uv=display.getAttribute('uv');
  for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
  patches.push({parent:'online_computer',name:'Bump_Software_Display',geometry:display,image:'software-display.webp',material:{name:'Bump_Software_Display',pbrMetallicRoughness:{metallicFactor:0,roughnessFactor:.85},emissiveFactor:[.18,.18,.18]}});
 }
 return patches;
}
