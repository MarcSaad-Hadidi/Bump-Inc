import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

// A bound book, with a real spine, two covers, page blocks and six curled leaves.
// Its sole animation is sampled by the chapter's existing scroll timeline.
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}};
const scene=new T.Scene(),book=new T.Group();book.name='Bump_Bound_Book';book.position.y=-.45;scene.add(book);
const leather=new T.MeshStandardMaterial({name:'Bump_Burgundy_Leather',color:0x582526,roughness:.84});
const paper=new T.MeshStandardMaterial({name:'Bump_Cream_Paper',color:0xe9d7ac,roughness:1});
const leaf=new T.MeshStandardMaterial({name:'Bump_Manuscript',color:0xffffff,roughness:1,side:T.FrontSide});
const coverInk=new T.MeshStandardMaterial({name:'Bump_Cover_Lettering',color:0xffffff,roughness:.84});
const gold=new T.MeshStandardMaterial({name:'Bump_Old_Gold',color:0xb19048,roughness:.6,metalness:.4});
const mesh=(g,m,parent=book,name='')=>{const o=new T.Mesh(g,m);o.name=name;parent.add(o);return o;};
const box=(w,h,d,x,y,z,material,parent=book,name='')=>{const o=mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.22),material,parent,name);o.position.set(x,y,z);return o;};
const back=box(1.7,.055,2.16,.82,-.115,0,leather,book,'Back_Cover');
const front=new T.Group();front.name='Front_Cover_Hinge';book.add(front);
box(1.7,.055,2.16,.82,.12,0,leather,front,'Front_Cover');
// Text belongs on the outer face, not every face of a box. GLTF PNG textures
// use top-left image coordinates, so explicitly orient each readable surface.
function printedPlane(w,h,back=false){
 const g=new T.PlaneGeometry(w,h,18,2);g.rotateX(back?Math.PI/2:-Math.PI/2);
 const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i),1-uv.getY(i));
 return g;
}
const coverTitle=mesh(printedPlane(1.56,2.02),coverInk,front,'Cover_Title');coverTitle.position.set(.82,.15,0);
const insideCover=mesh(printedPlane(1.56,2.02,true),paper,front,'Inside_Cover_Lining');insideCover.position.set(.82,.09,0);
// Thin inset brass rules and four corner details are physical, not painted panels.
for(const z of [-.97,.97])box(1.45,.007,.012,.82,.151,z,gold,front);
for(const x of [.095,1.545])box(.012,.007,1.95,x,.151,0,gold,front);
for(const x of [.12,1.52])for(const z of [-.94,.94]){
 const corner=mesh(new T.TorusGeometry(.037,.006,4,14),gold,front);corner.rotation.x=Math.PI/2;corner.position.set(x,.156,z);
}
const spine=mesh(new T.CylinderGeometry(.105,.105,2.17,24),leather);spine.rotation.x=Math.PI/2;spine.position.set(0,-.012,0);
for(const z of [-.9,-.5,.5,.9]){const band=mesh(new T.TorusGeometry(.108,.012,5,24),gold);band.position.set(0,-.012,z);}
box(1.58,.14,2.01,.81,-.015,0,paper,book,'Right_Page_Block');
const lastPage=mesh(printedPlane(1.56,2),leaf,book,'Last_Right_Page');lastPage.position.set(.78,.059,0);
const leftBlock=new T.Group();leftBlock.name='Left_Page_Block';leftBlock.position.set(0,-.06,0);leftBlock.rotation.z=Math.PI-.08;book.add(leftBlock);
box(1.58,.07,2.01,.81,0,0,paper,leftBlock);
// Page-edge lines catch light along all three exposed edges of the paper block.
const edge=new T.MeshStandardMaterial({name:'Fine_Paper_Edges',color:0xbaa881,roughness:1});
for(let y=-.07;y<.055;y+=.008){box(.006,.0015,1.98,1.6,y,0,edge);for(const z of [-1,1])box(1.56,.0015,.003,.81,y,z,edge);}
const duration=4,tracks=[];
function quatTrack(name,angles,times=angles.map((_,i)=>i/(angles.length-1)*duration)){
 const values=angles.flatMap(angle=>new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),angle).toArray());
 tracks.push(new T.QuaternionKeyframeTrack(name+'.quaternion',times,values));
}
quatTrack(front.name,[.02,.02,1.35,Math.PI-.07,Math.PI-.07],[0,.2,.8,1.5,4]);
tracks.push(new T.VectorKeyframeTrack(leftBlock.name+'.scale',[0,1.2,2,4],[.001,.001,1,.001,.001,1,1,1,1,1,1,1]));
const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
for(let page=0;page<6;page++){
 const segments=18,g=printedPlane(1.56,2);g.translate(.78,.075+page*.006,0);
 const positions=g.attributes.position,indices=[],weights=[];
 for(let i=0;i<positions.count;i++){const v=Math.max(0,Math.min(segments,positions.getX(i)/1.56*segments)),bone=Math.min(segments-1,Math.floor(v)),blend=v-bone;indices.push(bone,bone+1,0,0);weights.push(1-blend,blend,0,0);}
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const bones=[];for(let n=0;n<=segments;n++){const b=new T.Bone();b.name=`Bump_Leaf_${page}_${n}`;if(n){b.position.x=1.56/segments;bones[n-1].add(b);}else b.position.y=.025;bones.push(b);}
 const pageMesh=new T.SkinnedMesh(g,leaf);pageMesh.name='Bound_Leaf_'+page;pageMesh.add(bones[0]);pageMesh.bind(new T.Skeleton(bones));book.add(pageMesh);
 // The reverse is a separate printed face with reversed U coordinates. A
 // double-sided material otherwise shows the front printing in a mirror.
 const reverse=g.clone(),uv=reverse.attributes.uv,normals=reverse.attributes.normal;
 for(let i=0;i<uv.count;i++){uv.setX(i,1-uv.getX(i));normals.setXYZ(i,-normals.getX(i),-normals.getY(i),-normals.getZ(i));}
 for(let i=0;i<reverse.index.count;i+=3){const a=reverse.index.getX(i);reverse.index.setX(i,reverse.index.getX(i+2));reverse.index.setX(i+2,a);}
 const backPage=new T.SkinnedMesh(reverse,leaf);backPage.name='Bound_Leaf_Reverse_'+page;backPage.bind(pageMesh.skeleton,pageMesh.bindMatrix);book.add(backPage);
 const times=Array.from({length:49},(_,i)=>i/48*duration);
 const start=1.2+page*.26,end=start+.95;
 for(let n=0;n<=segments;n++){
  const angles=times.map(time=>{const phase=smooth((time-start)/(end-start));return n===0?.03+phase*(Math.PI-.12):Math.sin(phase*Math.PI)*.105*Math.sin(n/segments*Math.PI);});
  quatTrack(bones[n].name,angles,times);
 }
}
scene.animations=[new T.AnimationClip('Scene',duration,tracks)];
const output=await new GLTFExporter().parseAsync(scene,{binary:true,animations:scene.animations,onlyVisible:false});
// Embed the locally authored book page texture without needing a browser canvas.
const source=Buffer.from(output),size=source.readUInt32LE(12),j=JSON.parse(source.subarray(20,20+size));
const pad=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);
let bin=pad(source.subarray(28+size));
j.images=[];j.textures=[];
for(const [name,file]of [['Bump_Manuscript','book-manuscript-v15.png'],['Bump_Cover_Lettering','book-cover-v15.png']]){
 const image=readFileSync('src/bump/software/assets/'+file),view=j.bufferViews.length,index=j.images.length;
 j.bufferViews.push({buffer:0,byteOffset:bin.length,byteLength:image.length});bin=Buffer.concat([bin,pad(image)]);
 j.images.push({name,mimeType:'image/png',bufferView:view});j.textures.push({source:index});
 const material=j.materials.find(m=>m.name===name);material.pbrMetallicRoughness.baseColorTexture={index};material.pbrMetallicRoughness.baseColorFactor=[1,1,1,1];
}
j.buffers[0].byteLength=bin.length;
const body=Buffer.from(JSON.stringify(j)),json=Buffer.concat([body,Buffer.alloc((4-body.length%4)%4,32)]),header=Buffer.alloc(20),bh=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
writeFileSync('public/bump/models/software-book-v17.glb',Buffer.concat([header,json,bh,bin]));
console.log('Built Bump bound book: correctly oriented outer cover, individually printed front/back leaves and a reversible Scene clip.');
