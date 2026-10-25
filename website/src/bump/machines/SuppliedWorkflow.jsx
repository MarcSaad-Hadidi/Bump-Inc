import React from 'react';
import Workflow from '../../components/bump-anatomy/workflow/Workflow';
import {mountWorkflowPlayback} from './suppliedWorkflowPlayback';
import {mountWorkflowTooltips} from './suppliedWorkflowTooltips';

// The supplied React figure and all of its geometry, curves and native model
// stay intact. This host drives its own real controls, like a visitor would.
export default function SuppliedWorkflow(){
 const root=React.useRef(null);
 React.useEffect(()=>{const playback=mountWorkflowPlayback(root.current),tooltips=mountWorkflowTooltips(root.current);return()=>{playback();tooltips();};},[]);
 return <div ref={root} className="bump-workflow-live" data-bump-fixed-timing="true">
  <Workflow/>
  <div className="bump-workflow-approval" role="status"><i aria-hidden="true"/><span>En attente de votre approbation</span></div>
  <div className="bump-workflow-description" aria-live="off">
   <span data-workflow-number="">01</span>
   <div><h3 data-workflow-title="">Chaque demande trouve sa place.</h3><p data-workflow-detail="">Le besoin du client et ses coordonnées sont réunis dès le départ, pour préparer le devis sans repartir de zéro.</p></div>
  </div>
 </div>;
}
