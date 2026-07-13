import { access, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { getTarotArtManifestEntry } from "../../data/tarot-art-manifest.ts";
import { buildTarotArtPrompt } from "../../lib/tarot-art-prompt.ts";
import { parseBatchKey, parseCardIds, parseRootDir } from "./args.ts";
import { writeFileAtomically } from "./process.ts";

export type TarotPromptRecord = {
  cardId: number;
  promptPath: string;
  prompt: string;
  referencePaths: string[];
};

type WriteTarotPromptFilesOptions = {
  ids: number[];
  rootDir: string;
  selectionLabel?: string;
};

export async function writeTarotPromptFiles({
  ids,
  rootDir,
  selectionLabel = ids.join("-")
}: WriteTarotPromptFilesOptions) {
  const records: TarotPromptRecord[] = ids.map((cardId) => {
    const entry = getTarotArtManifestEntry(cardId);
    if (!entry) throw new Error(`Missing manifest entry for card ${cardId}`);
    return {
      cardId,
      promptPath: resolve(rootDir, `artwork-source/tarot/prompts/${cardId}.txt`),
      prompt: buildTarotArtPrompt(entry),
      referencePaths: entry.internalStyleReferences.map((referenceId) =>
        resolve(rootDir, `artwork-source/tarot/${referenceId}.png`)
      )
    };
  });

  for (const record of records) {
    for (const referencePath of record.referencePaths) {
      try {
        await access(referencePath);
      } catch {
        throw new Error(`Missing internal reference source ${referencePath}`);
      }
    }
  }

  await mkdir(resolve(rootDir, "artwork-source/tarot/prompts"), { recursive: true });
  for (const record of records) {
    await writeFileAtomically(record.promptPath, `${record.prompt}\n`);
  }

  const indexPath = join("/tmp", `tarot-${selectionLabel}-prompts.json`);
  await writeFileAtomically(indexPath, `${JSON.stringify(records, null, 2)}\n`);
  return { records, indexPath };
}

async function main() {
  const argv = process.argv.slice(2);
  const ids = parseCardIds(argv);
  const batchKey = parseBatchKey(argv);
  const result = await writeTarotPromptFiles({
    ids,
    rootDir: parseRootDir(argv),
    selectionLabel: batchKey ?? ids.join("-")
  });
  console.log(`Wrote ${result.records.length} prompt file(s): ${result.indexPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
