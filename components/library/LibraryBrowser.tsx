"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
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
  const filters = readLibraryFilters(new URLSearchParams(searchParams.toString()));
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
      ? "78 张原创牌组"
      : `${readyImageCount} / 78 张牌面已就绪 · 开发预览`;

  function hrefFor(nextFilters: LibraryFilterState) {
    const params = toLibrarySearchParams(nextFilters).toString();
    return params ? `/library?${params}` : "/library";
  }

  function replaceFilters(nextFilters: LibraryFilterState) {
    router.replace(hrefFor(nextFilters), { scroll: false });
  }

  function pushFilters(nextFilters: LibraryFilterState) {
    router.push(hrefFor(nextFilters), { scroll: false });
  }

  return (
    <div className={styles.browser}>
      <section className={styles.intro} aria-labelledby="library-title">
        <div>
          <h1 id="library-title" className={styles.title}>
            原创塔罗牌库
          </h1>
          <p className={styles.completion}>{completionCopy}</p>
        </div>
        <p className={styles.worldCopy}>
          同一文明的 78 个历史切面：行动、情感、思想与现实在星际漆彩中彼此回响。
        </p>
      </section>

      <LibraryFilters
        filters={filters}
        onQueryChange={(q) => replaceFilters({ ...filters, q })}
        onArcanaChange={(arcana) => pushFilters({ ...filters, arcana })}
        onSuitChange={(suit) => pushFilters({ ...filters, suit })}
        onClear={() => pushFilters(emptyFilters)}
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
        onClear={() => pushFilters(emptyFilters)}
      />
    </div>
  );
}
