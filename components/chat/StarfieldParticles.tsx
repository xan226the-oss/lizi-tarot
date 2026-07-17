"use client";

import { useEffect, useRef } from "react";

import styles from "./Chat.module.css";

type Particle = { x: number; y: number; radius: number; driftX: number; driftY: number; bornAt: number };

const maxParticles = 32;
const particleLifetime = 620;

export function StarfieldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window.matchMedia !== "function") return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const particles: Particle[] = [];
    let animationFrame: number | null = null;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * scale));
      canvas.height = Math.max(1, Math.round(bounds.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const clear = () => context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const stopIfDisabled = () => {
      if (finePointer.matches && !reducedMotion.matches) return;
      particles.length = 0;
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      clear();
    };
    const draw = (now: number) => {
      animationFrame = null;
      clear();
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        const elapsed = now - particle.bornAt;
        if (elapsed >= particleLifetime) { particles.splice(index, 1); continue; }
        const progress = elapsed / particleLifetime;
        context.beginPath();
        context.fillStyle = `rgba(201, 231, 255, ${0.48 * (1 - progress)})`;
        context.arc(particle.x + particle.driftX * progress, particle.y + particle.driftY * progress, particle.radius * (1 - progress * 0.4), 0, Math.PI * 2);
        context.fill();
      }
      if (particles.length > 0 && finePointer.matches && !reducedMotion.matches) animationFrame = requestAnimationFrame(draw);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType === "touch") return;
      const bounds = canvas.getBoundingClientRect();
      const now = performance.now();
      for (let index = 0; index < 2; index += 1) {
        particles.push({ x: event.clientX - bounds.left + (Math.random() - 0.5) * 12, y: event.clientY - bounds.top + (Math.random() - 0.5) * 12, radius: 0.9 + Math.random() * 1.5, driftX: (Math.random() - 0.5) * 22, driftY: -8 - Math.random() * 20, bornAt: now });
      }
      if (particles.length > maxParticles) particles.splice(0, particles.length - maxParticles);
      if (animationFrame === null) animationFrame = requestAnimationFrame(draw);
    };

    resize();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    finePointer.addEventListener?.("change", stopIfDisabled);
    reducedMotion.addEventListener?.("change", stopIfDisabled);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      finePointer.removeEventListener?.("change", stopIfDisabled);
      reducedMotion.removeEventListener?.("change", stopIfDisabled);
      observer?.disconnect();
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.starfieldParticles} aria-hidden="true" />;
}
