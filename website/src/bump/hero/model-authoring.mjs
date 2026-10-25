import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';

// Asset-authoring entry point. The GLB preserves the source skinning and scroll
// clip, with Bump textures and a separate character-only ambient loop.
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1200,800);renderer.setPixelRatio(1);renderer.setClearColor('#5b6257');renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.style.margin='0';document.body.appendChild(renderer.domElement);
async function imageTexture(url){const image=await new THREE.ImageLoader().loadAsync(url);const canvas=document.createElement('canvas');const target=url.includes('heads')?[1024,512]:[2048,2048];canvas.width=target[0];canvas.height=target[1];canvas.getContext('2d').drawImage(image,0,0,...target);const tex=new THREE.CanvasTexture(canvas);tex.flipY=true;tex.colorSpace=THREE.SRGBColorSpace;return tex;}
try{
 const draco=new DRACOLoader().setDecoderPath('/decoders/');
 const ktx=new KTX2Loader().setTranscoderPath('/decoders/').detectSupport(renderer);
 const gltf=await new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx).loadAsync('/source.glb');
 const scene=gltf.scene;scene.updateMatrixWorld(true);
 const body=await imageTexture('/edit/Hero_fg.png');
 const heads=await imageTexture('/edit/heads-bump-generated.png');
 const removed=[];const oldProps=[];
 scene.traverse(n=>{if(n.isMesh&&/Coffee_Cup|PinkBag|shiny-skatedeck|^Skateboard$/.test(n.name)){oldProps.push(n);removed.push(n.name);}});
 for(const node of oldProps)node.removeFromParent();
 const replacements=new Map();scene.traverse(n=>{if(!n.isMesh)return;
  const original=n.material;if(!replacements.has(original)){
   const mat=original.clone();const head=mat.name==='Image_Material.005';mat.name=head?'Bump_Painted_Heads':'Bump_Painted_Cloth';mat.map=head?heads:body;if(mat.emissiveMap)mat.emissiveMap=mat.map;mat.side=THREE.DoubleSide;replacements.set(original,mat);
  }n.material=replacements.get(original);n.frustumCulled=false;
 });
 // Assign wardrobe materials to contiguous parts of the actual skinned mesh.
 // UV layout remains exact; recoloring an arbitrary atlas patch would create seams.
 const pixels=body.image.getContext('2d').getImageData(0,0,2048,2048).data;
 function sample(uv,index){const u=uv.getX(index),v=uv.getY(index),x=Math.max(0,Math.min(2047,Math.floor(u*2048))),y=Math.max(0,Math.min(2047,Math.floor((1-v)*2048))),offset=(y*2048+x)*4;return [pixels[offset]/255,pixels[offset+1]/255,pixels[offset+2]/255];}
 function wardrobe(mesh){
  const base=mesh.material,navy=base.clone(),burgundy=base.clone(),shirt=base.clone();
  navy.name='Bump_Navy_Cloak';navy.color.set('#344c70');navy.emissive.copy(navy.color);
  burgundy.name='Bump_Burgundy_Coat';burgundy.color.set('#b46391');
  shirt.name='Bump_Ivory_Shirt';shirt.map=body;shirt.emissiveMap=body;shirt.userData.bumpPalette='ivory';shirt.color.set('#ffffff');shirt.roughness=1;shirt.metalness=0;
  const g=mesh.geometry.clone(),uv=g.getAttribute('uv'),groups=[[],[],[],[]],index=g.index;const world=new THREE.Vector3();
  // A garment UV island must use one material. Classifying dark folds separately
  // painted isolated white triangles onto the burgundy jacket.
  const parent=Uint32Array.from({length:g.getAttribute('position').count},(_,i)=>i);
  function root(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
  function union(a,b){a=root(a);b=root(b);if(a!==b)parent[b]=a;}
  for(let i=0;i<index.count;i+=3){union(index.getX(i),index.getX(i+1));union(index.getX(i),index.getX(i+2));}
  const triangles=[],votes=new Map();
  for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];const center=new THREE.Vector3(),rgb=[0,0,0];for(const id of ids){mesh.getVertexPosition(id,world);mesh.localToWorld(world);center.addScaledVector(world,1/3);const c=sample(uv,id);for(let k=0;k<3;k++)rgb[k]+=c[k]/3;}
   let target=0;
   if(mesh.name==='Robed_Woman'&&center.x<-1.19&&center.y>-.23)target=1;
   if(mesh.name==='RobedMan'){
    const red=rgb[0]>rgb[1]*1.23&&rgb[0]>rgb[2]*1.15;
    if(Math.max(...rgb)<.55&&rgb[0]<rgb[1]*1.8&&center.y>-.67&&center.x>.98&&center.x<1.94)target=3;
    else if(red&&(center.y>-.60||((center.x<.90||center.x>1.95)&&center.y>-.95)))target=2;
   }
   const island=root(ids[0]);const counts=votes.get(island)||[0,0,0,0];counts[target]++;votes.set(island,counts);triangles.push({ids,island});
  }
  const islandMaterials=new Map();for(const [island,counts] of votes){let materialIndex=0;for(let i=1;i<counts.length;i++)if(counts[i]>counts[materialIndex])materialIndex=i;islandMaterials.set(island,materialIndex);}
  for(const {ids,island} of triangles)groups[islandMaterials.get(island)].push(...ids);
  mesh.userData.wardrobeIslands=votes.size;
  g.clearGroups();let offset=0;const indices=[];groups.forEach((ids,materialIndex)=>{indices.push(...ids);if(ids.length)g.addGroup(offset,ids.length,materialIndex);offset+=ids.length;});g.setIndex(indices);mesh.geometry=g;mesh.material=[base,navy,burgundy,shirt];
 }
 const woman=scene.getObjectByName('Robed_Woman');
 const womanPositions=woman.geometry.getAttribute('position'),womanColors=new Float32Array(womanPositions.count*3),navyTint=new THREE.Color('#344c70'),point=new THREE.Vector3();
 for(let i=0;i<womanPositions.count;i++){
  woman.getVertexPosition(i,point);woman.localToWorld(point);
  const amount=(1-THREE.MathUtils.smoothstep(point.x,-1.36,-1.08))*THREE.MathUtils.smoothstep(point.y,-.30,-.13);
  for(let k=0;k<3;k++)womanColors[i*3+k]=THREE.MathUtils.lerp(1,[navyTint.r,navyTint.g,navyTint.b][k],amount);
 }
 woman.geometry.setAttribute('color',new THREE.BufferAttribute(womanColors,3));woman.material=woman.material.clone();woman.material.vertexColors=true;woman.material.name='Bump_Woman_Cloth';
 wardrobe(scene.getObjectByName('RobedMan'));
 const leftRig=scene.getObjectByName('Robed_Woman_Rig'),rightRig=scene.getObjectByName('Robed_Man_Rig');
 const leftWrapper=new THREE.Group();leftWrapper.name='Bump_Consultant_Left';scene.add(leftWrapper);leftWrapper.attach(leftRig);
 const rightWrapper=new THREE.Group();rightWrapper.name='Bump_Consultant_Right';scene.add(rightWrapper);rightWrapper.attach(rightRig);
 scene.updateMatrixWorld(true);
 // Keep only the two articulated characters; no added accessory geometry.
 const sourceClip=gltf.animations[0].clone();sourceClip.tracks=sourceClip.tracks.filter(track=>!removed.some(name=>track.name.startsWith(name+'.')));
 // Tuck the front lower leg clear of the central menu, retaining the source motion.
 const frontLeg=scene.getObjectByName('Bone026');
 if(frontLeg){
  const parentQ=frontLeg.parent.getWorldQuaternion(new THREE.Quaternion());
  const axis=new THREE.Vector3(0,0,1).applyQuaternion(parentQ.invert());
  const tuck=new THREE.Quaternion().setFromAxisAngle(axis,-.70);
  frontLeg.quaternion.premultiply(tuck);frontLeg.updateMatrixWorld(true);
  const track=sourceClip.tracks.find(t=>t.name===frontLeg.name+'.quaternion');
  if(track)for(let i=0;i<track.values.length;i+=4){const q=new THREE.Quaternion().fromArray(track.values,i).premultiply(tuck).normalize();q.toArray(track.values,i);}
 }
 const times=[0,3,6,9,12],ambient=[];
 function float(object,amount,phase=0){const {x,y,z}=object.position;ambient.push(new THREE.VectorKeyframeTrack(object.name+'.position',times,[x,y,z,x,y+amount,z,x,y,z,x,y-amount,z,x,y,z]));const q=object.quaternion.clone(),values=[];for(const angle of [0,.008,0,-.008,0]){const r=q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle));values.push(...r.toArray());}ambient.push(new THREE.QuaternionKeyframeTrack(object.name+'.quaternion',times,values));}
 float(leftWrapper,.024);float(rightWrapper,-.018);
 const ambientClip=new THREE.AnimationClip('BumpAmbient',12,ambient);
 scene.updateMatrixWorld(true);
 const result=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[sourceClip,ambientClip],onlyVisible:true,maxTextureSize:2048});
 const bytes=new Uint8Array(result);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 const preview=new THREE.Scene();preview.add(scene);preview.add(new THREE.AmbientLight(0xffffff,1));const key=new THREE.DirectionalLight('#fff1dc',2);key.position.set(0,3,5);preview.add(key);const camera=new THREE.PerspectiveCamera(30,1.5,.1,100);camera.position.set(.25,-.1,6);camera.lookAt(.25,-.1,0);renderer.render(preview,camera);
 let bones=0,skinnedMeshes=0,vertices=0;scene.traverse(n=>{if(n.isBone)bones++;if(n.isSkinnedMesh)skinnedMeshes++;if(n.isMesh)vertices+=n.geometry.getAttribute('position').count;});
 window.__assetResult={files:{'hero-characters-v2.glb':btoa(binary)},bytes:bytes.length,bones,skinnedMeshes,vertices,removedProps:removed,animations:[{name:sourceClip.name,tracks:sourceClip.tracks.length,duration:sourceClip.duration},{name:ambientClip.name,tracks:ambientClip.tracks.length,duration:12}],attachments:{},addedProps:[],backgroundPeople:false};window.__assetReady=true;
}catch(error){window.__assetError=error.stack;throw error;}
