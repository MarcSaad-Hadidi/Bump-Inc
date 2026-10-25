import{readFileSync,writeFileSync}from'node:fs';
const source=readFileSync('public/bump/models/security-1-v20.glb'),length=source.readUInt32LE(12),data=JSON.parse(source.subarray(20,20+length)),binary=source.subarray(28+length);
const eyeNames=['eyes-m-01','eyes-m-02','eyes-m-03','eyes-w-01','eyes-w-02'],removed=new Set();
data.nodes.forEach((node,index)=>{if(eyeNames.includes(node.name)){removed.add(index);delete node.mesh;delete node.extras;}});
for(const node of data.nodes)if(node.children)node.children=node.children.filter(index=>!removed.has(index));
for(const scene of data.scenes)scene.nodes=scene.nodes.filter(index=>!removed.has(index));
data.animations=data.animations.filter(clip=>!eyeNames.some(name=>clip.name===name+'Action'));
// Keep the complete face surface separately addressable by the native runtime.
const mesh=data.meshes[0],face=mesh.primitives.find(p=>data.materials[p.material]?.name==='Bump painted faces');
if(!face)throw Error('Missing registered face primitive');
mesh.primitives=mesh.primitives.filter(p=>p!==face);
const bodyIndex=data.nodes.findIndex(n=>n.mesh===0),body=data.nodes[bodyIndex],meshIndex=data.meshes.length,nodeIndex=data.nodes.length;
data.meshes.push({name:'Bump_Security_Faces_v21',primitives:[face]});
const node={...structuredClone(body),name:'Bump_Security_Faces_v21',mesh:meshIndex};delete node.children;data.nodes.push(node);
let parentFound=false;for(const parent of data.nodes)if(parent.children?.includes(bodyIndex)){parent.children.push(nodeIndex);parentFound=true;break;}
if(!parentFound)for(const scene of data.scenes)if(scene.nodes.includes(bodyIndex))scene.nodes.push(nodeIndex);
const material=data.materials.find(material=>material.name==='Bump painted faces');if(!material)throw Error('Missing complete Bump faces');material.name='Bump_Security_Gaze_v21';
const raw=Buffer.from(JSON.stringify(data)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(binary.length);binHeader.writeUInt32LE(0x004e4942,4);writeFileSync('public/bump/models/security-1-v21.glb',Buffer.concat([header,json,binHeader,binary]));console.log('Built complete open faces; five eyelid meshes detached and blink clips removed.');
