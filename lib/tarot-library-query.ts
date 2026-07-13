import type { TarotCard } from "./tarot-cards.ts";
import type { TarotLibraryEntry } from "./tarot-library.ts";

export type LibraryArcanaFilter = "all" | "major" | "minor";
export type LibrarySuitFilter = "all" | "wands" | "cups" | "swords" | "pentacles";
export type TarotArtworkTone = Exclude<LibrarySuitFilter, "all"> | "major";
export type LibraryFilterState = {
  q: string;
  arcana: LibraryArcanaFilter;
  suit: LibrarySuitFilter;
};
export type TarotLibraryCardRecord = {
  card: TarotCard;
  library: TarotLibraryEntry;
};

const arcanaFilters = new Set<LibraryArcanaFilter>(["all", "major", "minor"]);
const suitFilters = new Set<LibrarySuitFilter>([
  "all",
  "wands",
  "cups",
  "swords",
  "pentacles"
]);

export function getTarotArtworkTone(card: TarotCard): TarotArtworkTone {
  switch (card.suit) {
    case "wands":
      return "wands";
    case "cups":
      return "cups";
    case "swords":
      return "swords";
    case "pentacles":
      return "pentacles";
    default:
      return "major";
  }
}

export function readLibraryFilters(searchParams: URLSearchParams): LibraryFilterState {
  const arcana = searchParams.get("arcana");
  const suit = searchParams.get("suit");

  return {
    q: (searchParams.get("q") ?? "").trim(),
    arcana: arcanaFilters.has(arcana as LibraryArcanaFilter)
      ? (arcana as LibraryArcanaFilter)
      : "all",
    suit: suitFilters.has(suit as LibrarySuitFilter) ? (suit as LibrarySuitFilter) : "all"
  };
}

export function toLibrarySearchParams(filters: LibraryFilterState) {
  const searchParams = new URLSearchParams();
  const query = filters.q.trim();

  if (query) searchParams.set("q", query);
  if (filters.arcana !== "all") searchParams.set("arcana", filters.arcana);
  if (filters.suit !== "all") searchParams.set("suit", filters.suit);

  return searchParams;
}

export function filterLibraryCards(
  records: TarotLibraryCardRecord[],
  filters: LibraryFilterState
) {
  const query = filters.q.trim().toLowerCase();

  return records
    .filter(({ card }) => {
      const searchableText = [
        card.name_cn,
        card.name_en,
        ...card.keywords,
        card.meaning_upright,
        card.meaning_reversed
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || searchableText.includes(query);
      const matchesArcana = filters.arcana === "all" || card.arcana_type === filters.arcana;
      const matchesSuit = filters.suit === "all" || card.suit === filters.suit;

      return matchesQuery && matchesArcana && matchesSuit;
    })
    .sort((a, b) => a.card.id - b.card.id);
}
