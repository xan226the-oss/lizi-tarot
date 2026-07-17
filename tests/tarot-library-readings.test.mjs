import assert from "node:assert/strict";
import test from "node:test";

import { tarotCards } from "../lib/tarot-cards.ts";
import { tarotLibraryEntries } from "../lib/tarot-library.ts";
import {
  getTarotLibraryReading,
  tarotLibraryReadings
} from "../lib/tarot-library-readings.ts";

const ids = Array.from({ length: 78 }, (_, index) => index + 1);

test("library readings cover every canonical card without sharing draw data", () => {
  assert.deepEqual(tarotLibraryReadings.map((reading) => reading.cardId), ids);
  assert.equal(tarotLibraryReadings.length, tarotCards.length);
  assert.equal(tarotLibraryEntries.length, tarotCards.length);
  assert.ok(tarotLibraryReadings.every((reading) => reading.upright.trim()));
  assert.ok(tarotLibraryReadings.every((reading) => reading.reversed.trim()));
});

test("library readings are complete, bounded and individually written", () => {
  const upright = tarotLibraryReadings.map((reading) => reading.upright);
  const reversed = tarotLibraryReadings.map((reading) => reading.reversed);

  for (const reading of tarotLibraryReadings) {
    assert.ok(reading.upright.length >= 90 && reading.upright.length <= 160, reading.cardId);
    assert.ok(reading.reversed.length >= 90 && reading.reversed.length <= 160, reading.cardId);
  }

  assert.equal(new Set(upright).size, 78);
  assert.equal(new Set(reversed).size, 78);
});

test("library reading lookup is complete and unknown cards have no fallback", () => {
  for (const cardId of ids) {
    assert.equal(getTarotLibraryReading(cardId), tarotLibraryReadings[cardId - 1]);
  }

  assert.equal(getTarotLibraryReading(0), null);
  assert.equal(getTarotLibraryReading(79), null);
});
