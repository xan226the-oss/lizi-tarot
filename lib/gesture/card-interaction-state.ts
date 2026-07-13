export type CardInteractionState = "idle" | "candidate" | "grabbing" | "drawn";

export function getCardInteractionState(input: {
  selected: boolean;
  grabbed: boolean;
  drawn: boolean;
}): CardInteractionState {
  if (input.drawn) return "drawn";
  if (input.grabbed) return "grabbing";
  if (input.selected) return "candidate";
  return "idle";
}
