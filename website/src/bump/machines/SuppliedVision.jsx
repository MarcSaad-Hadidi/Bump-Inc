import React from 'react';
import VisionBench from '../../components/bump-anatomy/vision/VisionBench';
import {observeDemoReady} from '../ui/demoReady.js';
import {mountVisionPresentation,VISION_COPY} from './suppliedVisionPresentation';

export default function SuppliedVision(){
 const root=React.useRef(null),[active,setActive]=React.useState(false),[revision,remount]=React.useReducer(n=>n+1,0);
 React.useEffect(()=>{
  let entered=false;
  const stop=observeDemoReady(root.current,next=>{setActive(next);if(next){if(entered)remount();entered=true;}}),motion=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>remount();
  motion.addEventListener('change',change);
  return()=>{stop();motion.removeEventListener('change',change);};
 },[]);
 React.useEffect(()=>mountVisionPresentation(root.current),[revision]);
 return <section ref={root} className="bump-vision-live" data-vision-active={String(active)} data-bump-fixed-timing="true" aria-label="Notre vision à long terme">
  <h3 className="bump-vision-heading">Des besoins réels. Une vision à construire.</h3>
  <VisionBench key={revision}/>
  <div className="bump-vision-explanation" aria-live="off"><span data-vision-number="">01</span><div><h4 data-vision-title="">{VISION_COPY[0][0]}</h4><p data-vision-detail="">{VISION_COPY[0][1]}</p></div></div>
 </section>;
}
