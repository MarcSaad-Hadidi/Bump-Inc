import {DeferredMachine} from '../machines/DeferredMachine.jsx';
import{DemoCursor}from'../ui/DemoCursor.jsx';
import React,{useEffect,useId,useRef,useState} from 'react';
import {AnimatePresence,MotionConfig,motion} from 'motion/react';
import NumberFlow from '@number-flow/react';
import {Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,Pie,PieChart,XAxis,YAxis} from 'recharts';
import {ShieldCheck,Server,Code2,Users,FileText,Home,ChevronDown,ArrowDown,ArrowUpRight,ArrowRight,CheckCircle2,AlertTriangle,Activity,FileCheck2,Clock3,Settings2,X} from 'lucide-react';
import {Card,Badge,Button,Switch,Checkbox,Progress,Tabs,TabsList,TabsTrigger,TabsContent,ChartContainer,ChartTooltip,ChartTooltipContent} from './primitives.jsx';
import {DOMAINS,FINDINGS,RISK_DATA} from './data.js';
import {useSecurityScenario} from './useSecurityScenario.js';
import {SecurityOrbitSystem} from './SecurityOrbitSystem.jsx';

// Each visible click and its React state change share a clock checkpoint. The
// demonstration never dispatches DOM events, which would count as user activity.
const selectedDomains=count=>DOMAINS.map((_,i)=>i<count);
const SCOPE_INITIAL={route:'overview',tab:'scope',selected:selectedDomains(0),started:null,detail:null};
const SCOPE_STEPS=[
 [1100,{route:'applications'}],...DOMAINS.map((_,i)=>[2300+i*900,{selected:selectedDomains(i+1)}]),
 [8100,{tab:'analysis',started:8100}],[14200,{route:'infrastructure'}],[15400,{detail:0}],
 [16600,{detail:null}],[17800,{route:'applications'}],[19000,{route:'reports'}],[20500,{route:'applications'}]
];
const FINDING_INITIAL={route:'overview',period:'half',periodOpen:false,filter:'all',filterOpen:false,selected:null,detail:null};
const FINDING_STEPS=[
 [1100,{route:'findings'}],[2600,{periodOpen:true}],[3600,{period:'month',periodOpen:false}],
 [4800,{filterOpen:true}],[5800,{filter:'Élevée',filterOpen:false}],[7000,{selected:FINDINGS[0]}],
 [8600,{selected:null}],[9800,{filterOpen:true}],[10800,{filter:'all',filterOpen:false}],
 [12000,{route:'access'}],[13200,{detail:0}],[14400,{detail:null}],[15600,{route:'findings'}],
 [16800,{route:'reports'}],[18300,{route:'findings'}]
];
const CORRECTION_TASKS=['Renforcer l’authentification','Mettre à jour les versions','Restreindre les accès','Chiffrer les données sensibles'];
const CORRECTION_INITIAL={route:'findings',tab:'plan',done:CORRECTION_TASKS.map(()=>false),detail:null};
const CORRECTION_STEPS=[
 [1100,{route:'correction'}],...CORRECTION_TASKS.map((_,i)=>[2400+i*1400,{done:CORRECTION_TASKS.map((_,n)=>n<=i)}]),
 [8000,{tab:'log'}],[9600,{tab:'plan'}],[10800,{route:'reports'}],[12400,{route:'correction'}]
];
const MONITOR_INITIAL={route:'overview',period:'half',periodOpen:false,enabled:true,detail:null};
const MONITOR_STEPS=[
 [1100,{route:'monitor'}],[2600,{periodOpen:true}],[3600,{period:'month',periodOpen:false}],
 [5000,{enabled:false}],[6500,{enabled:true}],[7900,{periodOpen:true}],[8900,{period:'half',periodOpen:false}],
 [10300,{route:'infrastructure'}],[11500,{detail:0}],[12700,{detail:null}],[13900,{route:'monitor'}],
 [15100,{route:'reports'}],[16600,{route:'monitor'}]
];
const checkpoints=(steps,extra,end)=>[...new Set([...steps.map(([at])=>at),...extra,end])].sort((a,b)=>a-b);
const SCOPE_TIMES=checkpoints(SCOPE_STEPS,[8800,9600,10400,11200,12000,12800],21800);
const FINDING_TIMES=checkpoints(FINDING_STEPS,[1600,2100,2500],19600);
const CORRECTION_TIMES=checkpoints(CORRECTION_STEPS,[],13800);
const MONITOR_TIMES=checkpoints(MONITOR_STEPS,[1700,2400,3800,7100,9300,10100],18000);
const SEVERITY=[{name:'Critiques',value:3,color:'#c3313d'},{name:'Élevées',value:5,color:'#d8733b'},{name:'Moyennes',value:11,color:'#c5a453'},{name:'Faibles',value:5,color:'#78a28c'}];
const PERIODS=[['half','6 derniers mois'],['month','30 derniers jours']];
const NAV={
 overview:['Vue d’ensemble',Home],applications:['Applications',Code2,12],infrastructure:['Infrastructures',Server,8],
 access:['Accès',Users,147],findings:['Vulnérabilités',ShieldCheck,24],correction:['Corrections',Settings2,4],monitor:['Surveillance',Activity],reports:['Rapports',FileText]
};
const NAV_ROUTES={scope:['overview','applications','infrastructure','access','findings','reports'],findings:['overview','applications','infrastructure','access','findings','reports'],correction:['overview','applications','access','findings','correction','reports'],monitor:['overview','infrastructure','access','correction','monitor','reports']};
const LOCAL_PAGES={
 overview:{title:'Vue d’ensemble',subtitle:'Périmètre autorisé · Entreprise de démonstration',items:[['Applications et systèmes','12 applications · 8 environnements','Le périmètre regroupe les outils et les systèmes autorisés.'],['Accès et identités','147 comptes suivis','Les permissions sont examinées avec les responsables de chaque équipe.'],['Constats et prochaines actions','24 constats documentés','Les risques sont priorisés avant la mise en œuvre des corrections.']]},
 applications:{title:'Applications',subtitle:'12 systèmes dans le périmètre autorisé',items:[['CRM · Production','Application métier · Équipe commerciale','Le CRM fait partie du périmètre autorisé. Ses accès et sa configuration sont documentés.'],['Portail RH','Application interne · Équipe RH','Les données sensibles et les autorisations sont vérifiées avec l’équipe responsable.'],['Espace client','Application Web · Production','L’application est suivie dans le même plan de vérification.']]},
 infrastructure:{title:'Infrastructures',subtitle:'8 environnements · Montréal',items:[['Serveur Web · MTL-01','Production · 1 constat à examiner','Un accès trop large sur ce serveur demande une restriction des permissions, puis un contrôle.'],['Serveur de données · MTL-02','Production · Vérification documentée','La configuration et les accès ont été documentés dans le périmètre autorisé.'],['Environnement de préproduction','Tests · Périmètre autorisé','Les changements peuvent être préparés et vérifiés avec l’équipe avant la mise en production.']]},
 access:{title:'Accès & identités',subtitle:'147 comptes · Permissions documentées',items:[['Comptes à privilèges','12 comptes à examiner','Les droits de ces comptes dépassent leur rôle. Le plan prévoit de réduire les accès et de renforcer l’authentification.'],['Comptes de service','18 comptes suivis','Chaque compte de service est associé à un usage et à une équipe responsable.'],['Membres de l’équipe','117 comptes documentés','Les autorisations sont révisées avec les responsables des systèmes.']]},
 findings:{title:'Vulnérabilités',subtitle:'Constats documentés et priorisés',items:FINDINGS.slice(0,3).map(f=>[f.title,f.risk+' · '+f.domain,f.impact+' '+f.action])},
 correction:{title:'Corrections',subtitle:'4 actions suivies avec votre équipe',items:CORRECTION_TASKS.slice(0,3).map(task=>[task,'Action priorisée · Contrôle prévu','La mise en œuvre est préparée avec l’équipe responsable, puis son résultat est vérifié et documenté.'])},
 monitor:{title:'Surveillance',subtitle:'Évolution du périmètre et contrôles de suivi',items:[['Indice de risque','38 / 100 · Dernière mise à jour : aujourd’hui','L’indice illustratif permet de suivre les constats encore ouverts et les corrections vérifiées.'],['Contrôles de suivi','Surveillance active','Les mesures sont revérifiées au fil des changements du périmètre.'],['Bilan de protection','Rapport disponible','Les indicateurs et les prochaines étapes sont réunis dans un bilan local.']]}
};

function useDemoJourney(scenario,initial,steps){
 const[manual,setManual]=useState(null);
 const automatic=steps.reduce((state,[at,patch])=>scenario.time>=at?{...state,...patch}:state,initial);
 const value=manual??automatic;
 return {value,isManual:manual!==null,change:patch=>{scenario.pause();setManual({...value,...patch});},reset:()=>setManual(null)};
}
function Brand(){return <span className="bsc-brand"><img src="/bump/brand/bump-symbol.png" alt=""/>Bump<ChevronDown/></span>;}
function DemoSelect({name,label,value,options,open,onOpenChange,onValueChange}){
 const id=useId(),root=useRef(null),trigger=useRef(null);
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))onOpenChange(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open,onOpenChange]);
 function keydown(e){if(e.key==='Escape'){e.preventDefault();onOpenChange(false);trigger.current?.focus();}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open){onOpenChange(true);requestAnimationFrame(()=>root.current?.querySelector('[role="option"][aria-selected="true"]')?.focus());}else{const buttons=[...root.current.querySelectorAll('[role="option"]')],current=buttons.indexOf(document.activeElement),next=(current+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}}}
 return <div className="bsc-select" ref={root} onKeyDown={keydown} onBlur={e=>{if(open&&!e.currentTarget.contains(e.relatedTarget))onOpenChange(false);}}>
  <button type="button" ref={trigger} className="bsc-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} data-demo-select={name} onClick={()=>onOpenChange(!open)}>{options.find(([key])=>key===value)?.[1]}<ChevronDown/></button>
  {open&&<div className="bsc-select-options" id={id} role="listbox" aria-label={label}>{options.map(([key,text])=><button key={key} type="button" role="option" aria-selected={key===value} data-demo-option={name+':'+key} onClick={()=>{onValueChange(key);trigger.current?.focus();}}>{text}{key===value&&<CheckCircle2/>}</button>)}</div>}
 </div>;
}
function LocalPage({route,detail,onDetail}){
 const page=LOCAL_PAGES[route]??LOCAL_PAGES.overview,selected=detail===null?null:page.items[detail];
 return <div className="bsc-local-page"><div className="bsc-local-summary"><ShieldCheck/><span><strong>Périmètre documenté</strong><small>Les informations restent dans cette démonstration.</small></span><Badge tone="neutral">Illustratif</Badge></div><div className="bsc-local-list">{page.items.map(([title,meta],i)=><button key={title} type="button" data-local-item={i} onClick={()=>onDetail(i)}><span><strong>{title}</strong><small>{meta}</small></span><ArrowRight/></button>)}</div>{selected&&<div className="bsc-finding-detail bsc-local-detail" role="region" aria-label={'Détail : '+selected[0]}><button type="button" data-demo-action="close-local-detail" aria-label="Fermer le détail" onClick={()=>onDetail(null)}><X/></button><Badge tone="neutral">Périmètre illustratif</Badge><strong>{selected[0]}</strong><p>{selected[2]}</p><span><ShieldCheck/>Un constat clair et une prochaine action documentée.</span></div>}</div>;
}
function ReportPage({report,onClose}){
 return <div className="bsc-local-report"><button type="button" data-demo-action="close-report" className="bsc-panel-close" aria-label="Fermer le résumé du rapport" onClick={onClose}><X/></button><FileCheck2/><Badge tone="green">Rapport illustratif</Badge><h5>{report.title}</h5><p>{report.description}</p><dl>{report.items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><span><ShieldCheck/>Les constats, les actions et leur vérification restent réunis.</span></div>;
}
function AppFrame({kind,home,title,subtitle,action,journey,report,children}){
 const {route,detail}=journey.value,primary=route===home,page=LOCAL_PAGES[route]??LOCAL_PAGES.overview;
 const navigate=next=>journey.change({route:next,detail:null,...(kind==='findings'?{selected:null}:{}),periodOpen:false,filterOpen:false});
 return <Card className={'bsc-ui bsc-app bsc-app--'+kind} data-local-view={route}>
  <aside className="bsc-app-rail" aria-label="Navigation de la démonstration de sécurité"><Brand/><nav>{NAV_ROUTES[kind].map(key=>{const[label,Icon,count]=NAV[key];return <button type="button" key={key} data-demo-nav={key} aria-label={label} aria-current={route===key?'page':undefined} onClick={()=>navigate(key)}><Icon/><span>{label}</span>{count&&<small>{count}</small>}</button>;})}</nav><span className="bsc-rail-note"><ShieldCheck/>Espace de démonstration</span></aside>
  <div className="bsc-app-body"><header className="bsc-app-heading"><div><h4>{primary?title:route==='reports'?'Rapports':page.title}</h4><small>{primary?subtitle:route==='reports'?'Périmètre, constats et prochaines actions':page.subtitle}</small></div>{primary&&action}</header>
   {route==='reports'?<ReportPage report={report} onClose={()=>navigate(home)}/>:primary?children:<LocalPage route={route} detail={detail} onDetail={value=>journey.change({detail:value})}/>}
  </div>
 </Card>;
}
function DemoFooter({scenario}){return <div className="bsc-demo-footer"><span><i/>{scenario.finished?'Scénario terminé':scenario.active?'Démonstration en cours':'Scénario illustratif'}</span></div>;}
function AnimatedNumber({value,reduced,...props}){return <NumberFlow value={value} locales="fr-CA" animated={!reduced} {...props}/>;}

function AuditDemo({api}){
 const scenario=useSecurityScenario(1,SCOPE_TIMES,21800),t=scenario.time,journey=useDemoJourney(scenario,SCOPE_INITIAL,SCOPE_STEPS);
 const {selected,tab:view,started}=journey.value,count=selected.filter(Boolean).length;
 const progress=started===null?0:Math.min(100,Math.round(Math.max(0,t-started)/4700*100));
 function replay(){journey.reset();scenario.replay();}
 useEffect(()=>{scenario.replayHandler.current=replay;api.current={replay,show:()=>{journey.reset();scenario.seek(6800,false);}};});
 const report={title:'Rapport de périmètre',description:'Le périmètre autorisé, les systèmes examinés et les constats sont réunis dans un même suivi.',items:[['Domaines inclus',count+' / 6'],['Systèmes autorisés','20'],['Analyse',progress===100?'Complétée':progress+' %'],['Constats documentés','24']]};
 const actions=[{at:1100,selector:'[data-demo-nav="applications"]'},...DOMAINS.map((domain,i)=>({at:2300+i*900,selector:`[aria-label="Inclure ${domain.title}"]`})),{at:8100,selector:'[data-demo-action="launch-audit"]'},{at:14200,selector:'[data-demo-nav="infrastructure"]'},{at:15400,selector:'[data-local-item="0"]'},{at:16600,selector:'[data-demo-action="close-local-detail"]'},{at:17800,selector:'[data-demo-nav="applications"]'},{at:19000,selector:'[data-demo-nav="reports"]'},{at:20500,selector:'[data-demo-action="close-report"]'}];
 return <div className="bsc-demo" ref={scenario.root} data-security="scope" data-time={t} data-playing={scenario.active}>
  <DemoCursor scenario={scenario} actions={actions}/>
  <AppFrame kind="scope" home="applications" journey={journey} report={report} title="Audit de sécurité" subtitle={view==='scope'?'Définir un périmètre autorisé':'Périmètre : applications & systèmes de l’équipe'} action={<Button data-demo-action="launch-audit" disabled={count===0} onClick={()=>{journey.change({tab:'analysis',started:8100});scenario.seek(8100,true);}}>Lancer un audit <ArrowUpRight/></Button>}>
   <Tabs value={view} onValueChange={value=>journey.change({tab:value})} className="bsc-audit-tabs"><TabsList aria-label="Vues de l’audit"><TabsTrigger value="scope">Périmètre</TabsTrigger><TabsTrigger value="analysis">Analyse</TabsTrigger></TabsList>
    <TabsContent value="scope"><div className="bsc-scope-heading"><strong>Environnements à inclure</strong><Badge tone="neutral">{count} / 6 domaines</Badge></div><div className="bsc-scope-grid">{DOMAINS.map((domain,i)=>{const Icon=domain.icon;return <label key={domain.id} className="bsc-scope-option"><Icon/><span><strong>{domain.title}</strong><small>{domain.detail}</small></span><Switch checked={selected[i]} onCheckedChange={checked=>journey.change({selected:selected.map((v,n)=>n===i?checked:v)})} aria-label={'Inclure '+domain.title}/></label>;})}</div><div className="bsc-scope-progress"><Progress value={count/6*100} label="Préparation du périmètre"/><span>{count===6?'Périmètre défini':'Préparation du périmètre'}<AnimatedNumber value={Math.round(count/6*100)} suffix=" %" reduced={scenario.reduced}/></span></div></TabsContent>
    <TabsContent value="analysis"><div className="bsc-audit-kpis">{[['Applications',12,0],['Infrastructures',8,1],['Accès',147,2],['Expositions',24,-1]].map(([label,value,index])=><Card key={label}><span>{label}</span><div><AnimatedNumber value={index<0?(progress>=80?value:0):selected[index]?Math.round(value*progress/100):0} reduced={scenario.reduced}/>{index<0?<AlertTriangle/>:progress===100?<CheckCircle2/>:<Activity/>}</div><small data-alert={index<0}>{index<0?'À examiner':progress===100?'100 % analysés':'Vérification en cours'}</small></Card>)}</div><div className="bsc-audit-results"><strong>Dernières analyses</strong>{['CRM · Production','Serveurs · Montréal','Portail RH'].map((name,i)=><div key={name}>{progress>=35+i*25?<CheckCircle2/>:<Clock3/>}<strong>{name}</strong><span>{progress>=35+i*25?'Analyse terminée':'Analyse en cours…'}</span><small>{i===2?'2 constats à examiner':'Constats documentés'}</small></div>)}</div><div className="bsc-audit-progress"><Progress value={progress} label="Progression de l’analyse illustrative"/><span>{progress===100?'Périmètre défini · analyse complétée':`Analyse du périmètre · ${progress} %`}</span></div></TabsContent>
   </Tabs>
  </AppFrame><DemoFooter scenario={scenario}/>
 </div>;
}

function FindingsDemo({api}){
 const scenario=useSecurityScenario(2,FINDING_TIMES,19600),t=scenario.time,journey=useDemoJourney(scenario,FINDING_INITIAL,FINDING_STEPS);
 const {filter,selected,period,periodOpen,filterOpen}=journey.value,collect=journey.isManual?1:Math.min(1,Math.max(0,t-1100)/1400),count=journey.isManual?4:Math.min(4,Math.max(0,Math.floor((t-1100)/350)+1));
 const rows=FINDINGS.slice(0,count).filter(f=>filter==='all'||f.risk===filter);
 const bars=['Jan','Fév','Mar','Avr','Mai','Juin'].map((date,i)=>({date,remaining:Math.round([7,10,12,15,9,12][i]*collect),resolved:Math.round([5,10,15,13,13,17][i]*collect)}));
 function replay(){journey.reset();scenario.replay();}
 useEffect(()=>{scenario.replayHandler.current=replay;api.current={replay,show:()=>{journey.reset();scenario.seek(7000,false);}};});
 const report={title:'Rapport de vulnérabilités',description:'Les problèmes sont classés par niveau de risque, avec leur impact et une recommandation concrète.',items:[['Constats documentés','24'],['Critiques et élevés','8'],['Extraits consultables','4'],['Prochaine étape','Planifier les corrections']]};
 const actions=[{at:1100,selector:'[data-demo-nav="findings"]'},{at:2600,selector:'[data-demo-select="finding-period"]'},{at:3600,selector:'[data-demo-option="finding-period:month"]'},{at:4800,selector:'[data-demo-select="risk-filter"]'},{at:5800,selector:'[data-demo-option="risk-filter:Élevée"]'},{at:7000,selector:'[data-finding="B-024"]'},{at:8600,selector:'[data-demo-action="close-finding"]'},{at:9800,selector:'[data-demo-select="risk-filter"]'},{at:10800,selector:'[data-demo-option="risk-filter:all"]'},{at:12000,selector:'[data-demo-nav="access"]'},{at:13200,selector:'[data-local-item="0"]'},{at:14400,selector:'[data-demo-action="close-local-detail"]'},{at:15600,selector:'[data-demo-nav="findings"]'},{at:16800,selector:'[data-demo-nav="reports"]'},{at:18300,selector:'[data-demo-action="close-report"]'}];
 return <div className="bsc-demo" ref={scenario.root} data-security="findings" data-time={t} data-playing={scenario.active}>
  <DemoCursor scenario={scenario} actions={actions}/>
  <AppFrame kind="findings" home="findings" journey={journey} report={report} title="Analyse des vulnérabilités" subtitle="Constats documentés et priorisés" action={<DemoSelect name="finding-period" label="Période d’analyse" value={period} options={PERIODS} open={periodOpen} onOpenChange={value=>journey.change({periodOpen:value,filterOpen:false})} onValueChange={value=>journey.change({period:value,periodOpen:false})}/>}>
   <div className="bsc-findings-charts"><div className="bsc-severity"><div className="bsc-donut"><ChartContainer label="24 vulnérabilités : 3 critiques, 5 élevées, 11 moyennes, 5 faibles"><PieChart><Pie data={SEVERITY.map(s=>({...s,value:Math.round(s.value*collect)}))} dataKey="value" nameKey="name" innerRadius="69%" outerRadius="96%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={scenario.active&&!scenario.reduced} animationDuration={500}>{SEVERITY.map(s=><Cell key={s.name} fill={s.color}/>)}</Pie></PieChart></ChartContainer><span><AnimatedNumber value={Math.round(24*collect)} reduced={scenario.reduced}/><small>vulnérabilités</small></span></div><ul>{SEVERITY.map(s=><li key={s.name}><i style={{background:s.color}}/><span>{s.name}</span><AnimatedNumber value={Math.round(s.value*collect)} reduced={scenario.reduced}/></li>)}</ul></div><Card className="bsc-trend-chart"><strong>Tendance</strong><ChartContainer label="Évolution des constats documentés et résolus"><BarChart data={period==='half'?bars:bars.map((v,i)=>({...v,date:String(1+i*5)}))} margin={{top:8,right:4,left:-30,bottom:0}}><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:8,fill:'#76786f'}}/><YAxis hide/><Bar dataKey="remaining" name="À examiner" stackId="risk" fill="#26705a" radius={[0,0,0,0]} isAnimationActive={scenario.active&&!scenario.reduced}/><Bar dataKey="resolved" name="Documentés" stackId="risk" fill="#d8d8cf" radius={[1,1,0,0]} isAnimationActive={scenario.active&&!scenario.reduced}/><ChartTooltip content={<ChartTooltipContent/>}/></BarChart></ChartContainer></Card></div>
   <div className="bsc-findings-heading"><strong>Vulnérabilités prioritaires</strong><DemoSelect name="risk-filter" label="Filtrer par niveau de risque" value={filter} options={[["all","Toutes"],["Élevée","Élevée"],["Moyenne","Moyenne"],["Faible","Faible"]]} open={filterOpen} onOpenChange={value=>journey.change({filterOpen:value,periodOpen:false})} onValueChange={value=>journey.change({filter:value,filterOpen:false,selected:null})}/></div>
   <div className="bsc-findings-list"><AnimatePresence initial={false}>{rows.map(f=><motion.button type="button" key={f.id} data-finding={f.id} layout initial={scenario.reduced?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} aria-expanded={selected?.id===f.id} onClick={()=>journey.change({selected:selected?.id===f.id?null:f})}><i className={'bsc-risk-dot is-'+f.tone}/><span><strong>{f.title}</strong><small>{f.detail}</small></span><Badge tone={f.tone}>{f.risk}</Badge><span className="bsc-finding-domain">{f.domain}</span><ArrowRight/></motion.button>)}</AnimatePresence>{rows.length===0&&<p className="bsc-empty">{t<1100?'Les constats apparaîtront ici.':'Aucun constat de ce niveau dans cet extrait.'}</p>}</div>
   <AnimatePresence>{selected&&<motion.div className="bsc-finding-detail" role="region" aria-label={'Détail : '+selected.title} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}><button type="button" data-demo-action="close-finding" aria-label="Fermer le constat" onClick={()=>journey.change({selected:null})}><X/></button><Badge tone={selected.tone}>{selected.risk}</Badge><strong>{selected.title}</strong><p>{selected.impact}</p><span><ShieldCheck/>{selected.action}</span></motion.div>}</AnimatePresence>
  </AppFrame><DemoFooter scenario={scenario}/>
 </div>;
}

function CorrectionDemo({api}){
 const scenario=useSecurityScenario(3,CORRECTION_TIMES,13800),t=scenario.time,journey=useDemoJourney(scenario,CORRECTION_INITIAL,CORRECTION_STEPS),{done,tab}=journey.value,count=done.filter(Boolean).length;
 function replay(){journey.reset();scenario.replay();}
 useEffect(()=>{scenario.replayHandler.current=replay;api.current={replay,show:()=>{journey.reset();scenario.seek(5200,false);}};});
 const report={title:'Bilan des corrections',description:'Chaque action est suivie avec votre équipe. Le journal rassemble sa réalisation et le contrôle associé.',items:[['Actions terminées',count+' / 4'],['Vérifications enregistrées',String(count)],['Avancement',count*25+' %'],['Prochaine étape',count===4?'Maintenir le suivi':'Poursuivre le plan']]};
 return <div className="bsc-demo" ref={scenario.root} data-security="correction" data-time={t} data-playing={scenario.active}>
  <DemoCursor scenario={scenario} actions={[{at:1100,selector:'[data-demo-nav="correction"]'},...CORRECTION_TASKS.map((task,i)=>({at:2400+i*1400,selector:`[aria-label="${task}"]`})),{at:8000,selector:'[data-demo-tab="log"]'},{at:9600,selector:'[data-demo-tab="plan"]'},{at:10800,selector:'[data-demo-nav="reports"]'},{at:12400,selector:'[data-demo-action="close-report"]'}]}/>
  <AppFrame kind="correction" home="correction" journey={journey} report={report} title="Plan de correction" subtitle="4 actions prioritaires" action={<Badge tone={count===4?'green':'orange'}><AnimatedNumber value={count} reduced={scenario.reduced}/> / 4 terminées</Badge>}>
   <Tabs value={tab} onValueChange={value=>journey.change({tab:value})} className="bsc-plan-tabs"><TabsList aria-label="Plan de correction et journal"><TabsTrigger value="plan" data-demo-tab="plan">Plan d’action</TabsTrigger><TabsTrigger value="log" data-demo-tab="log">Journal</TabsTrigger></TabsList><TabsContent value="plan"><div className="bsc-plan-progress"><Progress value={count*25} label="Actions correctives terminées"/><AnimatedNumber value={count*25} suffix=" %" reduced={scenario.reduced}/></div><div className="bsc-plan-layout"><ol>{CORRECTION_TASKS.map((text,i)=><li key={text} data-done={done[i]}><Checkbox checked={done[i]} aria-label={text} onCheckedChange={checked=>journey.change({done:done.map((v,n)=>n===i?checked===true:v)})}/><span>{text}<small>{done[i]?'Vérification documentée':i===count?'En cours avec votre équipe':'Action planifiée'}</small></span><Badge tone={done[i]?'green':i===count?'orange':'neutral'}>{done[i]?'Terminée':i===count?'En cours':'À faire'}</Badge></li>)}</ol><motion.div className="bsc-remediation-float" data-complete={count===4} layout><Settings2/><h5>{count===4?'Corrections vérifiées':'Sécurisation en cours'}</h5><p>{count===4?'Les actions sont documentées pour le suivi.':'Un plan priorisé, suivi avec votre équipe.'}</p><Progress value={count*25} label="Progression du plan illustratif"/><span>{count} / 4 actions</span></motion.div></div></TabsContent><TabsContent value="log"><div className="bsc-correction-log">{CORRECTION_TASKS.map((text,i)=><div key={text}><span>{String(9+i).padStart(2,'0')}:30</span>{done[i]?<CheckCircle2/>:<Clock3/>}<span><strong>{text}</strong><small>{done[i]?'Action terminée · contrôle enregistré':'Prochaine étape du scénario'}</small></span></div>)}</div></TabsContent></Tabs>
   <p className="bsc-demo-note"><ShieldCheck/>Les changements importants restent encadrés et validés.</p>
  </AppFrame><DemoFooter scenario={scenario}/>
 </div>;
}

function MonitoringDemo({api}){
 const scenario=useSecurityScenario(4,MONITOR_TIMES,18000),t=scenario.time,journey=useDemoJourney(scenario,MONITOR_INITIAL,MONITOR_STEPS),{period,periodOpen,enabled}=journey.value;
 const elapsed=Math.max(0,t-1100-Math.max(0,Math.min(t,6500)-5000)),shown=journey.isManual?6:Math.min(6,Math.floor(elapsed/1400)+1),risk=RISK_DATA[shown-1].risk,improved=100-risk;
 function replay(){journey.reset();scenario.replay();}
 useEffect(()=>{scenario.replayHandler.current=replay;api.current={replay,show:()=>{journey.reset();scenario.seek(13900,false);}};});
 const data=RISK_DATA.slice(0,shown).map((p,i)=>({...p,date:period==='half'?p.date:[1,6,11,16,21,26][i]+' mars'}));
 const report={title:'Bilan de protection continue',description:'L’évolution du risque et l’état de la surveillance permettent de préparer les prochains contrôles.',items:[['Indice de risque',risk+' / 100'],['Risques ouverts','− '+improved+' %'],['Surveillance',enabled?'Active':'En pause'],['Période',period==='half'?'6 derniers mois':'30 derniers jours']]};
 function monitorChange(value){journey.change({enabled:value});if(value){if(scenario.finished)scenario.replay();else if(!scenario.playing)scenario.toggle();}else scenario.pause(true);}
 return <div className="bsc-demo" ref={scenario.root} data-security="monitor" data-time={t} data-playing={scenario.active}>
  <DemoCursor scenario={scenario} actions={[{at:1100,selector:'[data-demo-nav="monitor"]'},{at:2600,selector:'[data-demo-select="monitor-period"]'},{at:3600,selector:'[data-demo-option="monitor-period:month"]'},{at:5000,selector:'[aria-label="Activer la surveillance illustrative"]'},{at:6500,selector:'[aria-label="Activer la surveillance illustrative"]'},{at:7900,selector:'[data-demo-select="monitor-period"]'},{at:8900,selector:'[data-demo-option="monitor-period:half"]'},{at:10300,selector:'[data-demo-nav="infrastructure"]'},{at:11500,selector:'[data-local-item="0"]'},{at:12700,selector:'[data-demo-action="close-local-detail"]'},{at:13900,selector:'[data-demo-nav="monitor"]'},{at:15100,selector:'[data-demo-nav="reports"]'},{at:16600,selector:'[data-demo-action="close-report"]'}]}/>
  <AppFrame kind="monitor" home="monitor" journey={journey} report={report} title="Protection continue" subtitle="Évolution du niveau de risque" action={<DemoSelect name="monitor-period" label="Période du suivi" value={period} options={PERIODS} open={periodOpen} onOpenChange={value=>journey.change({periodOpen:value})} onValueChange={value=>journey.change({period:value,periodOpen:false})}/>}>
   <div className="bsc-monitor-summary"><div><AnimatedNumber value={risk} reduced={scenario.reduced}/><span>indice de risque illustratif</span></div><Badge tone="green">− <AnimatedNumber value={improved} reduced={scenario.reduced}/> % de risques ouverts</Badge></div>
   <ChartContainer className="bsc-monitor-chart" label="Le niveau de risque illustratif diminue de 100 à 38 sur six mois"><AreaChart data={data} margin={{top:10,right:10,left:-24,bottom:0}}><CartesianGrid vertical={false} stroke="#e6e6dc"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:9,fill:'#77796e'}}/><YAxis domain={[0,100]} ticks={[0,50,100]} axisLine={false} tickLine={false} tick={{fontSize:8,fill:'#8b8d80'}}/><Area dataKey="risk" name="Indice de risque" type="monotone" fill="#dce7d9" fillOpacity={.48} stroke="#16694f" strokeWidth={1.7} dot={{r:2.7,fill:'#16694f',strokeWidth:0}} isAnimationActive={scenario.active&&!scenario.reduced} animationDuration={650}/><ChartTooltip content={<ChartTooltipContent/>}/></AreaChart></ChartContainer>
   <div className="bsc-monitor-status" data-enabled={enabled}><ShieldCheck/><span><strong>{enabled?'Conformité et surveillance':'Suivi en pause'}</strong><small>{enabled?'Surveillance active · Dernière mise à jour : aujourd’hui':'Les contrôles sont suspendus. Réactivez le suivi ici.'}</small></span><Switch checked={enabled} aria-label="Activer la surveillance illustrative" onCheckedChange={monitorChange}/></div>
  </AppFrame><DemoFooter scenario={scenario}/>
 </div>;
}
const ROWS=[
 {id:'security-audits',title:'Un audit qui part de votre entreprise.',copy:'Nous cadrons l’audit avec vous : systèmes à examiner, accès autorisés et priorités de votre entreprise.',link:'Explorer le périmètre',note:'Un cadre convenu ensemble',detail:'Vous savez ce qui sera examiné, dans quelles conditions et avec quels accès.',icon:Server,Demo:AuditDemo},
 {id:'security-vulnerabilites',title:'Comprendre les risques. Savoir où agir.',copy:'Nous expliquons les faiblesses identifiées, leurs impacts et leur priorité pour vous aider à choisir les prochaines actions.',link:'Explorer les constats',note:'Des priorités lisibles',detail:'Chaque constat relie un problème, son impact et une recommandation concrète.',icon:FileText,Demo:FindingsDemo},
 {id:'security-remediation',title:'Passer du diagnostic aux corrections.',copy:'Nous construisons le plan avec votre équipe, mettons en place les correctifs convenus et vérifions leur fonctionnement.',link:'Suivre les corrections',note:'Des actions jusqu’à leur vérification',detail:'Vous suivez ce qui est prévu, ce qui est corrigé et ce qui reste à faire.',icon:ShieldCheck,Demo:CorrectionDemo},
 {id:'security-suivi',title:'Une sécurité qui suit votre évolution.',copy:'De nouveaux outils, de nouveaux usages, de nouveaux accès : nous vous aidons à adapter les mesures de protection dans le temps.',link:'Explorer le suivi',note:'Un suivi qui reste utile',detail:'Les contrôles et les indicateurs donnent à votre équipe une base pour préparer les prochains ajustements.',icon:Activity,Demo:MonitoringDemo}
];
function SecurityDemoRow({row,index}){const api=useRef(null),{Demo,icon:Icon}=row;return <section className={'bsc-row bsc-row--'+['audit','findings','correction','monitor'][index]} id={row.id} aria-labelledby={row.id+'-title'}><div className="bsc-editorial"><span className="bsc-row-number">{String(index+1).padStart(2,'0')}</span><h3 id={row.id+'-title'}>{row.title}</h3><p>{row.copy}</p><a className="bsc-text-link" href={'#'+row.id+'-demo'} onClick={e=>{e.preventDefault();api.current?.show();document.getElementById(row.id+'-demo')?.focus({preventScroll:true});}}>{row.link}<ArrowDown/></a></div><div className="bsc-row-demo" id={row.id+'-demo'} tabIndex={-1}><Demo api={api}/></div><aside className="bsc-row-annotation"><Icon/><h4>{row.note}</h4><p>{row.detail}</p></aside></section>;}
export function SecurityContentGroup({first}){return <MotionConfig reducedMotion="user"><div className="bsc-root">{first?<><div id="security-system"><DeferredMachine kind="security"/></div>{ROWS.slice(0,2).map((row,index)=><SecurityDemoRow row={row} index={index} key={row.id}/>)}</>:<><div className="bsc-editorial bsc-followup-heading"><h3>Corriger et faire durer la protection</h3><p>Des actions concrètes pour réduire les risques et maintenir vos systèmes en sécurité.</p></div>{ROWS.slice(2).map((row,index)=><SecurityDemoRow row={row} index={index+2} key={row.id}/>)}</>}</div></MotionConfig>;}
