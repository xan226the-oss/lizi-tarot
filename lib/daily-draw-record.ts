import { getTarotCardById, type TarotOrientation } from "./tarot-cards.ts";

export type DailyDrawRecord = {
  date: string;
  shownCardIds: number[];
  selectedCardId: number | null;
  orientation: TarotOrientation | null;
};

export function isValidDailyDrawRecord(
  value: unknown,
  date: string
): value is DailyDrawRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<DailyDrawRecord>;
  const hasThreeCards =
    Array.isArray(record.shownCardIds) &&
    record.shownCardIds.length === 3 &&
    new Set(record.shownCardIds).size === 3 &&
    record.shownCardIds.every(
      (id) => typeof id === "number" && Boolean(getTarotCardById(id))
    );

  const selectedIsValid =
    record.selectedCardId === null ||
    (typeof record.selectedCardId === "number" &&
      Array.isArray(record.shownCardIds) &&
      record.shownCardIds.includes(record.selectedCardId) &&
      Boolean(getTarotCardById(record.selectedCardId)));

  const selectionIsComplete =
    (record.selectedCardId === null && record.orientation === null) ||
    (typeof record.selectedCardId === "number" &&
      (record.orientation === "upright" || record.orientation === "reversed"));

  return (
    record.date === date &&
    hasThreeCards &&
    selectedIsValid &&
    selectionIsComplete &&
    (record.orientation === null ||
      record.orientation === "upright" ||
      record.orientation === "reversed")
  );
}
