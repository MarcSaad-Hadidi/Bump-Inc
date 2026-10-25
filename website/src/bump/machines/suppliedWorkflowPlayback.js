import {createDemoTimeout,demoIsPaused,observeDemoPaused} from '../ui/demoTransport.js';
import {motionMilliseconds} from '../ui/playback.js';
import {observeDemoReady,demoReadingMs,DEMO_START_MS,DEMO_REPLAY_MS} from '../ui/demoReady.js';
// Host-only playback. Never changes the supplied model, artwork or animation.
// One timeout at a time; the existing figure owns every animated SVG frame.
export function mountWorkflowPlayback(root){
 if(!root)return()=>{};
 const readout=root.querySelector('[data-readout]'),calm=matchMedia('(prefers-reduced-motion: reduce)');
 let visible=false,disposed=false,idle=0,startFrame=0,cursorFrame=0,manualUntil=0,cycle=0,approving=false;
 const held=new Set();
 const pointer=document.createElement('span');pointer.className='bump-demo-cursor';pointer.hidden=true;pointer.setAttribute('aria-hidden','true');pointer.style.transitionDuration='240ms';
 pointer.innerHTML='<svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg>';
 const ring=document.createElement('i');ring.className='bump-demo-click';ring.hidden=true;ring.setAttribute('aria-hidden','true');
 root.append(pointer,ring);
 const stage=()=>Number(root.querySelector('[data-step][data-current]')?.dataset.step??0);
 let lastDescription='';
 const descriptions={
  devis:[['Chaque demande trouve sa place.','Le besoin du client et ses coordonnées sont réunis dès le départ, pour préparer le devis sans repartir de zéro.'],['Le travail répétitif avance.','La fiche client se crée, le devis se prépare et votre équipe reçoit le contexte dont elle a besoin.'],['Votre accord déclenche l’envoi.','Le devis vérifié rejoint le client. Les informations validées suivent dans les outils concernés.']],
  facture:[['Le traitement commence dès réception.','La facture reçue par courriel rejoint le bon dossier avec les informations nécessaires à sa vérification.'],['La préparation se fait en parallèle.','Les données comptables sont reprises, le paiement est préparé et la pièce est classée, sans recopier le même dossier.'],['Vous approuvez. La suite s’enchaîne.','Après vérification, les instructions de paiement sont transmises au système concerné.']],
  support:[['Une demande prise en charge.','Le message du client ouvre un dossier : votre équipe retrouve le besoin et peut suivre sa résolution.'],['Le contexte arrive avec le ticket.','Le ticket se crée, une réponse se prépare et le technicien reçoit les informations pour intervenir.'],['La réponse part après vérification.','Le client reçoit une réponse approuvée et le ticket conserve la trace du suivi.']]
 };
 function describe(index){
  const kind=root.querySelector('[data-kind]')?.value||'devis',key=kind+':'+index;if(key===lastDescription)return;lastDescription=key;
  const copy=descriptions[kind]||descriptions.devis;
  const text=[copy[0],['Une saisie. Un dossier prêt à avancer.','Les informations utiles deviennent une tâche structurée. Votre équipe retrouve le même contexte à chaque étape.'],copy[1],['Vous décidez de la suite.','L’automatisation prépare le travail. Votre équipe vérifie les informations et donne son accord avant la transmission.'],copy[2],['Le dossier avance. Vos outils suivent.','Le traitement et les mises à jour restent reliés. Votre équipe peut suivre ce qui a été fait et prendre le relais.']][index];
  root.querySelector('[data-workflow-number]').textContent=String(index+1).padStart(2,'0');
  root.querySelector('[data-workflow-title]').textContent=text[0];root.querySelector('[data-workflow-detail]').textContent=text[1];
  root.dataset.workflowStage=String(index);

 }
 const allowed=()=>!disposed&&visible&&!document.hidden&&!calm.matches&&!held.size&&performance.now()>=manualUntil&&!demoIsPaused(root);
 const control=selector=>root.querySelector(selector)?.click();
 const clear=()=>{timer.clear();clearTimeout(idle);idle=0;cancelAnimationFrame(cursorFrame);pointer.hidden=true;ring.hidden=true;approving=false;root.dataset.workflowCursor='none';};
 const timer=createDemoTimeout(root,allowed);
 const later=(ms,fn)=>{if(!allowed())return;timer.schedule(ms*.68,fn);};
 function pause(){clear();const button=root.querySelector('[data-pause]');if(!calm.matches&&button?.getAttribute('aria-pressed')!=='true')button?.click();root.dataset.workflowPlaying='false';}
 function restart(){
  clear();if(calm.matches){control('[data-reset]');root.dataset.workflowPlaying='false';return;}if(!allowed())return;
  control('[data-reset]');root.dataset.workflowCycle=String(++cycle);root.dataset.workflowPlaying='true';root.dataset.workflowWaiting='false';
  advance();
 }
 function positionCursor(approach){
  const target=root.querySelector('[data-btn="ok"]'),box=target?.getBoundingClientRect(),host=root.getBoundingClientRect();
  if(!box?.width||!box.height)return false;
  const x=box.left-host.left+box.width*.52,y=box.top-host.top+box.height*.48;
  pointer.style.left=(x-(approach?68:0))+'px';pointer.style.top=(y+(approach?44:0))+'px';
  ring.style.left=(x-11)+'px';ring.style.top=(y-10)+'px';return true;
 }
 function approve(){
  if(stage()!==3){approving=false;advance();return;}
  approving=true;pointer.hidden=false;root.dataset.workflowCursor='approach';positionCursor(true);
  cursorFrame=requestAnimationFrame(()=>{cursorFrame=requestAnimationFrame(()=>positionCursor(false));});
  later(motionMilliseconds(550),()=>{
   if(stage()!==3){clear();advance();return;}
   positionCursor(false);ring.hidden=false;root.dataset.workflowCursor='click';
   const target=root.querySelector('[data-btn="ok"]'),b=target?.getBoundingClientRect();
   // Bubble through the provided SVG listener: the physical green button
   // performs its original press animation and calls the real approval guard.
   target?.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:b?b.left+b.width/2:0,clientY:b?b.top+b.height/2:0}));
   later(350,()=>{pointer.hidden=true;ring.hidden=true;approving=false;root.dataset.workflowCursor='none';advance();});
  });
 }
 function advance(){
  const index=stage(),text=readout?.textContent||'';describe(index);root.dataset.workflowWaiting=String(index===3&&!text.includes('→'));
  if(!allowed()||timer.pending||approving)return;
  if(text.includes('→')||text.includes(' · pause'))return;
  if(index===3){root.dataset.workflowWaiting='true';later(1800,approve);return;}
  root.dataset.workflowWaiting='false';
  if(index===5){later(DEMO_REPLAY_MS,restart);return;}
  later(index===0?DEMO_START_MS:demoReadingMs(root.querySelector('[data-workflow-title]').textContent,root.querySelector('[data-workflow-detail]').textContent),()=>control(`[data-step="${index+1}"]`));
 }
 const watch=new MutationObserver(advance);if(readout)watch.observe(readout,{subtree:true,childList:true,characterData:true});
 function scheduleIdle(){
  clearTimeout(idle);if(disposed||!visible||document.hidden||calm.matches||held.size||demoIsPaused(root))return;
  idle=setTimeout(()=>{idle=0;if(allowed())restart();else scheduleIdle();},Math.max(0,manualUntil-performance.now()));
 }
 const onUser=event=>{
  if(!event.isTrusted)return;
  if(event.type==='pointerdown'&&!event.target.closest('[data-btn],[data-kind]'))return;
  clear();manualUntil=performance.now()+30000;root.dataset.workflowPlaying='false';
  if(event.type==='pointerdown')held.add('pointer-'+event.pointerId);
  if(event.type==='keydown')held.add('key-'+event.code);
  scheduleIdle();
 };
 const release=event=>{held.delete(event.type==='keyup'?'key-'+event.code:'pointer-'+event.pointerId);scheduleIdle();};
 const onKind=event=>{if(!event.target.matches('[data-kind]'))return;manualUntil=0;held.clear();restart();};
 const onVisibility=()=>{if(document.hidden){pause();return;}if(!visible)return;if(manualUntil>performance.now())scheduleIdle();else restart();};
 const onMotion=()=>{if(calm.matches){clear();root.dataset.workflowPlaying='false';}else if(visible&&!document.hidden)restart();};
 let stopReady=()=>{};
 const observeReady=()=>{stopReady=observeDemoReady(root,next=>{
  if(next===visible)return;visible=next;
  if(!visible){pause();return;}
  manualUntil=0;held.clear();restart();
 });};
 const stopPause=observeDemoPaused(root,paused=>{if(paused||!visible||calm.matches)return;const button=root.querySelector('[data-pause]');if(button?.getAttribute('aria-pressed')==='true')button.click();if(manualUntil>performance.now())scheduleIdle();else advance();});
 root.addEventListener('pointerdown',onUser,true);root.addEventListener('keydown',onUser,true);root.addEventListener('change',onKind);
 window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('keyup',release);
 document.addEventListener('visibilitychange',onVisibility);calm.addEventListener('change',onMotion);
 // Child effects have installed all original listeners before the first action.
 startFrame=requestAnimationFrame(()=>{if(disposed)return;control('[data-reset]');observeReady();});
 return()=>{disposed=true;clear();stopPause();timer.destroy();cancelAnimationFrame(startFrame);stopReady();watch.disconnect();pointer.remove();ring.remove();root.removeEventListener('pointerdown',onUser,true);root.removeEventListener('keydown',onUser,true);root.removeEventListener('change',onKind);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('keyup',release);document.removeEventListener('visibilitychange',onVisibility);calm.removeEventListener('change',onMotion);};
}
