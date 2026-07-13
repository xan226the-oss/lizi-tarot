import assert from "node:assert/strict";
import test from "node:test";

import {
  NORMAL_SPREADS,
  getNormalSpread
} from "../lib/normal-draw/spreads.ts";

test("normal draw exposes twelve internally consistent spreads", () => {
  assert.equal(NORMAL_SPREADS.length, 12);
  assert.equal(new Set(NORMAL_SPREADS.map((spread) => spread.id)).size, 12);

  for (const spread of NORMAL_SPREADS) {
    assert.equal(spread.cardCount, spread.slots.length);
    assert.equal(
      new Set(spread.slots.map((slot) => slot.id)).size,
      spread.slots.length
    );
    assert.ok(spread.slots.every((slot) => slot.x >= 0 && slot.x <= 100));
    assert.ok(spread.slots.every((slot) => slot.y >= 0 && slot.y <= 100));
  }

  assert.equal(getNormalSpread("relationship")?.name, "关系牌阵");
});

test("annual zodiac spread models life areas instead of months", () => {
  const labels = getNormalSpread("annual-zodiac")?.slots.map(
    (slot) => slot.label
  );

  assert.deepEqual(labels, [
    "自我",
    "资源",
    "沟通",
    "家庭",
    "创造",
    "日常与健康",
    "关系",
    "共享与转化",
    "信念与远行",
    "事业",
    "社群",
    "潜意识"
  ]);
});
