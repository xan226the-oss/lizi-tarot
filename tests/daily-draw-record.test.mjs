import assert from "node:assert/strict";
import test from "node:test";

import { isValidDailyDrawRecord } from "../lib/daily-draw-record.ts";

const date = "2026-07-10";
const baseRecord = {
  date,
  shownCardIds: [1, 2, 3]
};

test("accepts an untouched daily draw", () => {
  assert.equal(
    isValidDailyDrawRecord(
      { ...baseRecord, selectedCardId: null, orientation: null },
      date
    ),
    true
  );
});

test("rejects a selected card without an orientation", () => {
  assert.equal(
    isValidDailyDrawRecord(
      { ...baseRecord, selectedCardId: 2, orientation: null },
      date
    ),
    false
  );
});

test("rejects an orientation without a selected card", () => {
  assert.equal(
    isValidDailyDrawRecord(
      { ...baseRecord, selectedCardId: null, orientation: "upright" },
      date
    ),
    false
  );
});

test("accepts a selected card and orientation pair", () => {
  assert.equal(
    isValidDailyDrawRecord(
      { ...baseRecord, selectedCardId: 3, orientation: "reversed" },
      date
    ),
    true
  );
});
