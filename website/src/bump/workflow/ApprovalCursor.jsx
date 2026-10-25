import {r as React} from '/runtime/assets/components-BdJai906.js';

// A finite approach to the actual approval control. Automatic nodes never click.
export function ApprovalCursor({root,phase,run}){
  const [point,setPoint]=React.useState(null);
  React.useLayoutEffect(()=>{const canvas=root.current,target=canvas?.querySelector('[data-node="approval"] .bump-flow-node-status');if(!target)return;const measure=()=>{const a=canvas.getBoundingClientRect(),b=target.getBoundingClientRect();setPoint({left:b.left-a.left+b.width*.67,top:b.top-a.top+b.height*.5});};measure();const observer=new ResizeObserver(measure);observer.observe(canvas);return()=>observer.disconnect();},[root]);
  if(!point)return null;
  return <span key={run} className="bump-demo-cursor bump-flow-approval-cursor" data-approval-cursor={phase} style={point} aria-hidden="true"><svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg>{phase==='clicking'&&<i className="bump-demo-click"/>}</span>;
}
