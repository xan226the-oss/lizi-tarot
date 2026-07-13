import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import * as argTools from "../scripts/tarot-art/args.ts";
import { processTarotArtwork } from "../scripts/tarot-art/process.ts";
import { upsertTarotReview } from "../scripts/tarot-art/review.ts";
import { verifyTarotArtwork } from "../scripts/tarot-art/verify.ts";

const { parseCardIds } = argTools;

async function independentSha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function writeSource(root, cardId, {
  width = 1024,
  height = 1536,
  background = `#${String(cardId).padStart(2, "0")}1936`
} = {}) {
  const source = join(root, `artwork-source/tarot/${cardId}.png`);
  await sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toFile(source);
  return source;
}

async function fixtureRoot(ids = [2]) {
  const root = await mkdtemp(join(tmpdir(), "tarot-art-"));
  await mkdir(join(root, "artwork-source/tarot/prompts"), { recursive: true });
  await mkdir(join(root, "public/images/tarot/cards"), { recursive: true });
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "docs/tarot-art-provenance.json"), "[]\n");
  for (const cardId of ids) {
    await writeFile(
      join(root, `artwork-source/tarot/prompts/${cardId}.txt`),
      `exact test generation prompt for ${cardId}\n`
    );
    await writeSource(root, cardId);
  }
  return root;
}

function processCard(rootDir, cardId, extra = {}) {
  return processTarotArtwork({
    cardId,
    rootDir,
    createdAt: "2026-07-13",
    generator: "test-generator",
    ...extra
  });
}

function passingReview(cardId) {
  return {
    anatomy: "pass",
    symbolCount: cardId <= 22 ? "not-applicable" : "pass",
    styleConsistency: "pass",
    forbiddenElements: "pass"
  };
}

async function reviewCard(rootDir, cardId) {
  return upsertTarotReview({ cardId, rootDir, ...passingReview(cardId) });
}

async function readProvenance(root) {
  return JSON.parse(await readFile(join(root, "docs/tarot-art-provenance.json"), "utf8"));
}

async function replaceProvenance(root, update) {
  const path = join(root, "docs/tarot-art-provenance.json");
  const records = await readProvenance(root);
  update(records);
  await writeFile(path, `${JSON.stringify(records, null, 2)}\n`);
}

test("processes a 2:3 PNG into a bounded WebP and records independently verified hashes", async () => {
  const root = await fixtureRoot();
  const result = await processCard(root, 2);
  assert.equal(result.width, 1024);
  assert.equal(result.height, 1536);
  assert.ok((await stat(result.webPath)).size <= 600 * 1024);
  assert.equal(result.provenance.sourceSha256, await independentSha256(result.sourcePath));
  assert.equal(result.provenance.webSha256, await independentSha256(result.webPath));
  assert.deepEqual(result.provenance.externalInputs, []);
  assert.equal(result.provenance.humanReview.anatomy, "fail");
});

test("rejects wrong aspect ratio without changing old runtime bytes or provenance and keeps the source", async () => {
  const root = await fixtureRoot([3]);
  const first = await processCard(root, 3);
  const provenancePath = join(root, "docs/tarot-art-provenance.json");
  const beforeWeb = await readFile(first.webPath);
  const beforeProvenance = await readFile(provenancePath);
  await writeSource(root, 3, { width: 1024, height: 1024, background: "#332244" });

  await assert.rejects(() => processCard(root, 3), /2:3/);
  assert.deepEqual(await readFile(first.webPath), beforeWeb);
  assert.deepEqual(await readFile(provenancePath), beforeProvenance);
  await access(first.sourcePath);
});

test("strict verification rejects unreviewed artwork", async () => {
  const root = await fixtureRoot();
  await processCard(root, 2);
  const result = await verifyTarotArtwork({ ids: [2], rootDir: root, requirePassingReview: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /human review/);
});

test("provenance stays numerically sorted and byte-idempotent across two IDs", async () => {
  const root = await fixtureRoot([2, 3]);
  await processCard(root, 3);
  await processCard(root, 2);
  const path = join(root, "docs/tarot-art-provenance.json");
  const before = await readFile(path, "utf8");
  assert.deepEqual(JSON.parse(before).map(({ cardId }) => cardId), [2, 3]);

  await processCard(root, 3);
  await processCard(root, 2);
  assert.equal(await readFile(path, "utf8"), before);
});

test("id parser expands inclusive ranges and rejects duplicates", () => {
  assert.deepEqual(parseCardIds(["--ids", "24-26,50"]), [24, 25, 26, 50]);
  assert.throws(() => parseCardIds(["--ids", "24-26,26"]), /duplicate/i);
  assert.throws(() => parseCardIds(["--ids", "30-24"]), /range/i);
});

test("all six CLI schemas reject unknown arguments and preserve legal usage", () => {
  const validate = argTools.validateTarotCliArgs;
  const legal = [
    ["library-data", []],
    ["prompts", ["--ids", "2", "--root", "/tmp/example"]],
    ["process", ["--batch", "major", "--created-at", "2026-07-13", "--generator", "test"]],
    ["review", ["--ids", "2", "--anatomy", "pass", "--symbol-count", "not-applicable", "--style-consistency", "pass", "--forbidden-elements", "pass"]],
    ["verify", ["--ids", "2", "--strict"]],
    ["contact-sheet", ["--batch", "major", "--root", "/tmp/example"]]
  ];
  for (const [command, argv] of legal) assert.doesNotThrow(() => validate(command, argv));
  for (const [command] of legal) {
    assert.throws(() => validate(command, ["--unknown"]), /unknown option --unknown/i);
  }
});

test("CLI schemas reject strict typos, duplicate flags, loose tokens and missing values", () => {
  const validate = argTools.validateTarotCliArgs;
  assert.throws(() => validate("verify", ["--ids", "2", "--strcit"]), /unknown option --strcit/i);
  assert.throws(() => validate("verify", ["--ids", "2", "--strict", "--strict"]), /duplicate option --strict/i);
  assert.throws(() => validate("prompts", ["--ids", "2", "loose"]), /unexpected argument loose/i);
  assert.throws(() => validate("process", ["--ids", "2", "--generator"]), /missing value for --generator/i);
});

test("processing rejects impossible UTC calendar dates", async () => {
  const root = await fixtureRoot();
  await assert.rejects(() => processCard(root, 2, { createdAt: "2026-99-99" }), /valid UTC calendar date/i);
  await assert.rejects(() => processCard(root, 2, { createdAt: "2025-02-29" }), /valid UTC calendar date/i);
});

test("verification rejects an impossible provenance UTC calendar date", async () => {
  const root = await fixtureRoot();
  await processCard(root, 2);
  await replaceProvenance(root, (records) => {
    records[0].createdAt = "2026-99-99";
  });
  const result = await verifyTarotArtwork({ ids: [2], rootDir: root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /createdAt is invalid/);
});

test("unchanged source and WebP preserve an explicit passing review", async () => {
  const root = await fixtureRoot();
  await processCard(root, 2);
  await reviewCard(root, 2);
  const result = await processCard(root, 2);
  assert.deepEqual(result.provenance.humanReview, passingReview(2));
});

test("a changed source resets a stale passing review", async () => {
  const root = await fixtureRoot();
  await processCard(root, 2);
  await reviewCard(root, 2);
  await writeSource(root, 2, { background: "#662244" });
  const result = await processCard(root, 2);
  assert.deepEqual(result.provenance.humanReview, {
    anatomy: "fail",
    symbolCount: "not-applicable",
    styleConsistency: "fail",
    forbiddenElements: "fail"
  });
});

test("a changed current WebP resets a stale passing review", async () => {
  const root = await fixtureRoot();
  const first = await processCard(root, 2);
  await reviewCard(root, 2);
  await sharp({ create: { width: 1024, height: 1536, channels: 3, background: "#aa2244" } })
    .webp()
    .toFile(first.webPath);
  const result = await processCard(root, 2);
  assert.equal(result.provenance.humanReview.anatomy, "fail");
  assert.equal(result.provenance.humanReview.styleConsistency, "fail");
});

test("review refuses assets whose current hashes do not match provenance", async () => {
  const root = await fixtureRoot();
  const result = await processCard(root, 2);
  await writeSource(root, 2, { background: "#114477" });
  await assert.rejects(() => reviewCard(root, 2), /assets do not match provenance/i);

  await processCard(root, 2);
  await sharp({ create: { width: 1024, height: 1536, channels: 3, background: "#771144" } })
    .webp()
    .toFile(result.webPath);
  await assert.rejects(() => reviewCard(root, 2), /assets do not match provenance/i);
});

test("strict verification rejects missing files, wrong dimensions and wrong hashes", async (t) => {
  await t.test("missing runtime file", async () => {
    const root = await fixtureRoot();
    const result = await processCard(root, 2);
    await unlink(result.webPath);
    const verification = await verifyTarotArtwork({ ids: [2], rootDir: root, requirePassingReview: true });
    assert.equal(verification.ok, false);
    assert.match(verification.errors.join("\n"), /runtime WebP file error/);
  });

  await t.test("wrong runtime dimensions", async () => {
    const root = await fixtureRoot();
    const result = await processCard(root, 2);
    await sharp({ create: { width: 512, height: 768, channels: 3, background: "#111111" } })
      .webp()
      .toFile(result.webPath);
    const verification = await verifyTarotArtwork({ ids: [2], rootDir: root, requirePassingReview: true });
    assert.equal(verification.ok, false);
    assert.match(verification.errors.join("\n"), /dimensions must be 1024 × 1536/);
  });

  await t.test("wrong source hash", async () => {
    const root = await fixtureRoot();
    await processCard(root, 2);
    await writeSource(root, 2, { background: "#881122" });
    const verification = await verifyTarotArtwork({ ids: [2], rootDir: root, requirePassingReview: true });
    assert.equal(verification.ok, false);
    assert.match(verification.errors.join("\n"), /source hash mismatch/);
  });
});

test("a post-commit failure restores both prior WebP and provenance bytes", async () => {
  const root = await fixtureRoot();
  const first = await processCard(root, 2);
  const provenancePath = join(root, "docs/tarot-art-provenance.json");
  const beforeWeb = await readFile(first.webPath);
  const beforeProvenance = await readFile(provenancePath);
  await writeSource(root, 2, { background: "#224466" });

  await assert.rejects(
    () => processCard(root, 2, {
      transactionHooks: {
        afterCommit: async () => {
          throw new Error("forced post-commit failure");
        }
      }
    }),
    /forced post-commit failure/
  );
  assert.deepEqual(await readFile(first.webPath), beforeWeb);
  assert.deepEqual(await readFile(provenancePath), beforeProvenance);
});

test("rollback attempts provenance and WebP independently and aggregates every failure", async () => {
  const root = await fixtureRoot();
  await processCard(root, 2);
  await writeSource(root, 2, { background: "#446688" });
  const attempts = [];

  await assert.rejects(
    () => processCard(root, 2, {
      transactionHooks: {
        afterCommit: async () => {
          throw new Error("original commit error");
        },
        restoreProvenance: async () => {
          attempts.push("provenance");
          throw new Error("provenance rollback error");
        },
        restoreWeb: async () => {
          attempts.push("web");
          throw new Error("web rollback error");
        }
      }
    }),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.match(error.message, /rollback failed/i);
      assert.deepEqual(error.errors.map((item) => item.message), [
        "original commit error",
        "provenance rollback error",
        "web rollback error"
      ]);
      return true;
    }
  );
  assert.deepEqual(attempts, ["provenance", "web"]);
});
