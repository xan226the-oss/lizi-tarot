import { getSpreadSlots, getSpreadTitle } from "./gesture/spreads.ts";
import { getNormalSpread } from "./normal-draw/spreads.ts";
import type { NormalSpreadId } from "./normal-draw/types.ts";
import { validateNormalQuestion } from "./normal-draw/validation.ts";
import { getTarotCardById } from "./tarot-cards.ts";

type Orientation = "upright" | "reversed";
type GestureSpread = "three" | "five";

type InterpretationResultInput<TCardId> = {
  cardId: TCardId;
  orientation: Orientation;
  slotId: string;
  slotLabel: string;
};

export type NormalInterpretationRequest = {
  readingType: "normal";
  question: string;
  spreadId: NormalSpreadId;
  results: Array<InterpretationResultInput<number>>;
};

export type NormalizedInterpretationCard = {
  cardId: number;
  slotId: string;
  slotLabel: string;
  slotDescription: string;
  cardName: string;
  orientation: Orientation;
  meaning: string;
  keywords: string[];
};

export type NormalizedInterpretationRequest = {
  readingType: "gesture" | "normal";
  question: string;
  spreadTitle: string;
  spreadPurpose: string | null;
  cards: NormalizedInterpretationCard[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOrientation(value: unknown): value is Orientation {
  return value === "upright" || value === "reversed";
}

function resolveCard(
  cardId: number,
  orientation: Orientation,
  slotId: string,
  slotLabel: string,
  slotDescription: string
): NormalizedInterpretationCard | null {
  const card = getTarotCardById(cardId);
  if (!card) return null;

  return {
    cardId,
    slotId,
    slotLabel,
    slotDescription,
    cardName: card.name_cn,
    orientation,
    meaning:
      orientation === "upright"
        ? card.meaning_upright
        : card.meaning_reversed,
    keywords: [...card.keywords]
  };
}

function normalizeNormal(
  request: Record<string, unknown>
): NormalizedInterpretationRequest | null {
  if (
    request.readingType !== "normal" ||
    typeof request.question !== "string" ||
    validateNormalQuestion(request.question) !== null ||
    typeof request.spreadId !== "string" ||
    !Array.isArray(request.results)
  ) {
    return null;
  }

  const spread = getNormalSpread(request.spreadId);
  if (!spread || request.results.length !== spread.cardCount) return null;

  const seenCardIds = new Set<number>();
  const seenSlotIds = new Set<string>();
  const cards: NormalizedInterpretationCard[] = [];

  for (let index = 0; index < request.results.length; index += 1) {
    const rawResult = request.results[index];
    const slot = spread.slots[index];
    if (!slot || !isRecord(rawResult)) return null;

    const { cardId, orientation, slotId, slotLabel } = rawResult;
    if (
      typeof cardId !== "number" ||
      !Number.isInteger(cardId) ||
      !isOrientation(orientation) ||
      slotId !== slot.id ||
      slotLabel !== slot.label ||
      seenCardIds.has(cardId) ||
      seenSlotIds.has(slot.id)
    ) {
      return null;
    }

    const card = resolveCard(
      cardId,
      orientation,
      slot.id,
      slot.label,
      slot.description
    );
    if (!card) return null;

    seenCardIds.add(cardId);
    seenSlotIds.add(slot.id);
    cards.push(card);
  }

  return {
    readingType: "normal",
    question: request.question.trim(),
    spreadTitle: spread.name,
    spreadPurpose: spread.useFor,
    cards
  };
}

function normalizeGesture(
  request: Record<string, unknown>
): NormalizedInterpretationRequest | null {
  if (
    request.readingType !== undefined &&
    request.readingType !== "gesture"
  ) {
    return null;
  }
  if (
    typeof request.question !== "string" ||
    request.question.trim().length < 2 ||
    request.question.trim().length > 500 ||
    (request.spread !== "three" && request.spread !== "five") ||
    !Array.isArray(request.results)
  ) {
    return null;
  }

  const spread = request.spread as GestureSpread;
  const slots = getSpreadSlots(spread);
  if (request.results.length !== slots.length) return null;

  const expectedSlots = new Map(slots.map((slot) => [slot.id, slot.label]));
  const seenCardIds = new Set<number>();
  const seenSlotIds = new Set<string>();
  const cards: NormalizedInterpretationCard[] = [];

  for (const rawResult of request.results) {
    if (!isRecord(rawResult)) return null;
    const { cardId, orientation, slotId, slotLabel } = rawResult;
    if (
      typeof cardId !== "string" ||
      !/^\d+$/.test(cardId) ||
      !isOrientation(orientation) ||
      typeof slotId !== "string" ||
      typeof slotLabel !== "string" ||
      expectedSlots.get(slotId) !== slotLabel
    ) {
      return null;
    }

    const numericCardId = Number(cardId);
    if (seenCardIds.has(numericCardId) || seenSlotIds.has(slotId)) return null;
    const card = resolveCard(numericCardId, orientation, slotId, slotLabel, "");
    if (!card) return null;

    seenCardIds.add(numericCardId);
    seenSlotIds.add(slotId);
    cards.push(card);
  }

  return {
    readingType: "gesture",
    question: request.question.trim(),
    spreadTitle: getSpreadTitle(spread),
    spreadPurpose: null,
    cards
  };
}

export function normalizeInterpretationRequest(
  value: unknown
): NormalizedInterpretationRequest | null {
  if (!isRecord(value)) return null;
  return value.readingType === "normal"
    ? normalizeNormal(value)
    : normalizeGesture(value);
}
