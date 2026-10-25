import{motionSeconds}from'/runtime/assets/BumpPlayback.js';
import{DemoCursor}from'../../ui/DemoCursor.jsx';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {AnimatePresence,LayoutGroup,MotionConfig,motion,animate,useMotionValue} from 'motion/react';
import NumberFlow from '@number-flow/react';
import {Bar,BarChart,CartesianGrid,Line,LineChart,ReferenceDot,XAxis,YAxis} from 'recharts';
import {ArrowDown,ArrowRight,Bell,Check,CheckCheck,ChevronDown,ChevronRight,CircleCheck,Clock3,Database,FileText,Folder,Home,Inbox,Mail,MoreHorizontal,MousePointer2,Search,ShieldCheck,Sparkles,TrendingUp,Users,X,Zap,Plus} from 'lucide-react';
import {KanbanProvider,KanbanBoard,KanbanHeader,KanbanCards,KanbanCard,AnimatedList,ChartContainer,ChartTooltip,ChartTooltipContent,Sheet,SheetContent,SheetTitle,SheetDescription,SheetClose} from './primitives.jsx';
import {useScenario} from './useScenario.js';

const KANBAN_TIMES=[650,1450,2500,3350,4550,5750,6950,8200,9400,10600,11900,13000,14400,15800,17200,18700];
const DATA_TIMES=[700,1450,2300,3000,3700,4400,5200,6400,7600,8800,10000,11000,12000,13200,14400,15600,17000,18200,19400,21000];
const KANBAN_ACTIONS=[{at:650,selector:'.bsd-new'},{at:10600,selector:'.bsd-notice-trigger'},{at:11900,selector:'.bsd-notice-trigger'},{at:13000,selector:'[data-nav="projects"]'},{at:14400,selector:'[data-nav="team"]'},{at:15800,selector:'[data-nav="reports"]'},{at:17200,selector:'[data-nav="requests"]'}];
const DATA_ACTIONS=[{at:700,selector:'[data-nav="sources"]'},{at:1450,selector:'.bsd-sync'},{at:5200,selector:'[data-nav="overview"]'},{at:6400,selector:'.bsd-period select'},{at:7600,selector:'[data-nav="analytics"]'},{at:8800,selector:'.bsd-assistant-trigger'},{at:12000,selector:'.bsd-submit'},{at:13200,selector:'.bsd-assistant-close'},{at:14400,selector:'[data-nav="automation"]'},{at:15600,selector:'[data-nav="reports"]'},{at:17000,selector:'.bsd-notice-trigger'},{at:18200,selector:'.bsd-notice-trigger'},{at:19400,selector:'[data-nav="overview"]'}];
const COLS=[{id:'todo',name:'À traiter'},{id:'progress',name:'En cours'},{id:'review',name:'En validation'},{id:'done',name:'Terminé'}];
const REQUEST={id:'RH-1023',name:'Accès CRM',subtitle:'Nouvel employé',tag:'RH',person:'ML',date:'Aujourd’hui',column:'todo'};
const BASE=[
  {id:'IT-2847',name:'Accès système',tag:'IT',person:'JL',date:'12 mars',column:'todo'},
  {id:'IT-2019',name:'Modification d’accès',tag:'IT',person:'ML',date:'Hier',column:'todo'},
  {id:'IT-2081',name:'Équipement logiciel',tag:'IT',person:'AB',date:'Aujourd’hui',column:'progress'},
  {id:'FIN-0176',name:'Rapport mensuel',tag:'FIN',person:'JL',date:'Hier',column:'progress'},
  {id:'SEC-0081',name:'Validation sécurité',tag:'SEC',person:'AB',date:'2 mars',column:'review'},
  {id:'DEV-2210',name:'Accès API',tag:'DEV',person:'ML',date:'1 mars',column:'review'},
  {id:'RH-1001',name:'Compte créé',tag:'RH',person:'JL',date:'28 févr.',column:'done'},
  {id:'RH-0998',name:'Formation planifiée',tag:'RH',person:'AB',date:'25 févr.',column:'done'}
];
const SOURCES=[{name:'CRM',icon:Users,detail:'Contacts & demandes'},{name:'ERP',icon:Database,detail:'Opérations & ressources'},{name:'Formulaires web',icon:FileText,detail:'Nouvelles demandes'},{name:'Boîte courriel',icon:Mail,detail:'Échanges de l’équipe'}];
const RECOMMENDATIONS=['Préparer la création des accès.','Faire valider les droits par un responsable.','Centraliser l’arrivée des nouveaux employés.'];
const CHART_CONFIG={access:{label:'Accès',color:'#285640'},software:{label:'Logiciels',color:'#5a8167'},hardware:{label:'Matériel',color:'#96aa92'},other:{label:'Autres',color:'#c5cec0'},requests:{label:'Demandes',color:'#346b4a'}};
const MONTHS=['Jan','Fév','Mar','Avr','Mai','Juin'];

function Brand(){return <span className="bsd-brand"><img src="/bump/brand/bump-symbol.png" alt=""/>Bump</span>;}
const NAV={operations:[['home','Accueil',Home],['requests','Demandes',Inbox],['projects','Dossiers',Folder],['team','Équipe',Users],['reports','Rapports',FileText]],data:[['overview','Vue d’ensemble',Home],['analytics','Analyses',TrendingUp],['reports','Rapports',FileText],['sources','Sources',Database],['automation','Automatisations',Zap]]};
function AppFrame({kind,view,onView,children,notifications,notice,onNotice,notificationTitle,notificationDetail,contentMinHeight}) {
  return <div className={'bsd-app bsd-app--'+kind}>
    <aside className="bsd-app-rail" aria-label={'Navigation de la démonstration '+(kind==='operations'?'de gestion':'d’analyse')}><Brand/>
      <nav>{NAV[kind].map(([id,label,Icon])=><button type="button" key={id} data-nav={id} onClick={()=>onView(id)} aria-pressed={view===id} title={label}><Icon/><span>{label}</span></button>)}</nav>
      <div className="bsd-rail-foot"><span className="bsd-avatar">AB</span><span>Équipe Bump<small>Espace de travail</small></span></div>
    </aside>
    <div className="bsd-app-main" style={contentMinHeight?{'--bsd-content-min-height':contentMinHeight+'px'}:undefined}><div className="bsd-app-toolbar"><span>{kind==='operations'?'Espace de travail':'Vos données, réunies'}</span><div>
      <button type="button" className="bsd-icon-button bsd-notice-trigger" onClick={onNotice} aria-label="Notifications de la démonstration" aria-expanded={notice}><Bell/>{notifications&&<i/>}</button>
      <span className="bsd-avatar" aria-label="Alex de l’équipe Bump">AB</span><ChevronDown className="bsd-profile-chevron"/>
    </div></div>
    {notice&&<div className="bsd-inbox" role="status"><CircleCheck/><div><strong>{notificationTitle??(notifications?'Tout est à jour':'Votre espace est prêt')}</strong><span>{notificationDetail??(notifications?'La dernière synchronisation a réussi.':'Les événements du scénario apparaîtront ici.')}</span></div></div>}
    {children}</div>
  </div>;
}

function DemoControls({stage,labels}){return <div className="bsd-controls"><div className="bsd-steps" aria-label="Étape illustrée">{labels.map((label,i)=><span key={label} aria-current={stage===i?'step':undefined}><b>{String(i+1).padStart(2,'0')}</b>{label}</span>)}</div></div>;}

function SecondaryView({kind,view,onBack,synced=4,connecting=false,onSync,submitted=false,completed=false}) {
  const title=NAV[kind].find(x=>x[0]===view)?.[1]??'Vos outils';
  const rows=view==='team'?['Marie Lefebvre · Opérations','Alex Bernard · Technologie','Julien Labelle · Équipe projet']:
    view==='projects'?['Intégration des nouveaux employés · RH-1023',completed?'Accès CRM · Créé et synchronisé':'Accès CRM · En cours de traitement',completed?'Suivi des demandes · Dossier à jour':'Suivi des demandes · Dossier ouvert']:
    view==='automation'?[submitted?'Création des accès · Proposition soumise':'Création des accès · À préparer','Validation humaine · Requise','Activation du scénario · Après validation']:
    view==='reports'?(kind==='operations'?[completed?'RH-1023 · Demande terminée':'RH-1023 · Demande en cours',completed?'Traitement · 4 étapes complétées':'Traitement · Suivi des étapes',completed?'CRM · Synchronisation confirmée':'CRM · Synchronisation à venir']:[`${synced} sources · Données réunies`,synced===4?'Demandes · Hausse de 32 % ce mois-ci':'Demandes · Collecte à compléter',submitted?'3 recommandations · En attente de validation':'Recommandations · À faire valider']):
    ['Demandes de l’équipe · Ce mois-ci',completed?'Dossier RH-1023 · Accès CRM créé':'Dossier RH-1023 · Suivi des accès',completed?'CRM · Dernière synchronisation réussie':'CRM · En attente de la prochaine mise à jour'];
  return <div className="bsd-secondary" data-screen={view}><div className="bsd-screen-heading"><h4>{title}</h4><span className="bsd-live-dot">{view==='sources'?`${synced}/4 sources`:view==='automation'?'À valider':'À jour'}</span></div>
    {view==='sources'?<><SourceList count={synced} connecting={connecting}/><button type="button" className="bsd-sync" disabled={connecting} onClick={onSync}>{connecting?<Clock3/>:<Database/>}{connecting?'Synchronisation…':synced===4?'Actualiser les sources':'Synchroniser les sources'}</button><p className="bsd-source-summary">{synced===4?'Vos quatre outils sont réunis dans le même aperçu.':connecting?'Les données de vos outils sont en cours de collecte.':'Lancez la collecte pour réunir les données de vos outils.'}</p></>:<div className="bsd-secondary-list">{rows.map((text,i)=><div key={text}><span className="bsd-avatar">{i+1}</span><strong>{text}</strong>{view==='automation'?<Clock3/>:<CircleCheck/>}</div>)}</div>}
    <button type="button" className="bsd-inline-link" onClick={onBack}>{kind==='operations'?'Revenir aux demandes':'Revenir à l’aperçu'} <ArrowRight/></button>
  </div>;
}

function RequestContents({item}) {
  return <><div className="bsd-request-title"><strong>{item.name}</strong>{item.column==='done'?<CircleCheck className="bsd-card-check"/>:<ChevronRight/>}</div>
    {item.subtitle&&<span className="bsd-request-subtitle">{item.subtitle}</span>}<span className="bsd-request-id">{item.id}</span>
    <div className="bsd-request-meta"><span className={'bsd-avatar bsd-person-'+item.person}>{item.person}</span><span>{item.date}</span></div></>;
}
function useCursor(scenario,cardRef,frameRef,enabled) {
  const x=useMotionValue(0),y=useMotionValue(0),controls=useRef([]);
  useLayoutEffect(()=>{
    if(!enabled || !cardRef.current || !frameRef.current)return;
    const slot=cardRef.current,frame=frameRef.current;
    // offset coordinates describe the destination layout, before FLIP transforms.
    let left=0,top=0,node=slot;
    while(node&&node!==frame){left+=node.offsetLeft;top+=node.offsetTop;node=node.offsetParent;}
    if(node!==frame){const a=slot.getBoundingClientRect(),b=frame.getBoundingClientRect();left=a.left-b.left;top=a.top-b.top;}
    const targetX=left+slot.offsetWidth*.77,targetY=top+Math.min(slot.offsetHeight*.77,70);
    controls.current.forEach(c=>c.stop());
    if(scenario.time<1450){x.set(targetX+65);y.set(targetY+55);}
    controls.current=[animate(x,targetX,{duration:motionSeconds(.95),ease:[.22,1,.36,1]}),animate(y,targetY,{duration:motionSeconds(.95),ease:[.22,1,.36,1]})];
    return ()=>controls.current.forEach(c=>c.stop());
  },[scenario.time,scenario.revision,enabled,x,y,cardRef,frameRef]);
  useEffect(()=>{controls.current.forEach(c=>scenario.active?c.play():c.pause());},[scenario.active]);
  return {x,y};
}

function KanbanDemo({apiRef}) {
  const scenario=useScenario(KANBAN_TIMES,18700,'operations'),t=scenario.time;
  const [manual,setManual]=useState(null),[manualView,setView]=useState(null),[query,setQuery]=useState(''),[manualNotice,setNotice]=useState(null);
  const [selected,setSelected]=useState(null);
  const requestRef=useRef(null),frameRef=useRef(null),boardHeight=useRef(0);
  const view=manualView??(t<13000?'requests':t<14400?'projects':t<15800?'team':t<17200?'reports':'requests');
  const notice=manualNotice??(t>=10600&&t<11900);
  const column=t>=8200?'done':t>=5750?'review':t>=3350?'progress':'todo';
  const automatic=[...BASE,...(t>=650?[{...REQUEST,column}]:[])];
  const data=manual??automatic;
  const currentColumn=data.find(x=>x.id===REQUEST.id)?.column??column,done=currentColumn==='done';
  const stage=manual?(currentColumn==='todo'?0:done?2:1):t<3350?0:t<8200?1:2;
  const cursorEnabled=!manual && !scenario.reduced && t>=1450 && t<9400 && view==='requests' && !query;
  const cursor=useCursor(scenario,requestRef,frameRef,cursorEnabled);
  useLayoutEffect(()=>{
    if(view!=='requests')return;
    const screen=frameRef.current?.querySelector('.bsd-requests-screen'),toolbar=frameRef.current?.querySelector('.bsd-app-toolbar');
    if(!screen||!toolbar)return;
    const measure=()=>{boardHeight.current=screen.getBoundingClientRect().height+toolbar.getBoundingClientRect().height;};
    measure();const observer=new ResizeObserver(measure);observer.observe(screen);return()=>observer.disconnect();
  },[view]);
  const interact=()=>{scenario.pause();setManual(data.map(x=>({...x})));};
  function replay(){setManual(null);setView(null);setQuery('');setSelected(null);setNotice(null);scenario.replay();}
  function stageTo(i){setManual(null);setView(null);setQuery('');setSelected(null);setNotice(null);scenario.seek([650,3350,9400][i],false);}
  function newRequest(){scenario.pause();setManual([...data.filter(item=>item.id!==REQUEST.id).map(item=>({...item})),{...REQUEST}]);setView('requests');setQuery('');setSelected(null);setNotice(false);}
  useEffect(()=>{apiRef.current={replay,example:replay};scenario.replayHandler.current=replay;});
  const controlsScenario={...scenario,replay};
  const status=selected?data.find(x=>x.id===selected):null;
  return <div className="bsd-demo bsd-operations-demo" ref={scenario.root} data-demo="operations" data-stage={stage+1} data-time={t} data-view={view} data-visible={scenario.visible} data-playing={scenario.active}>
    <DemoCursor scenario={{...scenario,active:scenario.active&&(t<1450||t>=9400)}} actions={t<1450?KANBAN_ACTIONS.slice(0,1):KANBAN_ACTIONS}/>
    <div className="bsd-demo-canvas" ref={frameRef} tabIndex={-1} id="bump-operations-demo">
      <AppFrame kind="operations" view={view} contentMinHeight={view==='requests'?0:boardHeight.current} onView={next=>{interact();setView(next);}} notice={notice} notifications={done} notificationTitle={done?'Demande RH-1023 terminée':'Votre espace est prêt'} notificationDetail={done?'Accès CRM créé et synchronisé. Le dossier de l’équipe est à jour.':'Vos demandes et les événements du CRM apparaîtront ici.'} onNotice={()=>{interact();setNotice(!notice);}}>
        {view!=='requests'?<SecondaryView kind="operations" view={view} completed={done} onBack={()=>{interact();setView('requests');}}/>:<div className="bsd-requests-screen">
          <div className="bsd-screen-heading"><h4>Demandes</h4><label className="bsd-search"><Search/><input value={query} onFocus={interact} onChange={e=>{interact();setQuery(e.target.value);}} placeholder="Rechercher une demande…" aria-label="Rechercher dans les demandes"/>{query&&<button type="button" aria-label="Effacer la recherche" onClick={()=>{interact();setQuery('');}}><X/></button>}</label>
            <button type="button" className="bsd-new" onClick={newRequest}><Plus/><span>Nouvelle demande</span></button></div>
          <LayoutGroup id="bump-operations-board"><KanbanProvider columns={COLS} data={data.filter(x=>(x.name+' '+x.id+' '+(x.subtitle??'')).toLowerCase().includes(query.toLowerCase()))}
            onDataChange={next=>{scenario.pause();setManual(current=>[...next,...(current??data).filter(x=>!next.some(n=>n.id===x.id))]);}}
            onInteract={interact} renderOverlay={item=><article className="bsd-request bsd-drag-overlay"><RequestContents item={item}/></article>}>
            {col=><KanbanBoard key={col.id} id={col.id} highlight={!manual&&column===col.id&&t>=3350&&t<9400}>
              <KanbanHeader><span>{col.name}</span><span className="bsd-count"><NumberFlow value={data.filter(x=>x.column===col.id).length} animated={scenario.visible&&!scenario.reduced} locales="fr-CA"/></span><ChevronRight/></KanbanHeader>
              <KanbanCards id={col.id}>{item=><div key={item.id} className="bsd-request-wrapper"><KanbanCard item={item} animated={item.id===REQUEST.id} reduced={scenario.reduced} activeRef={item.id===REQUEST.id?requestRef:null}><RequestContents item={item}/></KanbanCard>
                <button type="button" className="bsd-card-action" onClick={()=>{interact();setSelected(item.id);}} aria-label={'Voir ou changer le statut de '+item.name+' '+item.id}><MoreHorizontal/></button></div>}</KanbanCards>
            </KanbanBoard>}
          </KanbanProvider></LayoutGroup>
          {query&&!data.some(x=>(x.name+' '+x.id).toLowerCase().includes(query.toLowerCase()))&&<p className="bsd-empty" role="status">Aucune demande pour « {query} ».</p>}
        </div>}
      </AppFrame>
      <AnimatePresence>{cursorEnabled&&<motion.div className="bsd-cursor" style={cursor} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} aria-hidden="true"><MousePointer2 fill="currentColor"/>{t>=2500&&t<8200&&<span>Déplacer</span>}</motion.div>}</AnimatePresence>
      <AnimatedList count={done&&view==='requests'&&!notice&&(manual||(t>=9400&&t<10600))?1:0} reduced={scenario.reduced} className="bsd-crm-list"><div className="bsd-crm-toast" role="status"><CircleCheck/><div><strong>CRM synchronisé</strong><span>Accès créé · Dossier RH-1023 à jour</span></div><span className="bsd-live-dot" aria-label="Synchronisé"/></div></AnimatedList>
      <p className="bsd-ops-annotation" aria-hidden="true">Vos équipes,<br/>vos processus,<br/>dans un même outil.</p>
      {status&&<div className="bsd-detail" role="region" aria-label={'Statut de '+status.id}><div><strong>{status.name} · {status.id}</strong><button type="button" onClick={()=>{scenario.pause();setSelected(null);}} aria-label="Fermer le détail"><X/></button></div><p>{status.subtitle??'Une demande suivie par votre équipe.'}</p><label>Déplacer vers <select value={status.column} onChange={e=>{scenario.pause();const next=e.target.value;setManual(data.map(x=>x.id===status.id?{...x,column:next}:x));}}>{COLS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><small>Modification de démonstration, sans connexion à un CRM.</small></div>}
    </div>
    <DemoControls scenario={controlsScenario} stage={stage} labels={['Nouvelle demande','Traitement','Synchronisation']} onStage={stageTo}/>
    <p className="bsd-sr-only" role="status">{done?'La demande est terminée. Le CRM est synchronisé.':`Étape ${stage+1}. Accès CRM dans la colonne ${COLS.find(x=>x.id===currentColumn)?.name}.`}</p>
  </div>;
}

function SourceList({count,connecting=false}) {
  return <div className="bsd-sources">{SOURCES.map(({name,icon:Icon,detail},i)=><div key={name} data-synced={count>i}><span className="bsd-source-icon"><Icon/></span><span><strong>{name}</strong><small>{detail}</small></span><span className="bsd-source-state">{count>i?<Check/>:<Clock3/>}<span>{count>i?'Synchronisé':connecting&&count===i?'Connexion…':'En attente'}</span></span></div>)}</div>;
}
function Kpi({label,value,suffix,change,seed,reduced,visible}) {
  const points=[3,4,3,5,7,9].map((value,i)=>({n:i,value:value+seed}));
  return <div className="bsd-kpi"><div>{label}<ChevronRight/></div><strong><NumberFlow value={value} suffix={suffix} locales="fr-CA" format={{maximumFractionDigits:1}} animated={visible&&!reduced} transformTiming={{duration:850,easing:'ease-out'}}/></strong><small><TrendingUp/>{change}</small>
    <div className="bsd-sparkline" aria-hidden="true"><ChartContainer config={CHART_CONFIG}><LineChart data={points} margin={{top:2,right:0,left:0,bottom:0}}><Line dataKey="value" stroke="#72a782" strokeWidth={1.2} dot={false} isAnimationActive={false}/></LineChart></ChartContainer></div>
  </div>;
}
function VolumeChart({collect,understood,reduced,visible,period,synced,connecting}) {
  const base=period==='month'?[28,32,25,38,45,67]:[90,145,210,260,335,385];
  const data=base.map((total,i)=>({name:period==='month'?['1','6','11','16','21','26'][i]:MONTHS[i],access:Math.round(total*.42*collect),software:Math.round(total*.28*collect),hardware:Math.round(total*.18*collect),other:Math.round(total*.12*collect)}));
  return <div className="bsd-volume-panel"><div className="bsd-chart-title"><strong>Volume de demandes</strong>{understood?<span><TrendingUp/> +32 %</span>:<span>Sources · {synced}/4</span>}</div><div className={"bsd-volume-content "+(!understood?"has-sources":"")}><ChartContainer config={CHART_CONFIG} aria-label="Volume de demandes en hausse, réparti entre accès, logiciels, matériel et autres" role="img">
    <BarChart data={data} barSize={period==='month'?15:18} margin={{top:8,right:0,left:-25,bottom:0}} accessibilityLayer>
      <CartesianGrid vertical={false} stroke="#e8e8e1" strokeWidth={.7}/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill:'#73776d',fontSize:8}} interval={0} tickMargin={7}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#8a8e83',fontSize:8}} tickCount={4}/>
      <ChartTooltip content={<ChartTooltipContent/>} cursor={{fill:'#e1e7de',opacity:.4}}/>
      {['access','software','hardware','other'].map((key,i)=><Bar key={key} dataKey={key} stackId="volume" fill={CHART_CONFIG[key].color} radius={i===3?[2,2,0,0]:0} isAnimationActive={visible&&!reduced} animationDuration={650}/>)}
    </BarChart>
  </ChartContainer>{!understood?<SourceList count={synced} connecting={connecting}/>:<div className="bsd-chart-legend">{Object.entries(CHART_CONFIG).slice(0,4).map(([key,{label,color}])=><span key={key}><i style={{background:color}}/>{label}</span>)}</div>}</div></div>;
}
function TrendChart({reduced,visible}) {
  const points=[{date:'1 oct.',value:21},{date:'6',value:24},{date:'11',value:23},{date:'16',value:34},{date:'21',value:38},{date:'26',value:44}];
  return <div className="bsd-trend"><div className="bsd-chart-title"><strong>Une tendance se dessine</strong><span>+42 % le 16 oct.</span></div><ChartContainer config={CHART_CONFIG} role="img" aria-label="Hausse de 42 pour cent des demandes le 16 octobre"><LineChart data={points} margin={{top:8,right:12,left:-25,bottom:0}} accessibilityLayer><CartesianGrid vertical={false} stroke="#e8e8e1"/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fontSize:8,fill:'#7a7e72'}}/><YAxis hide/><ChartTooltip content={<ChartTooltipContent/>}/><Line type="monotone" dataKey="value" name="Demandes" stroke="#316348" strokeWidth={2} dot={false} isAnimationActive={visible&&!reduced} animationDuration={700}/><ReferenceDot x="16" y={34} r={4} fill="#316348" stroke="#fff" strokeWidth={2}/></LineChart></ChartContainer><div className="bsd-insight"><Sparkles/><div><strong>Une hausse des demandes a été détectée.</strong><span>+32 % ce mois-ci, surtout pour les accès des nouveaux employés.</span></div></div></div>;
}

function DashboardDemo({apiRef}) {
  const scenario=useScenario(DATA_TIMES,21000,'data'),t=scenario.time;
  const [manualView,setView]=useState(null),[manualNotice,setNotice]=useState(null),[manualPeriod,setPeriod]=useState(null),[manualSynced,setSynced]=useState(null);
  const [manualSubmitted,setSubmitted]=useState(null),[dismissed,setDismissed]=useState(false),[manualAssistant,setManualAssistant]=useState(false);
  const view=manualView??(t<700?'overview':t<5200?'sources':t<7600?'overview':t<14400?'analytics':t<15600?'automation':t<19400?'reports':'overview');
  const notice=manualNotice??(t>=17000&&t<18200),period=manualPeriod??(t>=6400?'month':'half');
  const synced=manualSynced??(t<2300?0:t<3000?1:t<3700?2:t<4400?3:4),collect=synced/4;
  const connecting=manualSynced===null&&t>=1450&&synced<4,understood=synced===4,submitted=manualSubmitted??(t>=12000);
  const acting=t>=8800,open=(manualAssistant||(scenario.reduced?understood:t>=8800&&t<13200))&&!dismissed;
  const count=t<10000?1:t<11000?2:3,stage=t<5200?0:t<8800?1:2;
  function reset(){setPeriod(null);setView(null);setSubmitted(null);setSynced(null);setDismissed(false);setManualAssistant(false);setNotice(null);}
  function replay(){reset();scenario.replay();}
  function stageTo(i){reset();scenario.seek([5200,7600,12000][i],false);}
  function navigate(next){scenario.pause();setView(next);setNotice(false);setDismissed(true);setManualAssistant(false);}
  function syncSources(){scenario.pause();setSynced(4);}
  useEffect(()=>{apiRef.current={replay,example:()=>{stageTo(2);setManualAssistant(true);}};scenario.replayHandler.current=replay;});
  return <div className="bsd-demo bsd-data-demo" ref={scenario.root} data-demo="data" data-stage={stage+1} data-time={t} data-visible={scenario.visible} data-playing={scenario.active} data-view={view}>
    <DemoCursor scenario={scenario} actions={DATA_ACTIONS}/>
    <div className="bsd-demo-canvas bsd-dashboard-canvas" id="bump-data-demo" tabIndex={-1}>
      <AppFrame kind="data" view={view} onView={navigate} notice={notice} notifications={understood} notificationTitle={submitted?'Recommandations soumises':understood?'Vos sources sont à jour':'Votre espace est prêt'} notificationDetail={submitted?'3 recommandations attendent la validation de votre équipe.':understood?'Les quatre outils sont synchronisés. Consultez vos analyses.':'Synchronisez vos sources pour réunir vos données.'} onNotice={()=>{scenario.pause();setNotice(!notice);}}>
        {!['overview','analytics'].includes(view)?<SecondaryView kind="data" view={view} synced={synced} connecting={connecting} onSync={syncSources} submitted={submitted} onBack={()=>navigate('overview')}/>:<div className="bsd-dashboard-screen">
          <div className="bsd-screen-heading"><h4>{view==='analytics'?'Analyses':'Aperçu'}</h4><label className="bsd-period"><span className="bsd-sr-only">Période des graphiques</span><select value={period} onChange={e=>{scenario.pause();setPeriod(e.target.value);}}><option value="half">6 derniers mois</option><option value="month">Octobre 2026</option></select><ChevronDown/></label></div>
          <div className="bsd-kpis"><Kpi label="Demandes traitées" value={Math.round((understood?312:248)*collect)} change={understood?'+26 %':'+12 %'} seed={0} {...scenario}/><Kpi label="Temps de résolution" value={collect?(understood?2.1:2.8):0} suffix=" j" change={understood?'−25 %':'−18 %'} seed={1} {...scenario}/><Kpi label="Taux de satisfaction" value={collect?(understood?96:92):0} suffix=" %" change="+6 %" seed={2} {...scenario}/></div>
          <div className="bsd-visualization"><AnimatePresence mode="wait" initial={false}>{view==='analytics'&&understood?<motion.div key="trend" initial={scenario.reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:scenario.reduced?0:.22}}><TrendChart reduced={scenario.reduced} visible={scenario.visible}/></motion.div>:<motion.div key="volume" initial={scenario.reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:scenario.reduced?0:.22}}><VolumeChart collect={collect} understood={understood} reduced={scenario.reduced} visible={scenario.visible} period={period} synced={synced} connecting={connecting}/></motion.div>}</AnimatePresence></div>
          {understood&&<button type="button" className="bsd-assistant-trigger" aria-expanded={open} onClick={()=>{scenario.pause();setManualAssistant(!open);setDismissed(open);}}><Sparkles/>{open?'Assistant IA ouvert':'Voir les recommandations'} <ArrowRight/></button>}
        </div>}
      </AppFrame>
      <Sheet open={open} onOpenChange={value=>{if(!value){setDismissed(true);scenario.pause();}}} modal={false}>
        <AnimatePresence>{open&&<SheetContent key="assistant" reduced={scenario.reduced}>
          <div className="bsd-assistant-heading"><Sparkles/><SheetTitle>Assistant IA</SheetTitle><SheetClose className="bsd-icon-button bsd-assistant-close" aria-label="Fermer l’assistant"><X/></SheetClose></div>
          <SheetDescription className="bsd-assistant-summary">Le volume de demandes a augmenté de <strong>32 %</strong> ce mois-ci, principalement en raison des nouveaux employés.</SheetDescription>
          <div className="bsd-recommendations"><strong>Recommandations</strong><AnimatedList count={scenario.reduced||manualAssistant?3:count} reduced={scenario.reduced}>{RECOMMENDATIONS.map((text,i)=>{const Icon=[Zap,ShieldCheck,Users][i];return <div className="bsd-recommendation" key={text}><Icon/><span>{text}</span></div>;})}</AnimatedList></div>
          <button type="button" className={'bsd-submit '+(submitted?'is-submitted':'')} disabled={submitted} onClick={()=>{scenario.pause();setSubmitted(true);}}>{submitted?<CheckCheck/>:null}{submitted?'Soumis à l’équipe':'Soumettre à l’équipe'}{!submitted&&<ArrowRight/>}</button>
          <div className="bsd-human-status" role="status">{submitted?<CircleCheck/>:<ShieldCheck/>}<span>{submitted?'En attente de validation humaine':'Validation humaine requise'}</span></div>
        </SheetContent>}</AnimatePresence>
      </Sheet>
      <p className="bsd-handwritten" aria-hidden="true"><span>Des données qui deviennent </span><span>des actions.</span></p>
    </div>
    <DemoControls scenario={{...scenario,replay}} stage={stage} labels={['Collecter','Comprendre','Agir']} onStage={stageTo}/>
    <span className="bsd-sr-only" role="status">{synced} sources synchronisées. {understood?'Hausse de 32 pour cent détectée.':''} {acting?'Trois recommandations à faire valider par votre équipe.':''}</span>
  </div>;
}

export function SoftwareDemoSection({kind,handles=[]}) {
  const api=useRef(null),operations=kind==='operations';
  return <section className={'bsd-section bsd-section--'+kind} aria-labelledby={'bump-demo-title-'+kind}>
    {handles.map(handle=><span key={handle} id={handle} className="bsd-anchor"/>)}
    <div className="bsd-editorial"><span className="bsd-section-number">{operations?'01':'02'}</span><h3 id={'bump-demo-title-'+kind}>{operations?<>Construire pour<br/>vos opérations</>:<>Rendre les systèmes<br/>plus utiles</>}</h3>
      <p>{operations?'Un espace conçu pour vos équipes : recevoir les demandes, suivre leur traitement et garder vos outils à jour.':'Réunissez vos données pour voir ce qui change, comprendre les priorités et préparer les décisions avec votre équipe.'}</p>
      <a className="bsd-editorial-link" href={operations?'#bump-operations-demo':'#bump-data-demo'} onClick={e=>{e.preventDefault();api.current?.example();document.getElementById(operations?'bump-operations-demo':'bump-data-demo')?.focus({preventScroll:true});}}>{operations?'Découvrir notre approche':'Voir des exemples'}<ArrowDown/></a>
    </div>
    <MotionConfig reducedMotion="user">{operations?<KanbanDemo apiRef={api}/>:<DashboardDemo apiRef={api}/>}</MotionConfig>
  </section>;
}
