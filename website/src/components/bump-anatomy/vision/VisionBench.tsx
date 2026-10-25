"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Modèle 06 — Notre vision (banc optique). Tourne en boucle tant qu'il est visible. */
export default function VisionBench() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createVision, STATES, PISTES, NEEDS, STATUS } from "./model";
