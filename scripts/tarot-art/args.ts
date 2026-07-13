import { TAROT_PRODUCTION_BATCHES } from "../../data/tarot-art-manifest.ts";
import type { TarotProductionBatchKey } from "../../types/tarot-art.ts";

const CARD_ID_MIN = 1;
const CARD_ID_MAX = 78;

export function optionValue(argv: string[], name: string) {
  const positions = argv.flatMap((value, index) => value === name ? [index] : []);
  if (positions.length > 1) throw new Error(`Duplicate option ${name}`);
  if (positions.length === 0) return undefined;

  const value = argv[positions[0] + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

export function hasOption(argv: string[], name: string) {
  return argv.includes(name);
}

function assertCardId(value: number, source: string) {
  if (!Number.isSafeInteger(value) || value < CARD_ID_MIN || value > CARD_ID_MAX) {
    throw new Error(`Card ID ${source} must be a decimal integer from 1 to 78`);
  }
}

function expandIds(value: string) {
  if (!value.trim()) throw new Error("--ids cannot be empty");
  const ids: number[] = [];
  const seen = new Set<number>();

  for (const rawToken of value.split(",")) {
    const token = rawToken.trim();
    if (!token) throw new Error("--ids contains an empty value");

    const range = /^(\d+)-(\d+)$/.exec(token);
    const single = /^\d+$/.test(token);
    if (!range && !single) {
      throw new Error(`Card ID ${token} is not a decimal value or range`);
    }

    const start = Number(range ? range[1] : token);
    const end = Number(range ? range[2] : token);
    assertCardId(start, token);
    assertCardId(end, token);
    if (start > end) throw new Error(`Descending range ${token} is not allowed`);

    for (let cardId = start; cardId <= end; cardId += 1) {
      if (seen.has(cardId)) throw new Error(`Duplicate card ID ${cardId}`);
      seen.add(cardId);
      ids.push(cardId);
    }
  }

  return ids;
}

export function parseBatchKey(argv: string[]) {
  const value = optionValue(argv, "--batch");
  if (!value) return undefined;
  const batch = TAROT_PRODUCTION_BATCHES.find(({ key }) => key === value);
  if (!batch) {
    throw new Error(`Unknown batch ${value}; expected major, wands, cups, swords or pentacles`);
  }
  return batch.key as TarotProductionBatchKey;
}

export function parseCardIds(argv: string[]) {
  const idsValue = optionValue(argv, "--ids");
  const batchKey = parseBatchKey(argv);
  if (idsValue && batchKey) throw new Error("Use either --ids or --batch, not both");
  if (idsValue) return expandIds(idsValue);
  if (batchKey) {
    const batch = TAROT_PRODUCTION_BATCHES.find(({ key }) => key === batchKey);
    if (!batch) throw new Error(`Unknown batch ${batchKey}`);
    return [...batch.ids];
  }
  throw new Error("Provide --ids or --batch");
}

export function parseRootDir(argv: string[]) {
  return optionValue(argv, "--root") ?? process.cwd();
}

export function currentUtcDate() {
  return new Date().toISOString().slice(0, 10);
}
