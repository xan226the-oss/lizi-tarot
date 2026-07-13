import { GESTURE_CONFIDENCE } from "@/lib/gesture/config";
import type {
  GestureFrame,
  GestureKind,
  StableGestureEvent,
  StableGestureEventType
} from "@/lib/gesture/types";

const gestureEventMap: Partial<Record<GestureKind, StableGestureEventType>> = {
  fist: "FIST_CONFIRMED",
  openPalm: "PALM_OPEN_CONFIRMED",
  pinch: "PINCH_CONFIRMED"
};

const requiredFrames: Partial<Record<GestureKind, number>> = {
  fist: GESTURE_CONFIDENCE.FIST_FRAMES,
  openPalm: GESTURE_CONFIDENCE.OPEN_PALM_FRAMES,
  pinch: GESTURE_CONFIDENCE.PINCH_FRAMES
};

export class GestureConfidenceTracker {
  private readonly counters: Record<GestureKind, number> = {
    fist: 0,
    openPalm: 0,
    pinch: 0,
    pointing: 0,
    unknown: 0
  };

  private lostFrames = 0;
  private lastEventAt: Partial<Record<StableGestureEventType, number>> = {};

  accept(frame: GestureFrame, now = performance.now()): StableGestureEvent[] {
    const events: StableGestureEvent[] = [];
    const frameConfident = frame.confidence >= GESTURE_CONFIDENCE.MIN_CONFIDENCE;

    (Object.keys(this.counters) as GestureKind[]).forEach((kind) => {
      if (frame.kind === kind && frameConfident) {
        this.counters[kind] += 1;
      } else {
        this.counters[kind] = 0;
      }
    });

    this.lostFrames = frame.kind === "unknown" ? this.lostFrames + 1 : 0;

    const stableEvent = gestureEventMap[frame.kind];
    const targetFrames = requiredFrames[frame.kind];

    if (
      stableEvent &&
      targetFrames &&
      this.counters[frame.kind] >= targetFrames &&
      this.canEmit(stableEvent, now)
    ) {
      events.push({ type: stableEvent, frame });
      this.lastEventAt[stableEvent] = now;
      this.counters[frame.kind] = 0;
    }

    if (
      this.lostFrames >= GESTURE_CONFIDENCE.HAND_LOST_FRAMES &&
      this.canEmit("HAND_LOST", now)
    ) {
      events.push({ type: "HAND_LOST", frame });
      this.lastEventAt.HAND_LOST = now;
      this.lostFrames = 0;
    }

    return events;
  }

  reset() {
    (Object.keys(this.counters) as GestureKind[]).forEach((kind) => {
      this.counters[kind] = 0;
    });
    this.lostFrames = 0;
    this.lastEventAt = {};
  }

  private canEmit(event: StableGestureEventType, now: number) {
    const lastEmittedAt = this.lastEventAt[event] ?? Number.NEGATIVE_INFINITY;
    return now - lastEmittedAt >= GESTURE_CONFIDENCE.EVENT_COOLDOWN_MS;
  }
}
