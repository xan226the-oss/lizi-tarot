import type { TarotLibraryEntry } from "@/lib/tarot-library";

import styles from "./Library.module.css";

type TarotStoryPanelProps = {
  entry: TarotLibraryEntry;
};

export function TarotStoryPanel({ entry }: TarotStoryPanelProps) {
  return (
    <section className={styles.storySection} aria-labelledby="chronicle-heading">
      <div className={styles.sectionHeadingRow}>
        <p className={styles.sectionIndex}>场景记录</p>
        <h2 id="chronicle-heading" className={styles.sectionHeading}>
          文明编年
        </h2>
      </div>

      <p className={styles.storyCopy}>{entry.story}</p>

      <dl className={styles.chronicle}>
        <div className={styles.chronicleItem}>
          <dt>人物</dt>
          <dd>
            <ul>
              {entry.characters.map((character) => (
                <li key={character}>{character}</li>
              ))}
            </ul>
          </dd>
        </div>

        <div className={styles.chronicleItem}>
          <dt>地点</dt>
          <dd>{entry.location}</dd>
        </div>

        <div className={styles.chronicleItem}>
          <dt>符号</dt>
          <dd>
            <ul>
              {entry.symbols.map((symbol) => (
                <li key={symbol}>{symbol}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </section>
  );
}
