"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Modèle 03 — Vos outils, un fonctionnement commun (train d'engrenages). */
export default function VosOutils() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createToolkit, STATES, TOOLS } from "./model";
