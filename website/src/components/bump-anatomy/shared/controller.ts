// Contrôleur d'états partagé par les huit modèles. Aucune dépendance au DOM :
// il s'utilise seul (tests, autre UI) et la couche de présentation s'y abonne.

export type Listener<S> = (snapshot: S) => void;

export interface StepSnapshot<Id extends string> {
  index: number;
  id: Id;
  /** Position continue 0..(n-1) que l'animation suit ; égale à index une fois arrivée. */
  position: number;
  paused: boolean;
  /** Incrémenté par replay() pour que la vue rejoue la transition entrante. */
  replays: number;
}

/** Machine à étapes discrètes : sélectionner, avancer, reculer, réinitialiser, pause, rejouer, lire. */
export class StepController<Id extends string> {
  private index = 0;
  private position = 0;
  private paused = false;
  private replays = 0;
  private listeners = new Set<Listener<StepSnapshot<Id>>>();
  /** Garde optionnelle : refuse une avancée tant qu'une condition métier n'est pas remplie. */
  canEnter: (to: number, from: number) => boolean = () => true;

  readonly ids: readonly Id[];
  private seconds: number;

  constructor(ids: readonly Id[], seconds = 0.6) {
    if (ids.length === 0) throw new Error("StepController: at least one state");
    this.ids = ids;
    this.seconds = seconds;
  }

  get(): StepSnapshot<Id> {
    return { index: this.index, id: this.ids[this.index], position: this.position, paused: this.paused, replays: this.replays };
  }

  select(target: number | Id): boolean {
    const to = typeof target === "number" ? target : this.ids.indexOf(target);
    if (to < 0 || to >= this.ids.length || to === this.index) return false;
    // Une sélection directe franchit chaque étape intermédiaire : les gardes s'appliquent à toutes.
    const step = to > this.index ? 1 : -1;
    for (let at = this.index; at !== to; at += step) if (!this.canEnter(at + step, at)) return false;
    this.index = to;
    this.emit();
    return true;
  }

  next() { return this.select(Math.min(this.index + 1, this.ids.length - 1)); }
  prev() { return this.select(Math.max(this.index - 1, 0)); }
  reset() { this.index = 0; this.position = 0; this.paused = false; this.emit(); }
  pause(on = !this.paused) { this.paused = on; this.emit(); }
  replay() { this.position = Math.max(0, this.index - 1); this.replays++; this.emit(); }

  /** Avance la position continue vers l'index (suivi exponentiel). Renvoie true tant qu'elle bouge. */
  tick(dt: number, calm = false): boolean {
    if (this.paused) return false;
    const target = this.index;
    this.position = calm ? target : this.position + (target - this.position) * (1 - Math.exp(-dt / this.seconds));
    if (Math.abs(target - this.position) < 1e-3) this.position = target;
    this.emit();
    return this.position !== target;
  }

  subscribe(fn: Listener<StepSnapshot<Id>>) { this.listeners.add(fn); fn(this.get()); return () => this.listeners.delete(fn); }
  private emit() { const s = this.get(); for (const fn of this.listeners) fn(s); }
}

/** Paramètre continu normalisé 0..1 (modèles 07 et 08). */
export class ProgressController {
  private value: number;
  private shown: number;
  private listeners = new Set<Listener<{ value: number; shown: number }>>();
  private seconds: number;
  constructor(initial = 0, seconds = 0.35) { this.value = this.shown = clamp01(initial); this.seconds = seconds; }
  get() { return { value: this.value, shown: this.shown }; }
  set(v: number) { this.value = clamp01(v); this.emit(); }
  nudge(by: number) { this.set(this.value + by); }
  reset() { this.set(0); }
  tick(dt: number, calm = false): boolean {
    this.shown = calm ? this.value : this.shown + (this.value - this.shown) * (1 - Math.exp(-dt / this.seconds));
    if (Math.abs(this.value - this.shown) < 1e-4) this.shown = this.value;
    this.emit();
    return this.shown !== this.value;
  }
  subscribe(fn: Listener<{ value: number; shown: number }>) { this.listeners.add(fn); fn(this.get()); return () => this.listeners.delete(fn); }
  private emit() { const s = this.get(); for (const fn of this.listeners) fn(s); }
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Part locale d'une étape i dans une position continue : 0 avant, 0..1 pendant, 1 après. */
export const shareOf = (position: number, i: number) => clamp01(position - (i - 1));
