"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type TrailParticle = {
  x: number;
  y: number;
  radius: number;
  age: number;
  life: number;
  vx: number;
  vy: number;
  color: "gold" | "blue";
};

type MouseStarTrailProps = {
  className?: string;
  maxParticles?: number;
};

export function MouseStarTrail({ className, maxParticles = 150 }: MouseStarTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = 0;
    let lastSpawn = 0;
    const particles: TrailParticle[] = [];

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const spawn = (x: number, y: number) => {
      particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 18,
        radius: 0.9 + Math.random() * 1.9,
        age: 0,
        life: 48 + Math.random() * 24,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.06,
        color: Math.random() > 0.5 ? "gold" : "blue"
      });

      while (particles.length > maxParticles) {
        particles.shift();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpawn < 10) return;
      lastSpawn = now;

      const spawnCount = Math.random() > 0.5 ? 3 : 2;
      for (let index = 0; index < spawnCount; index += 1) {
        spawn(event.clientX, event.clientY);
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.age += 1;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const progress = particle.age / particle.life;
        if (progress >= 1) {
          particles.splice(index, 1);
          continue;
        }

        const alpha = Math.pow(1 - progress, 1.7) * 0.42;
        const color =
          particle.color === "gold"
            ? { core: "201 169 97", glow: "212 175 55" }
            : { core: "74 127 193", glow: "115 169 232" };
        const glowRadius = particle.radius * 7;
        const gradient = context.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          glowRadius
        );

        gradient.addColorStop(0, `rgb(${color.glow} / ${alpha * 0.72})`);
        gradient.addColorStop(0.4, `rgb(${color.core} / ${alpha * 0.3})`);
        gradient.addColorStop(1, `rgb(${color.core} / 0)`);

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgb(${color.core} / ${alpha})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [maxParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none fixed inset-0 z-20", className)}
      aria-hidden="true"
    />
  );
}
