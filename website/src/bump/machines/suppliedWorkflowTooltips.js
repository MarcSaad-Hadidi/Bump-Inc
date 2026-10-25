import {highlightHoveredPart} from '../ui/hoverDemonstration.js';
const explanations={
 devis:{client:'Le formulaire rassemble le besoin du client et les informations nécessaires au devis.',task:'La demande devient une tâche structurée. Les informations sont reprises automatiquement.',a:'La fiche client est créée dans le CRM pour garder le même contexte.',b:'Un brouillon de devis est préparé avec l’assistance de l’IA. Il reste à vérifier.',c:'L’équipe reçoit les informations utiles pour prendre le relais.',human:'Votre équipe vérifie les informations avant leur envoi. Son accord autorise la suite du parcours.',out:'Le devis approuvé et les informations validées sont envoyés au client.'},
 facture:{client:'Le courriel du fournisseur apporte la facture et ses informations.',task:'La facture devient une tâche à traiter, sans nouvelle saisie du dossier.',a:'Les données de la facture préparent une écriture comptable.',b:'La date de paiement est planifiée selon les conditions du fournisseur.',c:'La pièce justificative est classée dans le bon dossier.',human:'Le responsable des finances vérifie et approuve avant la suite.',out:'Le paiement approuvé peut être transmis au système concerné.'},
 support:{client:'Le message du client ouvre un parcours de prise en charge.',task:'La demande devient une tâche suivie par l’équipe de support.',a:'Un ticket est ouvert et sa priorité est préparée.',b:'Une réponse est proposée avec l’assistance de l’IA, puis vérifiée.',c:'Un technicien est assigné selon sa disponibilité.',human:'Le technicien vérifie la proposition avant son envoi.',out:'La réponse validée est envoyée au client et le ticket est mis à jour.'}
};

export function mountWorkflowTooltips(root){
 if(!root)return()=>{};
 const svg=root.querySelector('.iso-stage svg'),cards=[...root.querySelectorAll('[data-card]')];if(!svg)return()=>{};
 const approval=svg.querySelector('[data-card="human"] .iso-solid');approval?.setAttribute('data-bump-approval-card','true');
 const tip=document.createElement('div');tip.className='bump-workflow-tooltip';tip.id='bump-workflow-part-description';tip.setAttribute('role','tooltip');tip.hidden=true;
 const title=document.createElement('strong'),detail=document.createElement('p');tip.append(title,detail);root.append(tip);
 let active=null,rects=null;
 const calm=matchMedia('(prefers-reduced-motion: reduce)');
 const label=id=>root.querySelector(`[data-t="${id}-0"]`)?.textContent||id;
 const updateLabels=()=>cards.forEach(card=>{card.setAttribute('data-bump-info',card.dataset.card);card.setAttribute('tabindex','0');card.setAttribute('role','group');card.setAttribute('aria-label',label(card.dataset.card));card.setAttribute('aria-describedby',tip.id);});
 function hide(){active=null;tip.hidden=true;highlightHoveredPart(root,null);delete root.dataset.workflowInspected;}
 function show(card){
  if(!card){hide();return;}const id=card.dataset.card,kind=root.querySelector('[data-kind]')?.value||'devis';
  if(active===id&&!tip.hidden)return;
  active=id;highlightHoveredPart(root,card);title.textContent=label(id);detail.textContent=(explanations[kind]||explanations.devis)[id];tip.hidden=false;root.dataset.workflowInspected=id;
  const b=card.getBoundingClientRect(),host=root.getBoundingClientRect(),t=tip.getBoundingClientRect();
  tip.style.left=Math.max(8,Math.min(host.width-t.width-8,b.left-host.left+b.width/2-t.width/2))+'px';
  tip.style.top=Math.max(6,b.top-host.top-t.height-12)+'px';
  if(!calm.matches)tip.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:160,easing:'ease-out'});
 }
 function hit(event){
  const direct=event.target.closest('[data-card]');if(direct)return direct;
  if(!rects)rects=cards.map(card=>({card,box:card.getBoundingClientRect()}));
  return rects.find(({box:b})=>event.clientX>=b.left&&event.clientX<=b.right&&event.clientY>=b.top&&event.clientY<=b.bottom)?.card;
 }
 const move=event=>{if(event.pointerType!=='touch')show(hit(event));};
 const touch=event=>{if(event.pointerType!=='touch')return;const card=hit(event);if(card?.dataset.card===active)hide();else show(card);};
 const focus=event=>{const card=event.target.closest('[data-card]');if(card)show(card);};
 const blur=event=>{if(!root.contains(event.relatedTarget)||!event.relatedTarget?.closest('[data-card]'))hide();};
 const escape=event=>{if(event.key==='Escape')hide();};
 const changed=event=>{if(event.target.matches('[data-kind]')){hide();updateLabels();}};
 const invalidate=()=>{rects=null;hide();};
 updateLabels();
 svg.addEventListener('pointermove',move);svg.addEventListener('pointerdown',touch);svg.addEventListener('pointerleave',hide);root.addEventListener('focusin',focus);root.addEventListener('focusout',blur);root.addEventListener('keydown',escape);root.addEventListener('change',changed);
 window.addEventListener('scroll',invalidate,{passive:true});window.addEventListener('resize',invalidate);
 return()=>{approval?.removeAttribute('data-bump-approval-card');tip.remove();svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerdown',touch);svg.removeEventListener('pointerleave',hide);root.removeEventListener('focusin',focus);root.removeEventListener('focusout',blur);root.removeEventListener('keydown',escape);root.removeEventListener('change',changed);window.removeEventListener('scroll',invalidate);window.removeEventListener('resize',invalidate);};
}
