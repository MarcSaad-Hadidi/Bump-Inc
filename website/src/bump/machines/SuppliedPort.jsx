import React from 'react';
import BumpPort from '../../components/bump-anatomy/port/BumpPort';
import {observeDemoReady} from '../ui/demoReady.js';
import {mountPortPresentation,PORT_COPY} from './suppliedPortPresentation';

export default function SuppliedPort(){
 const root=React.useRef(null),[active,setActive]=React.useState(false),[revision,remount]=React.useReducer(n=>n+1,0);
 React.useEffect(()=>{
  const stop=observeDemoReady(root.current,setActive,{onReenter:remount}),media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>remount();
  media.addEventListener('change',changed);
  return()=>{stop();media.removeEventListener('change',changed);};
 },[]);
 React.useEffect(()=>mountPortPresentation(root.current),[revision]);
 return <section ref={root} className="bump-port-live" data-port-active={String(active)} data-bump-fixed-timing="true" aria-label="Bump : un nouvel élan, depuis Montréal">
  <h3 className="bump-port-heading">La technologie doit vous donner de l’élan.</h3>
  <BumpPort key={revision}/>
  <div className="bump-port-services" aria-label="Les trois expertises Bump"><span><strong>Or</strong> Automatisation</span><span><strong>Vert</strong> Logiciels & IA</span><span><strong>Corail</strong> Cybersécurité</span></div>
  <p className="bump-port-hover-hint">Survolez un conteneur pour découvrir ce qu’il apporte.</p>
  <div className="bump-port-explanation" aria-live="off"><span data-port-number="">01</span><div><h4 data-port-title="">{PORT_COPY[0][0]}</h4><p data-port-detail="">{PORT_COPY[0][1]}</p></div></div>
 </section>;
}
