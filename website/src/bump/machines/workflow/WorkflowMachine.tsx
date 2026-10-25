import React from 'react';
import { WorkflowMachineScene, type PartRefs } from './WorkflowMachineScene';
import { useWorkflowMachineController } from './WorkflowMachineController';
import { WORKFLOW_STAGES, WORKFLOW_MOBILE_COPY } from './model';
import { AutoCursor } from '../../ui/AutoCursor.jsx';
import './workflow-machine.css';

export interface WorkflowMachineProps { playbackRate?: number; className?: string; }

export function WorkflowMachine({ playbackRate = 1.5, className = '' }: WorkflowMachineProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const partRefs = React.useRef<PartRefs>(new Map());
  const [mobile, setMobile] = React.useState(false);
  const [inspected, setInspected] = React.useState<number | null>(null);
  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 680px)');
    const onChange = () => setMobile(media.matches);
    onChange(); media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const controller = useWorkflowMachineController(root, partRefs, mobile, playbackRate);
  const current = WORKFLOW_STAGES[controller.stage];
  const detail = WORKFLOW_STAGES[inspected ?? controller.stage];
  return <div ref={root} className={`bump-workflow-execution bwm ${className}`} data-workflow-machine-stage={controller.stage}
    data-playing={controller.playing ? 'true' : 'false'} data-waiting={controller.waiting ? 'true' : 'false'} data-started={controller.started ? 'true' : 'false'}
    data-inspected={inspected ?? undefined} data-reduced-motion={controller.reduced ? 'true' : 'false'} data-mobile-composition={mobile ? 'true' : 'false'}>
    <div className="bwm-heading">
      <div><p className="bwm-eyebrow">BUMP AUTOMATION SYSTEM</p><h3>Une demande. Un parcours clair.</h3></div>
      <p className="bwm-scenario">Demande #024 <span>Planifier un rendez-vous</span></p>
    </div>
    <figure className="bwm-figure">
      <div className="bwm-frame iso-plate">
        <div className="bwm-frame-top" aria-hidden="true"><span>Fig. 01 — Circulation & validation</span><span>Simulation locale</span></div>
        <WorkflowMachineScene mobile={mobile} partRefs={partRefs} inspect={setInspected} />
        <div className="bwm-frame-bottom"><span className={`bwm-signal ${controller.waiting ? 'bwm-signal-waiting' : ''}`} />
          <span data-readout="">{controller.started ? controller.statusText : 'Un parcours prêt à être lancé'}</span>
          <span className="bwm-follow">Suivez la capsule verte</span>
        </div>
      </div>
      <figcaption className="bwm-module-strip" aria-label="Explorer les organes de la machine">
        {WORKFLOW_STAGES.map((item, i) => <button key={item.number} type="button" className="bwm-module" data-active={controller.stage === i ? 'true' : undefined}
          data-selected={inspected === i ? 'true' : undefined} onPointerEnter={() => setInspected(i)} onPointerLeave={() => setInspected(null)}
          onFocus={() => setInspected(i)} onBlur={() => setInspected(null)} onClick={() => setInspected(previous => previous === i ? null : i)}
          aria-label={`${item.number} — ${item.name} : ${item.inspect}`} aria-pressed={inspected === i}>
          <span>{item.number}</span>{item.name}
        </button>)}
      </figcaption>
    </figure>
    <div className="bwm-operating-line">
      <div className="bwm-narration"><span className="bwm-phase">{current.number}</span><div><h4>{mobile ? WORKFLOW_MOBILE_COPY[controller.stage][0] : current.title}</h4><p>{mobile ? WORKFLOW_MOBILE_COPY[controller.stage][1] : current.detail}</p></div></div>
    </div>
    <div className="bwm-approval-line" data-waiting={controller.waiting ? 'true' : 'false'}>
      <p><span className="bwm-approval-symbol" aria-hidden="true">✦</span><strong>Une validation avant la suite.</strong> {controller.waiting ? 'Proposition : mettre à jour le CRM et informer le responsable. La souris illustre l’accord de l’équipe.' : controller.stage === 5 ? 'Validation reçue. Le dossier a suivi le parcours autorisé.' : 'Le parcours montre où l’équipe autorise la transmission.'}</p>
      <button type="button" className="bwm-approve" onClick={controller.approve} disabled={!controller.waiting}>Valider la proposition <span aria-hidden="true">↗</span></button>
    </div>
    <div className="bwm-inspection" aria-live="off"><span>{detail.number} / {detail.name}</span><p>{detail.inspect}</p></div>
    <p className="bwm-footnote">Démonstration fictive : la souris simule l’accord de l’équipe. Aucun traitement réel.</p>
    <AutoCursor root={root} selector=".bwm-approve" phase={controller.cursorPhase} sequence={controller.cursorSequence} />
    <span className="bwm-sr-only" role="status" aria-live="polite">{controller.started ? `${current.number}. ${current.title} ${controller.waiting ? controller.reduced ? 'Utilisez le bouton Valider la proposition pour poursuivre.' : 'La démonstration attend, puis illustre la validation de l’équipe.' : ''}` : ''}</span>
  </div>;
}
export default WorkflowMachine;
