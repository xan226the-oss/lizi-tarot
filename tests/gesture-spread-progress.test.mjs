import assert from "node:assert/strict";
import test from "node:test";

import { isSpreadComplete } from "../lib/gesture/spread-progress.ts";

test("three-card spread reveals only after all three cards are drawn", () => {
  assert.equal(isSpreadComplete("three", 2), false);
  assert.equal(isSpreadComplete("three", 3), true);
});

test("five-card spread reveals only after all five cards are drawn", () => {
  assert.equal(isSpreadComplete("five", 4), false);
  assert.equal(isSpreadComplete("five", 5), true);
});
