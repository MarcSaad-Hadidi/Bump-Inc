"use client";
import { AnatomyFigure } from "../shared/AnatomyFigure";
import { FIGURE_HTML, DATA } from "./art.generated";
import { mount } from "./live";

/** Modèle 04 — Security Engine (coffre-fort à six domaines, neuf étapes). */
export default function SecurityEngine() {
  return <AnatomyFigure html={FIGURE_HTML} data={DATA as never} mount={mount} />;
}

export { createSecurityEngine, STATES, DOMAINS, PLAN } from "./model";
