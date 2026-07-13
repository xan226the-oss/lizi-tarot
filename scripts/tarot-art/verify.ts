import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

import { APPROVED_TAROT_SAMPLES } from "../../data/tarot-approved-samples.ts";
import { getTarotArtManifestEntry } from "../../data/tarot-art-manifest.ts";
import type { TarotArtProvenance, TarotArtReview } from "../../types/tarot-art.ts";
import {
  hasOption,
  isValidUtcDate,
  parseCardIds,
  parseRootDir,
  validateTarotCliArgs
} from "./args.ts";
import { sha256File } from "./hash.ts";
import { readTarotProvenance } from "./process.ts";

const MAX_WEBP_BYTES = 600 * 1024;

type VerifyTarotArtworkOptions = {
  ids: number[];
  rootDir: string;
  requirePassingReview?: boolean;
};

function approvedSample(cardId: number) {
  if (cardId !== 1 && cardId !== 49 && cardId !== 69) return undefined;
  return APPROVED_TAROT_SAMPLES[cardId];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sameIds(actual: unknown, expected: number[]) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function isReview(review: unknown): review is TarotArtReview {
  if (!review || typeof review !== "object") return false;
  const value = review as Partial<TarotArtReview>;
  return (value.anatomy === "pass" || value.anatomy === "fail")
    && (value.symbolCount === "pass" || value.symbolCount === "fail" || value.symbolCount === "not-applicable")
    && (value.styleConsistency === "pass" || value.styleConsistency === "fail")
    && (value.forbiddenElements === "pass" || value.forbiddenElements === "fail");
}

function verifyReview(
  cardId: number,
  review: unknown,
  requirePassingReview: boolean,
  errors: string[]
) {
  if (!isReview(review)) {
    errors.push(`Card ${cardId} human review has missing or invalid states`);
    return;
  }
  if (!requirePassingReview) return;

  if (review.anatomy !== "pass") errors.push(`Card ${cardId} human review anatomy must pass`);
  if (review.styleConsistency !== "pass") errors.push(`Card ${cardId} human review style consistency must pass`);
  if (review.forbiddenElements !== "pass") errors.push(`Card ${cardId} human review forbidden elements must pass`);
  const expectedSymbolCount = cardId <= 22 ? "not-applicable" : "pass";
  if (review.symbolCount !== expectedSymbolCount) {
    errors.push(`Card ${cardId} human review symbol count must be ${expectedSymbolCount}`);
  }
}

async function verifyCard(
  cardId: number,
  record: TarotArtProvenance | undefined,
  rootDir: string,
  requirePassingReview: boolean,
  errors: string[]
) {
  const manifest = getTarotArtManifestEntry(cardId);
  if (!manifest) {
    errors.push(`Card ${cardId} is missing from the manifest`);
    return;
  }
  if (!record) {
    errors.push(`Card ${cardId} is missing provenance`);
    return;
  }
  if (record.cardId !== manifest.cardId) {
    errors.push(`Card ${cardId} provenance ID does not match the manifest`);
  }

  const sourcePath = join(rootDir, `artwork-source/tarot/${cardId}.png`);
  const webPath = join(rootDir, `public/images/tarot/cards/${cardId}.webp`);
  let sourceSha256: string | undefined;
  let webSha256: string | undefined;

  try {
    const sourceMetadata = await sharp(sourcePath).metadata();
    if (!sourceMetadata.width || !sourceMetadata.height) {
      errors.push(`Card ${cardId} source dimensions are unreadable`);
    } else {
      if (sourceMetadata.width * 3 !== sourceMetadata.height * 2) {
        errors.push(`Card ${cardId} source dimensions are not exact 2:3`);
      }
      if (sourceMetadata.width < 1024 || sourceMetadata.height < 1536) {
        errors.push(`Card ${cardId} source dimensions are below 1024 × 1536`);
      }
    }
    sourceSha256 = await sha256File(sourcePath);
    if (record.sourceSha256 !== sourceSha256) errors.push(`Card ${cardId} source hash mismatch`);
  } catch (error) {
    errors.push(`Card ${cardId} source file error: ${errorMessage(error)}`);
  }

  try {
    const [webMetadata, webStat] = await Promise.all([sharp(webPath).metadata(), stat(webPath)]);
    if (webMetadata.width !== 1024 || webMetadata.height !== 1536) {
      errors.push(`Card ${cardId} runtime WebP dimensions must be 1024 × 1536`);
    }
    if (webStat.size > MAX_WEBP_BYTES) {
      errors.push(`Card ${cardId} runtime WebP exceeds 600 KB`);
    }
    webSha256 = await sha256File(webPath);
    if (record.webSha256 !== webSha256) errors.push(`Card ${cardId} runtime WebP hash mismatch`);
  } catch (error) {
    errors.push(`Card ${cardId} runtime WebP file error: ${errorMessage(error)}`);
  }

  const sample = approvedSample(cardId);
  let expectedPrompt: string | undefined;
  if (sample) {
    expectedPrompt = sample.prompt;
    if (sourceSha256 && sourceSha256 !== sample.sourceSha256) {
      errors.push(`Card ${cardId} source hash does not match the approved sample`);
    }
  } else {
    const promptPath = join(rootDir, `artwork-source/tarot/prompts/${cardId}.txt`);
    try {
      expectedPrompt = await readFile(promptPath, "utf8");
    } catch (error) {
      errors.push(`Card ${cardId} prompt file error: ${errorMessage(error)}`);
    }
  }
  if (expectedPrompt !== undefined && !expectedPrompt.trim()) {
    errors.push(`Card ${cardId} exact prompt must not be empty`);
  }
  if (expectedPrompt !== undefined && record.prompt !== expectedPrompt) {
    errors.push(`Card ${cardId} provenance prompt does not match the exact generation prompt`);
  }

  if (!Array.isArray(record.externalInputs) || record.externalInputs.length !== 0) {
    errors.push(`Card ${cardId} externalInputs must be empty`);
  }
  const expectedReferences = sample
    ? sample.internalReferenceCardIds
    : manifest.internalStyleReferences;
  if (!sameIds(record.internalReferenceCardIds, expectedReferences)) {
    errors.push(`Card ${cardId} internal reference IDs do not match the manifest`);
  }
  if (!record.createdAt || !isValidUtcDate(record.createdAt)) {
    errors.push(`Card ${cardId} provenance createdAt is invalid`);
  }
  if (!record.generator?.trim()) errors.push(`Card ${cardId} provenance generator is empty`);
  verifyReview(cardId, record.humanReview, requirePassingReview, errors);
}

export async function verifyTarotArtwork({
  ids,
  rootDir,
  requirePassingReview = false
}: VerifyTarotArtworkOptions) {
  const errors: string[] = [];
  let records: TarotArtProvenance[] = [];
  try {
    records = (await readTarotProvenance(rootDir)).records;
  } catch (error) {
    errors.push(`Provenance file error: ${errorMessage(error)}`);
  }

  for (const cardId of ids) {
    await verifyCard(
      cardId,
      records.find((record) => record.cardId === cardId),
      rootDir,
      requirePassingReview,
      errors
    );
  }

  return { ok: errors.length === 0, errors };
}

async function main() {
  const argv = process.argv.slice(2);
  validateTarotCliArgs("verify", argv);
  const ids = parseCardIds(argv);
  const result = await verifyTarotArtwork({
    ids,
    rootDir: parseRootDir(argv),
    requirePassingReview: hasOption(argv, "--strict")
  });
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log(`Verified ${ids.length} tarot artwork file(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}
