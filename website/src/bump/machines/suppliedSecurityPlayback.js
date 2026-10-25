import {createDemoTimeout,demoIsPaused,observeDemoPaused} from '../ui/demoTransport.js';
import {motionMilliseconds} from '../ui/playback.js';
import {observeDemoReady,demoReadingMs,DEMO_START_MS,DEMO_REPLAY_MS} from '../ui/demoReady.js';
import {highlightHoveredPart} from '../ui/hoverDemonstration.js';
const copy=[
 ['Voir clair dans votre sécurité.','Nous définissons avec vous ce qui doit être examiné et les accès autorisés, pour concentrer l’audit sur votre entreprise.'],
 ['Examiner ce qui compte.','Applications, infrastructures, données et accès : nous regardons les éléments dont dépendent vos activités, dans le périmètre convenu.'],
 ['Repérer les faiblesses.','Nous examinons les configurations et les accès pour identifier les points qui pourraient exposer votre entreprise.'],
 ['Distinguer les faits des incertitudes.','Les constats sont vérifiés et documentés. Vous savez ce qui est confirmé et ce qui demande encore une analyse.'],
 ['Comprendre la portée d’un risque.','Nous rapprochons les constats pour comprendre comment un problème peut affecter plusieurs outils ou données de votre entreprise.'],
 ['Savoir ce qu’il faut corriger.','Ici, un compte possède trop de permissions. Le problème et son impact sont expliqués pour aider votre équipe à décider.'],
 ['Valider un plan d’action clair.','Les corrections sont priorisées et présentées à votre équipe. La mise en œuvre commence après votre approbation.'],
 ['Corriger. Puis vérifier.','Nous ajustons les accès et les configurations, puis vérifions les corrections avec votre équipe. Chaque action reste documentée.'],
 ['Garder une protection à jour.','Le suivi aide à maintenir les mesures en place et à préparer les prochains ajustements à mesure que votre entreprise évolue.']
];

export function mountSecurityPlayback(root){
 if(!root)return()=>{};const calm=matchMedia('(prefers-reduced-motion: reduce)'),readout=root.querySelector('[data-readout]');
 let visible=false,disposed=false,idle=0,frame=0,cursorFrame=0,manualUntil=0,cycle=0,assembling=true,approving=false,last=-1,entered=false,reenter=false,suspendedAt=null;const held=new Set();
 const pointer=document.createElement('span');pointer.className='bump-demo-cursor';pointer.hidden=true;pointer.setAttribute('aria-hidden','true');pointer.innerHTML='<svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg>';
 const ring=document.createElement('i');ring.className='bump-demo-click';ring.hidden=true;ring.setAttribute('aria-hidden','true');root.append(pointer,ring);
 const desk=root.querySelector('[data-desk="0"]')?.closest('[data-i]');
 if(desk){desk.dataset.securityApprove='true';desk.setAttribute('role','button');desk.setAttribute('aria-label','Valider le plan de correction illustratif');desk.setAttribute('tabindex','0');}
 const stage=()=>Number(root.querySelector('[data-step][data-current]')?.dataset.step??0);
 const allowed=()=>visible&&!document.hidden&&!calm.matches&&!disposed&&!held.size&&performance.now()>=manualUntil&&!demoIsPaused(root);
 const control=selector=>root.querySelector(selector)?.click();
 function describe(){const index=stage();root.dataset.securityStage=String(index);if(last===index)return;last=index;root.querySelector('[data-security-number]').textContent=String(index+1).padStart(2,'0');root.querySelector('[data-security-title]').textContent=copy[index][0];root.querySelector('[data-security-detail]').textContent=copy[index][1];}

 const clear=()=>{timer.clear();clearTimeout(idle);idle=0;cancelAnimationFrame(cursorFrame);approving=false;pointer.hidden=true;ring.hidden=true;root.dataset.securityCursor='none';};
 const timer=createDemoTimeout(root,allowed);
 const later=(ms,fn)=>{if(!allowed())return;timer.schedule(ms*.6,fn);};
 const built=()=>[...root.querySelectorAll('[data-intro]')].filter(e=>Number(e.dataset.intro)>=0).every(e=>!e.style.transform&&(!e.style.opacity||Number(e.style.opacity)>.999));
 function restart(){clear();if(!allowed())return;assembling=true;control('[data-reset]');control('[data-replay]');root.dataset.securityCycle=String(++cycle);root.dataset.securityPlaying='true';root.dataset.securityAssembly='true';describe();}
 function pause(){timer.suspend();clearTimeout(idle);idle=0;root.dataset.securityPlaying='false';}
 function point(approach){if(!desk)return;const b=desk.getBoundingClientRect(),h=root.getBoundingClientRect(),x=b.left-h.left+b.width*.5,y=b.top-h.top+b.height*.62;pointer.style.left=(x-(approach?65:0))+'px';pointer.style.top=(y+(approach?40:0))+'px';ring.style.left=(x-11)+'px';ring.style.top=(y-10)+'px';}
 const approve=event=>{if(stage()!==6)return;if(event?.isTrusted){clear();control('[data-step="7"]');advance();return;}control('[data-step="7"]');later(320,()=>{pointer.hidden=true;ring.hidden=true;approving=false;root.dataset.securityCursor='none';advance();});};
 function demonstrationClick(){approving=true;pointer.hidden=false;root.dataset.securityCursor='approach';point(true);cursorFrame=requestAnimationFrame(()=>{cursorFrame=requestAnimationFrame(()=>point(false));});later(motionMilliseconds(650),()=>{ring.hidden=false;root.dataset.securityCursor='click';desk?.dispatchEvent(new MouseEvent('click',{bubbles:true}));});}
 function advance(){describe();if(!allowed()||timer.pending||approving)return;if(assembling){if(!built())return;assembling=false;root.dataset.securityAssembly='false';}
  const text=readout?.textContent||'',index=stage();if(text.includes('→')||text.includes(' · pause'))return;
  if(index===6){later(demoReadingMs(root.querySelector('[data-security-title]').textContent,root.querySelector('[data-security-detail]').textContent),demonstrationClick);return;}if(index===8){later(DEMO_REPLAY_MS,restart);return;}
  later(index===0?DEMO_START_MS:demoReadingMs(root.querySelector('[data-security-title]').textContent,root.querySelector('[data-security-detail]').textContent),()=>control(`[data-step="${index+1}"]`));
 }
 // Only intro transforms and the small readout are observed, never all paths.
 const watch=new MutationObserver(advance);if(readout)watch.observe(readout,{childList:true,subtree:true,characterData:true});
 const assemblyWatch=new MutationObserver(()=>{if(assembling)advance();});for(const el of root.querySelectorAll('[data-intro="5"]'))assemblyWatch.observe(el,{attributes:true,attributeFilter:['style','transform']});
 function scheduleIdle(){clearTimeout(idle);if(disposed||!visible||document.hidden||calm.matches||held.size||demoIsPaused(root))return;idle=setTimeout(()=>{idle=0;if(allowed())restart();else scheduleIdle();},Math.max(0,manualUntil-performance.now()));}
 const onUser=e=>{if(!e.isTrusted)return;if(e.type==='pointerdown'&&!e.target.closest('[data-drawer],[data-security-approve]'))return;if(e.type==='keydown'&&!['ArrowRight','ArrowLeft',' ','Home','Enter','1','2','3','4','5','6','7','8','9'].includes(e.key))return;clear();manualUntil=performance.now()+30000;root.dataset.securityPlaying='false';held.add(e.type==='keydown'?'key-'+e.code:'pointer-'+e.pointerId);scheduleIdle();};
 const release=e=>{if(held.delete(e.type==='keyup'?'key-'+e.code:'pointer-'+e.pointerId))scheduleIdle();};
 const deskKey=e=>{if(stage()===6&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();approve();}};
 const onMotion=()=>{clear();if(calm.matches){assembling=false;root.dataset.securityAssembly='false';control('[data-reset]');control('[data-step="8"]');root.dataset.securityPlaying='false';}else if(visible&&!document.hidden)restart();};
 let stopReady=()=>{};
 const observeReady=()=>{stopReady=observeDemoReady(root,next=>{
  if(next===visible)return;visible=next;
  if(!next){suspendedAt=performance.now();held.clear();pause();return;}
  if(suspendedAt!==null&&manualUntil>suspendedAt)manualUntil+=performance.now()-suspendedAt;
  suspendedAt=null;timer.resume();
  if(!entered||reenter){entered=true;reenter=false;held.clear();manualUntil=0;if(calm.matches){assembling=false;root.dataset.securityAssembly='false';control('[data-reset]');control('[data-step="8"]');root.dataset.securityPlaying='false';}else restart();return;}
  if(manualUntil>performance.now())scheduleIdle();else{root.dataset.securityPlaying=String(!calm.matches&&!demoIsPaused(root));advance();}
 },{onReenter:()=>{reenter=true;}});};
 const stopPause=observeDemoPaused(root,paused=>{if(paused||!visible||calm.matches)return;const button=root.querySelector('[data-pause]');if(button?.getAttribute('aria-pressed')==='true')button.click();if(manualUntil>performance.now())scheduleIdle();else advance();});
 root.addEventListener('pointerdown',onUser,true);root.addEventListener('keydown',onUser,true);desk?.addEventListener('click',approve);desk?.addEventListener('keydown',deskKey);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('keyup',release);calm.addEventListener('change',onMotion);
 frame=requestAnimationFrame(()=>{if(disposed)return;control('[data-reset]');describe();root.dataset.securityReady='true';observeReady();});
 return()=>{disposed=true;clear();stopPause();timer.destroy();cancelAnimationFrame(frame);stopReady();watch.disconnect();assemblyWatch.disconnect();pointer.remove();ring.remove();root.removeEventListener('pointerdown',onUser,true);root.removeEventListener('keydown',onUser,true);desk?.removeEventListener('click',approve);desk?.removeEventListener('keydown',deskKey);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('keyup',release);calm.removeEventListener('change',onMotion);};
}

const domains=[['Applications','Les logiciels et leurs configurations sont examinés dans le périmètre autorisé.'],['Infrastructures','Les serveurs et les environnements qui portent vos activités sont vérifiés.'],['Réseaux','Les connexions sont examinées pour comprendre les chemins d’accès.'],['Données & accès','Les permissions sont vérifiées et limitées aux besoins réels.'],['Utilisateurs','Les comptes et leurs privilèges sont examinés.'],['Services externes','Les dépendances et les accès des services connectés sont pris en compte.']];
export function mountSecurityTooltips(root){
 const svg=root?.querySelector('.iso-stage svg');if(!svg)return()=>{};const drawers=[...svg.querySelectorAll('[data-drawer]')];
 const tip=document.createElement('div');tip.className='bump-workflow-tooltip bump-security-tooltip';tip.id='bump-security-domain-description';tip.setAttribute('role','tooltip');tip.hidden=true;const title=document.createElement('strong'),detail=document.createElement('p');tip.append(title,detail);root.append(tip);let active=-1;
 drawers.forEach(e=>{e.setAttribute('data-bump-info',e.dataset.drawer);e.setAttribute('tabindex','0');e.setAttribute('aria-describedby',tip.id);});
 function hide(){tip.hidden=true;active=-1;highlightHoveredPart(root,null);delete root.dataset.securityInspected;}
 function show(el){if(!el){hide();return;}const i=Number(el.dataset.drawer);if(active===i&&!tip.hidden)return;active=i;highlightHoveredPart(root,el);title.textContent=domains[i][0];detail.textContent=domains[i][1];tip.hidden=false;root.dataset.securityInspected=String(i);const b=el.getBoundingClientRect(),h=root.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(h.width-t.width-8,b.left-h.left+b.width/2-t.width/2))+'px';tip.style.top=Math.max(8,b.top-h.top-t.height-10)+'px';}
 // SVG hit testing already accounts for the painted roof/door occluding a
 // drawer. Bounding rectangles include empty corners and hidden surfaces.
 const move=e=>{if(e.pointerType!=='touch')show(e.target.closest('[data-drawer]'));};const focus=e=>show(e.target.closest('[data-drawer]'));const key=e=>{if(e.key==='Escape')hide();};
 svg.addEventListener('pointermove',move);svg.addEventListener('pointerleave',hide);root.addEventListener('focusin',focus);root.addEventListener('focusout',hide);root.addEventListener('keydown',key);window.addEventListener('scroll',hide,{passive:true});window.addEventListener('resize',hide);
 return()=>{tip.remove();svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerleave',hide);root.removeEventListener('focusin',focus);root.removeEventListener('focusout',hide);root.removeEventListener('keydown',key);window.removeEventListener('scroll',hide);window.removeEventListener('resize',hide);};
}
