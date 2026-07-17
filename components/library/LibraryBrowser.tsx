"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  createLibraryIntentController,
  filterLibraryCards,
  readLibraryFilters,
  toLibrarySearchParams,
  type LibraryFilterState,
  type TarotLibraryCardRecord
} from "@/lib/tarot-library-query";

import styles from "./Library.module.css";
import { LibraryFilters } from "./LibraryFilters";
import { TarotCardGrid } from "./TarotCardGrid";

type LibraryBrowserProps = {
  cards: TarotLibraryCardRecord[];
  readyImageCount: number;
};

const emptyFilters: LibraryFilterState = {
  q: "",
  arcana: "all",
  suit: "all"
};

export function LibraryBrowser({ cards, readyImageCount }: LibraryBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilters = readLibraryFilters(new URLSearchParams(searchParams.toString()));
  const intentControllerRef = useRef<ReturnType<typeof createLibraryIntentController> | null>(null);

  if (!intentControllerRef.current) {
    intentControllerRef.current = createLibraryIntentController(urlFilters);
  }

  const intentController = intentControllerRef.current;
  const filters = useSyncExternalStore(
    intentController.subscribe,
    intentController.getSnapshot,
    intentController.getSnapshot
  );

  useEffect(() => {
    intentController.observe({
      q: urlFilters.q,
      arcana: urlFilters.arcana,
      suit: urlFilters.suit
    });
  }, [intentController, urlFilters.q, urlFilters.arcana, urlFilters.suit]);

  useEffect(() => {
    function restoreFromLocation() {
      intentController.restore(
        readLibraryFilters(new URLSearchParams(window.location.search))
      );
    }

    window.addEventListener("popstate", restoreFromLocation);
    return () => {
      window.removeEventListener("popstate", restoreFromLocation);
    };
  }, [intentController]);

  const filteredCards = useMemo(
    () =>
      filterLibraryCards(cards, {
        q: filters.q,
        arcana: filters.arcana,
        suit: filters.suit
      }),
    [cards, filters.q, filters.arcana, filters.suit]
  );

  const completionCopy =
    readyImageCount === 78
      ? "78 张"
      : `${readyImageCount} / 78 张牌面已就绪 · 开发预览`;

  function hrefFor(nextFilters: LibraryFilterState) {
    const params = toLibrarySearchParams(nextFilters).toString();
    return params ? `/library?${params}` : "/library";
  }

  function replaceFilters(patch: Partial<LibraryFilterState>) {
    const nextFilters = intentController.patch(patch);
    router.replace(hrefFor(nextFilters), { scroll: false });
  }

  function pushFilters(patch: Partial<LibraryFilterState>) {
    const nextFilters = intentController.patch(patch);
    router.push(hrefFor(nextFilters), { scroll: false });
  }

  function clearFilters() {
    const nextFilters = intentController.replace(emptyFilters);
    router.push(hrefFor(nextFilters), { scroll: false });
  }

  return (
    <div className={styles.browser}>
      <section className={styles.intro} aria-labelledby="library-title">
        <div className={styles.introIdentity}>
          <p className={styles.introEyebrow}>档案目录</p>
          <h1 id="library-title" className={styles.title}>
            牌库
          </h1>
          <p className={styles.completion}>{completionCopy}</p>
        </div>
      </section>

      <LibraryFilters
        filters={filters}
        onQueryChange={(q) => replaceFilters({ q })}
        onArcanaChange={(arcana) => pushFilters({ arcana })}
        onSuitChange={(suit) => pushFilters({ suit })}
        onClear={clearFilters}
      />

      <div className={styles.resultBar} aria-live="polite">
        <p>
          <strong>{filteredCards.length}</strong>
          <span> 张牌</span>
        </p>
        <span>{filteredCards.length === cards.length ? "完整牌组" : `共 ${cards.length} 张`}</span>
      </div>

      <TarotCardGrid
        cards={filteredCards}
        filters={filters}
        onClear={clearFilters}
      />
    </div>
  );
}
