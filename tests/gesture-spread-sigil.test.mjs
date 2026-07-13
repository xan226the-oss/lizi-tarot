import assert from "node:assert/strict";
import test from "node:test";

import { getSpreadSigilGeometry } from "../lib/gesture/spread-sigil.ts";

test("three-card sigil exposes a wide orrery and three anchors", () => {
  const geometry = getSpreadSigilGeometry("three");
  assert.equal(geometry.label, "三张星轨");
  assert.equal(geometry.orbit, "wide");
  assert.equal(geometry.points.length, 3);
  assert.equal(geometry.viewBox, "0 0 160 100");
  assert.equal("path" in geometry, false);
});

test("five-card sigil exposes a circular orrery without a pentagram path", () => {
  const geometry = getSpreadSigilGeometry("five");
  assert.equal(geometry.label, "五芒星阵");
  assert.equal(geometry.orbit, "round");
  assert.equal(geometry.points.length, 5);
  assert.equal(geometry.viewBox, "0 0 100 100");
  assert.equal("path" in geometry, false);
});
