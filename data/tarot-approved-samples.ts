export type ApprovedTarotSample = {
  cardId: 1 | 49 | 69;
  createdAt: "2026-07-13";
  generator: "OpenAI built-in image generation (model version not exposed)";
  prompt: string;
  internalReferenceCardIds: number[];
  sourceSha256: string;
};

export const APPROVED_TAROT_SAMPLES: Partial<
  Record<1 | 49 | 69, ApprovedTarotSample>
> = {};
