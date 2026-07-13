import assert from "node:assert/strict";
import test from "node:test";

import { tarotArtManifest } from "../data/tarot-art-manifest.ts";
import {
  getTarotLibraryEntry,
  tarotLibraryEntries
} from "../lib/tarot-library.ts";
import { tarotCards } from "../lib/tarot-cards.ts";
import { buildTarotLibraryEntries } from "../scripts/tarot-art/generate-library-data.ts";

const runtimeKeys = [
  "cardId",
  "characters",
  "dominantColor",
  "imageAlt",
  "imagePath",
  "location",
  "sceneSummary",
  "story",
  "symbols"
];

function expectedRuntimeEntries() {
  return tarotCards.map((card) => {
    const art = tarotArtManifest.find((entry) => entry.cardId === card.id);
    assert.ok(art);
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
  }).sort((left, right) => left.cardId - right.cardId);
}

test("canonical tarot data remains a complete 78-card deck", () => {
  assert.equal(tarotCards.length, 78);
  assert.deepEqual(tarotCards.map((card) => card.id), Array.from({ length: 78 }, (_, i) => i + 1));
  assert.equal(tarotCards.filter((card) => card.arcana_type === "major").length, 22);
  for (const suit of ["wands", "cups", "swords", "pentacles"]) {
    assert.equal(tarotCards.filter((card) => card.suit === suit).length, 14);
  }
  assert.ok(tarotCards.every((card) => card.keywords.length > 0));
  assert.ok(tarotCards.every((card) => card.meaning_upright.trim() && card.meaning_reversed.trim()));
});

test("runtime metadata is the exact runtime-only manifest projection", () => {
  const expected = expectedRuntimeEntries();

  assert.deepEqual(buildTarotLibraryEntries(tarotCards, tarotArtManifest), expected);
  assert.deepEqual(tarotLibraryEntries, expected);
  assert.equal(new Set(tarotLibraryEntries.map((entry) => entry.cardId)).size, 78);
  for (const entry of tarotLibraryEntries) {
    assert.deepEqual(Object.keys(entry).sort(), runtimeKeys);
  }
});

test("generator rejects duplicate manifest card ids", () => {
  const duplicateManifest = [
    ...tarotArtManifest,
    { ...tarotArtManifest[0] }
  ];

  assert.throws(
    () => buildTarotLibraryEntries(tarotCards, duplicateManifest),
    /Duplicate art manifest cardId 1/
  );
});

test("getter returns null for unknown ids", () => {
  assert.equal(getTarotLibraryEntry(0), null);
  assert.equal(getTarotLibraryEntry(79), null);
});
