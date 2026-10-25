import React from 'react';
import MethodLab from '../../components/bump-anatomy/methode/MethodLab';
import {mountMethodAnnotations,methodExplanations} from './suppliedMethodPresentation';
import {METHOD_PLAYBACK_RATE} from './methodRuntime';
import {observeDemoReady} from '../ui/demoReady.js';

// The delivered laboratory owns its loop. Mounting only in view also resets
// its native clock on reentry, with no competing host timer or scroll handler.
export default function SuppliedMethod(){
 const root=React.useRef(null),[active,setActive]=React.useState(false),[revision,remount]=React.useReducer(n=>n+1,0);
 React.useEffect(()=>{
  let entered=false;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const stop=observeDemoReady(root.current,next=>{setActive(next);if(next){if(entered)remount();entered=true;}});
  const changed=()=>remount();
  motion.addEventListener('change',changed);
  return()=>{stop();motion.removeEventListener('change',changed);};
 },[]);
 React.useEffect(()=>mountMethodAnnotations(root.current),[revision]);
 return <section ref={root} className="bump-method-live" data-method-active={String(active)} data-method-rate={String(METHOD_PLAYBACK_RATE)} data-bump-fixed-timing="true" aria-label="Notre méthode : laboratoire de calibration">
  <h3 className="bump-method-heading">Une méthode. Cinq étapes concrètes.</h3>
  <div className="bump-method-figure"><MethodLab key={revision}/></div>
  <div className="bump-method-description" aria-live="off"><span data-method-number="">01</span><div><h4 data-method-title="">{methodExplanations[0][0]}</h4><p data-method-detail="">{methodExplanations[0][1]}</p></div></div>
  <span className="bump-method-reading" data-method-reading="" aria-live="off">vibration 3,2 mm/s · seuil 1,0</span>
  <p className="bump-method-fiction">Laboratoire illustratif · mesures fictives.</p>
 </section>;
}
