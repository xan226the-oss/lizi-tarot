import Link from "next/link";

import {
  getTarotArtworkTone,
  type TarotLibraryCardRecord
} from "@/lib/tarot-library-query";

import styles from "./Library.module.css";
import { TarotCardArtwork } from "./TarotCardArtwork";

type TarotLibraryCardProps = {
  record: TarotLibraryCardRecord;
  priority: boolean;
};

const suitLabels: Record<string, string> = {
  wands: "权杖",
  cups: "圣杯",
  swords: "宝剑",
  pentacles: "星币"
};

export function TarotLibraryCard({ record, priority }: TarotLibraryCardProps) {
  const { card, library } = record;
  const category =
    card.arcana_type === "major" ? "大阿尔卡纳" : suitLabels[card.suit ?? ""] ?? "小阿尔卡纳";

  return (
    <Link
      href={`/library/${card.id}`}
      className={styles.cardLink}
      aria-label={`查看${card.name_cn} ${card.name_en}`}
    >
      <article className={styles.card}>
        <TarotCardArtwork
          src={library.imagePath}
          alt={library.imageAlt}
          cardName={card.name_cn}
          tone={getTarotArtworkTone(card)}
          priority={priority}
          sizes="(max-width: 359px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, (max-width: 1535px) 20vw, 16vw"
        />

        <div className={styles.cardMeta}>
          <p className={styles.cardCategory}>{category}</p>
          <h2 className={styles.cardName}>{card.name_cn}</h2>
          <p className={styles.cardEnglishName}>{card.name_en}</p>
          <ul className={styles.keywordList} aria-label={`${card.name_cn}关键词`}>
            {card.keywords.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        </div>
      </article>
    </Link>
  );
}
