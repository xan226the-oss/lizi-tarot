import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { tarotArtManifest } from "../../data/tarot-art-manifest.ts";
import { type TarotCard, tarotCards } from "../../lib/tarot-cards.ts";
import type { TarotArtManifestEntry } from "../../types/tarot-art.ts";

export function buildTarotLibraryEntries(
  cards: readonly TarotCard[],
  manifest: readonly TarotArtManifestEntry[]
) {
  const canonicalCardIds = new Set<number>();
  for (const card of cards) {
    if (canonicalCardIds.has(card.id)) {
      throw new Error(`Duplicate canonical tarot card id ${card.id}`);
    }
    canonicalCardIds.add(card.id);
  }

  const manifestCardIds = new Set<number>();
  for (const art of manifest) {
    if (manifestCardIds.has(art.cardId)) {
      throw new Error(`Duplicate art manifest cardId ${art.cardId}`);
    }
    manifestCardIds.add(art.cardId);

    if (!canonicalCardIds.has(art.cardId)) {
      throw new Error(`Missing canonical tarot card for manifest entry ${art.cardId}`);
    }
  }

  if (manifestCardIds.size !== canonicalCardIds.size) {
    throw new Error(
      `Tarot card/manifest ID count mismatch: ${canonicalCardIds.size} cards, ${manifestCardIds.size} manifest entries`
    );
  }

  const output = cards.map((card) => {
    const art = manifest.find((entry) => entry.cardId === card.id);
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

  return output.sort((left, right) => left.cardId - right.cardId);
}

const output = buildTarotLibraryEntries(tarotCards, tarotArtManifest);

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateLibraryData().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
