import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getTarotLibraryEntry,
  tarotLibraryEntries
} from "../lib/tarot-library.ts";
import { tarotCards } from "../lib/tarot-cards.ts";

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

test("runtime metadata maps one-to-one by numeric card id", () => {
  assert.equal(tarotLibraryEntries.length, 78);
  assert.equal(new Set(tarotLibraryEntries.map((entry) => entry.cardId)).size, 78);
  for (const card of tarotCards) {
    const entry = getTarotLibraryEntry(card.id);
    assert.ok(entry);
    assert.equal(entry.imagePath, `/images/tarot/cards/${card.id}.webp`);
    assert.match(entry.imageAlt, new RegExp(`^${card.name_cn}原创牌面：`));
    assert.ok(entry.story.length >= entry.sceneSummary.length);
    assert.ok(entry.characters.length > 0);
    assert.ok(entry.symbols.length > 0);
  }
});

test("runtime module excludes production-only authoring data", async () => {
  const source = await readFile(new URL("../lib/tarot-library.ts", import.meta.url), "utf8");
  for (const forbidden of [
    "prompt:",
    "forbiddenElements",
    "internalStyleReferences",
    "sourceSha256",
    "humanReview"
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden));
  }
});

test("getter returns null for unknown ids", () => {
  assert.equal(getTarotLibraryEntry(0), null);
  assert.equal(getTarotLibraryEntry(79), null);
});
