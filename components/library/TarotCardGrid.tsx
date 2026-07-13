import type {
  LibraryFilterState,
  TarotLibraryCardRecord
} from "@/lib/tarot-library-query";

import styles from "./Library.module.css";
import { TarotLibraryCard } from "./TarotLibraryCard";

type TarotCardGridProps = {
  cards: TarotLibraryCardRecord[];
  filters: LibraryFilterState;
  onClear: () => void;
};

const arcanaLabels = {
  all: "全部阿尔卡纳",
  major: "大阿尔卡纳",
  minor: "小阿尔卡纳"
} as const;

const suitLabels = {
  all: "全部花色",
  wands: "权杖",
  cups: "圣杯",
  swords: "宝剑",
  pentacles: "星币"
} as const;

export function TarotCardGrid({ cards, filters, onClear }: TarotCardGridProps) {
  if (cards.length === 0) {
    const activeSummary = [
      filters.q ? `搜索“${filters.q}”` : null,
      filters.arcana !== "all" ? arcanaLabels[filters.arcana] : null,
      filters.suit !== "all" ? suitLabels[filters.suit] : null
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <section className={styles.emptyState} aria-live="polite">
        <h2>没有找到符合条件的牌</h2>
        <p>{activeSummary || "当前筛选没有返回结果，请尝试调整条件。"}</p>
        <button type="button" className={styles.clearButton} onClick={onClear}>
          清空筛选
        </button>
      </section>
    );
  }

  return (
    <div className={styles.grid}>
      {cards.map((record, index) => (
        <TarotLibraryCard
          key={record.card.id}
          record={record}
          priority={index < 6}
        />
      ))}
    </div>
  );
}
