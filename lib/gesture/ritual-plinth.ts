import type { GesturePhase } from "./types.ts";

export type RitualPlinthMode = "hidden" | "emerging" | "active";

export function getRitualPlinthMode(phase: GesturePhase): RitualPlinthMode {
  if (phase === "CONFIRMED") return "emerging";
  if (phase === "REVEALING" || phase === "RESULT") return "active";
  return "hidden";
}

export function isCompletedSpreadPhase(phase: GesturePhase) {
  return phase === "CONFIRMED" || phase === "REVEALING";
}
