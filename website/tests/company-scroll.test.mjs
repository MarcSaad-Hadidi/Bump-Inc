import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationMixer,AnimationClip,VectorKeyframeTrack,Object3D,LoopOnce} from 'three';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {seekCompanyAnimation,applyCompanyAnimationValues} from '../src/bump/chapters/runtime/BumpCompanyScroll.js';
function rig(){
 const object=new Object3D(),mixer=new AnimationMixer(object),clip=new AnimationClip('Scene',2.5,[new VectorKeyframeTrack('.position',[0,1.25,2.5],[0,0,0,2,4,1,6,3,2])]),action=mixer.clipAction(clip);action.play();
 return {object,native:{mixer,actions:new Map([['Scene',action]])},action};
}
test('company poses depend on scroll and never advance with wall time',()=>{
 const {object,native,action}=rig();seekCompanyAnimation(native,.5);assert.deepEqual(object.position.toArray(),[2,4,1]);
 for(let frame=0;frame<300;frame++)native.mixer.update(1/60);
 assert.deepEqual(object.position.toArray(),[2,4,1]);assert.equal(action.paused,true);assert.equal(action.loop,LoopOnce);
});
test('Theatre transactions seek the real mixer synchronously and reverse exactly',()=>{
 const {object,native}=rig();
 applyCompanyAnimationValues(native,{Scene:{progress:.25,loop:true}});const prior=object.position.toArray();
 applyCompanyAnimationValues(native,{Scene:{progress:.9,loop:true}});assert.notDeepEqual(object.position.toArray(),prior);
 applyCompanyAnimationValues(native,{Scene:{progress:.25,loop:true}});assert.deepEqual(object.position.toArray(),prior);
 assert.equal(native.companyProgress,.25);assert.equal(native.manual,true);
 applyCompanyAnimationValues(native,{Scene:{progress:.2}},true);assert.deepEqual(object.position.toArray(),[6,3,2]);
});
test('the company scene explicitly disables the shared Asset default clock loop',()=>{
 const scene=JSON.parse(readFileSync('public/bump/scenes/contact-v2.json','utf8'));
 assert.equal(scene.sheetsById.Scene.staticOverrides.byObject['asset-1'].animations.Scene.loop,false);
});

test('all four actual company skins retain deterministic, reversible poses',async()=>{
 // Decode the real rig and clip without browser-only texture loaders. Meshes,
 // skins, accessors, node transforms and all 357 animation channels are intact.
 const file=readFileSync('public/bump/models/company-atelier-v22.glb'),length=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+length).toString()),binary=file.subarray(28+length);
 delete json.images;delete json.textures;delete json.materials;delete json.extensionsRequired;delete json.extensionsUsed;
 for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 const text=Buffer.from(JSON.stringify(json)),padding=(4-text.length%4)%4,chunk=Buffer.concat([text,Buffer.alloc(padding,32)]),glb=Buffer.alloc(28+chunk.length+binary.length);
 glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(chunk.length,12);glb.writeUInt32LE(0x4e4f534a,16);chunk.copy(glb,20);glb.writeUInt32LE(binary.length,20+chunk.length);glb.writeUInt32LE(0x004e4942,24+chunk.length);binary.copy(glb,28+chunk.length);
 const asset=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),''),mixer=new AnimationMixer(asset.scene),clip=asset.animations[0],action=mixer.clipAction(clip);action.play();
 const native={mixer,actions:new Map([['Scene',action]])},skins=[];asset.scene.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});assert.equal(json.skins.length,4);assert.equal(skins.length,5);assert.equal(clip.tracks.length,357);
 const pose=()=>{asset.scene.updateMatrixWorld(true);return skins.flatMap(s=>{s.skeleton.update();return [...s.skeleton.boneMatrices];});};
 applyCompanyAnimationValues(native,{Scene:{progress:.18,loop:true}});const early=pose();
 applyCompanyAnimationValues(native,{Scene:{progress:.82,loop:true}});assert.notDeepEqual(pose(),early);
 applyCompanyAnimationValues(native,{Scene:{progress:.18,loop:true}});assert.deepEqual(pose(),early);
 for(let i=0;i<120;i++)mixer.update(1/60);assert.deepEqual(pose(),early);
});
