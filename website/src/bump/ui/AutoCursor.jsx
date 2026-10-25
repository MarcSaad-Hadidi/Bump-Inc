import {r as React} from '/runtime/assets/components-BdJai906.js';

// A finite pointer cue, positioned over the real control. Controllers own the
// demonstration action; this layer never dispatches visitor input or scrolls.
export function AutoCursor({root,selector,phase='none',sequence=0}){
 const [point,setPoint]=React.useState(null),last=React.useRef(null);
 React.useLayoutEffect(()=>{
  if(phase==='none'){setPoint(null);return;}
  const host=root.current;if(!host)return;
  let frame=0;
  const measure=()=>{
   const target=host.querySelector(selector),b=target?.getBoundingClientRect(),base=host.getBoundingClientRect();
   if(b?.width&&b.height)last.current={x:Math.max(6,Math.min(base.width-28,b.left-base.left+b.width*.66)),y:Math.max(5,Math.min(base.height-30,b.top-base.top+b.height*.56))};
   return last.current;
  };
  const destination=measure();if(!destination)return;
  if(phase==='approach'){
   setPoint({x:Math.max(6,destination.x-65),y:Math.min(host.getBoundingClientRect().height-30,destination.y+46)});
   frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>setPoint(measure()||destination));});
  }else setPoint(destination);
  const resize=new ResizeObserver(()=>{const next=measure();if(next)setPoint(next);});resize.observe(host);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();};
 },[root,selector,phase,sequence]);
 if(phase==='none'||!point)return null;
 return <><span className="bump-demo-cursor" data-auto-cursor={phase} data-cursor-target={selector} style={{left:point.x,top:point.y}} aria-hidden="true"><svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg></span>{phase==='click'&&<i key={sequence} className="bump-demo-click" data-auto-click={selector} style={{left:point.x-11,top:point.y-10,zIndex:26,pointerEvents:'none'}} aria-hidden="true"/>}</>;
}
