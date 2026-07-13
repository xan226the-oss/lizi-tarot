import type { LibraryFilterState } from "@/lib/tarot-library-query";

import styles from "./Library.module.css";

type LibraryFiltersProps = {
  filters: LibraryFilterState;
  onQueryChange: (query: string) => void;
  onArcanaChange: (arcana: LibraryFilterState["arcana"]) => void;
  onSuitChange: (suit: LibraryFilterState["suit"]) => void;
  onClear: () => void;
};

const arcanaOptions = [
  ["all", "全部"],
  ["major", "大阿尔卡纳"],
  ["minor", "小阿尔卡纳"]
] as const;

const suitOptions = [
  ["all", "全部"],
  ["wands", "权杖"],
  ["cups", "圣杯"],
  ["swords", "宝剑"],
  ["pentacles", "星币"]
] as const;

export function LibraryFilters({
  filters,
  onQueryChange,
  onArcanaChange,
  onSuitChange,
  onClear
}: LibraryFiltersProps) {
  const hasActiveFilters =
    Boolean(filters.q) || filters.arcana !== "all" || filters.suit !== "all";

  return (
    <section className={styles.filters} aria-label="牌库搜索与筛选">
      <div className={styles.searchRow}>
        <label className={styles.searchLabel} htmlFor="tarot-library-search">
          搜索牌库
        </label>
        <input
          id="tarot-library-search"
          type="search"
          value={filters.q}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="牌名、关键词或牌意"
          aria-label="搜索牌名、关键词或牌意"
          className={styles.searchInput}
        />
        <button
          type="button"
          className={styles.clearButton}
          onClick={onClear}
          disabled={!hasActiveFilters}
        >
          清空筛选
        </button>
      </div>

      <div className={styles.filterTrack}>
        <span className={styles.filterLabel}>阿尔卡纳</span>
        <div className={styles.filterRail} role="group" aria-label="阿尔卡纳筛选">
          {arcanaOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${styles.filterButton} ${
                filters.arcana === value ? styles.filterButtonActive : ""
              }`}
              aria-pressed={filters.arcana === value}
              onClick={() => onArcanaChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterTrack}>
        <span className={styles.filterLabel}>花色</span>
        <div className={styles.filterRail} role="group" aria-label="花色筛选">
          {suitOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${styles.filterButton} ${
                filters.suit === value ? styles.filterButtonActive : ""
              }`}
              aria-pressed={filters.suit === value}
              onClick={() => onSuitChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
