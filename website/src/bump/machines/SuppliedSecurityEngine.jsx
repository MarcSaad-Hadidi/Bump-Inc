import React from 'react';
import SecurityEngine from '../../components/bump-anatomy/security-engine/SecurityEngine';
import {mountSecurityPlayback,mountSecurityTooltips} from './suppliedSecurityPlayback';

export default function SuppliedSecurityEngine(){
 const root=React.useRef(null);
 React.useEffect(()=>{const playback=mountSecurityPlayback(root.current),tips=mountSecurityTooltips(root.current);return()=>{playback();tips();};},[]);
 return <section ref={root} className="bump-security-live" data-security-ready="false" data-bump-fixed-timing="true" aria-label="Security Engine : comprendre, corriger, protéger">
  <h3 className="bump-security-heading">Comprendre. Corriger. Protéger.</h3>
  <SecurityEngine/>
  <div className="bump-security-description" aria-live="off"><span data-security-number="">01</span><div><h4 data-security-title="">Voir clair dans votre sécurité.</h4><p data-security-detail="">Nous définissons avec vous ce qui doit être examiné et les accès autorisés, pour concentrer l’audit sur votre entreprise.</p></div></div>
  <p className="bump-security-fiction">Scénario illustratif · aucune analyse ni correction réelle.</p>
 </section>;
}
