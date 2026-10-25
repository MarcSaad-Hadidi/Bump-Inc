import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const root='src/bump/software/assets/';
const align=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);
function model(input,output,edits={},objects={}){
 const source=readFileSync(root+input),length=source.readUInt32LE(12),j=JSON.parse(source.subarray(20,20+length)),binStart=20+length;
 let bin=align(source.subarray(binStart+8,binStart+8+source.readUInt32LE(binStart)));
 const view=(bytes,target)=>{const index=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:bin.length,byteLength:bytes.length,...(target?{target}:{})});bin=Buffer.concat([bin,align(bytes)]);return index;};
 for(const [index,file]of Object.entries(edits)){
  const tex=j.textures[index],imageIndex=tex.extensions?.KHR_texture_basisu?.source??tex.source,bytes=readFileSync(root+file),mimeType=file.endsWith('.png')?'image/png':'image/webp';
  j.images[imageIndex]={name:'Bump_'+file,mimeType,bufferView:view(bytes)};
  delete tex.extensions;tex.source=imageIndex;
  if(mimeType==='image/webp'){
   tex.extensions={EXT_texture_webp:{source:imageIndex}};delete tex.source;
   for(const key of ['extensionsUsed','extensionsRequired']){j[key]||=[];if(!j[key].includes('EXT_texture_webp'))j[key].push('EXT_texture_webp');}
  }
 }
 // KTX2 readback uses the opposite vertical UV convention to PNG.
 // Correct the mesh's texture transform; retain the generated pixels unchanged.
 if(input==='library-source.glb'){
  for(const material of j.materials){const map=material.pbrMetallicRoughness?.baseColorTexture;if(map)map.extensions={...(map.extensions||{}),KHR_texture_transform:{offset:[0,1],scale:[1,-1]}};}
  for(const key of ['extensionsUsed','extensionsRequired']){j[key]||=[];if(!j[key].includes('KHR_texture_transform'))j[key].push('KHR_texture_transform');}
 }
 if(input==='book-source.glb'){
  const cover=j.materials.length;j.materials.push({name:'Bump_Leather_Binding',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.064,.19,.15,1],roughnessFactor:.78,metallicFactor:0}});
  const node=j.nodes.find(n=>n.name==='Cover');for(const primitive of j.meshes[node.mesh].primitives)primitive.material=cover;
 }
 const material=j.materials.length;j.materials.push({name:'Bump_Brass_Software_Artifacts',pbrMetallicRoughness:{baseColorFactor:[.43,.30,.13,1],metallicFactor:.55,roughnessFactor:.4}});
 for(const [name,g]of Object.entries(objects)){
  const node=j.nodes.find(n=>n.name===name);if(!node)throw Error('Missing model node '+name);
  const original=j.meshes[node.mesh].primitives[0],bound=j.accessors[original.attributes.POSITION],size=new T.Vector3(...bound.max).sub(new T.Vector3(...bound.min)),center=new T.Vector3(...bound.min).add(new T.Vector3(...bound.max)).multiplyScalar(.5);
  g.computeBoundingBox();const own=g.boundingBox.getSize(new T.Vector3()),ownCenter=g.boundingBox.getCenter(new T.Vector3());g.translate(-ownCenter.x,-ownCenter.y,-ownCenter.z);g.scale(size.x/own.x,size.y/own.y,Math.max(size.z,.04)/own.z);g.translate(...center.toArray());
  const attributes={};
  for(const [field,key]of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0']]){
   const a=g.getAttribute(field);if(!a)continue;const bytes=new Float32Array(a.array),accessor=j.accessors.length;j.accessors.push({bufferView:view(Buffer.from(bytes.buffer),34962),componentType:5126,count:a.count,type:a.itemSize===2?'VEC2':'VEC3',...(field==='position'?{min:bound.min,max:bound.max}:{})});attributes[key]=accessor;
  }
  const mesh=j.meshes.length,primitive={attributes,material};
  if(g.index){const a=new Uint32Array(g.index.array),accessor=j.accessors.length;j.accessors.push({bufferView:view(Buffer.from(a.buffer),34963),componentType:5125,count:a.length,type:'SCALAR'});primitive.indices=accessor;}
  j.meshes.push({name:'Bump_'+name,primitives:[primitive]});node.mesh=mesh;g.dispose();
 }
 if(!j.textures.some(t=>t.extensions?.KHR_texture_basisu))for(const key of ['extensionsUsed','extensionsRequired'])j[key]=j[key].filter(x=>x!=='KHR_texture_basisu');
 j.buffers[0].byteLength=bin.length;const body=Buffer.from(JSON.stringify(j)),json=Buffer.concat([body,Buffer.alloc((4-body.length%4)%4,32)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+8+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);writeFileSync('public/bump/models/'+output,Buffer.concat([header,json,binHeader,bin]));
 console.log(output+': original scene/rig/animation buffers retained; '+Object.keys(objects).length+' physical objects replaced.');
}
const merge=parts=>mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
const box=(w,h,d,x=0,y=0,z=0)=>new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.15).translate(x,y,z);
const ring=new T.TorusGeometry(.7,.17,8,32),ring2=new T.TorusGeometry(.7,.17,8,32).translate(1,0,0);
const gear=()=>{const shape=new T.Shape();for(let i=0;i<80;i++){const a=i/80*Math.PI*2,r=i%4<2?1:.87;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();const hole=new T.Path();hole.absarc(0,0,.47,0,Math.PI*2,true);shape.holes.push(hole);return new T.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1});};
const database=merge([0,.35,.7].map(y=>new T.CylinderGeometry(.6,.6,.25,32).translate(0,y,0)));
model('library-source.glb','software-library-v17.glb',{0:'atelier-room-v17.png'});
model('book-source.glb','software-book-v1.glb',{0:'book-pages-v1.webp'});
model('props-source.glb','software-props-v1.glb',{0:'folio-card-v1.webp'}, {
 Skateboard:merge([box(1,1.6,.16),...[0,1,2].map(i=>box(.7,.08,.04,0,.4-i*.3,.1))]),
 Wheel:gear(),Shoes:merge([ring,ring2]),
 Cap:merge([box(.8,1,.10,-.4,0,0).rotateY(-.25),box(.8,1,.10,.4,0,0).rotateY(.25)]),
 Shirt:database
});
