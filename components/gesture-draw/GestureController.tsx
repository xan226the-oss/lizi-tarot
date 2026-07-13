"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ClickGestureAdapter } from "@/components/gesture-draw/ClickGestureAdapter";
import { GestureEngine } from "@/components/gesture-draw/GestureEngine";
import { advanceOrbitFrame } from "@/lib/gesture/card-orbit";
import { GESTURE_CONFIDENCE, GESTURE_TIMING } from "@/lib/gesture/config";
import {
  canAutoStartShuffle,
  canCompleteShuffle,
  isTrackedHandFrame
} from "@/lib/gesture/gesture-flow";
import { GestureConfidenceTracker } from "@/lib/gesture/gesture-confidence";
import type {
  GestureFrame,
  GesturePhase,
  InteractionMode,
  OrbitFrame,
  PointerPosition
} from "@/lib/gesture/types";

type GestureControllerProps = {
  phase: GesturePhase;
  mode: InteractionMode;
  pointer: PointerPosition;
  orbitOffset: number;
  orbitSpeed: number;
  selectedCardId: string | null;
  grabbedCardId: string | null;
  drawnCardIds: string[];
  onPointerChange: (pointer: PointerPosition) => void;
  onOrbitFrame: (frame: OrbitFrame) => void;
  onFistConfirmed: () => void;
  onPalmOpenConfirmed: () => void;
  onPinchConfirmed: (cardId?: string) => void;
  onGrabCancelled: () => void;
  onPullConfirmed: () => void;
  onGrabTimeout: () => void;
  onError: (message: string) => void;
  onTrackingChange: (active: boolean) => void;
  onTrackingRestored: () => void;
  onFallbackMode: (message: string) => void;
};

export function GestureController({
  phase,
  mode,
  pointer,
  orbitOffset,
  orbitSpeed,
  selectedCardId,
  grabbedCardId,
  drawnCardIds,
  onPointerChange,
  onOrbitFrame,
  onFistConfirmed,
  onPalmOpenConfirmed,
  onPinchConfirmed,
  onGrabCancelled,
  onPullConfirmed,
  onGrabTimeout,
  onError,
  onTrackingChange,
  onTrackingRestored,
  onFallbackMode
}: GestureControllerProps) {
  const confidenceTracker = useMemo(() => new GestureConfidenceTracker(), []);
  const offsetRef = useRef(orbitOffset);
  const speedRef = useRef(orbitSpeed);
  const lastFrameAtRef = useRef<number | null>(null);
  const pinchHoldStartedAtRef = useRef<number | null>(null);
  const pinchReleasedAtRef = useRef<number | null>(null);
  const shuffleStartedAtRef = useRef<number | null>(null);
  const handPresentStartedAtRef = useRef<number | null>(null);
  const pullConfirmedRef = useRef(false);
  const trackingActiveRef = useRef(false);

  useEffect(() => {
    offsetRef.current = orbitOffset;
    speedRef.current = orbitSpeed;
  }, [orbitOffset, orbitSpeed]);

  useEffect(() => {
    confidenceTracker.reset();
    pinchHoldStartedAtRef.current = phase === "GRABBING" ? performance.now() : null;
    pinchReleasedAtRef.current = null;
    handPresentStartedAtRef.current = null;
    shuffleStartedAtRef.current = phase === "SHUFFLING" ? performance.now() : null;
    pullConfirmedRef.current = false;
  }, [confidenceTracker, phase]);

  useEffect(() => {
    if (mode === "gesture" || !trackingActiveRef.current) return;
    trackingActiveRef.current = false;
    onTrackingChange(false);
  }, [mode, onTrackingChange]);

  const handleGestureFrame = useCallback(
    (frame: GestureFrame) => {
      const shouldUsePointer =
        phase === "SELECTING" || phase === "GRABBING" || phase === "CONFIRMED";

      if (shouldUsePointer) {
        onPointerChange(frame.pointer);
      }

      const isTracking = isTrackedHandFrame(frame);
      if (isTracking !== trackingActiveRef.current) {
        trackingActiveRef.current = isTracking;
        onTrackingChange(isTracking);
        if (isTracking) onTrackingRestored();
      }

      if (phase === "SELECTING") {
        const lastFrameAt = lastFrameAtRef.current ?? frame.timestamp;
        const deltaSeconds = Math.min((frame.timestamp - lastFrameAt) / 1000, 0.05);
        lastFrameAtRef.current = frame.timestamp;

        const nextFrame = advanceOrbitFrame({
          offset: offsetRef.current,
          speed: speedRef.current,
          pointer: frame.pointer,
          deltaSeconds,
          excludedCardIds: drawnCardIds
        });

        offsetRef.current = nextFrame.offset;
        speedRef.current = nextFrame.speed;
        onOrbitFrame(nextFrame);
      } else {
        lastFrameAtRef.current = null;
      }

      if (phase === "IDLE") {
        if (canAutoStartShuffle(frame)) {
          const startedAt = handPresentStartedAtRef.current ?? frame.timestamp;
          handPresentStartedAtRef.current = startedAt;

          if (frame.timestamp - startedAt >= 420) {
            handPresentStartedAtRef.current = null;
            onFistConfirmed();
            return;
          }
        } else {
          handPresentStartedAtRef.current = null;
        }
      }

      if (phase === "SHUFFLING") {
        const elapsed = frame.timestamp - (shuffleStartedAtRef.current ?? frame.timestamp);
        if (canCompleteShuffle(frame, elapsed)) {
          onPalmOpenConfirmed();
          return;
        }
      }

      if (phase === "GRABBING" && !pullConfirmedRef.current) {
        if (
          frame.kind === "pinch" &&
          frame.confidence >= GESTURE_CONFIDENCE.MIN_CONFIDENCE
        ) {
          const startedAt = pinchHoldStartedAtRef.current ?? frame.timestamp;
          pinchHoldStartedAtRef.current = startedAt;
          pinchReleasedAtRef.current = null;

          if (frame.timestamp - startedAt >= GESTURE_TIMING.PINCH_HOLD_CONFIRM_MS) {
            pullConfirmedRef.current = true;
            onPullConfirmed();
          }
        } else if (pinchHoldStartedAtRef.current !== null) {
          const releasedAt = pinchReleasedAtRef.current ?? frame.timestamp;
          pinchReleasedAtRef.current = releasedAt;

          if (frame.timestamp - releasedAt > 160) {
            onGrabCancelled();
          }
        }
      }

      confidenceTracker.accept(frame).forEach((event) => {
        if (event.type === "FIST_CONFIRMED" && phase === "IDLE") onFistConfirmed();
        if (
          event.type === "PALM_OPEN_CONFIRMED" &&
          phase === "SHUFFLING" &&
          frame.timestamp - (shuffleStartedAtRef.current ?? frame.timestamp) >=
            GESTURE_TIMING.SHUFFLING_MS
        ) {
          onPalmOpenConfirmed();
        }
        if (event.type === "PINCH_CONFIRMED" && phase === "SELECTING") {
          onPinchConfirmed();
        }
        if (
          event.type === "HAND_LOST" &&
          phase !== "QUESTION" &&
          phase !== "SPREAD" &&
          phase !== "AWAKENING"
        ) {
          onError("请调整手的位置");
        }
      });
    },
    [
      confidenceTracker,
      drawnCardIds,
      onError,
      onFistConfirmed,
      onGrabCancelled,
      onOrbitFrame,
      onPalmOpenConfirmed,
      onPinchConfirmed,
      onPointerChange,
      onPullConfirmed,
      onTrackingChange,
      onTrackingRestored,
      phase
    ]
  );

  return (
    <>
      <GestureEngine
        enabled={mode === "gesture"}
        onFrame={handleGestureFrame}
        onFallbackMode={onFallbackMode}
      />

      {mode === "click" && phase !== "QUESTION" && phase !== "SPREAD" ? (
        <ClickGestureAdapter
          phase={phase}
          pointer={pointer}
          orbitOffset={orbitOffset}
          orbitSpeed={orbitSpeed}
          selectedCardId={selectedCardId}
          grabbedCardId={grabbedCardId}
          drawnCardIds={drawnCardIds}
          onPointerChange={onPointerChange}
          onOrbitFrame={onOrbitFrame}
          onFistConfirmed={onFistConfirmed}
          onPalmOpenConfirmed={onPalmOpenConfirmed}
          onPinchConfirmed={onPinchConfirmed}
          onPullConfirmed={onPullConfirmed}
          onGrabCancelled={onGrabCancelled}
          onGrabTimeout={onGrabTimeout}
        />
      ) : null}
    </>
  );
}
