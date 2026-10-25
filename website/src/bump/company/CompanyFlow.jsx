import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {observeDemoPaused} from '../ui/demoTransport.js';
import {observeDemoReady} from '../ui/demoReady.js';

// Original React composition based on the public Integration Flow preview.
// No paid source, screenshots, external data or service calls are used.
const items=[
 ['Optimisation','Vos processus','M4 5h6v6H4z M16 13h6v6h-6z M10 8h9v5 M7 11v5h9','#b58a28','Simplifier les étapes qui ralentissent votre équipe.'],
 ['Automatisation','Vos tâches','m13 2-9 12h7l-1 8 10-13h-8z','#b58a28','Confier les tâches répétitives à des systèmes fiables.'],
 ['Logiciel sur mesure','Vos outils','m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18','#23644e','Développer et relier les outils dont vous avez besoin.'],
 ['Intégration IA','Vos données','M12 3 3 8v8l9 5 9-5V8z M3 8l9 5 9-5 M12 13v8','#23644e','Intégrer l’IA dans votre travail, avec votre équipe.'],
 ['Cybersécurité','Vos systèmes','M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 12l3 3 5-6','#bd503d','Comprendre les risques et accompagner les corrections.']
];
const details=[
 'Nous examinons le parcours réel d’une demande, les passages entre équipes et les doubles saisies. Ensemble, nous simplifions les étapes et clarifions les responsabilités pour que le travail avance plus facilement.',
 'Les tâches répétitives suivent des règles définies avec vous : classer un document, mettre à jour un dossier ou prévenir la bonne personne. Votre équipe garde la validation des actions qui demandent son jugement.',
 'Nous concevons un espace adapté à vos opérations, puis le relions à vos outils existants. Vos équipes retrouvent les demandes, les documents et le suivi dont elles ont besoin, sans multiplier les manipulations.',
 'Nous intégrons l’IA là où elle peut aider concrètement : retrouver du contexte, résumer des informations ou préparer une action. Les accès, les règles et les validations humaines sont définis avec votre équipe.',
 'Nous examinons vos applications, vos infrastructures et vos accès dans un périmètre autorisé. Les constats sont expliqués et priorisés, puis nous accompagnons les corrections et leur suivi avec votre équipe.'
];
export default function CompanyFlow(){
 const hold=useRef(null),holdKey=useRef(''),root=useRef(null),pillRefs=useRef([]),hubRef=useRef(null),tooltip=useRef(null),[index,setIndex]=useState(0),[phase,setPhase]=useState('ready'),[active,setActive]=useState(false),[paused,setPaused]=useState(false),[inspected,setInspected]=useState(null),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useLayoutEffect(()=>{if(inspected===null)return;const target=inspected===-1?hubRef.current:pillRefs.current[inspected],tip=tooltip.current;if(!target||!tip)return;const place=()=>{const b=target.getBoundingClientRect(),h=root.current.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(h.width-tip.offsetWidth-8,b.left-h.left+b.width/2-tip.offsetWidth/2))+'px';tip.style.top=Math.max(8,b.top-h.top-tip.offsetHeight-12)+'px';};place();target.addEventListener('transitionend',place);window.addEventListener('resize',place);return()=>{target.removeEventListener('transitionend',place);window.removeEventListener('resize',place);};},[inspected,index]);
 useLayoutEffect(()=>{const node=root.current,parent=node.parentElement;const align=()=>{const b=parent.getBoundingClientRect();node.style.setProperty('--company-flow-offset',(innerWidth>939?innerWidth/2-b.left-b.width/2:0)+'px');};const observer=new ResizeObserver(align);observer.observe(parent);window.addEventListener('resize',align);align();return()=>{observer.disconnect();window.removeEventListener('resize',align);};},[]);
 useEffect(()=>{const node=root.current;let keyboard=false;
  const move=event=>{if(event.pointerType==='touch')return;keyboard=false;const item=event.target.closest?.('.company-flow-pill,.company-flow-hub');if(!item||!node.contains(item))setInspected(null);};
  const key=event=>{if(event.key==='Tab')keyboard=true;};const blur=()=>setInspected(null);
  document.addEventListener('pointermove',move,{capture:true,passive:true});document.addEventListener('keydown',key,true);window.addEventListener('blur',blur);
  return()=>{document.removeEventListener('pointermove',move,true);document.removeEventListener('keydown',key,true);window.removeEventListener('blur',blur);};
 },[]);
 useEffect(()=>observeDemoPaused(root.current,setPaused),[]);
 useEffect(()=>{const node=root.current,inspect=event=>{const item=event.target.closest('.company-flow-pill,.company-flow-hub');if(!item)return;setInspected(event.detail.active?item.classList.contains('company-flow-hub')?-1:items.findIndex(entry=>entry[0]===item.getAttribute('aria-label')):null);};node.addEventListener('bump:demo-inspect',inspect);return()=>node.removeEventListener('bump:demo-inspect',inspect);},[]);
 useEffect(()=>{const stop=observeDemoReady(root.current,next=>{setActive(next);if(!next)setInspected(null);if(next){setIndex(0);setPhase('ready');}}),media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>setReduced(media.matches);media.addEventListener('change',changed);return()=>{stop();media.removeEventListener('change',changed);};},[]);
 useEffect(()=>{if(!active||reduced)return;const key=index+':'+phase;if(holdKey.current!==key){holdKey.current=key;hold.current=null;}if(paused||inspected!==null)return;const delay=hold.current??(phase==='ready'?250:phase==='charge'?350:phase==='beam'?600:800),started=performance.now();const timer=setTimeout(()=>{if(phase==='ready')setPhase('charge');else if(phase==='charge')setPhase('beam');else if(phase==='beam')setPhase('received');else{setIndex(i=>(i+1)%items.length);setPhase('ready');}},delay);return()=>{clearTimeout(timer);hold.current=Math.max(0,delay-(performance.now()-started));};},[active,reduced,phase,index,inspected,paused]);
 return <section ref={root} className="bump-company-flow" data-flow-active={String(active)} data-flow-phase={phase} data-flow-index={index} data-flow-paused={String(paused||inspected!==null)} data-flow-reduced={String(reduced)} data-bump-fixed-timing="true" aria-labelledby="company-flow-title">
  <header><p className="bump-company-flow-eyebrow">UN BESOIN CONCRET. LE BON ACCOMPAGNEMENT.</p><h3 id="company-flow-title">Toutes les expertises.<br/><em>Un même élan.</em></h3></header>
  <div className="bump-company-flow-scene" role="img" aria-label="Les besoins de votre entreprise convergent vers Bump : optimisation, automatisation, logiciels, IA et cybersécurité.">
   <svg viewBox="0 0 1200 650" className="bump-company-flow-paths" aria-hidden="true"><path className="company-flow-orbit" d="M850 -35Q590 325 850 685"/><path className="company-flow-link" d="M510 325H675"/><path className="company-flow-beam" d="M675 325H510" pathLength="100"/></svg>
   <div ref={hubRef} className="company-flow-hub" tabIndex={0} role="group" aria-label="Bump, du besoin à la solution" onPointerEnter={()=>setInspected(-1)} onPointerLeave={()=>setInspected(null)} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setInspected(-1);}} onBlur={()=>setInspected(null)}><div><strong>Bump</strong><span>Du besoin à la solution</span></div><i className="bump-brand-mark"/></div>
   {items.map((item,i)=>{let slot=(i-index+items.length)%items.length;if(slot>2)slot-=items.length;const selected=slot===0;return <div ref={node=>{pillRefs.current[i]=node;}} key={item[0]} className="company-flow-pill" tabIndex={Math.abs(slot)<2?0:-1} role="group" aria-label={item[0]} onPointerEnter={()=>setInspected(i)} onPointerLeave={()=>setInspected(null)} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setInspected(i);}} onBlur={()=>setInspected(null)} data-selected={String(selected)} data-inspected={String(inspected===i)} style={{'--slot':slot,'--pill-x':(840+45*slot*slot)/12+'%','--pill-y':(325+180*slot)/6.5+'%','--pill-accent':item[3],opacity:inspected===i?1:Math.abs(slot)===2?0:Math.abs(slot)===1?.44:1,transition:slot===2?'none':undefined}}><span className="company-flow-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item[2]}/></svg></span><span><strong>{item[0]}</strong><small>{item[1]}</small></span></div>;})}
  </div>
  {inspected!==null&&<div ref={tooltip} className="bump-workflow-tooltip company-flow-tooltip" role="tooltip"><strong>{inspected===-1?'Bump, à vos côtés.':items[inspected][0]}</strong><p>{inspected===-1?'Nous partons de votre besoin et de vos outils pour proposer un accompagnement adapté. De l’audit à l’implantation et à la maintenance, vous avancez avec un plan clair et des décisions prises ensemble.':details[inspected]}</p></div>}
  <div className="bump-company-flow-caption"><h4>{items[index][0]}</h4><p>{items[index][4]}</p></div>
  <button className="bump-company-flow-contact" onClick={()=>window.dispatchEvent(new Event('bump:brief'))}>Parlons de votre projet <span aria-hidden="true">↗</span></button>
 </section>;
}
