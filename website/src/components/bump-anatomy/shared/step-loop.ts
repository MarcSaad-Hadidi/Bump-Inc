// Boucle d'étapes commune aux modèles « en boucle » de la méthode (05b, 05c, 05d) : enchaîne les
// étapes seule tant que la figure est visible, se suspend 15 s après un geste, relie la barre de
// commandes et le clavier, écrit la lecture. Chaque modèle ne fournit que son dessin et ses textes.
import { createLoop, readoutOf, announcerOf } from "./runtime";
import type { StepController } from "./controller";

export interface StepScene {
  /** i : étape ; since : secondes depuis l'arrivée sur l'étape ; running : faux = état final figé. */
  draw(i: number, since: number, running: boolean, clock: number): void;
  readout(i: number, since: number, running: boolean): string;
}

export function loopSteps<Id extends string>(root: HTMLElement, steps: StepController<Id>, ids: readonly Id[], labels: Record<Id, string>, dwell: number[], scene: StepScene): () => void {
  const stage = root.querySelector(".iso-stage") as HTMLElement;
  const say = readoutOf(root);
  const announce = announcerOf(root);
  const last = ids.length - 1;
  const shown = { clock: 0, stepAt: 0, holdUntil: 0 };

  const loop = createLoop(stage, (dt, clock, calm) => {
    shown.clock = clock;
    const s = steps.get();
    if (!s.paused && !calm && clock >= shown.holdUntil && clock - shown.stepAt >= dwell[s.index]) {
      if (s.index === last) steps.reset();
      else steps.next();
      shown.stepAt = clock;
      sync();
    }
    const moving = steps.tick(dt, calm);
    const running = !steps.get().paused && !calm;
    paint(running);
    return running || moving;
  });

  function paint(running: boolean) {
    const s = steps.get();
    const since = shown.clock - shown.stepAt;
    scene.draw(s.index, since, running, shown.clock);
    const text = scene.readout(s.index, since, running);
    // Le texte suit l'étape dès que le glissement est bien engagé.
    say(s.paused ? `${text} · pause` : Math.abs(s.position - s.index) < 0.3 ? text : `→ ${labels[s.id]}`);
  }

  function sync() {
    const s = steps.get();
    root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => b.toggleAttribute("data-current", Number(b.dataset.step) === s.index));
    const pause = root.querySelector("[data-pause]");
    if (pause) { pause.textContent = s.paused ? "Reprendre" : "Pause"; pause.setAttribute("aria-pressed", String(s.paused)); }
    announce(`${labels[s.id]} · ${scene.readout(s.index, 99, false)}`);
    loop.kick();
  }

  const go = (i: number) => steps.select(Math.max(0, Math.min(last, i)));
  const handlers: [EventTarget | null, string, EventListener][] = [];
  const listen = (el: EventTarget | null, type: string, fn: EventListener) => { el?.addEventListener(type, fn); handlers.push([el, type, fn]); };
  // Un geste suspend la boucle 15 s ; l'étape choisie est montrée dans son état final.
  const act = (fn: () => void) => () => { shown.holdUntil = shown.clock + 15; shown.stepAt = shown.clock - 30; fn(); sync(); };

  root.querySelectorAll("[data-step]").forEach((b) => listen(b, "click", act(() => go(Number((b as HTMLElement).dataset.step)))));
  listen(root.querySelector("[data-next]"), "click", act(() => go(steps.get().index + 1)));
  listen(root.querySelector("[data-prev]"), "click", act(() => go(steps.get().index - 1)));
  listen(root.querySelector("[data-pause]"), "click", act(() => steps.pause()));
  listen(root.querySelector("[data-reset]"), "click", act(() => go(0)));
  listen(stage, "keydown", ((e: KeyboardEvent) => {
    const keys: Record<string, () => void> = { ArrowRight: () => go(steps.get().index + 1), ArrowLeft: () => go(steps.get().index - 1), " ": () => steps.pause(), Home: () => go(0) };
    const fn = keys[e.key] ?? (/^[1-9]$/.test(e.key) && Number(e.key) <= ids.length ? () => go(Number(e.key) - 1) : null);
    if (!fn) return;
    e.preventDefault();
    act(fn)();
  }) as EventListener);

  sync();
  paint(false);
  return () => { loop.destroy(); for (const [el, type, fn] of handlers) el?.removeEventListener(type, fn); };
}
