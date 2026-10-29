"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Page Intégration IA : le classeur (sources autorisées, synthèse, décision humaine). Tourne en boucle tant qu'elle est visible. */
export default function AssistantIA() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createAssistant, STATES, SOURCES, READOUT } from "./model";
