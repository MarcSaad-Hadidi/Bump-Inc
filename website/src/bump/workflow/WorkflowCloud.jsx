import {getBumpViewportHeight} from '../ui/viewport.js';
import {demoIsPaused} from '../ui/demoTransport.js';
import {r as React} from '/runtime/assets/components-BdJai906.js';

// A field of actual PME tasks, rather than a catalogue of software products.
const tasks=[
 {name:'demande-client',title:'Chaque demande a une suite.',copy:'Dirigez les nouvelles demandes vers la bonne personne, avec les informations nécessaires pour avancer.',route:'Recevoir → orienter → suivre',x:.51,y:.49,size:51,depth:1},
 {name:'classer-documents',title:'Chaque document trouve sa place.',copy:'Retrouvez vos documents dans le bon dossier. Les pièces incomplètes sont signalées à votre équipe.',route:'Recevoir → classer → vérifier',x:.49,y:.12,size:37,depth:.85},
 {name:'connexion-crm',title:'Une seule saisie, un dossier à jour.',copy:'Reliez vos formulaires au CRM pour reprendre les données utiles et limiter les doubles saisies.',route:'Collecter → vérifier → synchroniser',x:.22,y:.31,size:36,depth:.9},
 {name:'préparer-rapports',title:'Des rapports prêts à être relus.',copy:'Rassemblez vos données pour préparer les rapports dont votre équipe a besoin, avec une étape de vérification.',route:'Rassembler → préparer → relire',x:.42,y:.79,size:38,depth:.85},
 {name:'relances',title:'Le bon rappel, au bon moment.',copy:'Préparez les relances selon vos échéances et vos règles, avec des messages et des destinataires définis ensemble.',route:'Échéance → règle → rappel',x:.78,y:.33,size:32,depth:.75},
 {name:'validations',title:'Votre accord déclenche la suite.',copy:'Gardez la décision sur les étapes sensibles. Le parcours attend votre approbation avant de continuer.',route:'Préparer → décider → continuer',x:.79,y:.63,size:32,depth:.8},
 {name:'suivi-projet',title:'Une même vue pour votre équipe.',copy:'Partagez l’avancement dans les outils utilisés par vos équipes, pour savoir qui doit prendre le relais.',route:'Mettre à jour → partager → avancer',x:.16,y:.60,size:25,depth:.55},
 {name:'synchroniser',title:'Vos outils travaillent ensemble.',copy:'Connectez les logiciels déjà en place avec des échanges adaptés à vos opérations et à vos accès.',route:'Relier → échanger → contrôler',x:.84,y:.10,size:22,depth:.5},
 {name:'exceptions',title:'Un imprévu ne reste pas invisible.',copy:'Une donnée manque ou une connexion échoue : le parcours signale le problème et indique qui doit intervenir.',route:'Détecter → signaler → reprendre',x:.13,y:.08,size:22,depth:.45},
 {name:'vos-processus',title:'Comprendre avant d’automatiser.',copy:'Nous examinons le travail avec votre équipe pour repérer les étapes à simplifier avant de les automatiser.',route:'Observer → analyser → simplifier',x:.11,y:.87,size:23,depth:.5},
 {name:'factures',title:'Des factures prêtes à vérifier.',copy:'Réunissez les pièces et les données utiles à la comptabilité, avec les validations nécessaires avant la suite.',route:'Réunir → rapprocher → vérifier',x:.88,y:.88,size:23,depth:.5},
 {name:'vos-équipes',title:'Une solution que vos équipes comprennent.',copy:'Nous intégrons vos outils, expliquons le parcours et documentons les automatisations pour faciliter la prise en main.',route:'Intégrer → documenter → accompagner',x:.56,y:.98,size:27,depth:.6}
];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function useCloudMotion(root,active){
 const current=React.useRef(active),draw=React.useRef(()=>{});
 current.current=active;
 React.useLayoutEffect(()=>{
  const field=root.current;if(!field)return;
  const items=[...field.querySelectorAll('.bump-task')],media=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,visible=false,following=false,pointer={x:.5,y:.5};
  const render=()=>{
   frame=0;if(!visible||demoIsPaused(field))return;
   const bounds=field.getBoundingClientRect(),w=field.clientWidth,mobile=w<700;
   field.dataset.layout=mobile?'vertical':'field';
   const h=field.clientHeight;
   const follow=following&&!mobile&&!media.matches;
   field.dataset.following=String(follow);
   const progress=clamp((getBumpViewportHeight()-bounds.top)/(h+getBumpViewportHeight()),0,1);
   field.style.setProperty('--cloud-scale',clamp(w/1100,.65,1.08));
   const boxes=items.map((el,i)=>{
    const task=tasks[i],button=el.firstElementChild,isActive=i===current.current;
    // The source field has a cursor-centred lens even between commands.
    // Calibrate its depth to the already oversized Bump typography.
    const distance=Math.hypot((pointer.x-task.x)*w,(pointer.y-task.y)*h),near=clamp(1-distance/clamp(w*.46,340,580),0,1),focus=near*near*(3-2*near);
    const peak=task.size>45?1.08:task.size>35?1.24:1.42;
    const scale=follow&&current.current===null ? .76+(peak-.76)*focus : 1;
    const width=button.offsetWidth*scale,height=button.offsetHeight*scale;
    const motion=media.matches?0:1;
    const x=mobile?w*(i%2?.76:.24):w*task.x+(pointer.x-.5)*task.depth*(follow?58:16)*motion;
    const y=mobile?30+Math.floor(i/2)*(h-60)/5:35+task.y*(h-70)+(progress-.5)*task.depth*24*motion+(pointer.y-.5)*task.depth*(follow?24:8)*motion;
    const ink=isActive?1:follow?.46+.54*focus:.42+task.depth*.4;
    return {el,x,y,w:width,h:height,scale,ink,active:isActive};
   });
   // In a shorter vertical field, leave room for all preceding/following labels
   // before pinning the open explanation for the collision pass.
   if(mobile){
    const index=boxes.findIndex(box=>box.active);
    if(index>=0){
     const selected=boxes[index];selected.x=w/2;selected.y=clamp(selected.y,selected.h/2+8,h-selected.h/2-8);
    }
   }
   // Keep every label readable when its neighbour unfolds. No overlay or scroll lock.
   for(let pass=0;pass<16;pass++){
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
     const a=boxes[i],b=boxes[j],dx=b.x-a.x,dy=b.y-a.y;
     const ox=(a.w+b.w)/2+(mobile?8:25)-Math.abs(dx),oy=(a.h+b.h)/2+(mobile?12:25)-Math.abs(dy);
     if(ox<=0||oy<=0)continue;
     const vertical=oy<ox,sign=(vertical?dy:dx)>=0?1:-1;
     const push=(vertical?oy:ox)+1,aw=a.active?0:b.active?1:.5,bw=b.active?0:a.active?1:.5;
     if(vertical){a.y-=sign*push*aw;b.y+=sign*push*bw;}else{a.x-=sign*push*aw;b.x+=sign*push*bw;}
    }
    for(const b of boxes){b.x=clamp(b.x,b.w/2+3,w-b.w/2-3);b.y=clamp(b.y,b.h/2+5,h-b.h/2-5);}
   }
   for(const b of boxes){b.el.style.transform=`translate3d(${b.x}px,${b.y}px,0) translate(-50%,-50%)`;b.el.style.setProperty('--task-scale',b.scale);b.el.style.setProperty('--task-ink',b.ink);}

  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
  draw.current=schedule;
  const scroll=schedule;
  const move=e=>{if(e.pointerType==='touch')return;following=true;const b=field.getBoundingClientRect();pointer={x:(e.clientX-b.left)/b.width,y:(e.clientY-b.top)/b.height};schedule();};
  const leave=()=>{following=false;pointer={x:.5,y:.5};schedule();};
  const resize=new ResizeObserver(schedule);resize.observe(field);items.forEach(el=>resize.observe(el.firstElementChild));
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)scroll();},{rootMargin:'120px'});observer.observe(field);
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',schedule);media.addEventListener('change',schedule);
  field.addEventListener('pointermove',move);field.addEventListener('pointerleave',leave);
  document.fonts.ready.then(schedule);
  return()=>{draw.current=()=>{};cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();window.removeEventListener('scroll',scroll);window.removeEventListener('resize',schedule);media.removeEventListener('change',schedule);field.removeEventListener('pointermove',move);field.removeEventListener('pointerleave',leave);};
 },[root]);
 React.useLayoutEffect(()=>{draw.current();},[active]);
}

const emojiFiles=['pouce','confirmer','applaudir','confettis','elan'];
const emojiPaths=[[-46,-150,-18,.8],[38,-125,14,.75],[-12,-190,-8,.95],[63,-154,24,.72],[-65,-110,-12,.9],[16,-210,9,.8],[0,-170,-17,.7]];
function EmojiBurst({burst,onComplete}){
 return <span className="bump-task-particles" aria-hidden="true" style={{left:burst.x,top:burst.y}}>{emojiPaths.map(([x,y,rotate,scale],i)=><img key={i} src={'/bump/emoji/'+emojiFiles[(burst.task+i*2)%emojiFiles.length]+'.webp'} alt="" width="40" height="40" data-last={i===emojiPaths.length-1} style={{'--emoji-x':x+'px','--emoji-y':y+'px','--emoji-rotate':rotate+'deg','--emoji-scale':scale,'--emoji-delay':i*.1+'s','--emoji-duration':1.35+i*.07+'s'}} onAnimationEnd={e=>{if(e.currentTarget.dataset.last==='true')onComplete(burst.id);}}/>)}</span>;
}

export function WorkflowCloud(){
 const root=React.useRef(null),inputMode=React.useRef('pointer'),serial=React.useRef(0),lastActive=React.useRef(null),[active,setActive]=React.useState(null),[bursts,setBursts]=React.useState([]);
 lastActive.current=active;
 const activate=(index,button)=>{
  if(lastActive.current!==index&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const field=root.current.getBoundingClientRect(),label=button.querySelector('.bump-task-command').getBoundingClientRect();
   const burst={id:++serial.current,task:index,x:clamp(label.left-field.left+label.width*.7,85,field.width-85),y:label.top-field.top+10};
   setBursts(previous=>[...previous,burst].slice(-4));
  }
  lastActive.current=index;setActive(index);
 };
 const dismiss=()=>{lastActive.current=null;setActive(null);};
 useCloudMotion(root,active);
 React.useEffect(()=>{
  // Use the actual pointer target, not just enter/leave on a moving label.
  // Mouse clicks must never turn a temporary hover into a persistent selection.
  const move=e=>{
   if(e.pointerType==='touch')return;
   inputMode.current='pointer';
   const button=e.target.closest?.('.bump-task>button');
   if(!button||!root.current?.contains(button))dismiss();
  };
  const keyboard=e=>{if(e.key==='Tab'||e.key.startsWith('Arrow'))inputMode.current='keyboard';};
  const leave=()=>{if(inputMode.current==='pointer')dismiss();};
  document.addEventListener('pointermove',move,{passive:true,capture:true});
  document.addEventListener('keydown',keyboard,true);
  document.documentElement.addEventListener('pointerleave',leave);
  window.addEventListener('blur',leave);
  return()=>{document.removeEventListener('pointermove',move,true);document.removeEventListener('keydown',keyboard,true);document.documentElement.removeEventListener('pointerleave',leave);window.removeEventListener('blur',leave);};
 },[]);
 React.useEffect(()=>{
  if(active===null)return;
  const outside=e=>{if(!e.target.closest?.('.bump-task'))dismiss();};
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[active]);
 return <section className="bump-task-cloud" aria-labelledby="bump-task-cloud-title">
  <div className="bump-task-cloud-intro"><p className="bump-lab-label">LES POSSIBILITÉS PARTENT DE VOTRE QUOTIDIEN</p><h3 id="bump-task-cloud-title">Ce qui vous ralentit<br/>peut devenir <em>un raccourci.</em></h3><p>Vos demandes, vos documents, vos outils. Nous relions ce qui existe et simplifions ce qui se répète, avec votre équipe.</p></div>
  <div className="bump-task-field" ref={root} onPointerLeave={e=>{if(e.pointerType!=='touch')dismiss();}} onKeyDown={e=>{if(e.key==='Escape')dismiss();}}>
   <ul aria-label="Exemples de processus à simplifier">{tasks.map((task,i)=><li className="bump-task" data-active={active===i} key={task.name} style={{'--task-size':task.size+'px','--task-depth':task.depth}}>
    <button type="button" aria-expanded={active===i} aria-controls={'bump-task-detail-'+i} onPointerDown={e=>{inputMode.current=e.pointerType==='touch'?'touch':'pointer';}} onPointerEnter={e=>{if(e.pointerType!=='touch'){inputMode.current='pointer';activate(i,e.currentTarget);}}} onPointerLeave={e=>{if(e.pointerType!=='touch')dismiss();}} onFocus={e=>{if(inputMode.current==='keyboard'&&e.currentTarget.matches(':focus-visible'))activate(i,e.currentTarget);}} onBlur={dismiss} onClick={e=>{if(inputMode.current==='touch'){if(active===i)dismiss();else activate(i,e.currentTarget);}else if(e.detail===0){inputMode.current='keyboard';activate(i,e.currentTarget);}}}>
     <span className="bump-task-command">/{task.name}</span>
     <span id={'bump-task-detail-'+i} className="bump-task-detail" aria-hidden={active!==i}><span><strong>{task.title}</strong><span className="bump-task-description">{task.copy}</span><span className="bump-task-route">{task.route}</span></span></span>
    </button>
   </li>)}</ul>
   {bursts.map(burst=><EmojiBurst key={burst.id} burst={burst} onComplete={id=>setBursts(previous=>previous.filter(b=>b.id!==id))}/>)}
  </div>
  <p className="bump-task-cloud-note">Des exemples de mandats, conçus autour de vos opérations.<span>Survolez un raccourci ou explorez-le au toucher.</span></p>
 </section>;
}
