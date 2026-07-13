import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { parseCardIds } from "../scripts/tarot-art/args.ts";
import { processTarotArtwork } from "../scripts/tarot-art/process.ts";
import { sha256File } from "../scripts/tarot-art/hash.ts";
import { verifyTarotArtwork } from "../scripts/tarot-art/verify.ts";

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "tarot-art-"));
  const source = join(root, "artwork-source/tarot/2.png");
  await mkdir(join(root, "artwork-source/tarot/prompts"), { recursive: true });
  await mkdir(join(root, "public/images/tarot/cards"), { recursive: true });
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "artwork-source/tarot/prompts/2.txt"), "exact test generation prompt\n");
  await writeFile(join(root, "docs/tarot-art-provenance.json"), "[]\n");
  await sharp({ create: { width: 1024, height: 1536, channels: 3, background: "#101936" } })
    .png()
    .toFile(source);
  return root;
}

test("processes a 2:3 PNG into a bounded WebP and records real hashes", async () => {
  const root = await fixtureRoot();
  const result = await processTarotArtwork({ cardId: 2, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" });
  assert.equal(result.width, 1024);
  assert.equal(result.height, 1536);
  assert.ok((await stat(result.webPath)).size <= 600 * 1024);
  assert.equal(result.provenance.sourceSha256, await sha256File(result.sourcePath));
  assert.equal(result.provenance.webSha256, await sha256File(result.webPath));
  assert.deepEqual(result.provenance.externalInputs, []);
  assert.equal(result.provenance.humanReview.anatomy, "fail");
});

test("rejects wrong aspect ratio before writing a runtime image", async () => {
  const root = await fixtureRoot();
  const source = join(root, "artwork-source/tarot/3.png");
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: "#101936" } }).png().toFile(source);
  await assert.rejects(() => processTarotArtwork({ cardId: 3, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" }), /2:3/);
});

test("strict verification rejects unreviewed artwork", async () => {
  const root = await fixtureRoot();
  await processTarotArtwork({ cardId: 2, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" });
  const result = await verifyTarotArtwork({ ids: [2], rootDir: root, requirePassingReview: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /human review/);
});

test("provenance JSON remains sorted and idempotent", async () => {
  const root = await fixtureRoot();
  await processTarotArtwork({ cardId: 2, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" });
  const before = await readFile(join(root, "docs/tarot-art-provenance.json"), "utf8");
  await processTarotArtwork({ cardId: 2, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" });
  const after = await readFile(join(root, "docs/tarot-art-provenance.json"), "utf8");
  assert.equal(after, before);
});

test("id parser expands inclusive ranges and rejects duplicates", () => {
  assert.deepEqual(parseCardIds(["--ids", "24-26,50"]), [24, 25, 26, 50]);
  assert.throws(() => parseCardIds(["--ids", "24-26,26"]), /duplicate/i);
  assert.throws(() => parseCardIds(["--ids", "30-24"]), /range/i);
});
