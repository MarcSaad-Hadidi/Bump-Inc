import {highlightHoveredPart,hoverTargetIsVisible} from '../ui/hoverDemonstration.js';
export const methodExplanations=[
 ['Audit — Partir de vos outils.','Courriels, ventes, facturation : nous dressons la carte de votre fonctionnement et des informations qui circulent.'],
 ['Analyse — Trouver ce qui bloque.','Nous repérons les liens manquants et les doubles saisies qui ralentissent vos opérations.'],
 ['Proposition — Choisir le bon raccord.','Vous validez une approche adaptée : connecter vos outils, remplacer une limite ou simplifier une étape.'],
 ['Implantation — Relier, puis vérifier.','Nous mettons la connexion en place et vérifions le parcours avec votre équipe avant la mise en service.'],
 ['Maintenance — Garder le cap.','Nous suivons le fonctionnement, corrigeons les ralentissements et ajustons la solution à vos besoins.']
];
export function mountMethodAnnotations(root){
 if(!root)return()=>{};
 const readout=root.querySelector('[data-readout]'),controls=[...root.querySelectorAll('[data-step]')];
 let lastStage=-1;
 const annotated=[];
 const sync=()=>{
  const i=Number(controls.find(b=>b.hasAttribute('data-current'))?.dataset.step??0);
  if(i!==lastStage){lastStage=i;root.dataset.methodStage=String(i);
   root.querySelector('[data-method-number]').textContent=String(i+1).padStart(2,'0');
   root.querySelector('[data-method-title]').textContent=methodExplanations[i][0];
   root.querySelector('[data-method-detail]').textContent=methodExplanations[i][1];
  }
  const reading=root.querySelector('[data-method-reading]'),value=readout?.textContent??'';if(reading.textContent!==value)reading.textContent=value;
  for(const element of annotated){const visible=hoverTargetIsVisible(element,root);element.setAttribute('tabindex',visible?'0':'-1');element.style.pointerEvents=visible?'':'none';}
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
  ['[data-tool="0"]','Courriels — Le point de départ','Une demande reçue par courriel peut alimenter votre suivi sans être recopiée d’un outil à l’autre. Le périmètre et les validations sont définis avec vous.'],
  ['[data-tool="1"]','Ventes — Un suivi partagé','Les informations commerciales doivent être disponibles pour les bonnes personnes, avec un statut clair et une prochaine action.'],
  ['[data-tool="2"]','Facturation — Le bon passage de relais','Une vente validée peut préparer la facturation. Nous vérifions les informations transmises et les exceptions avant la mise en service.'],
  ['[data-tool="3"]','Comptabilité — Des données cohérentes','Les échanges entre facturation et comptabilité sont cadrés pour limiter les doubles saisies et faciliter les rapprochements.'],
  ['[data-tool="4"]','Inventaire — Une information à jour','La disponibilité et les mouvements doivent circuler entre les outils concernés. Un ralentissement peut être détecté puis corrigé.'],
  ['[data-connector]','Le raccord — Une intégration adaptée','La liaison représente une connexion entre vos logiciels. Elle est choisie selon vos besoins, puis testée avec votre équipe.'],
  ['[data-score]','La santé du parcours','Cet indicateur fictif rend l’évolution du scénario visible. Il ne représente pas une mesure ou un résultat client de Bump.'],
  ['[data-opt="0"]','Connecter les outils existants','Quand vos outils répondent déjà au besoin, une intégration peut suffire pour faire circuler les informations.'],
  ['[data-opt="1"]','Remplacer une limite identifiée','Changer un outil peut être pertinent quand ses limites empêchent le fonctionnement souhaité. Les impacts sont comparés avant de décider.'],
  ['[data-opt="2"]','Garder une solution proportionnée','Un outil simple peut répondre à un besoin limité. Nous comparons son usage, ses contraintes et sa maintenance avant de le retenir.']
 ];
 for(const [selector,title,detail]of tips){
  const element=root.querySelector(selector);if(!element)continue;
  annotated.push(element);
  element.setAttribute('data-bump-info',selector);element.setAttribute('tabindex','0');if(!element.hasAttribute('role'))element.setAttribute('role','group');
  element.setAttribute('aria-label',title+'. '+detail);
  const show=()=>{if(!hoverTargetIsVisible(element,root)){hide();return;}highlightHoveredPart(root,element);tooltip.replaceChildren();const strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=detail;tooltip.append(strong,p);tooltip.hidden=false;const host=root.getBoundingClientRect(),part=element.getBoundingClientRect(),width=tooltip.offsetWidth;tooltip.style.left=Math.max(8,Math.min(host.width-width-8,part.left-host.left+part.width/2-width/2))+'px';tooltip.style.top=Math.max(8,part.top-host.top-tooltip.offsetHeight-12)+'px';};
  listen(element,'pointerenter',show);listen(element,'pointerleave',hide);listen(element,'focus',show);listen(element,'blur',hide);

 }
 sync();
 listen(root,'keydown',e=>{if(e.key==='Escape')hide();});listen(window,'scroll',hide);listen(window,'resize',hide);
 return()=>{observer.disconnect();handlers.forEach(remove=>remove());tooltip.remove();};
}
