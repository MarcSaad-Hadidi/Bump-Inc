import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.outputColorSpace=T.SRGBColorSpace;renderer.setSize(256,256);document.body.appendChild(renderer.domElement);
const camera=new T.OrthographicCamera(-1,1,1,-1,0,10);camera.position.z=1;
const target=new T.WebGLRenderTarget(256,256),scene=new T.Scene(),quad=new T.Mesh(new T.PlaneGeometry(2,2));scene.add(quad);
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const load=async url=>{const i=await new T.ImageLoader().loadAsync(url),c=canvas(i.width,i.height);c.getContext('2d').drawImage(i,0,0);return c};
const save=async(name,c)=>{await fetch('/save/'+name,{method:'POST',body:c.toDataURL('image/png').split(',')[1]});await fetch('/save/'+name.replace('.png','.webp'),{method:'POST',body:c.toDataURL('image/webp',.94).split(',')[1]});};
function sample(map){quad.material=new T.MeshBasicMaterial({map,transparent:false,side:T.DoubleSide});renderer.setRenderTarget(target);renderer.render(scene,camera);const p=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,p);quad.material.dispose();return p;}
try{
 const draco=new DRACOLoader().setDecoderPath('/decoders/'),ktx=new KTX2Loader().setTranscoderPath('/decoders/').detectSupport(renderer),loader=new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx);
 const original=await loader.loadAsync('/source/sidekick-1.glb');let compressed;original.scene.traverse(n=>{if(n.isMesh&&!compressed)compressed=n.material.map});
 const source=await load('/atlas/sidekick-1-texture-0.png'),tex=new T.CanvasTexture(source);tex.colorSpace=T.SRGBColorSpace;const a=sample(compressed),orientation=[];
 for(const flipY of [false,true]){tex.flipY=flipY;tex.needsUpdate=true;const b=sample(tex);let error=0;for(let i=0;i<a.length;i+=4)for(let k=0;k<3;k++)error+=Math.abs(a[i+k]-b[i+k]);orientation.push({flipY,meanError:error/(256*256*3)})}
 const flipY=orientation.sort((a,b)=>a.meanError-b.meanError)[0].flipY;
 async function condition(name,sourceName,editName,regions){
  const src=await load('/atlas/'+sourceName+'.png'),edit=await load('/edit/'+editName+'.png');const out=canvas(src.width,src.height),ctx=out.getContext('2d');ctx.drawImage(edit,0,0,src.width,src.height);
  const p=ctx.getImageData(0,0,out.width,out.height),o=src.getContext('2d').getImageData(0,0,src.width,src.height);
  if(editName==='bump-faces-v2'){
   const raw=p.data.slice(),bad=i=>{const max=Math.max(raw[i],raw[i+1],raw[i+2]),min=Math.min(raw[i],raw[i+1],raw[i+2]);return raw[i+3]<240||(max-min>120&&min<50&&max>130);};
   for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){const i=(y*out.width+x)*4;if(o.data[i+3]<8||!bad(i))continue;let done=false;for(let r=1;r<=18&&!done;r++)for(let dy=-r;dy<=r&&!done;dy++)for(const dx of [-r,r]){const xx=x+dx,yy=y+dy;if(xx<0||xx>=out.width||yy<0||yy>=out.height)continue;const j=(yy*out.width+xx)*4;if(!bad(j)){for(let k=0;k<3;k++)p.data[i+k]=raw[j+k];p.data[i+3]=255;done=true;break;}}}
  }
  for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){const i=(y*out.width+x)*4,u=x/out.width,v=y/out.height;const useEdit=!regions||regions.some(r=>u>=r[0]&&v>=r[1]&&u<=r[2]&&v<=r[3]);
   if(!useEdit||((p.data[i]+p.data[i+1]+p.data[i+2]<8)&&o.data[i+3]>20)){for(let k=0;k<3;k++)p.data[i+k]=o.data[i+k];}p.data[i+3]=o.data[i+3];
  }
  ctx.putImageData(p,0,0);const encoded=canvas(out.width,out.height),ec=encoded.getContext('2d');if(flipY){ec.translate(0,out.height);ec.scale(1,-1)}ec.drawImage(out,0,0);await save(name+'.png',encoded);return{name,width:out.width,height:out.height,sourceAlphaPreserved:true,flipY};
 }
 const report=[];
 report.push(await condition('workflow-0','sidekick-1-texture-0','workflow-v2',[[.21,.44,1,.96],[.22,.105,.96,.35],[0,.45,.21,.67],[0,.1,.23,.35]]));
 report.push(await condition('software-0','online-1-texture-0','software-canvas-v2'));
 report.push(await condition('security-0','operations-1-texture-0','security-v2'));
 report.push(await condition('contact-faces-1','b2b-1-texture-1','bump-faces-v2'));
 report.push(await condition('method-wall-0','retail-3-texture-0','method-wall-v2'));
 function screen(w,h,method=false){const c=canvas(w,h),x=c.getContext('2d');x.fillStyle='#f3efe5';x.fillRect(0,0,w,h);x.fillStyle='#233a40';x.fillRect(0,0,w,h*.12);x.fillStyle='#f3efe5';x.font=`600 ${h*.05}px Georgia`;x.fillText('Bump',w*.045,h*.079);x.font=`${h*.022}px Georgia`;x.fillText(method?'ATELIER · MÉTHODE':'ATELIER · LOGICIEL',w*.22,h*.076);x.fillStyle='#e4ddcd';x.fillRect(0,h*.12,w*.2,h*.88);
  ['Vue d’ensemble','Dossiers','Équipe','Connexions'].forEach((t,i)=>{x.fillStyle=i===0?'#713d43':'#71695b';x.font=`${h*.023}px Georgia`;x.fillText(t,w*.025,h*(.2+i*.075));});x.fillStyle='#302c27';x.font=`${h*.05}px Georgia`;x.fillText(method?'De l’idée au système.':'Tout commence par un besoin.',w*.24,h*.23);x.font=`${h*.022}px Georgia`;x.fillStyle='#82755f';x.fillText('Comprendre. Construire. Faire évoluer.',w*.24,h*.29);
  const labels=method?['Audit','Analyse','Proposition','Implantation','Maintenance']:['Demande reçue','Dossier structuré','Validation humaine','Mise à jour'];labels.forEach((t,i)=>{const yy=h*(.38+i*.105);x.fillStyle=i===2?'#e6ddcb':'#faf7f0';x.fillRect(w*.24,yy,w*.7,h*.08);x.fillStyle='#9b8256';x.beginPath();x.arc(w*.28,yy+h*.04,h*.016,0,Math.PI*2);x.strokeStyle='#9b8256';x.lineWidth=2;x.stroke();x.fillStyle='#3d3930';x.font=`${h*.025}px Georgia`;x.fillText(t,w*.32,yy+h*.05);x.fillStyle='#d7cdb9';x.fillRect(w*.73,yy+h*.034,w*.16,h*.01);});return c;}
 const tablet=screen(1024,768,true),encoded=canvas(1024,768),ec=encoded.getContext('2d');if(flipY){ec.translate(0,768);ec.scale(1,-1)}ec.drawImage(tablet,0,0);await save('method-screen-1.png',encoded);const code=canvas(1536,1024),cx=code.getContext('2d');cx.fillStyle='#10272d';cx.fillRect(0,0,1536,1024);cx.fillStyle='#203c43';cx.fillRect(0,0,1536,110);cx.fillStyle='#dcc79c';cx.font='600 42px Georgia';cx.fillText('Bump / Atelier logiciel',70,70);cx.font='27px monospace';['// Partir de votre réalité','const projet = {','  besoin: comprendre(),','  outils: connecter(),','  solution: construire(),','  validation: votreEquipe,','  suivi: continuer()','};','','// Un système qui évolue avec vous'].forEach((line,i)=>{cx.fillStyle=line.startsWith('//')?'#7f9b94':line.includes(':')?'#d7c397':'#bdc8bc';cx.fillText(line,75,210+i*64);});await save('software-screen.png',code);
 await save('method-dome.png',await load('/atlas/retail-1-texture-1.png'));
 window.__assetResult={orientation,chosenFlipY:flipY,textures:report};window.__assetReady=true;draco.dispose();ktx.dispose();renderer.dispose();
}catch(e){window.__assetError=e.stack;}
