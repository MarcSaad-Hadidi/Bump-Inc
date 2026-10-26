import {r as React} from '/runtime/assets/components-BdJai906.js';

import {mountCaptionTransitions} from '../ui/captionTransitions.js';
import {mountDemoTransport} from '../ui/demoTransport.js';
import {mountHoverDemonstration} from '../ui/hoverDemonstration.js';
import {mountModelViewportFit} from '../ui/modelViewportFit.js';

const transportLabels={workflow:'le workflow',method:'Notre méthode',security:'la cybersécurité',vision:'Notre vision',port:'le port Bump',integration:'Vos outils'};
const scenes={
 workflow:React.lazy(()=>import('/runtime/assets/BumpWorkflowMachine.js')),
 method:React.lazy(()=>import('/runtime/assets/BumpWorkshop.js')),
 security:React.lazy(()=>import('/runtime/assets/BumpSecurityEngine.js')),
 vision:React.lazy(()=>import('/runtime/assets/BumpVisionSculpture.js')),
 research:React.lazy(()=>import('/runtime/assets/BumpResearchNetwork.js')),
 port:React.lazy(()=>import('/runtime/assets/BumpPort.js')),
 'company-flow':React.lazy(()=>import('/runtime/assets/BumpCompanyFlow.js')),
 integration:React.lazy(()=>import('/runtime/assets/BumpIntegrationCore.js'))
};

// Stable space is present from the first layout. Only an approaching figure
// imports its geometry and mounts its live SVG; the paintings stay independent.
export function DeferredMachine({kind,id,className='',...props}){
 const root=React.useRef(null),[loaded,setLoaded]=React.useState(false),Scene=scenes[kind];
 React.useEffect(()=>mountCaptionTransitions(root.current),[]);
 React.useEffect(()=>mountModelViewportFit(root.current,kind),[kind]);
 React.useEffect(()=>{if(transportLabels[kind])return mountDemoTransport(root.current,transportLabels[kind]);},[kind]);
 React.useEffect(()=>{if(loaded)return mountHoverDemonstration(root.current,kind);},[loaded,kind]);
 React.useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setLoaded(true);observer.disconnect();}},{rootMargin:'1600px'});if(root.current)observer.observe(root.current);return()=>observer.disconnect();},[]);
 return <div ref={root} id={id} className={'bump-machine-slot bump-machine-slot--'+kind+' '+(kind==='workflow'?'bump-workflow-import ':kind==='integration'?'bump-tools-import ':kind==='security'?'bump-security-import ':kind==='method'?'bump-method-import ':kind==='vision'?'bump-vision-import ':kind==='port'?'bump-port-import ':'')+className} data-bump-transport="true" data-bump-machine={kind} data-bump-local-keys={kind==='workflow'||kind==='integration'||kind==='security'||kind==='method'||kind==='vision'||kind==='port'?'true':undefined}>
  {loaded&&<React.Suspense fallback={<span className="bump-machine-loading" role="status">Préparation de la scène…</span>}><Scene {...props}/></React.Suspense>}
 </div>;
}
