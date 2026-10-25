import {r as React} from '/runtime/assets/components-BdJai906.js';
import {motionMilliseconds} from '/runtime/assets/BumpPlayback.js';

// Measure the real next control before its action. Keep that pre-action point
// when menus/dialogs unmount on click; click feedback never travels to the next
// control or dispatches a synthetic visitor event.
export function DemoCursor({scenario,actions=[]}){
 const [point,setPoint]=React.useState(null),[click,setClick]=React.useState(null),[layout,setLayout]=React.useState(0);
 const last=React.useRef(-1),cache=React.useRef(new Map()),latest=React.useRef(actions);latest.current=actions;
 const {root,time,active,reduced,revision}=scenario;
 React.useEffect(()=>{last.current=-1;cache.current.clear();setPoint(null);setClick(null);},[revision]);
 React.useEffect(()=>{const node=root.current;if(!node)return;const observer=new ResizeObserver(()=>{setLayout(value=>value+1);});observer.observe(node);return()=>observer.disconnect();},[root]);
 React.useEffect(()=>{
  if(!active||reduced)return;const element=root.current;if(!element)return;
  const list=latest.current,passed=list.findLast(a=>a.at<=time),next=list.find(a=>a.at>time);let timer;
  const key=action=>action.at+':'+action.selector;
  const measure=action=>{if(!action)return null;const target=element.querySelector(action.selector);if(!target)return cache.current.get(key(action))??null;const b=target.getBoundingClientRect(),base=element.getBoundingClientRect();if(!b.width||!b.height)return cache.current.get(key(action))??null;const p={x:Math.max(0,Math.min(innerWidth-base.left-28,b.left-base.left+b.width*(action.x??.66))),y:b.top-base.top+b.height*(action.y??.55),target:action.selector};cache.current.set(key(action),p);return p;};
  const move=()=>{const p=measure(next);if(p)setPoint(p);};
  if(passed&&passed.at>last.current){last.current=passed.at;const p=cache.current.get(key(passed))??measure(passed);if(p){setPoint(p);setClick({...p,at:passed.at});}timer=setTimeout(move,motionMilliseconds(260));}
  else move();
  return()=>clearTimeout(timer);
 },[root,time,active,reduced,revision,layout]);
 if(!point||!active||reduced)return null;
 return <><span className="bump-demo-cursor" data-cursor-target={point.target} style={{left:point.x,top:point.y}} aria-hidden="true"><svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg></span>{click&&<i key={revision+':'+click.at} className="bump-demo-click" data-click-at={click.at} data-click-target={click.target} style={{left:click.x-11,top:click.y-10,zIndex:26,pointerEvents:'none'}} aria-hidden="true"/>}</>;
}
