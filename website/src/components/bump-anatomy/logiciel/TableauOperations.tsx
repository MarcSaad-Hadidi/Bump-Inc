"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Page Développement logiciel : le tableau des opérations (une demande, un responsable, un état visible). Tourne en boucle tant qu'elle est visible. */
export default function TableauOperations() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createBoard, STATES, COLUMNS, READOUT } from "./model";
