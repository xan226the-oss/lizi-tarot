"use client";

import { memo, type CSSProperties, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  pulseDuration: number;
  pulseDelay: number;
  driftX: number;
  driftY: number;
  isFlare: boolean;
};

type ParticleFieldProps = {
  className?: string;
  count?: number;
};

const FLARE_PARTICLE_COUNT = 25;

function createParticles(count: number): Particle[] {
  const flareIndexes = new Set<number>();

  while (flareIndexes.size < Math.min(FLARE_PARTICLE_COUNT, count)) {
    flareIndexes.add(Math.floor(Math.random() * count));
  }

  return Array.from({ length: count }, (_, index) => {
    const isFlare = flareIndexes.has(index);
    const size = isFlare ? 0.9 + Math.random() * 0.65 : 0.8 + Math.random() * 1.4;

    return {
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size,
      opacity: isFlare ? 0.7 + Math.random() * 0.2 : 0.28 + Math.random() * 0.34,
      duration: 4.8 + Math.random() * 5.8,
      delay: Math.random() * -8,
      pulseDuration: 3.8 + Math.random() * 2.8,
      pulseDelay: Math.random() * -5,
      driftX: (Math.random() - 0.5) * 14,
      driftY: (Math.random() - 0.5) * 14,
      isFlare
    };
  });
}

function ParticleFieldComponent({ className, count = 160 }: ParticleFieldProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleCount = Math.max(60, Math.min(260, count));

  useEffect(() => {
    setParticles(createParticles(particleCount));
  }, [particleCount]);

  return (
    <div
      className={cn("particle-field pointer-events-none absolute inset-0 h-full w-full", className)}
      data-particle-count={particleCount}
      data-flare-count={Math.min(FLARE_PARTICLE_COUNT, particleCount)}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={cn(
            "particle-field__particle",
            particle.isFlare && "particle-field__particle--flare"
          )}
          style={
            {
              "--particle-x": `${particle.x}%`,
              "--particle-y": `${particle.y}%`,
              "--particle-size": `${particle.size}px`,
              "--particle-opacity": particle.opacity,
              "--particle-duration": `${particle.duration}s`,
              "--particle-delay": `${particle.delay}s`,
              "--particle-pulse-duration": `${particle.pulseDuration}s`,
              "--particle-pulse-delay": `${particle.pulseDelay}s`,
              "--particle-drift-x": `${particle.driftX}px`,
              "--particle-drift-y": `${particle.driftY}px`
            } as CSSProperties
          }
        />
      ))}

      <style jsx>{`
        .particle-field {
          overflow: hidden;
          mix-blend-mode: screen;
        }

        .particle-field__particle {
          position: absolute;
          left: var(--particle-x);
          top: var(--particle-y);
          width: var(--particle-size);
          height: var(--particle-size);
          border-radius: 999px;
          background: rgb(var(--particle-gold-rgb) / var(--particle-opacity));
          box-shadow: 0 0 5px rgb(var(--particle-gold-rgb) / 0.24);
          opacity: var(--particle-opacity);
          transform: translate(-50%, -50%);
          animation: particle-field-drift var(--particle-duration) ease-in-out infinite alternate;
          animation-delay: var(--particle-delay);
        }

        .particle-field__particle--flare {
          background: rgb(var(--particle-gold-rgb) / 0.96);
          box-shadow: none;
          filter: brightness(1.14);
          mix-blend-mode: screen;
          animation:
            particle-field-drift var(--particle-duration) ease-in-out infinite alternate,
            particle-field-star-pulse var(--particle-pulse-duration) ease-in-out infinite;
          animation-delay: var(--particle-delay), var(--particle-pulse-delay);
        }

        .particle-field__particle--flare::before,
        .particle-field__particle--flare::after {
          content: "";
          display: none;
        }

        @keyframes particle-field-drift {
          from {
            transform: translate(-50%, -50%) translate3d(0, 0, 0);
          }

          to {
            transform: translate(-50%, -50%)
              translate3d(var(--particle-drift-x), var(--particle-drift-y), 0);
          }
        }

        @keyframes particle-field-star-pulse {
          0%,
          100% {
            opacity: 0.38;
            filter: brightness(0.92);
          }

          48% {
            opacity: 1;
            filter: brightness(1.42);
          }

          72% {
            opacity: 0.64;
            filter: brightness(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .particle-field__particle {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export const ParticleField = memo(ParticleFieldComponent);
