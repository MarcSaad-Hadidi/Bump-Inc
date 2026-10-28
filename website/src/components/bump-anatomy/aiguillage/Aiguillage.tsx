"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Page Expertises : l'aiguillage (le bon levier, au bon endroit). Tourne en boucle tant qu'elle est visible. */
export default function Aiguillage() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createSwitchyard, STATES, ROUTES, READOUT } from "./model";
