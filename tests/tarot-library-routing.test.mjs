import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getAvailableTarotCardIds } from "../lib/tarot-library-assets.ts";
import {
  getAdjacentLibraryCardIds,
  parseLibraryCardId
} from "../lib/tarot-library-routing.ts";

test("accepts only canonical decimal ids 1 through 78", () => {
  assert.equal(parseLibraryCardId("1"), 1);
  assert.equal(parseLibraryCardId("49"), 49);
  assert.equal(parseLibraryCardId("78"), 78);
  for (const invalid of ["0", "79", "01", "+1", "1.0", " 1", "1 ", "one", ""]) {
    assert.equal(parseLibraryCardId(invalid), null, invalid);
  }
});

test("previous and next navigation stops at the deck boundaries", () => {
  assert.deepEqual(getAdjacentLibraryCardIds(1), { previousCardId: null, nextCardId: 2 });
  assert.deepEqual(getAdjacentLibraryCardIds(49), { previousCardId: 48, nextCardId: 50 });
  assert.deepEqual(getAdjacentLibraryCardIds(78), { previousCardId: 77, nextCardId: null });
});

test("server-side completion count reports only real WebP ids", async () => {
  const root = await mkdtemp(join(tmpdir(), "tarot-library-assets-"));
  const cards = join(root, "public/images/tarot/cards");
  await mkdir(cards, { recursive: true });
  await writeFile(join(cards, "1.webp"), "fixture");
  await writeFile(join(cards, "49.webp"), "fixture");
  await writeFile(join(cards, "not-a-card.webp"), "fixture");
  assert.deepEqual(getAvailableTarotCardIds(root), [1, 49]);
});
