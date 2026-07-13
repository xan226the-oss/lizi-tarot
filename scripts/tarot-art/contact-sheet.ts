import { access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

import {
  parseBatchKey,
  parseCardIds,
  parseRootDir,
  validateTarotCliArgs
} from "./args.ts";
import { writeFileAtomically } from "./process.ts";

const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 240;
const LABEL_HEIGHT = 28;
const GAP = 12;
const COLUMNS = 7;

type CreateTarotContactSheetOptions = {
  ids: number[];
  rootDir: string;
  batchLabel: string;
};

function labelSvg(cardId: number) {
  return Buffer.from(
    `<svg width="${THUMBNAIL_WIDTH}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`
    + `<rect width="100%" height="100%" fill="#11162b"/>`
    + `<text x="50%" y="19" fill="#f2d28f" font-family="Arial, sans-serif" font-size="16" text-anchor="middle">${cardId}</text>`
    + "</svg>"
  );
}

export async function createTarotContactSheet({
  ids,
  rootDir,
  batchLabel
}: CreateTarotContactSheetOptions) {
  if (ids.length === 0) throw new Error("Contact sheet requires at least one card ID");
  const inputs = ids.map((cardId) => ({
    cardId,
    path: join(rootDir, `public/images/tarot/cards/${cardId}.webp`)
  }));
  for (const input of inputs) {
    try {
      await access(input.path);
    } catch {
      throw new Error(`Missing runtime artwork ${input.path}`);
    }
  }

  const rows = Math.ceil(ids.length / COLUMNS);
  const cellHeight = THUMBNAIL_HEIGHT + LABEL_HEIGHT + GAP;
  const width = GAP + COLUMNS * (THUMBNAIL_WIDTH + GAP);
  const height = GAP + rows * cellHeight;
  const layers: sharp.OverlayOptions[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const left = GAP + column * (THUMBNAIL_WIDTH + GAP);
    const top = GAP + row * cellHeight;
    const thumbnail = await sharp(input.path)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: "cover" })
      .toBuffer();
    layers.push({ input: thumbnail, left, top });
    layers.push({ input: labelSvg(input.cardId), left, top: top + THUMBNAIL_HEIGHT });
  }

  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#080b18"
    }
  })
    .composite(layers)
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const outputPath = join("/tmp", `tarot-${batchLabel}-contact-sheet.jpg`);
  await writeFileAtomically(outputPath, buffer);
  return outputPath;
}

async function main() {
  const argv = process.argv.slice(2);
  validateTarotCliArgs("contact-sheet", argv);
  const ids = parseCardIds(argv);
  const batchKey = parseBatchKey(argv);
  const outputPath = await createTarotContactSheet({
    ids,
    rootDir: parseRootDir(argv),
    batchLabel: batchKey ?? ids.join("-")
  });
  console.log(`Wrote contact sheet: ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
