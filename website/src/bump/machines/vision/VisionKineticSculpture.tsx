import React from 'react';
import { VisionAssembly } from './VisionAssembly';
import { useVisionTransformationController, type VisionMotionOptions } from './VisionTransformationController';
import './vision.css';

export type VisionKineticSculptureProps = VisionMotionOptions & { className?: string };

export function VisionKineticSculpture({ className = '', scrollLinked = true, progress, onProgress }: VisionKineticSculptureProps) {
  const root = React.useRef<HTMLElement>(null);
  const id = React.useId().replace(/:/g, '');
  useVisionTransformationController(root, { scrollLinked, progress, onProgress });
  return <section ref={root} className={`bvs ${className}`} data-vision-progress="0.0000" data-phase="complexity" data-vision-mode="scroll" aria-labelledby={`${id}-heading`}>
    <div className="bvs-top">
      <p className="bvs-eyebrow">Une direction à long terme</p>
      <p className="bvs-future">Vision future · non disponible</p>
    </div>
    <div className="bvs-body">
      <div className="bvs-copy">
        <h3 id={`${id}-heading`}>De la complexité<br />à un <em>élan commun.</em></h3>
        <p className="bvs-intro">Notre ambition : des agents spécialisés qui partagent le bon contexte et se coordonnent autour de vos opérations.</p>
        <div className="bvs-phase-copy" aria-live="off">
          <p data-copy="complexity"><strong>01 — Partir du terrain</strong>Processus, développement et sécurité se croisent dans votre quotidien. Ces besoins guideront notre recherche.</p>
          <p data-copy="alignment" aria-hidden="true"><strong>02 — Relier les expertises</strong>Nous voulons concevoir des agents capables de partager leur contexte pour préparer des actions cohérentes.</p>
          <p data-copy="coherence" aria-hidden="true"><strong>03 — Garder la main</strong>À terme, cette infrastructure aiderait vos équipes à coordonner les actions et à valider les décisions importantes.</p>
        </div>
      </div>
      <div className="bvs-art">
        <VisionAssembly titleId={`${id}-desktop-art`} />
        <VisionAssembly mobile titleId={`${id}-mobile-art`} />
      </div>
    </div>
    <div className="bvs-controls">
      <p className="bvs-control-caption" id={`${id}-help`}>Faites défiler pour rapprocher les pièces, ou explorez librement leur transformation.</p>
      <div className="bvs-progress">
        <label className="bvs-range-label" htmlFor={`${id}-progress`}>Faire évoluer la sculpture <output className="bvs-percent" data-vision-percent="" aria-hidden="true">0 %</output></label>
        <input id={`${id}-progress`} className="bvs-range" data-vision-range="" type="range" min="0" max="1000" step="1" defaultValue="0" aria-describedby={`${id}-help`} aria-valuetext="Complexité — trois mécanismes indépendants" />
        <div className="bvs-state-row" aria-label="États de la sculpture">
          <button type="button" data-vision-state="complexity" data-vision-at="0" aria-pressed="true">Complexité</button>
          <button type="button" data-vision-state="alignment" data-vision-at="0.55" aria-pressed="false">Alignement</button>
          <button type="button" data-vision-state="coherence" data-vision-at="1" aria-pressed="false">Cohérence</button>
        </div>
        <div className="bvs-tools">
          <button type="button" data-vision-reset="">Revenir au début</button>
          <button type="button" data-vision-follow="" aria-pressed="true">Suivre le défilement</button>
        </div>
        <p className="bvs-mode" data-vision-mode="">Au fil du défilement</p>
      </div>
    </div>
    <p className="bvs-footnote">Ces agents ne sont pas disponibles. Notre offre actuelle : la consultation technologique.</p>
    <p className="bvs-sr-only" data-vision-status="" role="status" aria-live="polite" />
  </section>;
}
export default VisionKineticSculpture;
