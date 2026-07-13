import assert from "node:assert/strict";
import test from "node:test";

import {
  gestureDrawReducer,
  initialGestureDrawState
} from "../lib/gesture/state-machine.ts";

function createGrabbingState() {
  return {
    ...initialGestureDrawState,
    phase: "GRABBING",
    question: "这段关系里，我最需要看清什么？",
    spread: "three",
    grabbedCardId: "22"
  };
}

function createReadingResult(cardId, slotId, slotLabel) {
  return {
    cardId,
    orientation: "upright",
    question: "这段关系里，我最需要看清什么？",
    slotId,
    slotLabel,
    position: { x: 25, y: 50 }
  };
}

test("a non-final pull settles before returning to selection", () => {
  const placed = gestureDrawReducer(createGrabbingState(), {
    type: "PULL_CONFIRMED"
  });

  assert.equal(placed.phase, "PLACING");
  assert.equal(placed.results.length, 1);

  const settled = gestureDrawReducer(placed, { type: "PLACEMENT_SETTLED" });

  assert.equal(settled.phase, "SELECTING");
  assert.equal(settled.grabbedCardId, null);
  assert.equal(settled.result, null);
});

test("the final pull holds in confirmed instead of entering placement", () => {
  const finalGrab = {
    ...createGrabbingState(),
    currentSlotIndex: 2,
    results: [
      createReadingResult("10", "past", "过去"),
      createReadingResult("11", "present", "现在")
    ]
  };

  const confirmed = gestureDrawReducer(finalGrab, { type: "PULL_CONFIRMED" });

  assert.equal(confirmed.phase, "CONFIRMED");
  assert.equal(confirmed.results.length, 3);
  assert.equal(
    gestureDrawReducer(confirmed, { type: "PLACEMENT_SETTLED" }),
    confirmed
  );
});
