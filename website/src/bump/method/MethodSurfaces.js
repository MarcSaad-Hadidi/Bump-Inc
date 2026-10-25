import{styleBumpMaterial}from'/runtime/assets/Bump3DStyle.js';
import {r as React} from '/runtime/assets/components-BdJai906.js';
import {u as useThree,d as useFrame,aW as CanvasTexture,k as MeshBasicMaterial} from '/runtime/assets/Background-DpyJh-o1.js';
import {BUMP_PLAYBACK_RATE} from '/runtime/assets/BumpPlayback.js';
import {advanceMethodGesture} from './gesture.js';
const SURFACE_INTERVAL=100,LINEAR_FILTER=1006; // Real milliseconds; never multiplied by playback rate.
const COMPUTER_SIZE=[1600,1024],BOARD_SIZE=[1024,1024];
const labels=['Audit','Analyse','Proposition','Implantation','Maintenance'];
const details=['Comprendre votre réalité','Relier les constats','Définir le bon plan','Construire avec vous','Faire durer la solution'];
const ink='#26352e',green='#17654b',gold='#b08c46',paper='#f5f2e9',muted='#858878';
function rounded(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function text(c,label,x,y,size=24,color=ink,serif=false){c.fillStyle=color;c.font=`${serif?'400':'500'} ${size}px ${serif?'"IM FELL English",Georgia':'Arial,sans-serif'}`;c.fillText(label,x,y);}
function drawComputer(c,stage,logo){const w=1600,h=1024;c.clearRect(0,0,w,h);c.fillStyle=paper;c.fillRect(0,0,w,h);c.fillStyle='#eae9df';c.fillRect(0,0,275,h);if(logo)c.drawImage(logo,38,36,48,38);text(c,'Bump',98,70,43,ink,true);text(c,'VOTRE MANDAT',38,145,17,muted);
 ['Vue du projet','Parcours','Livrables','Équipe'].forEach((item,i)=>{if(i===0)rounded(c,25,182+i*66,224,54,7,'#d9e3d5');text(c,item,44,218+i*66,23,i===0?green:muted);});text(c,'Espace de démonstration',34,980,14,muted);
 text(c,'PROJET / TRANSFORMATION',325,63,18,muted);rounded(c,1270,28,273,48,24,'#e0e8d9');text(c,'Avec votre équipe',1300,60,20,green);
 text(c,'Du besoin à la solution.',325,152,53,ink,true);text(c,'Un accompagnement clair, étape par étape.',327,202,26,muted);
 rounded(c,325,255,505,260,12,'#fffefa','#e0e1d7');text(c,'ÉTAPE DU MANDAT',352,300,17,muted);text(c,String(stage+1).padStart(2,'0'),352,405,88,green,true);text(c,'/ 05',465,405,28,muted);text(c,labels[stage],352,465,33,ink,true);
 rounded(c,855,255,687,260,12,'#e1eadc');text(c,'AVEC VOTRE ÉQUIPE',887,300,17,green);text(c,details[stage]+'.',887,370,31,ink,true);text(c,'Constats partagés · Décisions validées',887,423,22,muted);rounded(c,887,460,620,7,3,'#cbd8c4');
 text(c,'Le fil du projet',325,590,30,ink,true);text(c,'ÉTAPE',325,638,14,muted);text(c,'CE QUI AVANCE',638,638,14,muted);text(c,'SUIVI',1338,638,14,muted);
 labels.forEach((label,i)=>{const y=660+i*56;if(i===stage)rounded(c,315,y,1240,51,6,'#fffefa');text(c,String(i+1).padStart(2,'0'),330,y+34,20,i<=stage?green:muted);text(c,label,380,y+34,23,ink);text(c,details[i],638,y+34,21,muted);rounded(c,1325,y+9,185,33,16,i<stage?'#dcebdc':i===stage?'#e9dfc5':'#ebece4');text(c,i<stage?'Documenté':i===stage?'En cours':'À venir',1341,y+32,17,i<stage?green:i===stage?'#886721':muted);});text(c,'AUDIT  →  ANALYSE  →  PROPOSITION  →  IMPLANTATION  →  MAINTENANCE',325,990,15,muted);
}
function drawBoard(c,stage,base){c.clearRect(0,0,1024,1024);c.drawImage(base,0,0,1024,1024);const x=280,w=744;c.fillStyle='#f1eee0';c.fillRect(x,0,w,768);c.strokeStyle='#bda97e';c.lineWidth=3;c.strokeRect(299,18,706,730);text(c,'BUMP / NOTRE MÉTHODE',329,62,17,green);text(c,'Le bon chemin, ensemble.',329,126,36,ink,true);text(c,'Un cadre. Cinq étapes. Votre réalité.',329,168,20,muted);
 labels.forEach((label,i)=>{const y=227+i*93,active=i===stage,done=i<stage;if(i<4){c.strokeStyle=done?green:'#c9c8b5';c.lineWidth=2;c.beginPath();c.moveTo(353,y+20);c.lineTo(353,y+95);c.stroke();}c.beginPath();c.arc(353,y,16,0,Math.PI*2);c.fillStyle=done?green:active?gold:'#e0dfd1';c.fill();text(c,done?'✓':String(i+1),done?344:348,y+6,16,done?'#fffcef':ink);if(active)rounded(c,388,y-30,560,70,7,'#fffdf6','#ddd8c5');text(c,label,411,y+1,27,active?green:ink,true);text(c,details[i],411,y+28,16,muted);if(active){rounded(c,411,y+51,475,3,1,'#dad9c9');}});text(c,'Votre équipe garde la main.',329,723,23,green,true);
}
function drawComputerMotion(c,stage,progress){
 rounded(c,887,460,Math.max(8,620*((stage+progress)/5)),7,3,green);
 const next=(stage+1)%5,cx=1460,cy=694+next*56,arrive=Math.max(0,Math.min(1,(progress-.55)/.35));c.save();c.translate(cx+Math.sin(arrive*Math.PI)*20,694+stage*56+(cy-694-stage*56)*arrive);c.fillStyle='#fffdf3';c.strokeStyle=green;c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(25,22);c.lineTo(13,23);c.lineTo(8,35);c.closePath();c.fill();c.stroke();if(progress>.93){c.beginPath();c.arc(0,0,(progress-.93)*180,0,Math.PI*2);c.strokeStyle='#238458';c.stroke();}c.restore();
}
function drawBoardMotion(c,stage,progress){rounded(c,411,278+stage*93,Math.max(4,475*progress),3,1,green);}

function makeSurface(mesh,size,draw,drawMotion){
 const [width,height]=size,canvas=document.createElement('canvas');
 // The screens occupy only a fraction of the viewport. Half-size source pixels
 // retain their authored logical layout and sharp text without oversized uploads.
 canvas.width=width/2;canvas.height=height/2;
 const context=canvas.getContext('2d'),texture=new CanvasTexture(canvas),old=mesh.material;
 texture.flipY=false;texture.colorSpace=old.map.colorSpace;
 texture.generateMipmaps=false;texture.minFilter=LINEAR_FILTER;texture.magFilter=LINEAR_FILTER;
 const material=new MeshBasicMaterial({map:texture,toneMapped:false,side:old.side,transparent:true});
 mesh.material=material;context.scale(.5,.5);
 return{mesh,old,material,texture,canvas,context,size,draw,drawMotion,stages:new Map()};
}
function paintSurface(target,stage,progress,logo){
 let layer=target.stages.get(stage);
 if(!layer){
  layer=document.createElement('canvas');layer.width=target.canvas.width;layer.height=target.canvas.height;
  const context=layer.getContext('2d');context.scale(.5,.5);target.draw(context,stage,logo);
  target.stages.set(stage,layer);
 }
 const [width,height]=target.size,c=target.context;
 c.clearRect(0,0,width,height);c.drawImage(layer,0,0,width,height);target.drawMotion(c,stage,progress);
 target.texture.needsUpdate=true;target.mesh.userData.bumpMethodStep=stage+1;
}
function getNativeAnimation(scene){
 let object=scene.getObjectByName('online-man');
 while(object){if(object.userData.bumpAnimation?.actions.size)return object.userData.bumpAnimation;object=object.parent;}
 return null;
}
function animateGesture(s,delta){
 const native=s.native;
 if(!native)return;
 const next=advanceMethodGesture(s.gesture,delta,BUMP_PLAYBACK_RATE,s.visible&&!s.hidden,s.reduced);
 if(next.time===s.gestureTime)return;
 s.gestureTime=next.time;
 for(const action of s.gestureActions){action.paused=true;action.timeScale=0;action.time=next.time;}
 native.mixer.update(0);
 if(s.section.dataset.methodGesture!==next.phase)s.section.dataset.methodGesture=next.phase;
}
export function MethodSurfaces(){
 const{scene}=useThree(),state=React.useRef({elapsed:0,lastUpload:-Infinity,targets:null,visible:false,hidden:document.hidden,reduced:false,gesture:{elapsed:0,duration:0},gestureTime:-1});
 React.useEffect(()=>{
  const s=state.current,section=document.getElementById('retail'),painting=section?.querySelector('[data-nav-theme]');
  s.section=section;if(!painting)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),onMotion=()=>{s.reduced=motion.matches;s.paintedReduced=false;s.lastUpload=-Infinity;},onVisibility=()=>{s.hidden=document.hidden;s.lastFrameAt=undefined;};
  onMotion();motion.addEventListener('change',onMotion);document.addEventListener('visibilitychange',onVisibility);
  // Visibility comes from the browser's intersection cache, so no layout read
  // enters the render loop while this heavy 3D chapter is on screen.
  const observer=new IntersectionObserver(entries=>{
   const visible=entries[0].isIntersecting;
   if(visible&&!s.visible){s.elapsed=0;s.gesture.elapsed=0;s.gestureTime=-1;s.paintedReduced=false;}
   s.visible=visible;s.lastUpload=-Infinity;s.lastFrameAt=undefined;
  },{threshold:0});observer.observe(painting);
  const invalidate=()=>{for(const target of s.targets||[])target.stages.clear();s.paintedReduced=false;s.lastUpload=-Infinity;};
  document.fonts?.ready.then(invalidate);
  return()=>{
   observer.disconnect();motion.removeEventListener('change',onMotion);document.removeEventListener('visibilitychange',onVisibility);
   if(s.logo)s.logo.onload=null;
   if(s.native)s.native.manual=false;
   for(const item of s.targets||[]){item.mesh.material=item.old;item.stages.clear();item.texture.dispose();item.material.dispose();}
  };
 },[]);
 useFrame(()=>{
  const s=state.current;
  if(!s.section||!s.visible||s.hidden)return;
  if(!s.targets){
   const display=scene.getObjectByName('Bump_Software_Display'),board=scene.getObjectByName('online_canvas');
   if(!display?.material||!board?.material?.map?.image)return;
   const maker=scene.getObjectByName('online-man');
   if(maker?.material&&!maker.material.userData.bumpConsultantStyle){styleBumpMaterial({name:'Bump_Method_Consultant_v21'},maker.material);maker.material.needsUpdate=true;}
   s.section.dataset.methodAppearance=String(!!maker?.material?.userData.bumpConsultantStyle);
   const base=board.material.map.image;
   s.targets=[makeSurface(display,COMPUTER_SIZE,drawComputer,drawComputerMotion),makeSurface(board,BOARD_SIZE,(c,a)=>drawBoard(c,a,base),drawBoardMotion)];
   s.logo=new Image();s.logo.onload=()=>{for(const target of s.targets)target.stages.clear();s.paintedReduced=false;s.lastUpload=-Infinity;};s.logo.src='/bump/brand/bump-symbol.png';
  }
  if(!s.native){
   s.native=getNativeAnimation(scene);
   if(s.native){
    s.gestureActions=[...s.native.actions.entries()].filter(([name])=>/Armature_002|online_handarmature|online_brush/.test(name)).map(([,action])=>action);
    if(s.gestureActions.length===3){s.gesture.duration=Math.max(...s.gestureActions.map(action=>action.getClip().duration));s.native.manual=true;}
    else s.native=null;
   }
  }
  const now=performance.now(),dt=s.lastFrameAt===undefined?0:(now-s.lastFrameAt)/1000;s.lastFrameAt=now;
  animateGesture(s,dt);
  for(const target of s.targets)target.material.opacity=(target.old.visibility??1)*(target.old.loadingVisibility??1);
  if(!s.reduced)s.elapsed+=dt*1000*BUMP_PLAYBACK_RATE;
  if(now-s.lastUpload<SURFACE_INTERVAL)return;s.lastUpload=now;
  const stage=s.reduced?4:Math.floor(s.elapsed/2600)%5,progress=s.reduced?1:s.elapsed%2600/2600;
  // Static type, rows and borders rasterize once per stage. Each bounded update
  // only copies that cached layer and paints the two bars and small pointer.
  if(s.reduced&&s.paintedReduced)return;
  for(const target of s.targets)paintSurface(target,stage,progress,s.logo.complete?s.logo:null);
  s.paintedReduced=s.reduced;s.section.dataset.methodStep=String(stage+1);
 });return null;
}
