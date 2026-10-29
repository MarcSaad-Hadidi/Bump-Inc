"use client";
// Pour le SEO : la page s'affiche d'abord avec une image fixe (poster, dimensions réservées, pas de
// décalage de mise en page) et une légende en vrai texte ; l'animation n'est chargée que lorsque la
// figure approche de l'écran. Le HTML initial reste léger et le H1 reste l'élément principal.
import { useEffect, useRef, useState, type ComponentType } from "react";

export interface LazyFigureProps {
  /** import dynamique du composant d'animation, ex. () => import("./ia/AssistantIA") */
  load: () => Promise<{ default: ComponentType }>;
  /** image fixe affichée avant le chargement (public/bump/*.webp) */
  poster: string;
  alt: string;
  /** légende en texte réel, avec les mots-clés de la page */
  caption: string;
  width: number;
  height: number;
  className?: string;
}

export function LazyFigure({ load, poster, alt, caption, width, height, className }: LazyFigureProps) {
  const ref = useRef<HTMLElement>(null);
  const [Anim, setAnim] = useState<ComponentType | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      load().then((m) => alive && setAnim(() => m.default)).catch(() => {}); // en cas d'échec, le poster reste affiché
    }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => { alive = false; io.disconnect(); };
  }, [load]);
  return (
    <figure ref={ref} className={className} style={{ margin: 0 }}>
      {Anim ? <Anim /> : <img src={poster} alt={alt} width={width} height={height} loading="lazy" decoding="async" style={{ width: "100%", height: "auto", aspectRatio: `${width} / ${height}`, display: "block" }} />}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
