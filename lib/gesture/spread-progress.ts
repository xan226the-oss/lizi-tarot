import type { ReadingSpread } from "@/lib/gesture/types";

const SPREAD_SIZE: Record<ReadingSpread, number> = {
  three: 3,
  five: 5
};

export function isSpreadComplete(
  spread: ReadingSpread | null,
  resultCount: number
) {
  return spread ? resultCount >= SPREAD_SIZE[spread] : false;
}
