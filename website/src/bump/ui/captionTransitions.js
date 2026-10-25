const captions='.bump-workflow-description,.bump-tools-description,.bump-security-description,.bump-method-description,.bump-vision-explanation,.bump-port-explanation,.bump-research-explanation,.bump-company-flow-caption,.bump-software-cascade-body,.bump-ops-heading';
export function mountCaptionTransitions(root){
 if(!root)return()=>{};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),states=new Map();
 const bind=()=>{for(const node of root.querySelectorAll(captions)){if(node.closest('.bump-caption-ghost')||states.has(node))continue;states.set(node,{html:node.innerHTML,text:node.textContent,ghost:null,animations:[]});node.classList.add('bump-caption-transition');}};
 const ghostRecord=record=>record.target.closest?.('.bump-caption-ghost')||[...record.addedNodes,...record.removedNodes].length&&[...record.addedNodes,...record.removedNodes].every(n=>n.nodeType===1&&n.classList?.contains('bump-caption-ghost'));
 const observer=new MutationObserver(records=>{
  const changes=records.filter(record=>!ghostRecord(record));if(!changes.length)return;if(!states.size)bind();
  for(const [node,state]of states){
   if(!changes.some(r=>node===r.target||node.contains(r.target)))continue;
   const text=[...node.childNodes].filter(n=>!n.classList?.contains('bump-caption-ghost')).map(n=>n.textContent).join('');if(text===state.text)continue;
   const old=state.html;state.text=text;state.animations.forEach(a=>a.cancel());state.ghost?.remove();state.ghost=null;
   state.html=node.innerHTML;
   if(reduced.matches)continue;
   const ghost=document.createElement('div');ghost.className='bump-caption-ghost';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=old;ghost.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));node.append(ghost);state.ghost=ghost;
   const outgoing=ghost.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:220,easing:'ease-out',fill:'both'});
   const incoming=[...node.children].filter(el=>el!==ghost).map(el=>el.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,delay:180,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));state.animations=[outgoing,...incoming];
   Promise.allSettled([outgoing.finished,...incoming.map(a=>a.finished)]).then(()=>{if(state.ghost===ghost){ghost.remove();state.ghost=null;incoming.forEach(a=>a.cancel());}});

  }
 });
 bind();observer.observe(root,{childList:true,characterData:true,subtree:true});
 return()=>{observer.disconnect();for(const state of states.values()){state.animations.forEach(a=>a.cancel());state.ghost?.remove();}states.clear();};
}
