import { getSpreadSlots } from "./spreads.ts";
import { confirmSelectedCard } from "./runtime-state.ts";
import { isSpreadComplete } from "./spread-progress.ts";
import type {
  GestureDrawState,
  GesturePhase,
  InteractionMode,
  ReadingSpread,
  ReadingResult
} from "./types.ts";

export type GestureDrawAction =
  | { type: "SUBMIT_QUESTION"; question: string }
  | { type: "SELECT_SPREAD"; spread: ReadingSpread }
  | { type: "AWAKENING_COMPLETE" }
  | { type: "FIST_CONFIRMED" }
  | { type: "SHUFFLE_VISUAL_COMPLETE" }
  | { type: "PINCH_CONFIRMED"; selectedCardId: string }
  | { type: "GRAB_CANCELLED" }
  | { type: "PULL_CONFIRMED" }
  | { type: "PLACEMENT_SETTLED" }
  | { type: "GRAB_TIMEOUT" }
  | { type: "START_REVEAL" }
  | { type: "REVEAL_VISUAL_COMPLETE" }
  | { type: "RESET_TO_QUESTION" }
  | { type: "SET_MODE"; mode: InteractionMode }
  | { type: "SET_ERROR"; message: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_CAMERA_ERROR"; message: string }
  | { type: "CLEAR_CAMERA_ERROR" };

export const initialGestureDrawState: GestureDrawState = {
  phase: "QUESTION",
  question: "",
  spread: null,
  results: [],
  currentSlotIndex: 0,
  grabbedCardId: null,
  result: null,
  mode: "gesture",
  error: null,
  cameraError: null
};

function randomOrientation(): ReadingResult["orientation"] {
  return Math.random() < 0.5 ? "upright" : "reversed";
}

function canTransition(current: GesturePhase, expected: GesturePhase) {
  return current === expected;
}

export function gestureDrawReducer(
  state: GestureDrawState,
  action: GestureDrawAction
): GestureDrawState {
  switch (action.type) {
    case "SUBMIT_QUESTION":
      return {
        ...initialGestureDrawState,
        question: action.question.trim(),
        mode: state.mode,
        error: state.error,
        cameraError: state.cameraError,
        phase: "SPREAD"
      };

    case "SELECT_SPREAD":
      if (!canTransition(state.phase, "SPREAD")) return state;
      return {
        ...state,
        spread: action.spread,
        results: [],
        currentSlotIndex: 0,
        grabbedCardId: null,
        result: null,
        error: null,
        phase: "AWAKENING"
      };

    case "AWAKENING_COMPLETE":
      if (!canTransition(state.phase, "AWAKENING")) return state;
      return { ...state, phase: "IDLE" };

    case "FIST_CONFIRMED":
      if (!canTransition(state.phase, "IDLE")) return state;
      return { ...state, phase: "SHUFFLING", error: null };

    case "SHUFFLE_VISUAL_COMPLETE":
      if (!canTransition(state.phase, "SHUFFLING")) return state;
      return { ...state, phase: "SELECTING", error: null };

    case "PINCH_CONFIRMED": {
      const confirmed = confirmSelectedCard(state.phase, action.selectedCardId);
      if (!confirmed) return state;
      return {
        ...state,
        ...confirmed,
        error: null
      };
    }

    case "PULL_CONFIRMED": {
      if (
        !canTransition(state.phase, "GRABBING") ||
        !state.grabbedCardId ||
        !state.spread
      ) {
        return state;
      }

      const slots = getSpreadSlots(state.spread);
      const slot = slots[state.currentSlotIndex];

      if (!slot) return state;

      const result: ReadingResult = {
        cardId: state.grabbedCardId,
        orientation: randomOrientation(),
        question: state.question,
        slotId: slot.id,
        slotLabel: slot.label,
        position: {
          x: slot.x,
          y: slot.y
        }
      };
      const results = [...state.results, result];
      const spreadComplete = isSpreadComplete(state.spread, results.length);

      return {
        ...state,
        phase: spreadComplete ? "CONFIRMED" : "PLACING",
        results,
        currentSlotIndex: state.currentSlotIndex + 1,
        grabbedCardId: spreadComplete ? state.grabbedCardId : null,
        result,
        error: null
      };
    }

    case "PLACEMENT_SETTLED":
      if (!canTransition(state.phase, "PLACING")) return state;
      return {
        ...state,
        phase: "SELECTING",
        grabbedCardId: null,
        result: null,
        error: null
      };

    case "GRAB_CANCELLED":
      if (!canTransition(state.phase, "GRABBING")) return state;
      return {
        ...state,
        phase: "SELECTING",
        grabbedCardId: null,
        result: null,
        error: null
      };

    case "GRAB_TIMEOUT":
      if (!canTransition(state.phase, "GRABBING")) return state;
      return {
        ...state,
        phase: "SELECTING",
        grabbedCardId: null,
        error: "星域回响变弱，请重新召唤一张牌"
      };

    case "START_REVEAL":
      if (!canTransition(state.phase, "CONFIRMED")) return state;
      return { ...state, phase: "REVEALING" };

    case "REVEAL_VISUAL_COMPLETE":
      if (!canTransition(state.phase, "REVEALING")) return state;
      if (isSpreadComplete(state.spread, state.results.length)) {
        return { ...state, phase: "RESULT", grabbedCardId: null, result: null };
      }
      return {
        ...state,
        phase: "SELECTING",
        grabbedCardId: null,
        result: null,
        error: null
      };

    case "RESET_TO_QUESTION":
      return {
        ...initialGestureDrawState,
        mode: state.mode
      };

    case "SET_MODE":
      if (state.mode === action.mode) return state;
      return { ...state, mode: action.mode };

    case "SET_ERROR":
      if (state.error === action.message) return state;
      return { ...state, error: action.message };

    case "CLEAR_ERROR":
      if (state.error === null) return state;
      return { ...state, error: null };

    case "SET_CAMERA_ERROR":
      if (state.cameraError === action.message) return state;
      return { ...state, cameraError: action.message };

    case "CLEAR_CAMERA_ERROR":
      if (state.cameraError === null) return state;
      return { ...state, cameraError: null };

    default:
      return state;
  }
}
