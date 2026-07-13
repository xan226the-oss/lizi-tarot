import assert from "node:assert/strict";
import test from "node:test";

import { NORMAL_SPREADS } from "../lib/normal-draw/spreads.ts";
import {
  initialNormalDrawState,
  normalDrawReducer
} from "../lib/normal-draw/state-machine.ts";

const question = "未来三个月我应该把事业重心放在哪里？";

test("question submission creates one deck and enters drawing", () => {
  const spread = NORMAL_SPREADS[1];
  const selected = normalDrawReducer(initialNormalDrawState, {
    type: "SELECT_SPREAD",
    spread
  });
  const drawing = normalDrawReducer(selected, {
    type: "SUBMIT_QUESTION",
    question,
    deck: Array.from({ length: 78 }, (_, index) => index + 1)
  });

  assert.equal(drawing.phase, "DRAWING");
  assert.equal(drawing.deck.length, 78);
  assert.equal(drawing.results.length, 0);
});

test("placing locks duplicate clicks and final settlement reveals", () => {
  const spread = NORMAL_SPREADS[1];
  const drawing = {
    ...initialNormalDrawState,
    phase: "DRAWING",
    spread,
    question,
    deck: [1, 2, 3, 4],
    results: []
  };

  const placing = normalDrawReducer(drawing, {
    type: "CHOOSE_CARD",
    cardId: 2,
    orientation: "upright"
  });

  assert.equal(placing.phase, "PLACING");
  assert.equal(
    normalDrawReducer(placing, {
      type: "CHOOSE_CARD",
      cardId: 3,
      orientation: "reversed"
    }),
    placing
  );

  const second = normalDrawReducer(
    normalDrawReducer(placing, { type: "PLACEMENT_SETTLED" }),
    { type: "CHOOSE_CARD", cardId: 3, orientation: "reversed" }
  );
  const third = normalDrawReducer(
    normalDrawReducer(second, { type: "PLACEMENT_SETTLED" }),
    { type: "CHOOSE_CARD", cardId: 4, orientation: "upright" }
  );

  assert.equal(
    normalDrawReducer(third, { type: "PLACEMENT_SETTLED" }).phase,
    "REVEAL"
  );
});

test("reset reading keeps the question and uses a fresh deck", () => {
  const spread = NORMAL_SPREADS[0];
  const reveal = {
    ...initialNormalDrawState,
    phase: "REVEAL",
    spread,
    question,
    deck: [2, 3],
    results: [
      {
        cardId: 1,
        orientation: "upright",
        slotId: "guidance",
        slotLabel: "核心指引"
      }
    ]
  };

  const reset = normalDrawReducer(reveal, {
    type: "RESET_READING",
    deck: [9, 8, 7]
  });

  assert.equal(reset.phase, "DRAWING");
  assert.equal(reset.question, question);
  assert.equal(reset.spread, spread);
  assert.deepEqual(reset.deck, [9, 8, 7]);
  assert.deepEqual(reset.results, []);
});
