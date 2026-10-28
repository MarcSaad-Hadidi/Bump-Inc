import {ArrowDown} from '../ui/Icons.js';
import {r as React} from '/runtime/assets/components-BdJai906.js';
import {mountCaptionTransitions} from '../ui/captionTransitions.js';
import {BumpSoftwareHand} from './SoftwareHand.jsx';
import referenceHand from './reference-hand.json';

const steps=[
 {label:'Le contexte',title:'Le bon contexte, dès le départ.',copy:'Vos demandes et vos documents sont réunis pour que votre équipe retrouve les informations utiles dans un même espace.'},
 {label:'L’assistance',title:'Préparer la suite, plus vite.',copy:'Un agent IA peut résumer une demande et préparer une réponse ou une action, selon les règles définies avec vous.'},
 {label:'La validation',title:'Votre équipe garde la main.',copy:'Vous vérifiez la proposition et donnez votre accord avant toute action qui demande une approbation.'},
 {label:'Les connexions',title:'Un accord. Des outils qui suivent.',copy:'Après validation, le logiciel met à jour les outils concernés et transmet les informations utiles aux bonnes personnes.'}
];
const clamp=n=>Math.max(0,Math.min(1,n));
export function BumpSoftwareStory(){
 const root=React.useRef(null),stage=React.useRef(null);
 const [step,setStep]=React.useState(0),[handAvailable,setHandAvailable]=React.useState(true);
 React.useEffect(()=>mountCaptionTransitions(stage.current),[]);
 const handError=React.useCallback(()=>setHandAvailable(false),[]);
 React.useEffect(()=>{
  const element=root.current;let frame=0;
  const draw=()=>{
   frame=0;
   const panel=stage.current,style=getComputedStyle(element);
   const padding=parseFloat(style.paddingTop)||0,stickyTop=parseFloat(getComputedStyle(panel).top)||0;
   // The blank paper leading into the story is not part of its pinned travel.
   const travel=Math.max(1,element.clientHeight-padding-panel.offsetHeight);
   const p=clamp((stickyTop-element.getBoundingClientRect().top-padding)/travel);
   const index=Math.min(3,Math.floor(p*4));
   setStep(old=>old===index?old:index);element.style.setProperty('--software-progress',p);element.dataset.step=String(index);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  const resize=new ResizeObserver(schedule);resize.observe(element);resize.observe(stage.current);window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[]);
 const current=steps[step];
 return <div ref={root} className="bump-software-story" data-nav-theme="light" data-animation="reference-rive">
  <div ref={stage} className="bump-software-stage">
   <div className="bump-software-story-copy">
    <p className="bump-software-eyebrow">L’IA PREND PLACE DANS VOTRE TRAVAIL</p>
    <h3>Vos outils. <br/>Votre contexte.<br/><em>Une nouvelle intelligence.</em></h3>
    <p>Nous développons des logiciels et intégrons l’IA pour alléger le travail répétitif, avec vos outils et vos équipes.</p>
    {/* Cue's file-folder cascade, driven by the existing native story progress.
        No additional scroll listener, pin or competing smooth-scroll engine. */}
    <div className="bump-software-narration bump-software-cascade" aria-label="Les quatre étapes" aria-live="off">
     {steps.map((item,index)=><article key={item.label} className="bump-software-cascade-card" data-state={index<step?'past':index===step?'current':'next'} aria-hidden={index!==step} style={{'--cascade-index':index,'--cascade-from':(index-1)/4+.015,'--cascade-cover-from':index/4+.015,'--cascade-arrival':index===0?1:undefined,'--cascade-cover':index===3?0:undefined,zIndex:index+1}}>
      <div className="bump-software-cascade-tab"><span className="bump-software-step">0{index+1}</span><small>{item.label}</small><span aria-hidden="true">/ 04</span></div>
      <div className="bump-software-cascade-body"><h4>{item.title}</h4><p>{item.copy}</p></div>
     </article>)}
    </div>
    <a href="#software-capabilities" className="bump-software-explore">Explorer les possibilités <ArrowDown /></a>
   </div>
   <div className="bump-software-device" role="img" aria-label={referenceHand.description}>
    <div className="bump-software-reference-hand">{handAvailable?<BumpSoftwareHand onLoadError={handError}/>:<div className="bump-software-fallback"><div className="bump-software-fallback-phone"><span className="bump-brand-mark"/><strong>Votre espace</strong><p>{current.title}</p><div>{step<2?'Proposition à relire':step===2?'Validation de votre équipe':'Vos outils sont à jour'}</div><span>{step===3?'✓ CRM synchronisé':'Demande · Sources · Prochaine étape'}</span></div></div>}</div>
    <p className="bump-software-device-caption">Une possibilité, conçue autour de votre entreprise.</p>
   </div>
   <div className="bump-software-scroll" aria-hidden="true"><span>FAITES DÉFILER POUR SUIVRE LE PARCOURS</span><i><b/></i></div>
  </div>
 </div>;
}
