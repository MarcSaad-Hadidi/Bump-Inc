"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Modèle 01 — Workflow Automation Machine (planche de flux à cartes et tubes de verre). */
export default function Workflow() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createWorkflow, STATES, CARDS, KIND_LABEL } from "./model";
