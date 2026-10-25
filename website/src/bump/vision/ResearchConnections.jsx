import React, {useState,useRef,useEffect,useLayoutEffect} from 'react';
import {IntegrationBeam} from './IntegrationBeam';
import {mountBeamDemonstration} from './beamDemonstration.js';

const icons={
 crm:'M4 5h16v14H4z M4 10h16 M9 10v9 M7 7.5h.01 M10 7.5h.01',
 erp:'M4 3h16v18H4z M8 7h2 M14 7h2 M8 11h2 M14 11h2 M10 21v-6h4v6',
 data:'M4 6c0-4 16-4 16 0s-16 4-16 0m0 0v12c0 4 16 4 16 0V6 M4 12c0 4 16 4 16 0',
 workflow:'M3 3h6v6H3z M15 15h6v6h-6z M9 6h9v9 M6 9v9h9',
 developer:'m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',
 cyber:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 12l3 3 5-6'
};
function Mark({kind,color}){return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[kind]}/></svg>;}
const tools=[
 {name:'CRM',kind:'crm',color:'#087f63',title:'Les relations, au même endroit.',detail:'Clients, demandes, suivis : partir des informations que vos équipes utilisent déjà.'},
 {name:'ERP',kind:'erp',color:'#356aa5',title:'Comprendre vos opérations.',detail:'Rapprocher les informations de gestion pour mieux comprendre les besoins du terrain.'},
 {name:'Données',kind:'data',color:'#bc791b',title:'Donner du sens aux informations.',detail:'Des formulaires aux systèmes internes, identifier ce qui peut rendre vos outils plus utiles.'},
 {id:'vision-workflow-ai',name:'Workflow AI',kind:'workflow',color:'#087f63',title:'Workflow AI',detail:'Notre ambition : aider les équipes à coordonner leurs tâches et leurs processus, avec une validation humaine.'},
 {id:'vision-developer-ai',name:'Developer AI',kind:'developer',color:'#7f53ad',title:'Developer AI',detail:'Notre ambition : accompagner le développement et l’évolution des logiciels utiles aux entreprises.'},
 {id:'vision-cyber-ai',name:'Cyber AI',kind:'cyber',color:'#c45041',title:'Cyber AI',detail:'Notre ambition : aider à analyser les risques et à suivre les correctifs, sous supervision humaine.'}
];
const nodes=tools.map(tool=>({...tool,logo:<Mark kind={tool.kind} color={tool.color}/>}));
export default function ResearchConnections(){
 const root=useRef(null);
 const [inspected,setInspected]=useState(null);
 useEffect(()=>mountBeamDemonstration(root.current),[]);
 useLayoutEffect(()=>{const node=root.current,parent=node.parentElement;const align=()=>{const b=parent.getBoundingClientRect();node.style.setProperty('--bump-research-offset',(innerWidth>700?innerWidth/2-b.left-b.width/2:0)+'px');};const observer=new ResizeObserver(align);observer.observe(parent);window.addEventListener('resize',align);align();return()=>{observer.disconnect();window.removeEventListener('resize',align);};},[]);
 const current=inspected===null?null:tools[inspected];
 return <section ref={root} className="bump-research" aria-labelledby="bump-research-title" data-bump-fixed-timing="true">
  <header className="bump-research-heading">
   <p className="bump-research-eyebrow">NOTRE AMBITION À LONG TERME</p>
   <h3 id="bump-research-title">Des outils reliés.<br/><em>Des intelligences spécialisées.</em></h3>
   <p>Une vision nourrie par les besoins réels de votre entreprise.</p>
  </header>
  <div className="bump-research-diagram">
   <div className="bump-research-axis" aria-hidden="true"><span>VOTRE RÉALITÉ</span><span>NOTRE VISION</span></div>
   <IntegrationBeam left={nodes.slice(0,3)} right={nodes.slice(3)} center={{name:'Bump',logo:<span className="bump-brand-mark"/>}} onInspect={setInspected} label="Schéma illustratif de notre vision à long terme : relier les outils de l’entreprise à Workflow AI, Developer AI et Cyber AI."/>
  </div>
  <div className="bump-research-explanation" id="vision-infrastructure">
   <h4>{current?.title||'Une infrastructure à construire.'}</h4>
   <p>{current?.detail||'Nous voulons faire émerger des agents spécialisés à partir des solutions développées avec les entreprises.'}</p>
  </div>
 </section>;
}
