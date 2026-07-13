export type NormalSpreadId =
  | "single-guidance"
  | "three-time"
  | "four-seasons"
  | "relationship"
  | "decision"
  | "cross"
  | "horseshoe"
  | "moon-phase"
  | "soul-exploration"
  | "celtic-cross"
  | "annual-zodiac"
  | "career-growth";

export type NormalSpreadSigil =
  | "single"
  | "arc"
  | "circle"
  | "fork"
  | "cross"
  | "rise"
  | "grid";

export type NormalSpreadSlot = {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
};

export type NormalSpread = {
  id: NormalSpreadId;
  name: string;
  cardCount: number;
  useFor: string;
  sigil: NormalSpreadSigil;
  slots: NormalSpreadSlot[];
};

export type NormalReadingResult = {
  cardId: number;
  orientation: "upright" | "reversed";
  slotId: string;
  slotLabel: string;
};
