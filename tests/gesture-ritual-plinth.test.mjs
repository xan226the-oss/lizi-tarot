import assert from "node:assert/strict";
import test from "node:test";

import {
  getRitualPlinthMode,
  isCompletedSpreadPhase
} from "../lib/gesture/ritual-plinth.ts";

test("the shared plinth appears only after the final confirmation", () => {
  assert.equal(getRitualPlinthMode("SELECTING"), "hidden");
  assert.equal(getRitualPlinthMode("PLACING"), "hidden");
  assert.equal(getRitualPlinthMode("CONFIRMED"), "emerging");
  assert.equal(getRitualPlinthMode("REVEALING"), "active");
  assert.equal(getRitualPlinthMode("RESULT"), "active");
});

test("chosen card backs become a complete group only during confirmation and reveal", () => {
  assert.equal(isCompletedSpreadPhase("PLACING"), false);
  assert.equal(isCompletedSpreadPhase("CONFIRMED"), true);
  assert.equal(isCompletedSpreadPhase("REVEALING"), true);
  assert.equal(isCompletedSpreadPhase("RESULT"), false);
});
