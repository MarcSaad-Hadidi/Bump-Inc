import * as React from 'react';
import { Solid, Line, Dots, FaceText } from '../../anatomy/kit/react/draw';
import type { IntegrationGeometry, PartArt } from './geometry';

function StationPart({ part, geometry }: { part: PartArt; geometry: IntegrationGeometry }) {
  const moduleMove = part.piece.startsWith('tool-') && part.tool ? geometry.moduleMoves[part.tool] : undefined;
  const collarMove = part.piece.startsWith('adapter-') && part.tool ? geometry.collarMoves[part.tool] : undefined;
  const move = moduleMove || collarMove;
  return (
    <g
      className={`bic-part bic-material-${part.material}`}
      data-bic-part={part.id}
      data-bic-module={moduleMove ? part.tool : undefined}
      data-bic-adapter={collarMove ? part.tool : undefined}
      transform={move ? `translate(${move[0]} ${move[1]})` : undefined}
    >
      <Solid paths={part.paths} tone="mid" crease="faint" inner={
        <React.Fragment key={`${part.id}-details`}>
          {part.lines.map((line, i) => <Line key={i} {...line} />)}
          {part.dots.length > 0 ? <Dots points={part.dots} size={.45} tone="mid" /> : null}
        </React.Fragment>
      } />
      {part.text ? <FaceText transform={part.text.transform} size={part.text.size} tone="hi">{part.text.value}</FaceText> : null}
      {part.needleFrames ? <path className="iso-line bic-needle" data-free="end" data-tone={part.detail === 'lid' ? 'hi' : 'lit'} d={part.needleFrames[0]} data-bic-needle={part.id} /> : null}
      {part.indicatorPoint ? <circle className="bic-contact-led" data-bic-ready="" cx={part.indicatorPoint[0]} cy={part.indicatorPoint[1]} r={.8} /> : null}
      {part.detail === 'cap' ? (
        <g className="bic-signals" aria-hidden="true">
          {geometry.signals.map((signal, i) => <circle key={signal.tool} className="bic-signal" data-bic-signal={i} cx={signal.start[0]} cy={signal.start[1]} r={1.55} />)}
        </g>
      ) : null}
    </g>
  );
}

export const IntegrationCoreScene = React.memo(function IntegrationCoreScene({ geometry }: { geometry: IntegrationGeometry }) {
  return (
    <svg className="bic-svg" viewBox={`0 0 ${geometry.model.width} ${geometry.model.height}`} role="img" aria-label="Station d’interconnexion à cinq cartouches : CRM, ERP, API, applications métier et systèmes internes. Des adaptateurs relient leurs prises à un bus et à un noyau commun." focusable="false">
      <path className="bic-ground" d={geometry.halo} />
      <g data-bic-parts="">{geometry.parts.map((part) => <StationPart key={part.id} part={part} geometry={geometry} />)}</g>
    </svg>
  );
});
