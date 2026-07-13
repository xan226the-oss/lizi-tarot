import assert from "node:assert/strict";
import test from "node:test";

import {
  TAROT_PRODUCTION_BATCHES,
  getTarotArtManifestEntry,
  tarotArtManifest
} from "../data/tarot-art-manifest.ts";
import { buildTarotArtPrompt } from "../lib/tarot-art-prompt.ts";
import { tarotCards } from "../lib/tarot-cards.ts";

const ids = Array.from({ length: 78 }, (_, index) => index + 1);

test("manifest maps one-to-one to canonical card ids", () => {
  assert.equal(tarotArtManifest.length, 78);
  assert.deepEqual(tarotArtManifest.map((entry) => entry.cardId), ids);
  assert.equal(new Set(tarotArtManifest.map((entry) => entry.cardId)).size, 78);
  assert.deepEqual(tarotCards.map((card) => card.id), ids);
});

test("every brief carries complete authoring and runtime source fields", () => {
  for (const entry of tarotArtManifest) {
    assert.ok(entry.archetype.trim());
    assert.ok(entry.sceneSummary.trim());
    assert.ok(entry.characters.length > 0);
    assert.ok(entry.location.trim());
    assert.ok(entry.dominantColor.trim());
    assert.ok(entry.uprightVisualCue.trim());
    assert.ok(entry.reversedVisualCue.trim());
    assert.ok(entry.requiredElements.length > 0);
    assert.ok(entry.forbiddenElements.length > 0);
    assert.ok(entry.librarySymbols.length > 0);
    assert.ok(entry.internalStyleReferences.every((id) => ids.includes(id)));
    assert.ok(!entry.internalStyleReferences.includes(entry.cardId));
  }
});

test("numeric minor cards use exact original suit-symbol counts", () => {
  for (const card of tarotCards) {
    const entry = getTarotArtManifestEntry(card.id);
    assert.ok(entry);
    if (card.arcana_type === "major") {
      assert.equal(entry.suitSymbol, null);
      assert.equal(entry.requiredSymbolCount, null);
    } else if (card.number >= 1 && card.number <= 10) {
      assert.equal(entry.requiredSymbolCount, card.number);
      assert.match(entry.requiredElements.join(" "), new RegExp(`\\b${card.number}\\b`));
    } else {
      assert.equal(entry.requiredSymbolCount, null);
      assert.match(entry.requiredElements.join(" "), /至少 1 个清晰花色符号/);
    }
  }
});

test("production batches contain exactly the remaining 75 cards", () => {
  assert.deepEqual(
    TAROT_PRODUCTION_BATCHES.map(({ key, ids }) => [key, ids.length]),
    [["major", 21], ["wands", 14], ["cups", 13], ["swords", 14], ["pentacles", 13]]
  );
  const producedIds = TAROT_PRODUCTION_BATCHES.flatMap((batch) => batch.ids);
  assert.equal(producedIds.length, 75);
  assert.equal(new Set(producedIds).size, 75);
  assert.deepEqual(producedIds.filter((id) => [1, 49, 69].includes(id)), []);
  assert.deepEqual([...producedIds, 1, 49, 69].sort((a, b) => a - b), ids);
});

test("prompts enforce the approved visual and originality contract", () => {
  for (const entry of tarotArtManifest) {
    const prompt = buildTarotArtPrompt(entry);
    assert.match(prompt, /portrait 2:3/i);
    assert.match(prompt, /1024 × 1536/);
    assert.match(prompt, /55–65%/);
    assert.match(prompt, /gold limited to about 10%/i);
    assert.match(prompt, /no title, number, border, logo, or watermark/i);
    assert.match(prompt, /do not imitate or reference any named artist/i);
    assert.match(prompt, new RegExp(entry.sceneSummary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
