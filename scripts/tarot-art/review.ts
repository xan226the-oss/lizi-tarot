import { access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { TarotArtProvenance, TarotArtReview } from "../../types/tarot-art.ts";
import {
  optionValue,
  parseCardIds,
  parseRootDir,
  validateTarotCliArgs
} from "./args.ts";
import { sha256File } from "./hash.ts";
import {
  readTarotProvenance,
  serializeTarotProvenance,
  writeFileAtomically
} from "./process.ts";

type UpsertTarotReviewOptions = TarotArtReview & {
  cardId: number;
  rootDir: string;
};

function assertReview(review: TarotArtReview) {
  if (review.anatomy !== "pass" && review.anatomy !== "fail") {
    throw new Error("anatomy must be pass or fail");
  }
  if (!(["pass", "fail", "not-applicable"] as string[]).includes(review.symbolCount)) {
    throw new Error("symbolCount must be pass, fail or not-applicable");
  }
  if (review.styleConsistency !== "pass" && review.styleConsistency !== "fail") {
    throw new Error("styleConsistency must be pass or fail");
  }
  if (review.forbiddenElements !== "pass" && review.forbiddenElements !== "fail") {
    throw new Error("forbiddenElements must be pass or fail");
  }
}

async function requireCurrentAssets(
  cardId: number,
  rootDir: string,
  record: TarotArtProvenance
) {
  const sourcePath = join(rootDir, `artwork-source/tarot/${cardId}.png`);
  const webPath = join(rootDir, `public/images/tarot/cards/${cardId}.webp`);
  await Promise.all([access(sourcePath), access(webPath)]);
  const [sourceSha256, webSha256] = await Promise.all([
    sha256File(sourcePath),
    sha256File(webPath)
  ]);
  if (sourceSha256 !== record.sourceSha256 || webSha256 !== record.webSha256) {
    throw new Error(`Card ${cardId} assets do not match provenance; process them again before review`);
  }
}

export async function upsertTarotReview({
  cardId,
  rootDir,
  anatomy,
  symbolCount,
  styleConsistency,
  forbiddenElements
}: UpsertTarotReviewOptions) {
  const humanReview: TarotArtReview = {
    anatomy,
    symbolCount,
    styleConsistency,
    forbiddenElements
  };
  assertReview(humanReview);

  const { provenancePath, records } = await readTarotProvenance(rootDir);
  const record = records.find((candidate) => candidate.cardId === cardId);
  if (!record) throw new Error(`Card ${cardId} must have provenance before human review`);
  await requireCurrentAssets(cardId, rootDir, record);

  const nextRecords = records.map((candidate) => candidate.cardId === cardId
    ? { ...candidate, humanReview }
    : candidate
  );
  await writeFileAtomically(provenancePath, serializeTarotProvenance(nextRecords));
  return nextRecords.find((candidate) => candidate.cardId === cardId)!;
}

function requiredOption(argv: string[], name: string) {
  const value = optionValue(argv, name);
  if (!value) throw new Error(`Provide ${name}`);
  return value;
}

function parsePassFail(argv: string[], name: string) {
  const value = requiredOption(argv, name);
  if (value !== "pass" && value !== "fail") {
    throw new Error(`${name} must be pass or fail`);
  }
  return value;
}

function parseSymbolCount(argv: string[]) {
  const value = requiredOption(argv, "--symbol-count");
  if (value !== "pass" && value !== "fail" && value !== "not-applicable") {
    throw new Error("--symbol-count must be pass, fail or not-applicable");
  }
  return value;
}

async function main() {
  const argv = process.argv.slice(2);
  validateTarotCliArgs("review", argv);
  const ids = parseCardIds(argv);
  const rootDir = parseRootDir(argv);
  const review: TarotArtReview = {
    anatomy: parsePassFail(argv, "--anatomy"),
    symbolCount: parseSymbolCount(argv),
    styleConsistency: parsePassFail(argv, "--style-consistency"),
    forbiddenElements: parsePassFail(argv, "--forbidden-elements")
  };

  for (const cardId of ids) {
    await upsertTarotReview({ cardId, rootDir, ...review });
    console.log(`Recorded explicit human review for card ${cardId}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
