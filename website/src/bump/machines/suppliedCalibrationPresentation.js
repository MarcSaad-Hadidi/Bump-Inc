import {highlightHoveredPart} from '../ui/hoverDemonstration.js';
export const methodExplanations=[
 ['Audit — Comprendre votre réalité.','Nous passons en revue vos processus, vos outils et vos contraintes pour comprendre ce qui vous ralentit et définir les priorités.'],
 ['Analyse — Identifier les causes.','Nous relions les constats pour identifier les causes : tâches répétitives, outils isolés, données dispersées ou risques de sécurité.'],
 ['Proposition — Choisir la bonne approche.','Nous comparons les options et vous proposons un plan clair : solution retenue, étapes de réalisation et priorités à valider ensemble.'],
 ['Implantation — Passer au concret.','Nous développons et intégrons la solution à vos outils, puis vérifions son fonctionnement avec votre équipe avant sa mise en service.'],
 ['Maintenance — Faire évoluer la solution.','Nous suivons la solution dans le temps, corrigeons les problèmes et l’ajustons à mesure que vos besoins évoluent.']
];
export function mountMethodAnnotations(root){
 if(!root)return()=>{};
 const readout=root.querySelector('[data-readout]'),controls=[...root.querySelectorAll('[data-step]')];
 let lastStage=-1;
 const sync=()=>{
  const i=Number(controls.find(b=>b.hasAttribute('data-current'))?.dataset.step??0);
  if(i!==lastStage){lastStage=i;root.dataset.methodStage=String(i);
   root.querySelector('[data-method-number]').textContent=String(i+1).padStart(2,'0');
   root.querySelector('[data-method-title]').textContent=methodExplanations[i][0];
   root.querySelector('[data-method-detail]').textContent=methodExplanations[i][1];
  }
  const reading=root.querySelector('[data-method-reading]'),value=readout?.textContent??'';if(reading.textContent!==value)reading.textContent=value;
 };
 const observer=new MutationObserver(sync);
 if(readout)observer.observe(readout,{childList:true,characterData:true,subtree:true});
 controls.forEach(button=>observer.observe(button,{attributes:true,attributeFilter:['data-current']}));
 sync();
 const tooltip=document.createElement('div');tooltip.className='bump-workflow-tooltip bump-method-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','tooltip');root.append(tooltip);
 const handlers=[];
 const listen=(target,type,fn)=>{target.addEventListener(type,fn);handlers.push(()=>target.removeEventListener(type,fn));};
 const hide=()=>{tooltip.hidden=true;highlightHoveredPart(root,null);};
 const tips=[
  ['[data-part="rotor"]','Votre point de départ','Nous partons de vos opérations et de vos outils pour comprendre les blocages avant de proposer une solution.'],
  ['[data-part="bell-front"]','Analyser avant d’intervenir','L’analyse permet de chercher les causes du problème et de choisir une intervention adaptée.'],
  ['[data-part="arm"]','Mettre en place, puis vérifier','La solution retenue est implantée et intégrée à vos outils. Son fonctionnement est vérifié avec votre équipe.'],
  ['[data-part="wave"]','Comparer sur des faits','Les mesures illustrent la comparaison des options et la vérification de l’amélioration après intervention.'],
  ...['A','B','C'].map(id=>['[data-knob="'+id+'"]','Comparer l’option '+id,'À l’étape Proposition, explorez ce réglage pour comparer les options avant de retenir la solution adaptée.']),
  ['[data-s="paper"]','Un suivi dans le temps','Les contrôles et les ajustements sont documentés pour accompagner l’évolution de votre solution.']
 ];
 for(const [selector,title,detail]of tips){
  const element=root.querySelector(selector);if(!element)continue;
  element.setAttribute('data-bump-info',selector);element.setAttribute('tabindex','0');if(!element.hasAttribute('role'))element.setAttribute('role','group');
  element.setAttribute('aria-label',title+'. '+detail);
  const show=()=>{highlightHoveredPart(root,element);tooltip.replaceChildren();const strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=detail;tooltip.append(strong,p);tooltip.hidden=false;const host=root.getBoundingClientRect(),part=element.getBoundingClientRect(),width=tooltip.offsetWidth;tooltip.style.left=Math.max(8,Math.min(host.width-width-8,part.left-host.left+part.width/2-width/2))+'px';tooltip.style.top=Math.max(8,part.top-host.top-tooltip.offsetHeight-12)+'px';};
  listen(element,'pointerenter',show);listen(element,'pointerleave',hide);listen(element,'focus',show);listen(element,'blur',hide);
  if(element.hasAttribute('data-knob'))listen(element,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();element.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 }
 listen(root,'keydown',e=>{if(e.key==='Escape')hide();});listen(window,'scroll',hide);listen(window,'resize',hide);
 return()=>{observer.disconnect();handlers.forEach(remove=>remove());tooltip.remove();};
}
