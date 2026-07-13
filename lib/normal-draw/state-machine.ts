import type { TarotOrientation } from "../tarot-cards.ts";
import type {
  NormalReadingResult,
  NormalSpread
} from "./types.ts";

export type NormalDrawPhase =
  | "ATLAS"
  | "QUESTION"
  | "DRAWING"
  | "PLACING"
  | "REVEAL";

export type NormalDrawState = {
  phase: NormalDrawPhase;
  spread: NormalSpread | null;
  question: string;
  deck: number[];
  results: NormalReadingResult[];
};

export type NormalDrawAction =
  | { type: "SELECT_SPREAD"; spread: NormalSpread }
  | { type: "SUBMIT_QUESTION"; question: string; deck: number[] }
  | {
      type: "CHOOSE_CARD";
      cardId: number;
      orientation: TarotOrientation;
    }
  | { type: "PLACEMENT_SETTLED" }
  | { type: "BACK_TO_QUESTION" }
  | { type: "RESET_READING"; deck: number[] }
  | { type: "CHANGE_SPREAD" };

export const initialNormalDrawState: NormalDrawState = {
  phase: "ATLAS",
  spread: null,
  question: "",
  deck: [],
  results: []
};

export function normalDrawReducer(
  state: NormalDrawState,
  action: NormalDrawAction
): NormalDrawState {
  switch (action.type) {
    case "SELECT_SPREAD":
      return {
        phase: "QUESTION",
        spread: action.spread,
        question: "",
        deck: [],
        results: []
      };

    case "SUBMIT_QUESTION":
      if (state.phase !== "QUESTION" || !state.spread) return state;
      return {
        ...state,
        phase: "DRAWING",
        question: action.question.trim(),
        deck: [...action.deck],
        results: []
      };

    case "CHOOSE_CARD": {
      if (state.phase !== "DRAWING" || !state.spread) return state;
      const cardIndex = state.deck.indexOf(action.cardId);
      const currentSlot = state.spread.slots[state.results.length];
      if (cardIndex < 0 || !currentSlot) return state;

      const deck = [...state.deck];
      deck.splice(cardIndex, 1);
      const result: NormalReadingResult = {
        cardId: action.cardId,
        orientation: action.orientation,
        slotId: currentSlot.id,
        slotLabel: currentSlot.label
      };

      return {
        ...state,
        phase: "PLACING",
        deck,
        results: [...state.results, result]
      };
    }

    case "PLACEMENT_SETTLED":
      if (state.phase !== "PLACING" || !state.spread) return state;
      return {
        ...state,
        phase:
          state.results.length === state.spread.cardCount
            ? "REVEAL"
            : "DRAWING"
      };

    case "BACK_TO_QUESTION":
      if (!state.spread) return initialNormalDrawState;
      return {
        ...state,
        phase: "QUESTION",
        deck: [],
        results: []
      };

    case "RESET_READING":
      if (!state.spread) return initialNormalDrawState;
      return {
        ...state,
        phase: "DRAWING",
        deck: [...action.deck],
        results: []
      };

    case "CHANGE_SPREAD":
      return initialNormalDrawState;

    default:
      return state;
  }
}
