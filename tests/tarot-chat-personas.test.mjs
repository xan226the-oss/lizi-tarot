import assert from "node:assert/strict";
import test from "node:test";
import { tarotCards } from "../lib/tarot-cards.ts";
import { getTarotChatPersona, isChatEligibleCard, tarotChatPersonas } from "../lib/tarot-chat-personas.ts";

test("chat personas cover every and only canonical major arcana card", () => {
  const majorIds = tarotCards.filter((card) => card.arcana_type === "major").map((card) => card.id);
  assert.deepEqual(tarotChatPersonas.map((persona) => persona.cardId), majorIds);
  assert.equal(tarotChatPersonas.length, 22);
  assert.ok(tarotChatPersonas.every((persona) => persona.openingLine.trim().length >= 40));
  assert.ok(tarotChatPersonas.every((persona) => persona.imageryTerms.length >= 3));
});

test("persona lookup never falls back from an invalid or minor card", () => {
  assert.equal(getTarotChatPersona(1)?.cardId, 1);
  assert.equal(getTarotChatPersona(22)?.cardId, 22);
  assert.equal(getTarotChatPersona(0), null);
  assert.equal(getTarotChatPersona(23), null);
  assert.equal(isChatEligibleCard(tarotCards[0]), true);
  assert.equal(isChatEligibleCard(tarotCards[22]), false);
});
