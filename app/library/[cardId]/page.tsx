import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/components/library/Library.module.css";
import { TarotCardArtwork } from "@/components/library/TarotCardArtwork";
import { TarotDetailContent } from "@/components/library/TarotDetailContent";
import { TarotDetailNavigation } from "@/components/library/TarotDetailNavigation";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { getTarotCardById } from "@/lib/tarot-cards";
import { getTarotLibraryEntry } from "@/lib/tarot-library";
import { getTarotLibraryReading } from "@/lib/tarot-library-readings";
import { getTarotArtworkTone } from "@/lib/tarot-library-query";
import { getAdjacentLibraryCardIds, parseLibraryCardId } from "@/lib/tarot-library-routing";

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: 78 }, (_, index) => ({ cardId: String(index + 1) }));
}

type TarotDetailPageProps = {
  params: {
    cardId: string;
  };
};

const suitLabels: Record<string, string> = {
  wands: "权杖",
  cups: "圣杯",
  swords: "宝剑",
  pentacles: "星币"
};

export default function TarotDetailPage({ params }: TarotDetailPageProps) {
  const cardId = parseLibraryCardId(params.cardId);

  if (cardId === null) notFound();

  const card = getTarotCardById(cardId);
  const entry = getTarotLibraryEntry(cardId);
  const reading = getTarotLibraryReading(cardId);

  if (!card || !entry || !reading) notFound();

  const { previousCardId, nextCardId } = getAdjacentLibraryCardIds(cardId);
  const previousCard = previousCardId === null ? null : getTarotCardById(previousCardId);
  const nextCard = nextCardId === null ? null : getTarotCardById(nextCardId);
  const category =
    card.arcana_type === "major"
      ? "大阿尔卡纳"
      : `${suitLabels[card.suit ?? ""] ?? "小阿尔卡纳"} · 小阿尔卡纳`;

  return (
    <main className={`${styles.page} ${styles.detailPage}`}>
      <div className={`${styles.frame} ${styles.detailFrame}`}>
        <header className={styles.siteHeader}>
          <Link href="/" className={styles.brand} aria-label="返回粒子首页">
            <ConstellationLogo />
            <span>粒子</span>
          </Link>
          <Link href="/library" className={styles.homeLink}>
            返回牌库
          </Link>
        </header>

        <nav className={styles.breadcrumb} aria-label="面包屑">
          <Link href="/">首页</Link>
          <span aria-hidden="true">/</span>
          <Link href="/library">牌库</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{card.name_cn}</span>
        </nav>

        <article className={styles.detailLayout}>
          <div className={styles.artworkColumn}>
            <TarotCardArtwork
              src={entry.imagePath}
              alt={entry.imageAlt}
              cardName={card.name_cn}
              tone={getTarotArtworkTone(card)}
              sizes="(max-width: 1023px) 92vw, 22rem"
              priority
              className={styles.detailArtwork}
            />
          </div>

          <div className={styles.detailContent}>
            <header className={styles.detailIdentity}>
              <p className={styles.detailCategory}>
                档案 {String(card.id).padStart(2, "0")} · {category}
              </p>
              <h1>{card.name_cn}</h1>
              <p className={styles.detailEnglishName}>{card.name_en}</p>
              <ul className={styles.detailKeywords} aria-label={`${card.name_cn}关键词`}>
                {card.keywords.map((keyword) => (
                  <li key={keyword}>{keyword}</li>
                ))}
              </ul>
            </header>

            <TarotDetailContent entry={entry} reading={reading} />
            <TarotDetailNavigation previousCard={previousCard} nextCard={nextCard} />
          </div>
        </article>
      </div>
    </main>
  );
}
