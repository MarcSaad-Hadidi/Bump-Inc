"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Section « Notre méthode » : la carte des outils d'une PME. Tourne en boucle tant qu'elle est visible. */
export default function MethodLab() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createToolMap, STATES, TOOLS, LINKS, HEALTH, OPTIONS, READOUT, MAINTENANCE } from "./model";
