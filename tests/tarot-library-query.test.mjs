import assert from "node:assert/strict";
import test from "node:test";

import {
  filterLibraryCards,
  getTarotArtworkTone,
  readLibraryFilters,
  toLibrarySearchParams
} from "../lib/tarot-library-query.ts";
import { tarotCards } from "../lib/tarot-cards.ts";
import { getTarotLibraryEntry } from "../lib/tarot-library.ts";

const records = tarotCards.map((card) => ({
  card,
  library: getTarotLibraryEntry(card.id)
}));

function params(value) {
  return new URLSearchParams(value);
}

test("searches Chinese name, English name, keyword and both meanings", () => {
  for (const query of ["愚者", "the fool", "冒险", "新的道路", "确认边界"]) {
    const result = filterLibraryCards(records, { q: query, arcana: "all", suit: "all" });
    assert.equal(result[0].card.id, 1, query);
  }
});

test("combines arcana and suit filters without reordering", () => {
  const cups = filterLibraryCards(records, { q: "", arcana: "minor", suit: "cups" });
  assert.equal(cups.length, 14);
  assert.deepEqual(cups.map(({ card }) => card.id), Array.from({ length: 14 }, (_, i) => i + 37));
  assert.deepEqual(
    filterLibraryCards(records, { q: "", arcana: "major", suit: "cups" }),
    []
  );
});

test("invalid URL values fall back safely", () => {
  assert.deepEqual(readLibraryFilters(params("q=%20Fool%20&arcana=broken&suit=coins")), {
    q: "Fool",
    arcana: "all",
    suit: "all"
  });
});

test("serialization omits defaults and round-trips non-default state", () => {
  assert.equal(toLibrarySearchParams({ q: "", arcana: "all", suit: "all" }).toString(), "");
  const state = { q: "hope", arcana: "minor", suit: "cups" };
  assert.deepEqual(readLibraryFilters(toLibrarySearchParams(state)), state);
});

test("empty search returns canonical numeric order", () => {
  assert.deepEqual(
    filterLibraryCards(records, { q: "", arcana: "all", suit: "all" }).map(({ card }) => card.id),
    Array.from({ length: 78 }, (_, i) => i + 1)
  );
});

test("maps the loose canonical suit string to a safe artwork tone", () => {
  assert.equal(getTarotArtworkTone(tarotCards[0]), "major");
  assert.equal(getTarotArtworkTone(tarotCards[22]), "wands");
  assert.equal(getTarotArtworkTone(tarotCards[36]), "cups");
  assert.equal(getTarotArtworkTone(tarotCards[50]), "swords");
  assert.equal(getTarotArtworkTone(tarotCards[64]), "pentacles");
});
