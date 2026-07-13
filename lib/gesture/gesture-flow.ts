import { GESTURE_CONFIDENCE, GESTURE_TIMING } from "@/lib/gesture/config";
import type { GestureFrame } from "@/lib/gesture/types";

const ACTIVE_HAND_KINDS = new Set(["fist", "openPalm", "pinch", "pointing"]);

export function isTrackedHandFrame(frame: GestureFrame) {
  return (
    frame.handCount > 0 &&
    ACTIVE_HAND_KINDS.has(frame.kind) &&
    frame.confidence >= GESTURE_CONFIDENCE.MIN_CONFIDENCE
  );
}

export function canAutoStartShuffle(frame: GestureFrame) {
  return isTrackedHandFrame(frame);
}

export function canCompleteShuffle(frame: GestureFrame, elapsedMs: number) {
  if (elapsedMs < GESTURE_TIMING.SHUFFLING_MS) return false;

  return (
    frame.handCount > 0 &&
    (frame.kind === "openPalm" || frame.kind === "pointing") &&
    frame.confidence >= GESTURE_CONFIDENCE.MIN_CONFIDENCE
  );
}
