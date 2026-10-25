// Adapted from Render WorkflowNode and UI TripleD N8nWorkflowBlock (MIT).
// Original positioned node, type badge, icon and active border anatomy retained.
import {r as React} from '/runtime/assets/components-BdJai906.js';
const paths={
 form:'M4 3h16v18H4z M8 8h8 M8 12h8 M8 16h4',
 organize:'M3 7h7l2 2h9v11H3z M3 7V4h7l2 3 M8 14h8 M8 17h5',
 person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 13-6 M16 18l3 3 4-6',
 database:'M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3 M4 6v12c0 2 4 3 8 3s8-1 8-3V6 M4 12c0 2 4 3 8 3s8-1 8-3',
 mail:'M3 5h18v14H3z m0 0 9 8 9-8',
 document:'M5 3h9l5 5v13H5z M14 3v6h5 M9 13h6 M9 17h6',
 check:'m5 12 4 4 10-10',play:'m8 5 11 7-11 7z',pause:'M8 5v14 M16 5v14',reset:'M4 5v6h6 M4 11a8 8 0 1 1 1 7',next:'m7 5 9 7-9 7 M19 5v14',back:'m17 5-9 7 9 7 M5 5v14',arrow:'M5 12h14 m-5-5 5 5-5 5'
};
export function WorkflowIcon({name,className=''}){return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.document}/></svg>;}

export function WorkflowNode({node,isActive,isComplete,waiting,onApprove}){
  const [explaining,setExplaining]=React.useState(false),ref=React.useRef(null),pressedOpen=React.useRef(false);
  React.useEffect(()=>{if(!explaining)return;const outside=event=>{if(!ref.current?.contains(event.target))setExplaining(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[explaining]);
  const ready=waiting&&node.id==='approval';
  const status=ready?'En attente d’approbation':isComplete?node.output:isActive?'En cours…':'En attente';
  const tooltipId='bump-flow-tip-'+node.id;
  return <button ref={ref} type="button" className="bump-flow-node" data-node={node.id} data-state={ready?'waiting':isComplete?'complete':isActive?'active':'idle'} data-explaining={explaining} aria-describedby={tooltipId} aria-label={ready?'Valider et continuer':node.label+' — voir le rôle'} onPointerEnter={e=>{if(e.pointerType==='mouse')setExplaining(true);}} onPointerLeave={e=>{if(e.pointerType==='mouse')setExplaining(false);}} onFocus={()=>setExplaining(true)} onBlur={()=>setExplaining(false)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setExplaining(false);}}} onPointerDown={()=>{pressedOpen.current=explaining;}} onClick={e=>{if(ready)onApprove();else setExplaining(e.nativeEvent.pointerType==='touch'?!pressedOpen.current:true);}} style={{left:node.position.x,top:node.position.y,width:node.width,height:node.height}}>
    <span className={'bump-flow-port bump-flow-port--in'+(node.type==='trigger'?' is-hidden':'')} aria-hidden="true"/>
    <span className={'bump-flow-port bump-flow-port--out'+(['record','notify'].includes(node.id)?' is-hidden':'')} aria-hidden="true"/>
    <span className="bump-flow-node-head"><span className="bump-flow-node-icon"><WorkflowIcon name={isComplete?'check':node.icon}/></span><span><small>{node.type==='trigger'?'DÉCLENCHEUR':node.id==='approval'?'VALIDATION HUMAINE':'ACTION'}</small><strong>{node.label}</strong></span></span>
    <span className="bump-flow-node-description">{node.description}</span>
    <span className="bump-flow-node-status"><i aria-hidden="true"/>{status}{ready&&<WorkflowIcon name="arrow"/>}</span>
    <span id={tooltipId} role="tooltip" className="bump-flow-node-tooltip" aria-hidden={!explaining}><strong>{node.label}</strong><span>{node.detail}</span></span>
  </button>;
}
