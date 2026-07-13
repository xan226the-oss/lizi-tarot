import { writeFile } from "node:fs/promises";

import {
  getTarotArtManifestEntry,
  tarotArtManifest
} from "../../data/tarot-art-manifest.ts";
import { tarotCards } from "../../lib/tarot-cards.ts";

const canonicalCardIds = new Set(tarotCards.map((card) => card.id));

for (const art of tarotArtManifest) {
  if (!canonicalCardIds.has(art.cardId)) {
    throw new Error(`Missing canonical tarot card for manifest entry ${art.cardId}`);
  }
}

const output = tarotCards.map((card) => {
  const art = getTarotArtManifestEntry(card.id);
  if (!art) throw new Error(`Missing art manifest entry for card ${card.id}`);
  return {
    cardId: card.id,
    imagePath: `/images/tarot/cards/${card.id}.webp`,
    imageAlt: `${card.name_cn}原创牌面：${art.sceneSummary}`,
    story: `${art.sceneSummary}。${art.uprightVisualCue}；${art.reversedVisualCue}。`,
    sceneSummary: art.sceneSummary,
    characters: art.characters,
    location: art.location,
    symbols: art.librarySymbols,
    dominantColor: art.dominantColor
  };
});

output.sort((left, right) => left.cardId - right.cardId);

const moduleSource = `export type TarotLibraryEntry = {
  cardId: number;
  imagePath: string;
  imageAlt: string;
  story: string;
  sceneSummary: string;
  characters: string[];
  location: string;
  symbols: string[];
  dominantColor: string;
};

export const tarotLibraryEntries = ${JSON.stringify(output, null, 2)} as TarotLibraryEntry[];

export function getTarotLibraryEntry(cardId: number) {
  return tarotLibraryEntries.find((entry) => entry.cardId === cardId) ?? null;
}
`;

async function generateLibraryData() {
  await writeFile(new URL("../../lib/tarot-library.ts", import.meta.url), moduleSource, "utf8");
}

generateLibraryData().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
