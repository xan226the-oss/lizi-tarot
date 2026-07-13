"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AmbientTarotBackdropProps = {
  className?: string;
};

export function AmbientTarotBackdrop({ className }: AmbientTarotBackdropProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let frame = 0;

    const handleMouseMove = (event: MouseEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;

        layer.style.setProperty("--parallax-front-x", `${(x * 18).toFixed(2)}px`);
        layer.style.setProperty("--parallax-front-x-reverse", `${(x * -18).toFixed(2)}px`);
        layer.style.setProperty("--parallax-front-y", `${(y * 12).toFixed(2)}px`);
        layer.style.setProperty("--parallax-back-x", `${(x * 8).toFixed(2)}px`);
        layer.style.setProperty("--parallax-back-x-reverse", `${(x * -8).toFixed(2)}px`);
        layer.style.setProperty("--parallax-back-y", `${(y * 5).toFixed(2)}px`);
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className={cn("ambient-tarot-layer pointer-events-none absolute inset-0", className)}
      aria-hidden="true"
    >
      <div className="bg-card-slot ambient-card-left-back">
        <div className="ambient-tarot-card bg-card--back" />
      </div>
      <div className="bg-card-slot ambient-card-left-front">
        <div className="ambient-tarot-card bg-card--front" />
      </div>
      <div className="bg-card-slot ambient-card-right-back">
        <div className="ambient-tarot-card bg-card--back" />
      </div>
      <div className="bg-card-slot ambient-card-right-front">
        <div className="ambient-tarot-card bg-card--front" />
      </div>
    </div>
  );
}
