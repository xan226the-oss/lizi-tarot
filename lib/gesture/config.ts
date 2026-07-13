export const GESTURE_TIMING = {
  AWAKENING_MS: 1800,
  SHUFFLING_MS: 1800,
  SELECTING_ENTER_MS: 1200,
  GRABBING_MAX_WAIT_MS: 6500,
  PINCH_HOLD_CONFIRM_MS: 800,
  PLACEMENT_SETTLE_MS: 800,
  FINAL_CONFIRM_HOLD_MS: 1100,
  REVEALING_MS: 1800,
  RESULT_SETTLE_MS: 900
} as const;

export const GESTURE_CONFIDENCE = {
  FIST_FRAMES: 15,
  OPEN_PALM_FRAMES: 10,
  PINCH_FRAMES: 6,
  HAND_LOST_FRAMES: 18,
  EVENT_COOLDOWN_MS: 760,
  MIN_CONFIDENCE: 0.58
} as const;

export const ORBIT_CONFIG = {
  visibleCards: 15,
  cardCount: 78,
  angleStep: 0.19,
  pointerAngleRange: 1.33,
  pointerSensitivity: 1.05,
  orbitDamping: 7.5,
  maxOrbitSpeed: 6.4,
  pointerDeadZone: 0.08
} as const;

export const GRAB_CONFIG = {
  pullScaleThreshold: 1.24,
  pullPointerDeltaY: 0.26,
  magneticDelay: 0.18
} as const;

export const DEFAULT_POINTER = {
  x: 0,
  y: 0
} as const;
