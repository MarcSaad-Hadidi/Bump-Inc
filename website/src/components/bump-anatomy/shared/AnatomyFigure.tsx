"use client";
// Enveloppe React commune aux huit modèles. L'art statique (SVG pré-calculé par build.mjs)
// est injecté tel quel ; le même live.ts que la démo autonome l'anime dans un effet.
// Rien n'est re-rendu par React image par image (references/react.md d'Anatomy).
import { useEffect, useRef } from "react";
import "../kit/iso.css";
import "./bump-theme.css";

export interface AnatomyFigureProps<D> {
  /** FIGURE_HTML de art.generated.ts */
  html: string;
  /** DATA de art.generated.ts */
  data: D;
  /** mount() du live.ts du modèle ; renvoie la fonction de nettoyage. */
  mount: (root: HTMLElement, data: D) => () => void;
  className?: string;
}

export function AnatomyFigure<D>({ html, data, mount, className }: AnatomyFigureProps<D>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current?.querySelector<HTMLElement>(".iso-figure");
    if (!root) return;
    return mount(root, data);
  }, [html, data, mount]);
  return <div ref={ref} className={`iso bump${className ? ` ${className}` : ""}`} data-theme="light" dangerouslySetInnerHTML={{ __html: html }} />;
}
