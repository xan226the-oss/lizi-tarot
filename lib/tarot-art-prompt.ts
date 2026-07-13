import type { TarotArtManifestEntry } from "../types/tarot-art.ts";

export function buildTarotArtPrompt(entry: TarotArtManifestEntry) {
  const symbolRule = entry.suitSymbol
    ? entry.requiredSymbolCount === null
      ? `Show at least one clear original suit symbol: ${entry.suitSymbol}.`
      : `Show exactly ${entry.requiredSymbolCount} clear original suit symbols: ${entry.suitSymbol}.`
    : "Do not force a repeated suit object; express this historical turning point through scene and action.";

  return [
    "Use case: final production tarot card face for the original Particle deck.",
    `Card identity: canonical numeric cardId ${entry.cardId}; archetype ${entry.archetype}.`,
    `Primary scene: ${entry.sceneSummary}`,
    `Characters: ${entry.characters.join("; ")}. Complete bodies, believable anatomy, visible hands and feet.`,
    `Location: ${entry.location}. Dominant color: ${entry.dominantColor}.`,
    `Upright visual cue: ${entry.uprightVisualCue}`,
    `Reversed visual tension: ${entry.reversedVisualCue}`,
    symbolRule,
    `Required elements: ${entry.requiredElements.join("; ")}.`,
    "Style: high-end hand-painted cinematic story illustration from one original East-West interstellar mythic civilization; dark colored lacquer with raised gilded relief, mineral pigments, jewel-like highlights, deep indigo shared base, one dominant color, antique gold limited to about 10%.",
    "Composition: portrait 2:3, output 1024 × 1536, full-bleed, environment occupies 55–65%, asymmetric action, strong thumbnail read, no centered static pose and no altar-like symmetry.",
    "Originality: entirely original. Do not imitate or reference any named artist, existing tarot deck, tarot illustration, copyrighted character, recognizable franchise, course material, or copyright-unknown input.",
    `Avoid: ${entry.forbiddenElements.join("; ")}.`,
    "No title, number, border, logo, or watermark."
  ].join("\n\n");
}
