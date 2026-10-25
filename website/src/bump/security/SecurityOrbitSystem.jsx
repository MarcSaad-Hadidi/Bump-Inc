import{DemoCursor}from'../ui/DemoCursor.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion,useTransform} from 'motion/react';
import NumberFlow from '@number-flow/react';
import {ShieldCheck,CheckCircle2,AlertTriangle,ArrowUpRight,ArrowRight,ArrowDown,X,Server,Network} from 'lucide-react';
import {Card,Badge,Button,Progress,Checkbox,Hint} from './primitives.jsx';
import {DOMAINS,STAGES,ORBIT_STARTS,ORBIT_TIMES,ACTIONS} from './data.js';
import {useSecurityScenario} from './useSecurityScenario.js';

function OrbitDot({clock,index}){
 const angle=index*.95,rx=[202,165,203,181,205,165][index],ry=[157,116,102,143,157,116][index],tilt=[0,.57,-.62,0,0,.57][index];
 const point=(value,axis)=>{const t=value/6200+angle,x=Math.cos(t)*rx,y=Math.sin(t)*ry;return axis===0?250+x*Math.cos(tilt)-y*Math.sin(tilt):225+x*Math.sin(tilt)+y*Math.cos(tilt);};
 const cx=useTransform(clock,v=>point(v,0)),cy=useTransform(clock,v=>point(v,1));
 return <motion.circle cx={cx} cy={cy} r={index%2?3:3.8} fill={index===4?'#ac8127':'#08794d'} opacity={index%2?.85:1}/>;
}
export function OrbitPaths({scenario}){
 const draw=useTransform(scenario.clock,[0,1400],[0,1]);
 return <svg className="bsc-orbits" viewBox="0 0 500 450" fill="none" aria-hidden="true">
  {[['M250 58a202 167 0 1 1-.01 0',0],['M85 225a165 116 0 1 0 330 0a165 116 0 1 0-330 0',32],['M47 225a203 102 0 1 0 406 0a203 102 0 1 0-406 0',-36]].map(([d,angle],i)=><motion.path key={d} d={d} transform={`rotate(${angle} 250 225)`} stroke={scenario.time>=23800?'#278957':'#aa893b'} strokeWidth="1.25" opacity={.72+i*.06} style={{pathLength:scenario.reduced?1:draw}}/>) }
  {[0,1,2,3,4,5].map(i=><OrbitDot key={i} clock={scenario.clock} index={i}/>)}
 </svg>;
}

// Adapted from Magic UI Animated Beam's measured quadratic geometry. The fixed
// orbit composition uses a solid path and clock-driven dot instead of its
// default gradient and infinite timer. All geometry responds to the real cards.
export function SecuritySignal({clock,points,index,active,tone='green'}){
 const warning=tone!=='green',color={green:'#148253',orange:'#e07720',red:'#d6263e'}[tone];
 const {x1,y1,x2,y2}=points,controlX=(x1+x2)/2+(index%2?24:-24),controlY=(y1+y2)/2-28;
 const position=(value,axis)=>{const p=((value-3800+index*390)%2250+2250)%2250/2250;return (1-p)*(1-p)*(axis?y1:x1)+2*(1-p)*p*(axis?controlY:controlX)+p*p*(axis?y2:x2);};
 const cx=useTransform(clock,v=>position(v,0)),cy=useTransform(clock,v=>position(v,1));
 return <g data-tone={tone}><motion.path d={`M${x1} ${y1} Q${controlX} ${controlY} ${x2} ${y2}`} fill="none" animate={{stroke:color,opacity:active?.88:.42}} strokeWidth={warning?1.9:1.35}/>{active&&<motion.circle cx={cx} cy={cy} r={warning?4.2:3.2} fill={color} stroke="#fffcf0" strokeWidth="1"/>}</g>;
}
export function SecurityShield({scenario,stage,shieldRef}){
 const draw=useTransform(scenario.clock,[0,1400],[0,1]),fill=useTransform(scenario.clock,[0,500,1400],[0,0,1]);
 const pulse=useTransform(scenario.clock,value=>value<1400?.86+.14*value/1400:value>=23800?1.035:value>=3800?1+.014*Math.exp(-(((value-3800)%2250)/2250)*7):1);
 // The path is Lucide's ISC-licensed Shield icon, drawn by the same Motion
 // clock as the orbital paths. Its small response follows incoming signals.
 return <motion.div ref={shieldRef} className="bsc-shield" style={{x:'-50%',y:'-50%',scale:pulse}} data-secured={stage===8} initial={scenario.reduced?false:{opacity:0}} animate={{opacity:1}} transition={{duration:.9,ease:[.22,1,.36,1]}} aria-hidden="true">
  <svg className="bsc-shield-outline" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" style={{pathLength:draw,fillOpacity:fill}}/></svg><ShieldCheck className="bsc-shield-check"/>
 </motion.div>;
}
export const SecurityDomainCard=React.forwardRef(function SecurityDomainCard({domain,index,stage,time,selected,onSelect,reduced},ref){
 const warning=domain.id==='network'&&stage>=3&&stage<8&&time<22100,verified=stage>=3&&(stage>3||index<Math.min(6,Math.floor((time-7300)/400)+1))&&!warning;
 const danger=warning&&stage>=5&&stage<7;
 const status=warning?(stage>=7?'En correction…':stage>=5?'1 vulnérabilité':'À examiner'):verified?'Vérifié':stage>=2?'Analyse en cours…':domain.detail;
 const Icon=warning?AlertTriangle:verified?CheckCircle2:domain.icon;
 return <motion.button ref={ref} type="button" className="bsc-domain" data-domain={domain.id} data-status={danger?'danger':warning?'warning':verified?'verified':stage>=2?'scanning':'idle'} aria-pressed={selected} onClick={onSelect}
  style={{'--domain-x':domain.x+'%','--domain-y':domain.y+'%',x:'-50%',y:'-50%'}} initial={reduced?false:{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={{duration:.45,delay:reduced?0:index*.09}}>
  <Icon/><span><strong>{domain.title}</strong><small>{status}</small></span>
 </motion.button>;
});

export function SecurityRiskPanel({onRecommend,onClose}){return <Card className="bsc-orbit-panel"><button className="bsc-panel-close" type="button" aria-label="Fermer le détail du risque" onClick={onClose}><X/></button><span className="bsc-panel-overline">CONSTAT ILLUSTRATIF · B-024</span><h4>Vulnérabilité détectée</h4><div className="bsc-risk-heading"><AlertTriangle/><strong>Accès trop large sur un serveur de production</strong></div><dl><div><dt>Domaine</dt><dd><Network/>Réseaux</dd></div><div><dt>Système concerné</dt><dd><Server/>Serveur Web · MTL-01</dd></div><div><dt>Niveau de risque</dt><dd><Badge tone="red">Élevé</Badge></dd></div><div><dt>Impact potentiel</dt><dd>Accès non autorisé à des données sensibles.</dd></div></dl><Button onClick={onRecommend}>Voir la recommandation <ArrowRight/></Button></Card>;}
export function SecurityRemediationPanel({scenario,stage,onClose}){
 const auto=Math.max(0,Math.min(4,Math.floor((scenario.time-18500)/1200))),[manual,setManual]=useState(null),done=manual??ACTIONS.map((_,i)=>i<auto);
 useEffect(()=>setManual(null),[scenario.revision]);
 const count=done.filter(Boolean).length;
 return <Card className="bsc-orbit-panel"><button className="bsc-panel-close" type="button" aria-label="Fermer le plan" onClick={onClose}><X/></button><span className="bsc-panel-overline">{stage>=7?'CORRECTION EN COURS':'PROPOSITION À VALIDER'}</span><h4>Plan de correction</h4><p className="bsc-ui-muted">Quatre actions, avec votre équipe.</p><ol className="bsc-orbit-actions">{ACTIONS.map((text,i)=><motion.li key={text} initial={scenario.reduced?false:{opacity:0,y:6}} animate={{opacity:scenario.time>=15500+i*600||stage>=7?1:.3,y:0}} transition={{duration:.35}}><Checkbox checked={done[i]} aria-label={text} onCheckedChange={value=>{scenario.pause();setManual(done.map((v,n)=>n===i?value===true:v));}}/><span>{text}<small>{['Supprimer les permissions inutiles','Sur le serveur Web · MTL-01','Avec l’équipe responsable','Par un contrôle de suivi'][i]}</small></span></motion.li>)}</ol>{stage>=7?<><Progress value={count*25} label="Avancement de la correction"/><p className="bsc-ui-muted"><NumberFlow value={count} animated={!scenario.reduced}/> / 4 actions terminées</p></>:<><p className="bsc-validation-wait" role="status">En attente de validation</p><Button className="bsc-launch-correction" onClick={()=>scenario.seek(18500,true)}>Lancer la correction <ArrowRight/></Button></>}</Card>;
}


export function SecurityOrbitSystem(){
 const scenario=useSecurityScenario(0,ORBIT_TIMES,27000),stage=Math.max(0,ORBIT_STARTS.findLastIndex(t=>scenario.time>=t));
 const board=useRef(null),shield=useRef(null),cards=useRef([]),[geometry,setGeometry]=useState({width:500,height:450,points:[]}),[selected,setSelected]=useState(null),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{setSelected(null);setDismissed(false);},[stage,scenario.revision]);
 useEffect(()=>{const node=board.current;if(!node)return;const update=()=>{const b=node.getBoundingClientRect(),center=shield.current?.getBoundingClientRect();if(!center)return;const x2=center.left-b.left+center.width/2,y2=center.top-b.top+center.height/2;setGeometry({width:b.width,height:b.height,points:DOMAINS.map((d,i)=>{const r=cards.current[i]?.getBoundingClientRect();return{x1:r?r.left-b.left+r.width/2:d.x*b.width/100,y1:r?r.top-b.top+r.height/2:d.y*b.height/100,x2,y2};})});};const observer=new ResizeObserver(update);observer.observe(node);update();return()=>observer.disconnect();},[stage>=1]);
 return <section className="bsc-orbit-system" ref={scenario.root} data-security="orbit" data-stage={stage+1} data-time={scenario.time} data-playing={scenario.active}>
  {scenario.time>=17600&&scenario.time<19700&&<DemoCursor scenario={scenario} actions={[{at:18500,selector:'.bsc-launch-correction'}]}/>}
  <div className="bsc-orbit-grid">
   <div className="bsc-editorial bsc-orbit-intro"><span className="bsc-eyebrow">CYBERSÉCURITÉ</span><h3>Examiner avec<br/>un cadre clair</h3><p>Une visibilité complète sur vos applications, vos infrastructures et vos accès, pour réduire les risques.</p><a href="#security-audits" className="bsc-text-link">Découvrir notre approche <ArrowDown/></a></div>
   <div className="bsc-orbit-composition"><div className="bsc-orbit-board" ref={board}>
    <OrbitPaths scenario={scenario}/>
    <svg className="bsc-signals" width={geometry.width} height={geometry.height} viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">{geometry.points.map((points,i)=><SecuritySignal key={i} clock={scenario.clock} points={points} index={i} active={!scenario.reduced&&stage>=2&&stage<8} tone={stage>=3&&stage<8&&((i===3&&scenario.time<22100)||(i===4&&stage>=4&&scenario.time<23300))?(stage>=5&&stage<7?'red':'orange'):'green'}/>)}{stage>=4&&stage<8&&geometry.points[3]&&<motion.path d={`M${geometry.points[0].x1} ${geometry.points[0].y1} Q${geometry.width*.8} ${geometry.height*.2} ${geometry.points[3].x1} ${geometry.points[3].y1} T${geometry.points[4].x1} ${geometry.points[4].y1}`} fill="none" animate={{stroke:scenario.time>=23300?'#148253':stage>=5&&stage<7?'#d6263e':'#e07720',pathLength:1}} strokeWidth="1.8" strokeDasharray="4 4" initial={{pathLength:0}} transition={{duration:1}}/>}</svg>
    <SecurityShield scenario={scenario} stage={stage} shieldRef={shield}/>
    <AnimatePresence>{stage>=1&&DOMAINS.map((domain,i)=><SecurityDomainCard ref={el=>cards.current[i]=el} key={domain.id} domain={domain} index={i} stage={stage} time={scenario.time} reduced={scenario.reduced} selected={selected===i} onSelect={()=>{scenario.pause();setDismissed(false);setSelected(selected===i?null:i);}}/>)}</AnimatePresence>
   </div><div className="bsc-secured-slot"><AnimatePresence>{stage===8&&<motion.div className="bsc-secured-toast" initial={scenario.reduced?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}><CheckCircle2/><span><strong>Périmètre maîtrisé</strong><small>Suivi continu activé</small></span></motion.div>}</AnimatePresence></div></div>
   <div className="bsc-orbit-aside"><AnimatePresence mode="wait" initial={false}>
    {selected!==null?<motion.div key="domain" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}><Card className="bsc-orbit-panel"><button className="bsc-panel-close" type="button" aria-label="Fermer le domaine" onClick={()=>{scenario.pause();setSelected(null);}}><X/></button><ShieldCheck className="bsc-detail-symbol"/><h4>{DOMAINS[selected].title}</h4><p className="bsc-ui-muted">{DOMAINS[selected].detail} dans le périmètre illustratif.</p><p>Les constats sont documentés et vérifiés avec votre équipe.</p><Button onClick={()=>{setSelected(null);scenario.seek(3800,true);}}>Suivre l’analyse <ArrowRight/></Button></Card></motion.div>:
     stage===5&&!dismissed?<motion.div key="risk" initial={{opacity:0,x:14}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}}><SecurityRiskPanel onRecommend={()=>scenario.seek(15500,true)} onClose={()=>{scenario.pause();setDismissed(true);}}/></motion.div>:
     stage>=6&&stage<8&&!dismissed?<motion.div key="plan" initial={{opacity:0,x:14}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}}><SecurityRemediationPanel scenario={scenario} stage={stage} onClose={()=>{scenario.pause();setDismissed(true);}}/></motion.div>:
     <motion.div key="editorial" className="bsc-editorial bsc-protection" initial={scenario.reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><span className="bsc-eyebrow">COMPRENDRE · CORRIGER · SUIVRE</span><h3>La protection<br/><em>se construit.</em></h3><p>Une approche pragmatique pour des environnements plus sûrs, sans complexité inutile.</p><Button className="bsc-green" onClick={()=>scenario.seek(stage===8?0:12500,true)}>{stage===8?'Revoir le parcours':'Explorer la cybersécurité'}<ArrowUpRight/></Button></motion.div>}
   </AnimatePresence></div>
  </div>
  <p className="bsc-orbit-status" role="status"><span>{String(stage+1).padStart(2,'0')} / 09 · {STAGES[stage][0]}</span>{STAGES[stage][1]}</p>
  <p className="bsc-illustrative">Scénario illustratif. Chaque audit réel est autorisé, ciblé et adapté à votre environnement.</p>
 </section>;
}
