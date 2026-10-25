"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Modèle 07 — Bump (port de Montréal). Tourne en boucle tant qu'il est visible. */
export default function BumpPort() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createPort, STATES, NEEDS, REALITY, REACH, BRIEF, MESSAGE } from "./model";
