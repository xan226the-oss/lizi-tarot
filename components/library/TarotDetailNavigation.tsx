import Link from "next/link";

import styles from "./Library.module.css";

type DetailNavigationCard = {
  id: number;
  name_cn: string;
};

type TarotDetailNavigationProps = {
  previousCard: DetailNavigationCard | null;
  nextCard: DetailNavigationCard | null;
};

export function TarotDetailNavigation({
  previousCard,
  nextCard
}: TarotDetailNavigationProps) {
  return (
    <nav className={styles.detailNavigation} aria-label="牌库前后导航">
      {previousCard ? (
        <Link className={styles.detailNavigationItem} href={`/library/${previousCard.id}`}>
          <span className={styles.navigationDirection}>上一张</span>
          <strong>{previousCard.name_cn}</strong>
        </Link>
      ) : (
        <span className={styles.detailNavigationItem} aria-disabled="true">
          <span className={styles.navigationDirection}>上一张</span>
          <strong>已是第一张</strong>
        </span>
      )}

      {nextCard ? (
        <Link
          className={`${styles.detailNavigationItem} ${styles.detailNavigationNext}`}
          href={`/library/${nextCard.id}`}
        >
          <span className={styles.navigationDirection}>下一张</span>
          <strong>{nextCard.name_cn}</strong>
        </Link>
      ) : (
        <span
          className={`${styles.detailNavigationItem} ${styles.detailNavigationNext}`}
          aria-disabled="true"
        >
          <span className={styles.navigationDirection}>下一张</span>
          <strong>已是最后一张</strong>
        </span>
      )}
    </nav>
  );
}
