import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {brandingGeometry} from '../src/bump/chapters/branding/geometry.mjs';
const specs=JSON.parse(readFileSync('src/bump/chapters/models.json','utf8'));
const edits={
 'sidekick-1.glb':{0:'../branding/workflow-branded-0'},
 'online-1.glb':{0:'../branding/software-board-0',1:'../branding/software-maker-1'},
 'operations-1.glb':{0:'security-0'},
 'retail-3.glb':{0:'method-wall-0',1:'../branding/method-display'},
 'b2b-1.glb':{0:'../branding/company-branded-0',1:'contact-faces-1'}
};
const align=buffer=>Buffer.concat([buffer,Buffer.alloc((4-buffer.length%4)%4)]);
const report=[];
for(const spec of specs){
 const input=readFileSync('src/bump/chapters/source/'+spec.input),jsonLength=input.readUInt32LE(12);
 const json=JSON.parse(input.subarray(20,20+jsonLength).toString());
 const binaryStart=20+jsonLength,originalBinary=input.subarray(binaryStart+8,binaryStart+8+input.readUInt32LE(binaryStart));
 let binary=align(originalBinary);const replaced=[];
 for(const [textureIndex,filename]of Object.entries(edits[spec.input]||{})){
  const file=filename.startsWith('../branding/')?'src/bump/chapters/branding/'+filename.slice(12)+'.webp':'src/bump/chapters/textures/conditioned/'+filename+'.webp';
  if(!existsSync(file))continue;
  const bytes=readFileSync(file),texture=json.textures[textureIndex],imageIndex=texture.extensions?.KHR_texture_basisu?.source??texture.source;
  const view=json.bufferViews.length;
  json.bufferViews.push({buffer:0,byteOffset:binary.length,byteLength:bytes.length});binary=Buffer.concat([binary,align(bytes)]);
  json.images[imageIndex]={name:'Bump_'+filename,mimeType:'image/webp',bufferView:view};
  if(texture.extensions){delete texture.extensions.KHR_texture_basisu;if(!Object.keys(texture.extensions).length)delete texture.extensions;}
  texture.extensions={...(texture.extensions||{}),EXT_texture_webp:{source:imageIndex}};delete texture.source;for(const key of ['extensionsUsed','extensionsRequired']){json[key]||=[];if(!json[key].includes('EXT_texture_webp'))json[key].push('EXT_texture_webp');}replaced.push({textureIndex:Number(textureIndex),filename,bytes:bytes.length});
 }
 const appendView=(bytes,target)=>{const i=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:binary.length,byteLength:bytes.length,...(target?{target}:{})});binary=Buffer.concat([binary,align(bytes)]);return i;};
 for(const patch of brandingGeometry(spec.input)){
  const attributes={};
  for(const [name,key]of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0']]){
   const a=patch.geometry.getAttribute(name);if(!a)continue;
   const values=new Float32Array(a.array),view=appendView(Buffer.from(values.buffer),34962),index=json.accessors.length,entry={bufferView:view,componentType:5126,count:a.count,type:a.itemSize===2?'VEC2':'VEC3'};
   if(name==='position'){patch.geometry.computeBoundingBox();entry.min=patch.geometry.boundingBox.min.toArray();entry.max=patch.geometry.boundingBox.max.toArray();}json.accessors.push(entry);attributes[key]=index;
  }
  const primitive={attributes,material:json.materials.length};
  if(patch.geometry.index){const array=new Uint32Array(patch.geometry.index.array),view=appendView(Buffer.from(array.buffer),34963);primitive.indices=json.accessors.length;json.accessors.push({bufferView:view,componentType:5125,count:array.length,type:'SCALAR'});}
  if(patch.image){const bytes=readFileSync('src/bump/chapters/branding/'+patch.image),image=json.images.length;json.images.push({name:patch.name,mimeType:'image/webp',bufferView:appendView(bytes)});const texture=json.textures.length;json.textures.push({extensions:{EXT_texture_webp:{source:image}}});patch.material.pbrMetallicRoughness.baseColorTexture={index:texture};patch.material.emissiveTexture={index:texture};for(const key of ['extensionsUsed','extensionsRequired'])if(!json[key].includes('EXT_texture_webp'))json[key].push('EXT_texture_webp');}
  json.materials.push(patch.material);const mesh=json.meshes.length;json.meshes.push({name:patch.name,primitives:[primitive]});
  const node=json.nodes.find(n=>n.name===(patch.replace||patch.parent));if(!node)throw Error('Missing branding parent '+(patch.replace||patch.parent));
  if(patch.replace)node.mesh=mesh;else{node.children||=[];node.children.push(json.nodes.length);json.nodes.push({name:patch.name,mesh});}
  patch.geometry.dispose();
 }
 // A restrained Bump palette, applied to the original 3D materials rather than
 // repainting disconnected UV triangles or changing any skeleton/animation data.
 for(const material of json.materials||[]){
  if(spec.input==='online-1.glb'&&material.name==='online_fg_man'){material.name='Bump_Software_Maker';material.pbrMetallicRoughness.baseColorFactor=[1,1,1,1];}
  if(spec.input==='online-1.glb'&&material.name==='OnlineScene-metallic'){material.name='Bump_Brass_Stylus';material.pbrMetallicRoughness.baseColorFactor=[.7,.52,.22,1];}
  if(spec.input==='developer-1.glb'&&material.name==='Developer_FG.001'){material.name='Bump_Vision_Marble';material.pbrMetallicRoughness.baseColorFactor=[.95,.88,.74,1];}
  if(spec.input==='b2b-1.glb'&&material.name==='B2B'){material.name='Bump_Company_Cloth';material.pbrMetallicRoughness.baseColorFactor=[.91,.82,.86,1];}
 }
 if(!json.textures?.some(t=>t.extensions?.KHR_texture_basisu))for(const key of ['extensionsUsed','extensionsRequired'])if(json[key])json[key]=json[key].filter(x=>x!=='KHR_texture_basisu');
 json.buffers[0].byteLength=binary.length;
 const body=Buffer.from(JSON.stringify(json)),j=Buffer.concat([body,Buffer.alloc((4-body.length%4)%4,32)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+j.length+8+binary.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(binary.length);binHeader.writeUInt32LE(0x004e4942,4);
 writeFileSync('public/bump/models/'+spec.output,Buffer.concat([header,j,binHeader,binary]));
 report.push({input:spec.input,output:spec.output,originalBinarySha256:createHash('sha256').update(originalBinary).digest('hex'),originalBinaryRetained:true,animations:json.animations?.length||0,skins:json.skins?.length||0,replaced});
}
writeFileSync('src/bump/chapters/model-report.json',JSON.stringify(report,null,2)+'\n');
console.log(`Prepared ${report.length} chapter models; original geometry, skeletons and animation buffers retained.`);
