import assert from "node:assert/strict";
import test from "node:test";

import {
  getOrbitEdgeVisibility,
  getVisibleOrbitCards
} from "../lib/gesture/card-orbit.ts";

test("orbit cards fade continuously through the outer one-and-a-half slots", () => {
  assert.equal(getOrbitEdgeVisibility(5.5, 7), 1);
  assert.ok(getOrbitEdgeVisibility(6.5, 7) < 1);
  assert.ok(getOrbitEdgeVisibility(6.5, 7) > 0);
  assert.equal(getOrbitEdgeVisibility(7.5, 7), 0);
});

test("the two outer orbit cards are quieter than the center card", () => {
  const cards = getVisibleOrbitCards(0.49);
  const center = cards.find((card) => card.slotIndex === 0);
  const edge = cards.find((card) => card.slotIndex === -7);

  assert.ok(center);
  assert.ok(edge);
  assert.ok(edge.opacity < center.opacity * 0.5);
});
