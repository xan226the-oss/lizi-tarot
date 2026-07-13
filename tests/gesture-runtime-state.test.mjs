import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmSelectedCard,
  INITIAL_RITUAL_VISUAL_STATE,
  ritualVisualReducer
} from "../lib/gesture/runtime-state.ts";

test("pointer frames stay inside the visual runtime", () => {
  const next = ritualVisualReducer(INITIAL_RITUAL_VISUAL_STATE, {
    type: "POINTER_FRAME",
    pointer: { x: 0.4, y: -0.2 }
  });

  assert.deepEqual(next.pointer, { x: 0.4, y: -0.2 });
  assert.equal(next.orbitOffset, 0);
});

test("orbit frames update local motion and candidate together", () => {
  const next = ritualVisualReducer(INITIAL_RITUAL_VISUAL_STATE, {
    type: "ORBIT_FRAME",
    frame: {
      offset: 2.5,
      speed: 1.2,
      selectedCardId: "14",
      selectedVirtualIndex: 13,
      selectedAngle: 0.2,
      pointerAngle: 0.1
    }
  });

  assert.equal(next.orbitOffset, 2.5);
  assert.equal(next.orbitSpeed, 1.2);
  assert.equal(next.selectedCardId, "14");
});

test("identical pointer frames preserve the state reference", () => {
  const state = {
    ...INITIAL_RITUAL_VISUAL_STATE,
    pointer: { x: 0.2, y: 0.1 }
  };

  assert.equal(
    ritualVisualReducer(state, {
      type: "POINTER_FRAME",
      pointer: { x: 0.2, y: 0.1 }
    }),
    state
  );
});

test("reset clears transient visual motion", () => {
  const moving = {
    pointer: { x: 0.5, y: 0.2 },
    orbitOffset: 4,
    orbitSpeed: 3,
    selectedCardId: "19"
  };

  assert.deepEqual(
    ritualVisualReducer(moving, { type: "RESET" }),
    INITIAL_RITUAL_VISUAL_STATE
  );
});

test("confirmed visual candidate becomes the business grab target", () => {
  assert.deepEqual(confirmSelectedCard("SELECTING", "22"), {
    phase: "GRABBING",
    grabbedCardId: "22"
  });
  assert.equal(confirmSelectedCard("SELECTING", undefined), null);
  assert.equal(confirmSelectedCard("SHUFFLING", "22"), null);
});
