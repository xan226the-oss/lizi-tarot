import type { TarotOrientation } from "@/lib/tarot-cards";

export type GesturePhase =
  | "QUESTION"
  | "SPREAD"
  | "AWAKENING"
  | "IDLE"
  | "SHUFFLING"
  | "SELECTING"
  | "GRABBING"
  | "PLACING"
  | "CONFIRMED"
  | "REVEALING"
  | "RESULT";

export type InteractionMode = "click" | "gesture";

export type GestureKind = "fist" | "openPalm" | "pinch" | "pointing" | "unknown";

export type ReadingSpread = "three" | "five";

export type SpreadSlot = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type PointerPosition = {
  x: number;
  y: number;
};

export type GestureFrame = {
  kind: GestureKind;
  confidence: number;
  pointer: PointerPosition;
  palmScale: number;
  timestamp: number;
  handCount: number;
  debugLabel: string;
};

export type StableGestureEventType =
  | "FIST_CONFIRMED"
  | "PALM_OPEN_CONFIRMED"
  | "PINCH_CONFIRMED"
  | "PULL_CONFIRMED"
  | "HAND_LOST";

export type StableGestureEvent = {
  type: StableGestureEventType;
  frame: GestureFrame;
};

export type ReadingResult = {
  cardId: string;
  orientation: TarotOrientation;
  question: string;
  slotId: string;
  slotLabel: string;
  position: {
    x: number;
    y: number;
  };
};

export type OrbitCardSlot = {
  cardId: string;
  virtualIndex: number;
  slotIndex: number;
  angle: number;
  depth: number;
  scale: number;
  opacity: number;
  x: number;
  y: number;
  zIndex: number;
};

export type OrbitFrame = {
  offset: number;
  speed: number;
  selectedCardId: string;
  selectedVirtualIndex: number;
  selectedAngle: number;
  pointerAngle: number;
};

export type GestureDrawState = {
  phase: GesturePhase;
  question: string;
  spread: ReadingSpread | null;
  results: ReadingResult[];
  currentSlotIndex: number;
  grabbedCardId: string | null;
  result: ReadingResult | null;
  mode: InteractionMode;
  error: string | null;
  cameraError: string | null;
};
