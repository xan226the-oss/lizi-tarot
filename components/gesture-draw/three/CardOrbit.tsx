"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { getVisibleOrbitCards } from "@/lib/gesture/card-orbit";
import { getCardInteractionState } from "@/lib/gesture/card-interaction-state";
import { isCompletedSpreadPhase } from "@/lib/gesture/ritual-plinth";
import type { GesturePhase } from "@/lib/gesture/types";
import { TarotCard3D } from "@/components/gesture-draw/three/TarotCard3D";
import { cn } from "@/lib/utils";

type CardOrbitProps = {
  phase: GesturePhase;
  orbitOffset: number;
  selectedCardId: string | null;
  grabbedCardId: string | null;
  drawnCardIds: string[];
};

export function CardOrbit({
  phase,
  orbitOffset,
  selectedCardId,
  grabbedCardId,
  drawnCardIds
}: CardOrbitProps) {
  const [opening, setOpening] = useState(false);
  const hasOpenedRef = useRef(false);
  const slots = useMemo(() => getVisibleOrbitCards(orbitOffset), [orbitOffset]);
  const drawnCards = useMemo(() => new Set(drawnCardIds), [drawnCardIds]);
  const visible =
    phase === "IDLE" ||
    phase === "SHUFFLING" ||
    phase === "SELECTING" ||
    phase === "GRABBING" ||
    phase === "PLACING" ||
    phase === "CONFIRMED" ||
    phase === "REVEALING";

  useEffect(() => {
    if (phase === "SHUFFLING") {
      hasOpenedRef.current = false;
      setOpening(false);
      return;
    }

    if (phase !== "SELECTING") {
      setOpening(false);
      return;
    }

    if (hasOpenedRef.current) return;

    hasOpenedRef.current = true;
    setOpening(true);
    const timeoutId = window.setTimeout(() => setOpening(false), 760);

    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "gesture-card-orbit",
        phase === "IDLE" && "gesture-card-orbit--dormant",
        phase === "SHUFFLING" && "gesture-card-orbit--summoning",
        opening && "gesture-card-orbit--opened",
        isCompletedSpreadPhase(phase) && "gesture-card-orbit--completed",
        (phase === "GRABBING" ||
          phase === "PLACING" ||
          phase === "CONFIRMED" ||
          phase === "REVEALING") &&
          "gesture-card-orbit--receding"
      )}
      aria-hidden="true"
    >
      {slots.map((slot) => {
        const interactionState = getCardInteractionState({
          selected: selectedCardId === slot.cardId,
          grabbed: grabbedCardId === slot.cardId,
          drawn: drawnCards.has(slot.cardId)
        });
        const isCandidate = interactionState === "candidate";
        const isGrabbed = interactionState === "grabbing";
        const isActive = isCandidate || isGrabbed;
        const selectedScale = isActive ? Math.min(slot.scale * 1.04, 1.14) : slot.scale;
        const baseDepth = Math.round(slot.depth * 52);

        return (
          <TarotCard3D
            key={`${slot.cardId}-${slot.virtualIndex}`}
            cardId={slot.cardId}
            phase={phase}
            selected={isCandidate}
            grabbed={isGrabbed}
            summoning={phase === "SHUFFLING"}
            subdued={
              interactionState === "drawn" ||
              (phase === "PLACING" || phase === "CONFIRMED" || phase === "REVEALING")
            }
            style={
              {
                "--card-x": `clamp(-46vw, ${slot.x}vw, 46vw)`,
                "--card-y": `clamp(-8vh, ${slot.y}vh, 16vh)`,
                "--card-z": `${baseDepth + (isGrabbed ? 24 : isCandidate ? 12 : 0)}px`,
                "--card-scale": selectedScale,
                "--card-opacity": slot.opacity,
                "--card-rotate": isActive ? `${slot.angle * -8}deg` : `${slot.angle * -18}deg`,
                "--card-rotate-y": isActive ? `${slot.angle * -8}deg` : `${slot.angle * -22}deg`,
                zIndex: isActive ? 260 : slot.zIndex
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
