import {highlightHoveredPart} from '../ui/hoverDemonstration.js';
const parts=[
 ['Courriel','Les échanges utiles rejoignent le dossier client. Votre équipe retrouve le contexte sans fouiller dans les boîtes de réception.'],
 ['CRM','Les coordonnées et le suivi restent reliés aux autres outils pour éviter les mises à jour en double.'],
 ['Comptabilité','Les données nécessaires au traitement suivent le dossier, avec les vérifications prévues par votre équipe.'],
 ['Agenda','Les rendez-vous suivent le contexte partagé. Sélectionnez cet outil pour explorer une déconnexion, puis son retour dans le parcours.'],
 ['Excel','Vos fichiers existants peuvent rejoindre les échanges, après vérification de leur structure et de leurs données.']
];
export function mountVosOutilsTooltips(root){
 if(!root)return()=>{};const svg=root.querySelector('.iso-stage svg');if(!svg)return()=>{};
 const tip=document.createElement('div');tip.className='bump-workflow-tooltip bump-tools-tooltip';tip.id='bump-tools-part-description';tip.setAttribute('role','tooltip');tip.hidden=true;
 const title=document.createElement('strong'),detail=document.createElement('p');tip.append(title,detail);root.append(tip);let active=null;
 // A tool has separate gear and label groups. Expose one focus target per
 // physical tool, and map its label/adapter hits back to that same target.
 const tools=[...svg.querySelectorAll('[data-tool]:not([data-move])')];
 const byId=new Map(tools.map(tool=>[tool.dataset.tool,tool]));
 tools.forEach(tool=>{tool.setAttribute('data-bump-info',tool.dataset.tool);tool.setAttribute('tabindex','0');tool.setAttribute('role','group');tool.setAttribute('aria-label',parts[Number(tool.dataset.tool)][0]);tool.setAttribute('aria-describedby',tip.id);});
 const hide=()=>{active=null;tip.hidden=true;highlightHoveredPart(root,null);delete root.dataset.toolsInspected;};
 function show(tool){
  if(!tool){hide();return;}const index=Number(tool.dataset.tool);if(active===index&&!tip.hidden)return;active=index;
  highlightHoveredPart(root,tool);title.textContent=parts[index][0];detail.textContent=parts[index][1];tip.hidden=false;root.dataset.toolsInspected=String(index);
  const b=tool.getBoundingClientRect(),host=root.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(host.width-t.width-8,b.left-host.left+b.width/2-t.width/2))+'px';tip.style.top=Math.max(6,b.top-host.top-t.height-12)+'px';
 }
 function hit(event){const direct=event.target.closest('[data-tool]');if(direct)return byId.get(direct.dataset.tool);const adapter=event.target.closest('[data-adapter]');if(adapter)return byId.get(adapter.dataset.adapter);return tools.find(tool=>{const b=tool.getBoundingClientRect();return event.clientX>=b.left&&event.clientX<=b.right&&event.clientY>=b.top&&event.clientY<=b.bottom;});}
 const move=event=>{if(event.pointerType!=='touch')show(hit(event));};const touch=event=>{if(event.pointerType!=='touch')return;const tool=hit(event);if(Number(tool?.dataset.tool)===active)hide();else show(tool);};
 const focus=event=>{const tool=event.target.closest('[data-tool]');if(tool)show(tool);};const blur=event=>{if(!event.relatedTarget?.closest('[data-tool]'))hide();};const key=event=>{if(event.key==='Escape')hide();};
 svg.addEventListener('pointermove',move);svg.addEventListener('pointerdown',touch);svg.addEventListener('pointerleave',hide);root.addEventListener('focusin',focus);root.addEventListener('focusout',blur);root.addEventListener('keydown',key);window.addEventListener('scroll',hide,{passive:true});window.addEventListener('resize',hide);
 return()=>{tip.remove();svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerdown',touch);svg.removeEventListener('pointerleave',hide);root.removeEventListener('focusin',focus);root.removeEventListener('focusout',blur);root.removeEventListener('keydown',key);window.removeEventListener('scroll',hide);window.removeEventListener('resize',hide);};
}
