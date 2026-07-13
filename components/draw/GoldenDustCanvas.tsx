"use client";

import { useEffect, useRef } from "react";
import styles from "./NormalDraw.module.css";

type DustParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
};

export function GoldenDustCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) return;

    const trailBurst = 6;
    const maxDust = 320;
    const dust: DustParticle[] = [];
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let animationFrame = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      for (let index = 0; index < trailBurst; index += 1) {
        dust.push({
          x: event.clientX + (Math.random() - 0.5) * 16,
          y: event.clientY + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -0.15 - Math.random() * 0.7,
          radius: 0.45 + Math.random() * 1.35,
          life: 0.62 + Math.random() * 0.36
        });
      }

      if (dust.length > maxDust) {
        dust.splice(0, dust.length - maxDust);
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (let index = dust.length - 1; index >= 0; index -= 1) {
        const particle = dust[index];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.018;

        if (particle.life <= 0) {
          dust.splice(index, 1);
          continue;
        }

        context.beginPath();
        context.fillStyle = `rgba(224, 191, 105, ${particle.life})`;
        context.shadowColor = `rgba(224, 191, 105, ${particle.life * 0.42})`;
        context.shadowBlur = particle.radius * 7;
        context.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        );
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.goldenDust} aria-hidden="true" />;
}
