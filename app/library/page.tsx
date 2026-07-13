import Link from "next/link";
import { Suspense } from "react";

import { LibraryBrowser } from "@/components/library/LibraryBrowser";
import styles from "@/components/library/Library.module.css";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { getAvailableTarotCardIds } from "@/lib/tarot-library-assets";
import { getTarotLibraryEntry } from "@/lib/tarot-library";
import { tarotCards } from "@/lib/tarot-cards";

export default function LibraryPage() {
  const cards = tarotCards.map((card) => {
    const library = getTarotLibraryEntry(card.id);

    if (!library) {
      throw new Error(`Missing tarot library entry for card ${card.id}`);
    }

    return { card, library };
  });
  const readyImageCount = getAvailableTarotCardIds().length;

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.siteHeader}>
          <Link href="/" className={styles.brand} aria-label="返回粒子首页">
            <ConstellationLogo />
            <span>粒子</span>
          </Link>
          <Link href="/" className={styles.homeLink}>
            返回首页
          </Link>
        </header>

        <Suspense
          fallback={
            <div className={styles.loadingSurface} role="status">
              正在整理牌库…
            </div>
          }
        >
          <LibraryBrowser cards={cards} readyImageCount={readyImageCount} />
        </Suspense>
      </div>
    </main>
  );
}
