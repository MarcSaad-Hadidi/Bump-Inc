// Boucle d'animation commune : une seule requestAnimationFrame par figure, active
// seulement quand la figure est visible et que quelque chose bouge (motion.md d'Anatomy).

export const clampN = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** Smoothstep : départ et arrivée sans à-coup. */
export const easeIO = (t: number) => { const x = clampN(t); return x * x * (3 - 2 * x); };
/** Part d'une fenêtre [a, b] dans une progression u. */
export const windowOf = (u: number, a: number, b: number) => easeIO((u - a) / (b - a));
export const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Loop {
  /** Relance la boucle (après une commande). */
  kick(): void;
  /** Vrai si l'utilisateur demande moins de mouvement. */
  calm(): boolean;
  destroy(): void;
}

/**
 * tick(dt, clock, calm) renvoie true tant qu'il reste du mouvement.
 * Coupée hors écran (IntersectionObserver, entrée la plus récente) et à l'arrêt.
 */
export function createLoop(stage: Element, tick: (dt: number, clock: number, calm: boolean) => boolean): Loop {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = 0;
  let clock = 0;
  let visible = false;
  const step = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    clock += dt;
    const moving = tick(dt, clock, still.matches);
    frame = visible && moving ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(step); } };
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) kick(); }, { rootMargin: "120px 0px" });
  io.observe(stage);
  return { kick, calm: () => still.matches, destroy() { io.disconnect(); if (frame) cancelAnimationFrame(frame); frame = 0; } };
}

/** Coordonnées viewBox d'un événement pointeur. */
export function toViewBox(svg: SVGSVGElement, e: { clientX: number; clientY: number }): [number, number] {
  const m = svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}

/** Écrit dans le coin « lecture » de la carte sans re-rendu. */
export function readoutOf(root: Element) {
  const el = root.querySelector("[data-readout]");
  let shown = "";
  return (text: string) => { if (el && text !== shown) { el.textContent = shown = text; } };
}

/** Région aria-live : seulement les changements de phase, jamais les nombres image par image. */
export function announcerOf(root: Element) {
  const el = root.querySelector("[data-live]");
  let said = "";
  return (text: string) => { if (el && text !== said) { el.textContent = said = text; } };
}

