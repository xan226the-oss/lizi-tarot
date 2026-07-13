import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

import { APPROVED_TAROT_SAMPLES } from "../../data/tarot-approved-samples.ts";
import { getTarotArtManifestEntry } from "../../data/tarot-art-manifest.ts";
import type { TarotArtProvenance, TarotArtReview } from "../../types/tarot-art.ts";
import { currentUtcDate, optionValue, parseCardIds, parseRootDir } from "./args.ts";
import { sha256File } from "./hash.ts";

const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 1536;
const MAX_WEBP_BYTES = 600 * 1024;
const WEBP_QUALITIES = [82, 78, 74, 70, 66, 62] as const;

type ProcessTarotArtworkOptions = {
  cardId: number;
  rootDir: string;
  createdAt?: string;
  generator: string;
};

function temporaryPath(path: string) {
  return `${path}.${process.pid}.${Date.now()}.tmp`;
}

async function fileExists(path: string) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function parseProvenance(raw: string, path: string) {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid provenance JSON at ${path}`);
  }
  if (!Array.isArray(value)) throw new Error(`Provenance at ${path} must be a JSON array`);
  const ids = new Set<number>();
  for (const record of value) {
    const cardId = (record as { cardId?: unknown })?.cardId;
    if (!Number.isInteger(cardId)) throw new Error(`Invalid provenance cardId at ${path}`);
    if (ids.has(cardId as number)) throw new Error(`Duplicate provenance cardId ${cardId}`);
    ids.add(cardId as number);
  }
  return value as TarotArtProvenance[];
}

export async function readTarotProvenance(rootDir: string) {
  const provenancePath = join(rootDir, "docs/tarot-art-provenance.json");
  const raw = await readFile(provenancePath, "utf8");
  return { provenancePath, raw, records: parseProvenance(raw, provenancePath) };
}

export function serializeTarotProvenance(records: TarotArtProvenance[]) {
  return `${JSON.stringify([...records].sort((left, right) => left.cardId - right.cardId), null, 2)}\n`;
}

export async function writeFileAtomically(path: string, contents: string | Buffer) {
  const tempPath = temporaryPath(path);
  try {
    await writeFile(tempPath, contents);
    await rename(tempPath, path);
  } finally {
    await unlink(tempPath).catch(() => undefined);
  }
}

function defaultReview(cardId: number): TarotArtReview {
  return {
    anatomy: "fail",
    symbolCount: cardId <= 22 ? "not-applicable" : "fail",
    styleConsistency: "fail",
    forbiddenElements: "fail"
  };
}

function approvedSample(cardId: number) {
  if (cardId !== 1 && cardId !== 49 && cardId !== 69) return undefined;
  return APPROVED_TAROT_SAMPLES[cardId];
}

async function boundedWebpBuffer(sourcePath: string) {
  for (const quality of WEBP_QUALITIES) {
    const buffer = await sharp(sourcePath)
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
        fit: "cover",
        withoutEnlargement: true
      })
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (buffer.byteLength <= MAX_WEBP_BYTES) return buffer;
  }
  throw new Error(`Unable to encode WebP at or below ${MAX_WEBP_BYTES} bytes`);
}

async function restoreRuntimeImage(webPath: string, previousWeb: Buffer | undefined) {
  if (previousWeb) {
    await writeFileAtomically(webPath, previousWeb);
  } else {
    await unlink(webPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export async function processTarotArtwork({
  cardId,
  rootDir,
  createdAt = currentUtcDate(),
  generator
}: ProcessTarotArtworkOptions) {
  if (!Number.isInteger(cardId) || cardId < 1 || cardId > 78) {
    throw new Error(`Card ID ${cardId} must be from 1 to 78`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) {
    throw new Error(`createdAt must use YYYY-MM-DD, received ${createdAt}`);
  }
  if (!generator?.trim()) throw new Error("generator is required");

  const manifest = getTarotArtManifestEntry(cardId);
  if (!manifest) throw new Error(`Missing manifest entry for card ${cardId}`);

  const sourcePath = join(rootDir, `artwork-source/tarot/${cardId}.png`);
  const promptPath = join(rootDir, `artwork-source/tarot/prompts/${cardId}.txt`);
  const webPath = join(rootDir, `public/images/tarot/cards/${cardId}.webp`);
  const metadata = await sharp(sourcePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Source ${sourcePath} has no readable dimensions`);
  }
  if (metadata.width * 3 !== metadata.height * 2) {
    throw new Error(`Source ${sourcePath} must have an exact 2:3 aspect ratio`);
  }
  if (metadata.width < OUTPUT_WIDTH || metadata.height < OUTPUT_HEIGHT) {
    throw new Error(`Source ${sourcePath} must be at least ${OUTPUT_WIDTH} × ${OUTPUT_HEIGHT}`);
  }

  const sourceSha256 = await sha256File(sourcePath);
  const sample = approvedSample(cardId);
  let prompt: string;
  let internalReferenceCardIds: number[];
  if (sample) {
    if (sourceSha256 !== sample.sourceSha256) {
      throw new Error(`Approved sample ${cardId} source hash does not match its known SHA-256`);
    }
    if (createdAt !== sample.createdAt || generator !== sample.generator) {
      throw new Error(`Approved sample ${cardId} requires its recorded date and generator`);
    }
    prompt = sample.prompt;
    internalReferenceCardIds = [...sample.internalReferenceCardIds];
  } else {
    prompt = await readFile(promptPath, "utf8");
    if (!prompt.trim()) throw new Error(`Prompt ${promptPath} must not be empty`);
    internalReferenceCardIds = [...manifest.internalStyleReferences];
  }

  const { provenancePath, raw: previousProvenanceRaw, records } = await readTarotProvenance(rootDir);
  const existing = records.find((record) => record.cardId === cardId);
  const hadWeb = await fileExists(webPath);
  const previousWeb = hadWeb ? await readFile(webPath) : undefined;
  const currentWebSha256 = hadWeb ? await sha256File(webPath) : undefined;
  const webp = await boundedWebpBuffer(sourcePath);

  await mkdir(join(rootDir, "public/images/tarot/cards"), { recursive: true });
  const stagedWebPath = temporaryPath(webPath);
  const stagedProvenancePath = temporaryPath(provenancePath);
  let webCommitted = false;
  let provenanceCommitted = false;

  try {
    await writeFile(stagedWebPath, webp);
    const webSha256 = await sha256File(stagedWebPath);
    const sourceSha256AfterEncoding = await sha256File(sourcePath);
    if (sourceSha256AfterEncoding !== sourceSha256) {
      throw new Error(`Source ${sourcePath} changed while it was being processed`);
    }

    const hashesUnchanged = Boolean(
      existing
      && currentWebSha256
      && existing.sourceSha256 === sourceSha256
      && existing.webSha256 === currentWebSha256
      && currentWebSha256 === webSha256
    );
    const provenance: TarotArtProvenance = {
      cardId,
      createdAt,
      generator,
      prompt,
      externalInputs: [],
      internalReferenceCardIds,
      sourceSha256,
      webSha256,
      humanReview: hashesUnchanged ? existing!.humanReview : defaultReview(cardId)
    };
    const nextRecords = records.filter((record) => record.cardId !== cardId);
    nextRecords.push(provenance);
    const nextProvenanceRaw = serializeTarotProvenance(nextRecords);

    if (currentWebSha256 === webSha256 && previousProvenanceRaw === nextProvenanceRaw) {
      return {
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        sourcePath,
        webPath,
        provenance
      };
    }

    await writeFile(stagedProvenancePath, nextProvenanceRaw, "utf8");
    await rename(stagedWebPath, webPath);
    webCommitted = true;
    await rename(stagedProvenancePath, provenancePath);
    provenanceCommitted = true;

    const [finalSourceSha256, finalWebSha256] = await Promise.all([
      sha256File(sourcePath),
      sha256File(webPath)
    ]);
    if (finalSourceSha256 !== provenance.sourceSha256 || finalWebSha256 !== provenance.webSha256) {
      throw new Error(`Hash changed while committing card ${cardId}`);
    }

    return {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      sourcePath,
      webPath,
      provenance
    };
  } catch (error) {
    if (provenanceCommitted) {
      await writeFileAtomically(provenancePath, previousProvenanceRaw);
    }
    if (webCommitted) {
      await restoreRuntimeImage(webPath, previousWeb);
    }
    throw error;
  } finally {
    await Promise.all([
      unlink(stagedWebPath).catch(() => undefined),
      unlink(stagedProvenancePath).catch(() => undefined)
    ]);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const ids = parseCardIds(argv);
  const rootDir = parseRootDir(argv);
  const createdAt = optionValue(argv, "--created-at");
  const generator = optionValue(argv, "--generator");
  if (!generator) throw new Error("Provide --generator with the exact generator name");

  for (const cardId of ids) {
    const result = await processTarotArtwork({ cardId, rootDir, createdAt, generator });
    console.log(`Processed card ${cardId}: ${result.webPath}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
