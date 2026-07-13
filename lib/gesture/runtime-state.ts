import type { GesturePhase, OrbitFrame, PointerPosition } from "./types.ts";

export type RitualVisualState = {
  pointer: PointerPosition;
  orbitOffset: number;
  orbitSpeed: number;
  selectedCardId: string | null;
};

export type RitualVisualAction =
  | { type: "POINTER_FRAME"; pointer: PointerPosition }
  | { type: "ORBIT_FRAME"; frame: OrbitFrame }
  | { type: "RESET" };

export const INITIAL_RITUAL_VISUAL_STATE: RitualVisualState = {
  pointer: { x: 0, y: 0 },
  orbitOffset: 0,
  orbitSpeed: 0,
  selectedCardId: null
};

export function ritualVisualReducer(
  state: RitualVisualState,
  action: RitualVisualAction
): RitualVisualState {
  if (action.type === "RESET") return INITIAL_RITUAL_VISUAL_STATE;

  if (action.type === "POINTER_FRAME") {
    if (
      state.pointer.x === action.pointer.x &&
      state.pointer.y === action.pointer.y
    ) {
      return state;
    }

    return { ...state, pointer: action.pointer };
  }

  if (
    state.orbitOffset === action.frame.offset &&
    state.orbitSpeed === action.frame.speed &&
    state.selectedCardId === action.frame.selectedCardId
  ) {
    return state;
  }

  return {
    ...state,
    orbitOffset: action.frame.offset,
    orbitSpeed: action.frame.speed,
    selectedCardId: action.frame.selectedCardId
  };
}

export function confirmSelectedCard(
  phase: GesturePhase,
  selectedCardId?: string
) {
  if (phase !== "SELECTING" || !selectedCardId) return null;

  return {
    phase: "GRABBING" as const,
    grabbedCardId: selectedCardId
  };
}
