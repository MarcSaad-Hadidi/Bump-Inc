import {NEEDS} from '../../components/bump-anatomy/port/model';
import {highlightHoveredPart} from '../ui/hoverDemonstration.js';
export const PORT_COPY=[
 ['Proches de votre réalité.','Deux entrepreneurs à Montréal, un même point de départ : vos outils, votre équipe et vos contraintes.'],
 ['Ancrés à Montréal.','Nous accompagnons les PME du Québec avec des solutions adaptées à leur quotidien.'],
 ['De nouveaux horizons.','Des systèmes qui évoluent avec votre entreprise, du Québec vers de nouvelles ambitions.'],
 ['Partir de votre besoin.','Un processus à simplifier, un outil à développer ou une faiblesse à corriger : le mandat part de votre réalité.'],
 ['Parlons de votre projet.','Décrivez votre besoin, vos enjeux et le résultat attendu. Construisons la suite ensemble.']
];
export const PORT_CONTAINERS=[
 ['Automatiser','Confier les tâches répétitives à un processus fiable.'],
 ['Connecter','Relier vos outils et vos API pour éviter les doubles saisies.'],
 ['Développer','Créer un logiciel conçu autour de vos opérations.'],
 ['Intégrer l’IA','Ajouter une assistance utile, avec votre équipe aux commandes.'],
 ['Auditer','Identifier les vulnérabilités dans un cadre autorisé.'],
 ['Protéger','Corriger les faiblesses et suivre la sécurité dans le temps.']
];
const SERVICES=[
 ['Automatisation','Relier les tâches et les outils pour rendre vos processus plus fluides.'],
 ['Logiciel sur mesure','Développer l’outil qui manque et le connecter à vos systèmes.'],
 ['Cybersécurité','Comprendre les risques et accompagner les corrections autorisées.']
];
export function mountPortPresentation(root){
 if(!root)return()=>{};
 const readout=root.querySelector('[data-readout]'),controls=[...root.querySelectorAll('[data-step]')];
 const sync=()=>{
  const index=Number(controls.find(b=>b.hasAttribute('data-current'))?.dataset.step??0),focus=index===3&&root.dataset.portLoading?Math.floor(Number(root.dataset.portLoading)/2):NEEDS.findIndex(n=>readout?.textContent.startsWith(n.service)),copy=index===3&&focus>=0?SERVICES[focus]:PORT_COPY[index];
  root.dataset.portStage=String(index);root.dataset.portFocus=String(focus);
  for(const [selector,text]of [['[data-port-number]',String(index+1).padStart(2,'0')],['[data-port-title]',copy[0]],['[data-port-detail]',copy[1]]]){const node=root.querySelector(selector);if(node.textContent!==text)node.textContent=text;}
 };
 const observer=new MutationObserver(sync);observer.observe(root,{attributes:true,attributeFilter:['data-port-loading']});if(readout)observer.observe(readout,{childList:true,characterData:true,subtree:true});controls.forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['data-current']}));sync();
 const tip=document.createElement('div');tip.className='bump-workflow-tooltip bump-port-tooltip';tip.hidden=true;tip.setAttribute('role','tooltip');root.append(tip);const listeners=[];
 const listen=(node,type,fn)=>{node.addEventListener(type,fn);listeners.push(()=>node.removeEventListener(type,fn));},hide=()=>{tip.hidden=true;highlightHoveredPart(root,null);delete root.dataset.portInspect;};
 // Centre of the long visible hull face, with the same isometric baseline.
 for(const label of root.querySelectorAll('svg .iso-face-text'))if(label.textContent==='BUMP'){label.setAttribute('transform','matrix(1.3 0.408 0 1.108 336.5 257.6)');label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','central');label.setAttribute('font-size','9.5');}
 for(const label of root.querySelectorAll('svg .iso-face-text'))if(label.textContent==='MONTRÉAL'){label.setAttribute('font-size','8');label.setAttribute('font-weight','700');label.style.fill='#183627';label.style.letterSpacing='.3px';}
 const stage=root.querySelector('.iso-stage'),svg=stage.querySelector('svg');
 stage.removeAttribute('tabindex');stage.setAttribute('aria-label','Port de Montréal, Bump. Survolez un conteneur pour découvrir son rôle.');
 const cargo=[...svg.querySelectorAll('[data-cargo],[data-port-restock]')],labels=['AUTO','API','CODE','IA','AUDIT','SÉCU'];
 cargo.forEach(part=>{const j=Number(part.dataset.cargo??part.dataset.portRestock);
  const element=part.querySelector('[data-need]');if(!element)return;
  const need=Number(element.dataset.need),copy=PORT_CONTAINERS[j],b=part.getBBox();
  element.setAttribute('data-bump-info','port-cargo-'+j);element.setAttribute('tabindex','0');element.setAttribute('role','group');element.setAttribute('aria-label',SERVICES[need][0]+' : '+copy[0]+'. '+copy[1]);
  const mark=document.createElementNS('http://www.w3.org/2000/svg','text');mark.setAttribute('class','port-cargo-label');mark.setAttribute('x',String(b.x+6));mark.setAttribute('y',String(b.y+b.height-13));mark.setAttribute('transform',`rotate(17.4 ${b.x+6} ${b.y+b.height-13})`);mark.textContent=labels[j];mark.dataset.portLabel=String(need);element.append(mark);listeners.push(()=>mark.remove());
  const show=()=>{
   highlightHoveredPart(root,element);root.dataset.portInspect=String(j);tip.replaceChildren();const title=document.createElement('strong'),detail=document.createElement('p');title.textContent=copy[0]+' · '+SERVICES[need][0];detail.textContent=copy[1];tip.append(title,detail);tip.hidden=false;
   const rect=element.getBoundingClientRect(),r=root.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(r.width-tip.offsetWidth-8,rect.left-r.left+rect.width/2-tip.offsetWidth/2))+'px';tip.style.top=Math.max(8,rect.top-r.top-tip.offsetHeight-12)+'px';
  };
  listen(element,'pointerenter',show);listen(element,'pointerleave',hide);listen(element,'focus',show);listen(element,'blur',hide);
 });
 // These cargoes explain on hover/focus. The supplied click/transport handlers
 // stay inside the immutable source but are not active in this landing page.
 const block=event=>{if(event.type==='click'||['ArrowLeft','ArrowRight',' ','Home','a','l','c','1','2','3','4','5'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}};
 svg.addEventListener('click',block,true);stage.addEventListener('keydown',block,true);listeners.push(()=>svg.removeEventListener('click',block,true),()=>stage.removeEventListener('keydown',block,true));
 listen(root,'keydown',event=>{if(event.key==='Escape')hide();});listen(window,'scroll',hide);listen(window,'resize',hide);
 return()=>{observer.disconnect();hide();listeners.forEach(remove=>remove());tip.remove();};
}
