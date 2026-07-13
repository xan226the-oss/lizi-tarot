export type TarotArtBrief = {
  cardId: number;
  archetype: string;
  sceneSummary: string;
  characters: string[];
  location: string;
  dominantColor: string;
  suitSymbol: string | null;
  requiredSymbolCount: number | null;
  uprightVisualCue: string;
  reversedVisualCue: string;
  internalStyleReferences: number[];
  requiredElements: string[];
  forbiddenElements: string[];
};

export type TarotArtManifestEntry = TarotArtBrief & {
  librarySymbols: string[];
};

export type TarotArtReview = {
  anatomy: "pass" | "fail";
  symbolCount: "pass" | "fail" | "not-applicable";
  styleConsistency: "pass" | "fail";
  forbiddenElements: "pass" | "fail";
};

export type TarotArtProvenance = {
  cardId: number;
  createdAt: string;
  generator: string;
  prompt: string;
  externalInputs: string[];
  internalReferenceCardIds: number[];
  sourceSha256: string;
  webSha256: string;
  humanReview: TarotArtReview;
};

export type TarotProductionBatchKey =
  | "major"
  | "wands"
  | "cups"
  | "swords"
  | "pentacles";

export type TarotProductionBatch = {
  key: TarotProductionBatchKey;
  label: string;
  ids: number[];
  anchorIds: number[];
};
