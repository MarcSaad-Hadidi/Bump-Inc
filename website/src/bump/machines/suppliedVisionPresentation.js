import {PISTES,NEEDS} from '../../components/bump-anatomy/vision/model';
import {highlightHoveredPart} from '../ui/hoverDemonstration.js';

export const VISION_COPY=[
 ['Partir de vos défis.','Nos ambitions partent des défis concrets rencontrés dans les entreprises.'],
 ['Relier ce qui existe.','Notre ambition : relier les informations utiles pour mieux comprendre vos opérations.'],
 ['Donner une direction aux données.','Nous voulons préparer des actions cohérentes, que votre équipe pourra comprendre et valider.'],
 ['Explorer trois spécialisations.','Workflow, développement et cybersécurité : trois directions pour les agents spécialisés que nous voulons développer.']
];
const PISTE_COPY=[
 ['Workflow AI','Explorer l’analyse des processus, la connexion des outils et leur automatisation.'],
 ['Developer AI','Explorer l’assistance au développement et à l’évolution de vos logiciels.'],
 ['Cyber AI','Explorer l’analyse des constats et le suivi des corrections de sécurité autorisées.']
];

export function mountVisionPresentation(root){
 if(!root)return()=>{};
 const readout=root.querySelector('[data-readout]'),controls=[...root.querySelectorAll('[data-step]')];
 const sync=()=>{
  const index=Number(controls.find(b=>b.hasAttribute('data-current'))?.dataset.step??0),focus=PISTES.findIndex(p=>readout?.textContent.includes(p.label)),copy=index===3&&focus>=0?PISTE_COPY[focus]:VISION_COPY[index];
  root.dataset.visionStage=String(index);root.dataset.visionFocus=String(focus);
  root.querySelector('[data-vision-number]').textContent=String(index+1).padStart(2,'0');root.querySelector('[data-vision-title]').textContent=copy[0];root.querySelector('[data-vision-detail]').textContent=copy[1];
 };
 const observer=new MutationObserver(sync);if(readout)observer.observe(readout,{childList:true,characterData:true,subtree:true});controls.forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['data-current']}));sync();
 const tip=document.createElement('div');tip.className='bump-workflow-tooltip bump-vision-tooltip';tip.hidden=true;tip.setAttribute('role','tooltip');root.append(tip);const listeners=[];
 const listen=(node,type,fn)=>{node.addEventListener(type,fn);listeners.push(()=>node.removeEventListener(type,fn));};
 const hide=()=>{tip.hidden=true;highlightHoveredPart(root,null);};
 const targets=[
  ...PISTES.map((p,i)=>({element:root.querySelector('[data-dome="'+i+'"]'),title:p.label,detail:PISTE_COPY[i][1],interactive:true})),
  ...NEEDS.map((n,i)=>{
   // The five rows share one generated data-i group. Bind each row's own
   // solid face, rather than deduplicating all needs onto that parent.
   let card=root.querySelector('[data-need="'+i+'"]')?.previousElementSibling;
   while(card&&!card.classList.contains('iso-solid'))card=card.previousElementSibling;
   return{element:card,title:n,detail:'Un besoin concret des entreprises qui guide notre vision.'};
  }),
  ...['lens0','lens1','slit'].map(n=>({element:root.querySelector('[data-drop="'+n+'"]'),title:'Partager le bon contexte',detail:'Nous voulons relier les informations utiles pour préparer des actions cohérentes.'}))
 ];
 const bound=new Set();
 for(const {element,title,detail,interactive}of targets){
  if(!element||bound.has(element))continue;bound.add(element);element.setAttribute('data-bump-info',title);element.setAttribute('tabindex','0');element.setAttribute('role',interactive?'button':'group');element.setAttribute('aria-label',title+'. '+detail);
  const show=()=>{highlightHoveredPart(root,element);tip.replaceChildren();const h=document.createElement('strong'),p=document.createElement('p');h.textContent=title;p.textContent=detail;tip.append(h,p);tip.hidden=false;const b=element.getBoundingClientRect(),r=root.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(r.width-tip.offsetWidth-8,b.left-r.left+b.width/2-tip.offsetWidth/2))+'px';tip.style.top=Math.max(8,b.top-r.top-tip.offsetHeight-12)+'px';};
  listen(element,'pointerenter',show);listen(element,'pointerleave',hide);listen(element,'focus',show);listen(element,'blur',hide);
  if(interactive)listen(element,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();element.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 }
 listen(root,'keydown',e=>{if(e.key==='Escape')hide();});listen(window,'scroll',hide);listen(window,'resize',hide);
 return()=>{observer.disconnect();listeners.forEach(remove=>remove());tip.remove();};
}
