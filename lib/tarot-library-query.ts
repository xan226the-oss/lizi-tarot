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

function normalizeLibraryFilters(filters: LibraryFilterState) {
  return readLibraryFilters(toLibrarySearchParams(filters));
}

function libraryFilterKey(filters: LibraryFilterState) {
  return toLibrarySearchParams(filters).toString();
}

export function createLibraryIntentController(initialFilters: LibraryFilterState) {
  let intent = normalizeLibraryFilters(initialFilters);
  let observedKey = libraryFilterKey(intent);
  let pendingKey: string | null = null;
  const listeners = new Set<() => void>();

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function setIntent(nextFilters: LibraryFilterState) {
    const nextIntent = { ...nextFilters };
    const nextKey = libraryFilterKey(nextIntent);
    // Next cancels older navigations, and a same-canonical-URL call emits no new URL observation.
    const settlesSynchronously = nextKey === observedKey;

    pendingKey = settlesSynchronously ? null : nextKey;
    intent = settlesSynchronously ? normalizeLibraryFilters(nextIntent) : nextIntent;
    emit();
    return intent;
  }

  return {
    getSnapshot: () => intent,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    patch(patch: Partial<LibraryFilterState>) {
      return setIntent({ ...intent, ...patch });
    },
    replace(nextFilters: LibraryFilterState) {
      return setIntent(nextFilters);
    },
    restore(restoredFilters: LibraryFilterState) {
      const normalizedRestored = normalizeLibraryFilters(restoredFilters);

      observedKey = libraryFilterKey(normalizedRestored);
      pendingKey = null;
      intent = normalizedRestored;
      emit();
      return intent;
    },
    observe(observedFilters: LibraryFilterState) {
      const normalizedObserved = normalizeLibraryFilters(observedFilters);
      const nextObservedKey = libraryFilterKey(normalizedObserved);

      if (pendingKey !== null && nextObservedKey !== pendingKey) {
        observedKey = nextObservedKey;
        return intent;
      }

      if (pendingKey === null && nextObservedKey === observedKey) return intent;

      observedKey = nextObservedKey;
      pendingKey = null;
      intent = normalizedObserved;
      emit();
      return intent;
    }
  };
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
