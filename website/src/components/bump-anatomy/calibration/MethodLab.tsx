"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Modèle 05 — Notre méthode (laboratoire de calibration). Tourne en boucle tant qu'il est visible. */
export default function MethodLab() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createLab, STATES, SETTINGS, STEP_TEXT } from "./model";
