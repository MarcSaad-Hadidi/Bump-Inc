import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {Matrix4,Quaternion,Vector3} from 'three';
import {createHash} from 'node:crypto';

const require=createRequire(import.meta.url),module={exports:{}};
const factory=new Function('module','exports','require','__filename','__dirname',readFileSync('public/runtime/decoders/draco_decoder.js','utf8')+'\nreturn module.exports;')(module,module.exports,require,'draco_decoder.js',process.cwd()+'/public/runtime/decoders');
const draco=await factory();
const input=readFileSync('public/bump/models/security-1-v2.glb'),jsonSize=input.readUInt32LE(12),json=JSON.parse(input.subarray(20,20+jsonSize));
const original=input.subarray(28+jsonSize,28+jsonSize+input.readUInt32LE(20+jsonSize));
const analysis=JSON.parse(execFileSync('python',['scripts/analyze-bump-security-atlas.py'],{maxBuffer:32*1024*1024}));
const parts=[original],align=bytes=>Buffer.concat([bytes,Buffer.alloc((4-bytes.length%4)%4)]);let length=original.length;
function append(bytes){const padding=(4-length%4)%4;if(padding){parts.push(Buffer.alloc(padding));length+=padding;}const offset=length;parts.push(bytes);length+=bytes.length;const index=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});return index;}
function accessor(values,size,type=5126){const array=type===5125?new Uint32Array(values):type===5123?new Uint16Array(values):new Float32Array(values);const view=append(Buffer.from(array.buffer)),index=json.accessors.length,kind={1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[size];const item={bufferView:view,componentType:type,count:values.length/size,type:kind};if(size===3&&type===5126){item.min=[0,1,2].map(k=>Math.min(...values.filter((_,i)=>i%3===k)));item.max=[0,1,2].map(k=>Math.max(...values.filter((_,i)=>i%3===k)));}json.accessors.push(item);return index;}
function decode(primitive){const extension=primitive.extensions.KHR_draco_mesh_compression,view=json.bufferViews[extension.bufferView],data=original.subarray(view.byteOffset,view.byteOffset+view.byteLength),buffer=new draco.DecoderBuffer(),decoder=new draco.Decoder(),mesh=new draco.Mesh();buffer.Init(new Int8Array(data),data.length);const status=decoder.DecodeBufferToMesh(buffer,mesh);if(!status.ok())throw Error(status.error_msg());const attributes={};for(const[name,id]of Object.entries(extension.attributes)){const attr=decoder.GetAttributeByUniqueId(mesh,id),values=new draco.DracoFloat32Array();decoder.GetAttributeFloatForAllPoints(mesh,attr,values);attributes[name]={size:attr.num_components(),data:Array.from({length:values.size()},(_,i)=>values.GetValue(i))};draco.destroy(values);}const indices=[],face=new draco.DracoInt32Array();for(let i=0;i<mesh.num_faces();i++){decoder.GetFaceFromMesh(mesh,i,face);for(let k=0;k<3;k++)indices.push(face.GetValue(k));}for(const object of[face,mesh,decoder,buffer])draco.destroy(object);return{attributes,indices};}
const source=decode(json.meshes[0].primitives[0]),uv=source.attributes.TEXCOORD_0.data,position=source.attributes.POSITION.data,S=analysis.size;
function row(rows,head,y){return rows[Math.max(0,Math.min(rows.length-1,Math.round(y-head.bounds[2])))];}
// Complete, skinned head surfaces use Bump artwork without the former face
// alpha mask. The original body surface, rig and animation buffers remain.
const headImage=json.images.length;json.images.push({name:'Bump_Faces_Registered_v20',mimeType:'image/png',bufferView:append(readFileSync('src/bump/security/assets/security-team-v18.png'))});
const headTexture=json.textures.length;json.textures.push({sampler:json.textures[0].sampler,source:headImage});
const headMaterial=json.materials.length;json.materials.push({...structuredClone(json.materials[0]),name:'Bump painted faces',alphaMode:'OPAQUE',pbrMetallicRoughness:{...json.materials[0].pbrMetallicRoughness,baseColorTexture:{index:headTexture}},emissiveTexture:{index:headTexture}});delete json.materials[headMaterial].alphaCutoff;
const bodyTexture=append(readFileSync('src/bump/security/assets/security-team-v18.webp'));json.images[0]={name:'Bump_Security_Team_v18',mimeType:'image/webp',bufferView:bodyTexture};
const sharedAttributes={};for(const[name,a]of Object.entries(source.attributes))sharedAttributes[name]=accessor(a.data,a.size,name==='JOINTS_0'?5123:5126);
// Spatial lookup projects the new, complete painted head surface onto the native
// depth surface. Outside an old silhouette, extend its nearest surface triangle.
// This keeps the painting's proportions instead of squeezing it into old UVs.
const cells=new Map(),cellCount=96;
for(let i=0;i<source.indices.length;i+=3){const ids=source.indices.slice(i,i+3),xs=ids.map(id=>uv[id*2]),ys=ids.map(id=>uv[id*2+1]);for(let x=Math.floor(Math.min(...xs)*cellCount);x<=Math.floor(Math.max(...xs)*cellCount);x++)for(let y=Math.floor(Math.min(...ys)*cellCount);y<=Math.floor(Math.max(...ys)*cellCount);y++){const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(ids);}}
function surface(u,v){let best=null,cost=Infinity;const cx=Math.floor(u*cellCount),cy=Math.floor(v*cellCount);for(let radius=0;radius<4&&!best;radius++)for(let x=cx-radius;x<=cx+radius;x++)for(let y=cy-radius;y<=cy+radius;y++)for(const ids of cells.get(x+','+y)||[]){const[a,b,c]=ids.map(id=>[uv[id*2],uv[id*2+1]]),den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-10)continue;const w0=((b[1]-c[1])*(u-c[0])+(c[0]-b[0])*(v-c[1]))/den,w1=((c[1]-a[1])*(u-c[0])+(a[0]-c[0])*(v-c[1]))/den,w=[w0,w1,1-w0-w1],inside=w.every(n=>n>=-.0001&&n<=1.0001);const clamped=w.map(n=>Math.max(0,Math.min(1,n))),sum=clamped.reduce((a,b)=>a+b,0),point=[0,1].map(k=>ids.reduce((n,id,i)=>n+uv[id*2+k]*clamped[i]/sum,0)),distance=(point[0]-u)**2+(point[1]-v)**2;if(distance<cost){best={ids,w};cost=distance;}if(inside){best={ids,w};cost=0;break;}}
 if(!best)throw Error('No native surface at '+u+','+v);const {ids,w}=best,xyz=[0,1,2].map(k=>ids.reduce((n,id,i)=>n+position[id*3+k]*Math.max(-2,Math.min(3,w[i])),0)),weights=new Map();for(let i=0;i<3;i++)for(let k=0;k<4;k++){const joint=source.attributes.JOINTS_0.data[ids[i]*4+k],weight=source.attributes.WEIGHTS_0.data[ids[i]*4+k]*Math.max(0,w[i]);weights.set(joint,(weights.get(joint)||0)+weight);}const influences=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4);while(influences.length<4)influences.push([0,0]);const total=influences.reduce((n,p)=>n+p[1],0)||1;return{xyz,joints:influences.map(p=>p[0]),weights:influences.map(p=>p[1]/total)};
}
const bodyIndices=source.indices;
const headPositions=[],headUV=[],headJoints=[],headWeights=[],headIndices=[];
for(const head of analysis.heads){let previous=null;const columns=64;
 for(let y=head.bounds[2];y<=head.bounds[3];y+=4){const span=row(head.paintedRows,head,y);if(!span||span[1]-span[0]<3){previous=null;continue;}const current=[];for(let x=0;x<=columns;x++){const px=span[0]+.65+(span[1]-span[0]-1.3)*x/columns,u=px/S,v=y/S,p=surface(u,v),index=headPositions.length/3;headPositions.push(p.xyz[0],p.xyz[1],p.xyz[2]+.004);headUV.push(u,1-v);headJoints.push(...p.joints);headWeights.push(...p.weights);current.push(index);if(previous&&x>0)headIndices.push(previous[x-1],current[x-1],current[x],previous[x-1],current[x],previous[x]);}previous=current;}
}
const headAttributes={POSITION:accessor(headPositions,3),TEXCOORD_0:accessor(headUV,2),JOINTS_0:accessor(headJoints,4,5123),WEIGHTS_0:accessor(headWeights,4)};
json.materials[headMaterial].doubleSided=true;
json.meshes[0].primitives=[{attributes:sharedAttributes,indices:accessor(bodyIndices,1,5125),material:0,mode:4},{attributes:headAttributes,indices:accessor(headIndices,1,5125),material:headMaterial,mode:4}];
// Fit each pair of painted eyelids to the NEW eye landmarks. Their native
// animation still moves them just behind/in front of the face for a blink.
const parents=new Map();json.nodes.forEach((node,index)=>(node.children||[]).forEach(child=>parents.set(child,index)));
function matrix(index){const node=json.nodes[index],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3(...(node.translation||[0,0,0])),new Quaternion(...(node.rotation||[0,0,0,1])),new Vector3(...(node.scale||[1,1,1])));return parents.has(index)?matrix(parents.get(index)).multiply(local):local;}
function readAccessor(index){const a=json.accessors[index],view=json.bufferViews[a.bufferView],count={SCALAR:1,VEC3:3,VEC4:4}[a.type],offset=(view.byteOffset||0)+(a.byteOffset||0);return Array.from({length:a.count},(_,i)=>Array.from({length:count},(_,k)=>original.readFloatLE(offset+(i*count+k)*4)));}
const lidImage=json.images.length;json.images.push({name:'Bump_Closed_Eyelids_v20',mimeType:'image/png',bufferView:append(readFileSync('src/bump/security/assets/security-eyelids-v20.png'))});const lidTexture=json.textures.length;json.textures.push({sampler:json.textures[0].sampler,source:lidImage});
const lidMaterial=json.materials.length;json.materials.push({...structuredClone(json.materials[headMaterial]),name:'Bump painted eyelids',alphaMode:'BLEND',doubleSided:true,pbrMetallicRoughness:{...json.materials[headMaterial].pbrMetallicRoughness,baseColorTexture:{index:lidTexture}},emissiveTexture:{index:lidTexture}});
const registeredEyes=[];
for(const head of analysis.heads){const nodeIndex=json.nodes.findIndex(node=>node.name===head.name),node=json.nodes[nodeIndex],inverse=matrix(nodeIndex).invert(),clip=json.animations.find(a=>a.name===head.name+'Action'),sampler=clip.samplers[clip.channels.find(ch=>ch.target.path==='translation').sampler],translations=readAccessor(sampler.output),closed=translations.reduce((a,b)=>b[2]>a[2]?b:a,translations[0]),delta=new Vector3(...closed).sub(new Vector3(...node.translation));
 // Keep each native blink visible at the shared ×2 rate, including low FPS:
 // a short close, a painted closed-lid hold, then a short reopen.
 const times=readAccessor(sampler.input).map(value=>value[0]);for(let i=1;i<translations.length-1;i++){if(new Vector3(...translations[i]).distanceTo(new Vector3(...node.translation))>delta.length()*.5&&new Vector3(...translations[i-1]).distanceTo(new Vector3(...node.translation))<delta.length()*.1){let end=i;while(end+1<translations.length&&new Vector3(...translations[end+1]).distanceTo(new Vector3(...node.translation))>delta.length()*.5)end++;const center=(times[i]+times[end])/2;times[i-1]=Math.max(.042,center-.18);times[i]=center-.09;times[end]=center+.09;times[end+1]=Math.min(7.5,center+.18);i=end;}}sampler.input=accessor(times,1);
 const p=[],tex=[],color=[],indices=[];
 function point(x,y){const sample=surface(x/S,y/S),world=new Vector3(...sample.xyz);world.z+=.004;return world.applyMatrix4(inverse).addScaledVector(delta,-.57).toArray();}
 for(const[cx,cy,rx0,ry0,tilt]of head.eyes){const rx=rx0*1.18,ry=ry0*1.18,segments=32,rings=[0,.7,1];
  for(const radius of rings)for(let a=0;a<=segments;a++){const angle=a/segments*Math.PI*2,dx=Math.cos(angle)*rx*radius,dy=Math.sin(angle)*ry*radius,x=cx+dx*Math.cos(tilt)-dy*Math.sin(tilt),y=cy+dx*Math.sin(tilt)+dy*Math.cos(tilt);p.push(...point(x,y));tex.push(x/S,1-y/S);color.push(1,1,1,radius===1?0:1);if(radius>0&&a>0){const index=p.length/3-1;indices.push(index-segments-2,index-segments-1,index,index-segments-2,index,index-1);}}

 }
 json.meshes[node.mesh]={name:head.name,primitives:[{attributes:{POSITION:accessor(p,3),TEXCOORD_0:accessor(tex,2),COLOR_0:accessor(color,4)},indices:accessor(indices,1,5125),material:lidMaterial,mode:4}]};
 node.extras={...(node.extras||{}),bumpLidOpen:[...node.translation],bumpLidDelta:delta.length()};
 registeredEyes.push({name:node.name,eyes:head.eyes.map(e=>e.slice(0,2)),nativeTrack:clip.name});
}
json.buffers[0].byteLength=length;
const binary=align(Buffer.concat(parts)),raw=Buffer.from(JSON.stringify(json)),j=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+j.length+8+binary.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(binary.length);binHeader.writeUInt32LE(0x004e4942,4);
const out=process.argv[2]??'public/bump/models/security-1-v20.glb';writeFileSync(out,Buffer.concat([header,j,binHeader,binary]));export const securityFaceReport={source:'public/bump/models/security-1-v2.glb',output:out,sourceBinarySha256:createHash('sha256').update(original).digest('hex'),sourceBinaryRetained:true,skinnedHeadVertices:headPositions.length/3,headTriangles:headIndices.length/3,bodyTriangles:bodyIndices.length/3,skins:json.skins.length,animations:json.animations.map(a=>a.name),registeredEyes,globeUnchangedSha256:createHash('sha256').update(readFileSync('public/bump/models/security-3-v2.glb')).digest('hex')};writeFileSync('src/bump/security/assets/model-report.json',JSON.stringify(securityFaceReport,null,2)+'\n');console.log(JSON.stringify({output:out,headTriangles:headIndices.length/3,bodyTriangles:bodyIndices.length/3,blinkMeshes:registeredEyes.length}));
