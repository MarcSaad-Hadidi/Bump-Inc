// Adapted from UI TripleD's WorkflowConnectionLine (MIT) and Render's
// WorkflowEdge (MIT): cubic connectors, active path and travelling packet.
import {r as React} from '/runtime/assets/components-BdJai906.js';

export function connectionPath(from,to,vertical) {
  if(vertical){
    const x1=from.position.x+from.width/2,y1=from.position.y+from.height;
    const x2=to.position.x+to.width/2,y2=to.position.y,mid=(y1+y2)/2;
    return `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`;
  }
  const x1=from.position.x+from.width,y1=from.position.y+from.height/2;
  const x2=to.position.x,y2=to.position.y+to.height/2,mid=(x1+x2)/2;
  return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
}

export function WorkflowEdge({edge,nodes,isActive,isComplete,vertical,run}) {
  const from=nodes.find(n=>n.id===edge.from),to=nodes.find(n=>n.id===edge.to);
  if(!from||!to)return null;
  const path=connectionPath(from,to,vertical);
  return <g className="bump-flow-edge" data-edge={edge.id} data-active={isActive} data-complete={isComplete}>
    <path d={path} className="bump-flow-route" fill="none"/>
    {isActive&&<g key={run}>
      <path d={path} pathLength="1" className="bump-flow-route-draw" fill="none"/>
      <circle r="7" className="bump-flow-packet-halo" style={{offsetPath:`path('${path}')`}}/>
      <circle r="3.5" className="bump-flow-packet" style={{offsetPath:`path('${path}')`}}/>
    </g>}
  </g>;
}
