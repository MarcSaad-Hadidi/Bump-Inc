import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync('public/bump/models/software-1-v3.glb'),length=source.readUInt32LE(12),json=JSON.parse(source.subarray(20,20+length)),align=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);
// Preserve the exact painted seams on this densely unwrapped native character.
// Its new Bump palette is graded on the actual 3D material, rather than moving
// tiny UV islands in an edited atlas.
const native=readFileSync('src/bump/chapters/source/online-1.glb'),nativeLength=native.readUInt32LE(12),original=JSON.parse(native.subarray(20,20+nativeLength)),nativeBin=native.subarray(28+nativeLength),nativeView=original.bufferViews[original.images[1].bufferView],image=nativeBin.subarray(nativeView.byteOffset,nativeView.byteOffset+nativeView.byteLength);
let binary=align(source.subarray(28+length));const view=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:binary.length,byteLength:image.length});binary=Buffer.concat([binary,align(image)]);json.images[1]={name:'Bump_Consultant_Seam_Registered_v20',mimeType:'image/ktx2',bufferView:view};json.textures[1]={sampler:json.textures[1].sampler,extensions:{KHR_texture_basisu:{source:1}}};
for(const key of ['extensionsUsed','extensionsRequired']){json[key]||=[];if(!json[key].includes('KHR_texture_basisu'))json[key].push('KHR_texture_basisu');}
json.materials[1].name='Bump_Method_Consultant_v21';delete json.materials[1].pbrMetallicRoughness.baseColorTexture.extensions;
// The articulated hand originally shared its paint material with the desk and
// other props. Give that mesh its own material so skin grading stays local.
const handMaterial=json.materials.length;json.materials.push({...structuredClone(json.materials[0]),name:'Bump_Method_Hand_v21'});
for(const mesh of json.meshes)if(mesh.name==='online_hand.001')for(const primitive of mesh.primitives)primitive.material=handMaterial;
json.buffers[0].byteLength=binary.length;const raw=Buffer.from(JSON.stringify(json)),body=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+body.length+binary.length,8);header.writeUInt32LE(body.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(binary.length);binHeader.writeUInt32LE(0x004e4942,4);writeFileSync('public/bump/models/method-consultant-v21.glb',Buffer.concat([header,body,binHeader,binary]));console.log('Built the seam-registered consultant and isolated hand material; original mesh, skeleton and pencil/hand clips retained.');
