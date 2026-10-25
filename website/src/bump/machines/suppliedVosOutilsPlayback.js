import {createDemoTimeout,demoIsPaused,observeDemoPaused} from '../ui/demoTransport.js';
import {motionMilliseconds} from '../ui/playback.js';
import {observeDemoReady,demoReadingMs,DEMO_START_MS,DEMO_REPLAY_MS} from '../ui/demoReady.js';
// Host sequencing uses the supplied controls; its native loop owns all frames.
export const TOOLS_COPY=[
 ['Avant','Vos données sont dispersées.','Vos équipes passent d’un outil à l’autre pour retrouver les informations d’un même client.'],
 ['01','Lever les blocages.','Nous repérons ce qui freine vos opérations et fiabilisons les outils avant de les connecter.'],
 ['02','Relier vos logiciels existants.','Nous adaptons les échanges entre vos outils, leurs API et vos règles de travail pour qu’ils puissent se comprendre.'],
 ['03','Faire circuler l’information.','CRM, courriels, comptabilité et fichiers échangent les données utiles au lieu de laisser votre équipe les recopier.'],
 ['04','La même information, au bon endroit.','Une mise à jour se répercute dans les outils concernés. Votre équipe travaille à partir d’un dossier cohérent.'],
 ['05','Des outils qui avancent ensemble.','Vos logiciels gardent leur rôle et travaillent ensemble. Nous documentons les connexions pour les maintenir et les faire évoluer.']
];

export function mountVosOutilsPlayback(root){
 if(!root)return()=>{};
 const readout=root.querySelector('[data-readout]'),calm=matchMedia('(prefers-reduced-motion: reduce)');
 let visible=false,disposed=false,idle=0,startFrame=0,cursorFrame=0,manualUntil=0,cycle=0,demonstrating=false,adapterShown=false,lastCopy='';
 const held=new Set();
 const pointer=document.createElement('span');pointer.className='bump-demo-cursor';pointer.hidden=true;pointer.setAttribute('aria-hidden','true');
 pointer.innerHTML='<svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg>';
 const ring=document.createElement('i');ring.className='bump-demo-click';ring.hidden=true;ring.setAttribute('aria-hidden','true');root.append(pointer,ring);
 const stage=()=>Number(root.querySelector('[data-step][data-current]')?.dataset.step??0);
 const allowed=()=>!disposed&&visible&&!document.hidden&&!calm.matches&&!held.size&&performance.now()>=manualUntil&&!demoIsPaused(root);
 const control=selector=>root.querySelector(selector)?.click();
 function describe(){
  const index=stage(),detached=(readout?.textContent||'').includes('sans adaptateur');
  const copy=detached?['04','Vous maîtrisez les connexions.','Un outil peut être isolé pendant que les autres continuent d’échanger. Vous gardez le contrôle des données partagées.']:TOOLS_COPY[index];
  const key=index+':'+detached;if(key===lastCopy)return;lastCopy=key;
  root.dataset.toolsStage=String(index);root.dataset.toolsDetached=String(detached);
  root.querySelector('[data-tools-number]').textContent=copy[0];root.querySelector('[data-tools-title]').textContent=copy[1];root.querySelector('[data-tools-detail]').textContent=copy[2];

 }
 const clear=()=>{timer.clear();clearTimeout(idle);idle=0;cancelAnimationFrame(cursorFrame);pointer.hidden=true;ring.hidden=true;demonstrating=false;root.dataset.toolsCursor='none';};
 const timer=createDemoTimeout(root,allowed);
 const later=(ms,fn)=>{if(!allowed())return;timer.schedule(ms*.8,fn);};
 function pause(){clear();const button=root.querySelector('[data-pause]');if(!calm.matches&&button?.getAttribute('aria-pressed')!=='true')button?.click();root.dataset.toolsPlaying='false';}
 function restart(){
  clear();if(calm.matches||!allowed()){root.dataset.toolsPlaying='false';return;}
  adapterShown=false;control('[data-reset]');root.dataset.toolsCycle=String(++cycle);root.dataset.toolsPlaying='true';advance();
 }
 function cursorAt(approach){
  const target=root.querySelector('[data-tool="3"]'),box=target?.getBoundingClientRect(),host=root.getBoundingClientRect();if(!box?.width)return;
  const x=box.left-host.left+box.width*.5,y=box.top-host.top+box.height*.48;
  pointer.style.left=(x-(approach?65:0))+'px';pointer.style.top=(y+(approach?40:0))+'px';ring.style.left=(x-11)+'px';ring.style.top=(y-10)+'px';
 }
 function clickAdapter(done){
  pointer.hidden=false;ring.hidden=true;root.dataset.toolsCursor='approach';cursorAt(true);
  cursorFrame=requestAnimationFrame(()=>{cursorFrame=requestAnimationFrame(()=>cursorAt(false));});
  later(motionMilliseconds(650),()=>{
   ring.hidden=false;root.dataset.toolsCursor='click';const target=root.querySelector('[data-tool="3"]'),box=target?.getBoundingClientRect();
   target?.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:box?box.left+box.width/2:0,clientY:box?box.top+box.height/2:0}));
   later(300,()=>{pointer.hidden=true;ring.hidden=true;root.dataset.toolsCursor='none';done();});
  });
 }
 function showAdapter(){
  demonstrating=true;adapterShown=true;
  clickAdapter(()=>later(1700,()=>clickAdapter(()=>later(350,()=>{demonstrating=false;advance();}))));
 }
 function advance(){
  describe();if(!allowed()||timer.pending||demonstrating)return;
  const index=stage(),text=readout?.textContent||'';if(text.includes('→')||text.includes(' · pause'))return;
  if(index===4&&!adapterShown){later(demoReadingMs(root.querySelector('[data-tools-title]').textContent,root.querySelector('[data-tools-detail]').textContent),showAdapter);return;}
  if(index===5){later(DEMO_REPLAY_MS,restart);return;}
  later(index===0?DEMO_START_MS:index===4?350:demoReadingMs(root.querySelector('[data-tools-title]').textContent,root.querySelector('[data-tools-detail]').textContent),()=>control(`[data-step="${index+1}"]`));
 }
 const watch=new MutationObserver(advance);if(readout)watch.observe(readout,{subtree:true,childList:true,characterData:true});
 function scheduleIdle(){clearTimeout(idle);if(disposed||!visible||document.hidden||calm.matches||held.size||demoIsPaused(root))return;idle=setTimeout(()=>{idle=0;if(allowed())restart();else scheduleIdle();},Math.max(0,manualUntil-performance.now()));}
 const onUser=event=>{
  if(!event.isTrusted)return;
  if(event.type==='pointerdown'&&!event.target.closest('[data-tool],[data-adapter]'))return;
  // Merely hovering or focusing a part never interrupts the demonstration.
  if(event.type==='keydown'&&!['ArrowLeft','ArrowRight',' ','Home','Enter','1','2','3','4','5'].includes(event.key))return;
  clear();manualUntil=performance.now()+30000;root.dataset.toolsPlaying='false';
  held.add(event.type==='keydown'?'key-'+event.code:'pointer-'+event.pointerId);scheduleIdle();
 };
 const release=event=>{const key=event.type==='keyup'?'key-'+event.code:'pointer-'+event.pointerId;if(!held.delete(key))return;scheduleIdle();};
 const onVisibility=()=>{if(document.hidden){pause();return;}if(!visible)return;if(manualUntil>performance.now())scheduleIdle();else restart();};
 const onMotion=()=>{clear();if(calm.matches){root.dataset.toolsPlaying='false';control('[data-reset]');control('[data-step="5"]');}else if(visible&&!document.hidden)restart();};
 let stopReady=()=>{};
 const observeReady=()=>{stopReady=observeDemoReady(root,next=>{if(next===visible)return;visible=next;if(!visible){pause();return;}manualUntil=0;held.clear();if(calm.matches){control('[data-reset]');control('[data-step="5"]');root.dataset.toolsPlaying='false';}else restart();});};
 const stopPause=observeDemoPaused(root,paused=>{if(paused||!visible||calm.matches)return;const button=root.querySelector('[data-pause]');if(button?.getAttribute('aria-pressed')==='true')button.click();if(manualUntil>performance.now())scheduleIdle();else advance();});
 root.addEventListener('pointerdown',onUser,true);root.addEventListener('keydown',onUser,true);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('keyup',release);document.addEventListener('visibilitychange',onVisibility);calm.addEventListener('change',onMotion);
 // The generated illustration contains the assembled pose. Expose it only
 // after the delivered live renderer has drawn its real isolated-tool pose.
 startFrame=requestAnimationFrame(()=>{if(disposed)return;control('[data-reset]');describe();root.dataset.toolsReady='true';observeReady();});
 return()=>{disposed=true;clear();stopPause();timer.destroy();cancelAnimationFrame(startFrame);stopReady();watch.disconnect();pointer.remove();ring.remove();root.removeEventListener('pointerdown',onUser,true);root.removeEventListener('keydown',onUser,true);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('keyup',release);document.removeEventListener('visibilitychange',onVisibility);calm.removeEventListener('change',onMotion);};
}
