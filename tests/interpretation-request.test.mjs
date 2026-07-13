import assert from "node:assert/strict";
import test from "node:test";

import { normalizeInterpretationRequest } from "../lib/interpretation-request.ts";
import { NORMAL_SPREADS } from "../lib/normal-draw/spreads.ts";

const question = "未来三个月，我应该把注意力放在哪个方向？";

function makeNormalRequest(spread) {
  return {
    readingType: "normal",
    question,
    spreadId: spread.id,
    results: spread.slots.map((slot, index) => ({
      cardId: index + 1,
      orientation: index % 2 === 0 ? "upright" : "reversed",
      slotId: slot.id,
      slotLabel: slot.label
    }))
  };
}

function clone(value) {
  return structuredClone(value);
}

test("normalizes all twelve normal spreads from local authoritative data", () => {
  assert.equal(NORMAL_SPREADS.length, 12);

  for (const spread of NORMAL_SPREADS) {
    const normalized = normalizeInterpretationRequest(makeNormalRequest(spread));
    assert.ok(normalized, spread.id);
    assert.equal(normalized.readingType, "normal");
    assert.equal(normalized.question, question);
    assert.equal(normalized.spreadTitle, spread.name);
    assert.equal(normalized.spreadPurpose, spread.useFor);
    assert.equal(normalized.cards.length, spread.cardCount);
    assert.deepEqual(
      normalized.cards.map((card) => card.slotDescription),
      spread.slots.map((slot) => slot.description)
    );
    assert.ok(normalized.cards.every((card) => card.cardName.length > 0));
    assert.ok(normalized.cards.every((card) => card.meaning.length > 0));
  }
});

test("rejects unknown spreads and wrong result counts", () => {
  const base = makeNormalRequest(NORMAL_SPREADS[1]);
  assert.equal(
    normalizeInterpretationRequest({ ...base, spreadId: "not-a-spread" }),
    null
  );
  assert.equal(
    normalizeInterpretationRequest({ ...base, results: base.results.slice(1) }),
    null
  );
  assert.equal(
    normalizeInterpretationRequest({
      ...base,
      results: [...base.results, base.results[0]]
    }),
    null
  );
});

test("rejects forged, reordered, duplicate, unknown and malformed normal results", () => {
  const base = makeNormalRequest(NORMAL_SPREADS[3]);
  const invalidRequests = [];

  const reordered = clone(base);
  [reordered.results[0], reordered.results[1]] = [
    reordered.results[1],
    reordered.results[0]
  ];
  invalidRequests.push(reordered);

  const wrongSlotId = clone(base);
  wrongSlotId.results[0].slotId = "forged-slot";
  invalidRequests.push(wrongSlotId);

  const wrongSlotLabel = clone(base);
  wrongSlotLabel.results[0].slotLabel = "伪造牌位";
  invalidRequests.push(wrongSlotLabel);

  const duplicateCard = clone(base);
  duplicateCard.results[1].cardId = duplicateCard.results[0].cardId;
  invalidRequests.push(duplicateCard);

  const duplicateSlot = clone(base);
  duplicateSlot.results[1].slotId = duplicateSlot.results[0].slotId;
  duplicateSlot.results[1].slotLabel = duplicateSlot.results[0].slotLabel;
  invalidRequests.push(duplicateSlot);

  const unknownCard = clone(base);
  unknownCard.results[0].cardId = 999;
  invalidRequests.push(unknownCard);

  const wrongCardType = clone(base);
  wrongCardType.results[0].cardId = "1";
  invalidRequests.push(wrongCardType);

  const wrongOrientation = clone(base);
  wrongOrientation.results[0].orientation = "sideways";
  invalidRequests.push(wrongOrientation);

  for (const request of invalidRequests) {
    assert.equal(normalizeInterpretationRequest(request), null);
  }
});

test("uses the same normal-question validation as the existing form", () => {
  const base = makeNormalRequest(NORMAL_SPREADS[0]);
  for (const invalidQuestion of [
    "太短",
    "12345678",
    "啊啊啊啊啊啊啊啊",
    "问".repeat(241)
  ]) {
    assert.equal(
      normalizeInterpretationRequest({ ...base, question: invalidQuestion }),
      null
    );
  }
});

test("keeps legacy three/five requests and explicit gesture requests compatible", () => {
  const legacyThree = {
    question: "这段关系里，我最需要看清什么？",
    spread: "three",
    results: [
      { cardId: "1", orientation: "upright", slotId: "past", slotLabel: "过去" },
      { cardId: "2", orientation: "reversed", slotId: "present", slotLabel: "现在" },
      { cardId: "3", orientation: "upright", slotId: "future", slotLabel: "未来" }
    ]
  };
  const legacyFive = {
    question: "我现在最需要平衡哪些生活方向？",
    spread: "five",
    results: [
      { cardId: "4", orientation: "upright", slotId: "body", slotLabel: "身" },
      { cardId: "5", orientation: "reversed", slotId: "mind", slotLabel: "心" },
      { cardId: "6", orientation: "upright", slotId: "spirit", slotLabel: "灵" },
      { cardId: "7", orientation: "reversed", slotId: "emotion", slotLabel: "情感" },
      { cardId: "8", orientation: "upright", slotId: "environment", slotLabel: "环境" }
    ]
  };

  for (const payload of [
    legacyThree,
    { ...legacyThree, readingType: "gesture" },
    legacyFive
  ]) {
    const normalized = normalizeInterpretationRequest(payload);
    assert.ok(normalized);
    assert.equal(normalized.readingType, "gesture");
    assert.equal(
      normalized.spreadTitle,
      payload.spread === "three" ? "抽三张" : "抽五张"
    );
    assert.equal(normalized.cards.length, payload.results.length);
  }
});
