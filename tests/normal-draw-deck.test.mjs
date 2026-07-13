import assert from "node:assert/strict";
import test from "node:test";

import {
  randomNormalOrientation,
  shuffleNormalDeck
} from "../lib/normal-draw/deck.ts";

test("normal deck shuffle keeps every unique card", () => {
  const ids = Array.from({ length: 78 }, (_, index) => index + 1);
  const shuffled = shuffleNormalDeck(ids, () => 0.25);

  assert.equal(shuffled.length, 78);
  assert.equal(new Set(shuffled).size, 78);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), ids);
  assert.notDeepEqual(shuffled, ids);
  assert.deepEqual(ids, Array.from({ length: 78 }, (_, index) => index + 1));
});

test("orientation uses an even threshold", () => {
  assert.equal(randomNormalOrientation(() => 0.49), "upright");
  assert.equal(randomNormalOrientation(() => 0.5), "reversed");
});
