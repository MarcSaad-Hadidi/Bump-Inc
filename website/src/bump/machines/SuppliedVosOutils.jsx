import React from 'react';
import VosOutils from '../../components/bump-anatomy/vos-outils/VosOutils';
import {mountVosOutilsPlayback} from './suppliedVosOutilsPlayback';
import {mountVosOutilsTooltips} from './suppliedVosOutilsTooltips';

// The delivered SVG, gearing and native renderer are used without alteration.
export default function SuppliedVosOutils(){
 const root=React.useRef(null);
 React.useEffect(()=>{const playback=mountVosOutilsPlayback(root.current),tooltips=mountVosOutilsTooltips(root.current);return()=>{playback();tooltips();};},[]);
 return <section ref={root} className="bump-tools-live" data-tools-ready="false" data-tools-stage="0" data-bump-fixed-timing="true" aria-label="Vos outils, un fonctionnement commun">
  <h3 className="bump-tools-heading">Vos outils. Enfin connectés.</h3>
  <VosOutils/>
  <div className="bump-tools-description" aria-live="off">
   <span data-tools-number="">Avant</span>
   <div><h4 data-tools-title="">Vos données sont dispersées.</h4><p data-tools-detail="">Vos équipes passent d’un outil à l’autre pour retrouver les informations d’un même client.</p></div>
  </div>
 </section>;
}
