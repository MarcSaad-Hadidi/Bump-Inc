import {ApprovalCursor} from './ApprovalCursor.jsx';
import {r as React} from '/runtime/assets/components-BdJai906.js';
import {workflows,edges,layoutNodes} from './config.js';
import {WorkflowNode,WorkflowIcon} from './WorkflowNode.jsx';
import {WorkflowEdge} from './WorkflowEdge.jsx';
import {useWorkflowJourney} from './useWorkflowJourney.js';

function WorkflowPlayer({config}){
  const ref=React.useRef(null),[width,setWidth]=React.useState(0),[viewportHeight,setViewportHeight]=React.useState(innerHeight);
  const journey=useWorkflowJourney(config.stages,ref);
  React.useLayoutEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setWidth(el.clientWidth);measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[]);
  React.useEffect(()=>{const resized=()=>setViewportHeight(innerHeight);window.addEventListener('resize',resized);return()=>window.removeEventListener('resize',resized);},[]);
  const layout=React.useMemo(()=>layoutNodes(config.nodes,width||1000,viewportHeight),[config.nodes,width,viewportHeight]);
  const done=new Set(journey.stage.complete),active=new Set(journey.stage.activeNodes),activeEdges=new Set(journey.stage.activeEdges);
  return <div className="bump-flow-player" data-step={journey.stage.id} data-playing={journey.animationPlaying} data-approval-phase={journey.waiting?journey.approvalPhase:undefined} data-run={journey.run} data-reduced={journey.reduced} data-layout={layout.vertical?'vertical':'horizontal'} tabIndex="0" role="group" aria-label="Exécuter un exemple de workflow">
    <div className="bump-flow-toolbar">
      <div className="bump-flow-document"><WorkflowIcon name="document"/><span>{config.document}<small>{config.field}</small></span></div>

    </div>
    <div className="bump-flow-canvas" ref={ref} style={{height:layout.height}}>
      {width>0&&<><svg className="bump-flow-connections" width={width} height={layout.height} viewBox={`0 0 ${width} ${layout.height}`} aria-hidden="true">{edges.map(edge=><WorkflowEdge key={edge.id} edge={edge} nodes={layout.nodes} vertical={layout.vertical} isActive={activeEdges.has(edge.id)} isComplete={done.has(edge.from)&&done.has(edge.to)} run={journey.run}/>)}</svg>{layout.nodes.map(node=><WorkflowNode key={node.id} node={node} isActive={active.has(node.id)} isComplete={done.has(node.id)} waiting={journey.waiting} onApprove={journey.approve}/>)}</>}
      {journey.approvalCursor&&<ApprovalCursor root={ref} phase={journey.approvalPhase} run={journey.run}/>}
      {!layout.vertical&&<span className="bump-flow-parallel">APRÈS VOTRE VALIDATION</span>}
    </div>
    <div className="bump-flow-narration" aria-live="polite" aria-atomic="true"><span className="bump-flow-step">{String(journey.index+1).padStart(2,'0')}<small>/ 05</small></span><div key={journey.stage.id}><strong>{journey.stage.title}</strong><p>{journey.stage.description}</p></div>{journey.atEnd&&<span className="bump-flow-complete"><WorkflowIcon name="check"/>Parcours terminé</span>}</div>
  </div>;
}

export function WorkflowDemo(){
  const [scenario,setScenario]=React.useState(0);
  return <div className="bump-lab bump-workflow-demo bump-workflow-execution">
    <div className="bump-flow-intro"><div><p className="bump-lab-label">UN PARCOURS ENTRE VOS OUTILS</p><h3>Moins de détours.<em>Tout s’enchaîne.</em></h3></div><p>Une demande entre. Les bonnes actions suivent.<br/>Votre équipe garde la décision.</p></div>
    <div className="bump-flow-scenarios" role="tablist" aria-label="Choisir un workflow">{workflows.map((w,i)=><button type="button" role="tab" id={'workflow-example-'+w.id} aria-controls="workflow-example-panel" aria-selected={scenario===i} key={w.id} onClick={()=>setScenario(i)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setScenario(i===0?1:0);document.getElementById('workflow-example-'+workflows[i===0?1:0].id)?.focus();}}}><span>{String(i+1).padStart(2,'0')}</span>{w.name}<WorkflowIcon name={i===0?'form':'document'}/></button>)}</div>
    <div id="workflow-example-panel" role="tabpanel" aria-labelledby={'workflow-example-'+workflows[scenario].id}><WorkflowPlayer key={workflows[scenario].id} config={workflows[scenario]}/></div>
    <p className="bump-lab-footnote"><span className="bump-flow-footnote-full">Parcours illustratif. Chaque automatisation est adaptée à vos outils, à vos règles et aux décisions de votre équipe.</span><span className="bump-flow-footnote-short">Scénario illustratif, adapté à vos outils et à vos règles.</span></p>
  </div>;
}
