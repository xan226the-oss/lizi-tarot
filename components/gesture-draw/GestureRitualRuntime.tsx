"use client";

import { useCallback, useEffect, useReducer } from "react";
import { GestureController } from "@/components/gesture-draw/GestureController";
import { TarotUniverse } from "@/components/gesture-draw/TarotUniverse";
import {
  INITIAL_RITUAL_VISUAL_STATE,
  ritualVisualReducer
} from "@/lib/gesture/runtime-state";
import type {
  GesturePhase,
  InteractionMode,
  ReadingResult,
  ReadingSpread
} from "@/lib/gesture/types";

type GestureRitualRuntimeProps = {
  showUniverse: boolean;
  phase: GesturePhase;
  mode: InteractionMode;
  grabbedCardId: string | null;
  spread: ReadingSpread | null;
  results: ReadingResult[];
  currentSlotIndex: number;
  drawnCardIds: string[];
  spreadTitle: string;
  onFistConfirmed: () => void;
  onPalmOpenConfirmed: () => void;
  onPinchConfirmed: (cardId: string) => void;
  onGrabCancelled: () => void;
  onPullConfirmed: () => void;
  onGrabTimeout: () => void;
  onError: (message: string) => void;
  onTrackingChange: (active: boolean) => void;
  onTrackingRestored: () => void;
  onFallbackMode: (message: string) => void;
  onRevealVisualComplete: () => void;
};

export function GestureRitualRuntime({
  showUniverse,
  phase,
  mode,
  grabbedCardId,
  spread,
  results,
  currentSlotIndex,
  drawnCardIds,
  spreadTitle,
  onFistConfirmed,
  onPalmOpenConfirmed,
  onPinchConfirmed,
  onGrabCancelled,
  onPullConfirmed,
  onGrabTimeout,
  onError,
  onTrackingChange,
  onTrackingRestored,
  onFallbackMode,
  onRevealVisualComplete
}: GestureRitualRuntimeProps) {
  const [visual, visualDispatch] = useReducer(
    ritualVisualReducer,
    INITIAL_RITUAL_VISUAL_STATE
  );

  useEffect(() => {
    visualDispatch({ type: "RESET" });
  }, [spread]);

  const handlePinchConfirmed = useCallback(
    (cardId?: string) => {
      const confirmedId = cardId ?? visual.selectedCardId ?? undefined;
      if (confirmedId) onPinchConfirmed(confirmedId);
    },
    [onPinchConfirmed, visual.selectedCardId]
  );

  return (
    <>
      {showUniverse ? (
        <TarotUniverse
          phase={phase}
          pointer={visual.pointer}
          orbitOffset={visual.orbitOffset}
          selectedCardId={visual.selectedCardId}
          grabbedCardId={grabbedCardId}
          spread={spread}
          results={results}
          currentSlotIndex={currentSlotIndex}
          drawnCardIds={drawnCardIds}
          spreadTitle={spreadTitle}
          onRevealVisualComplete={onRevealVisualComplete}
        />
      ) : null}

      <GestureController
        phase={phase}
        mode={mode}
        pointer={visual.pointer}
        orbitOffset={visual.orbitOffset}
        orbitSpeed={visual.orbitSpeed}
        selectedCardId={visual.selectedCardId}
        grabbedCardId={grabbedCardId}
        drawnCardIds={drawnCardIds}
        onPointerChange={(pointer) =>
          visualDispatch({ type: "POINTER_FRAME", pointer })
        }
        onOrbitFrame={(frame) =>
          visualDispatch({ type: "ORBIT_FRAME", frame })
        }
        onFistConfirmed={onFistConfirmed}
        onPalmOpenConfirmed={onPalmOpenConfirmed}
        onPinchConfirmed={handlePinchConfirmed}
        onGrabCancelled={onGrabCancelled}
        onPullConfirmed={onPullConfirmed}
        onGrabTimeout={onGrabTimeout}
        onError={onError}
        onTrackingChange={onTrackingChange}
        onTrackingRestored={onTrackingRestored}
        onFallbackMode={onFallbackMode}
      />
    </>
  );
}
