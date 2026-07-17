import type { TarotLibraryEntry } from "@/lib/tarot-library";

import styles from "./Library.module.css";

type TarotStoryPanelProps = {
  entry: TarotLibraryEntry;
};

export function TarotStoryPanel({ entry }: TarotStoryPanelProps) {
  return (
    <section className={styles.scenePanel} aria-label="场景记录">
      <p className={styles.storyCopy}>{entry.story}</p>

      <dl className={styles.sceneMeta}>
        <div>
          <dt>人物</dt>
          <dd>
            <ul>
              {entry.characters.map((character) => (
                <li key={character}>{character}</li>
              ))}
            </ul>
          </dd>
        </div>

        <div>
          <dt>地点</dt>
          <dd>{entry.location}</dd>
        </div>

        <div>
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
