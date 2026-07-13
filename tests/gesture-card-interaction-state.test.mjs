import assert from "node:assert/strict";
import test from "node:test";

import { getCardInteractionState } from "../lib/gesture/card-interaction-state.ts";

test("drawn overrides grabbing and grabbing overrides candidate", () => {
  assert.equal(
    getCardInteractionState({ selected: true, grabbed: false, drawn: false }),
    "candidate"
  );
  assert.equal(
    getCardInteractionState({ selected: true, grabbed: true, drawn: false }),
    "grabbing"
  );
  assert.equal(
    getCardInteractionState({ selected: true, grabbed: true, drawn: true }),
    "drawn"
  );
});
