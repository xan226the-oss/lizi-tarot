"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import type { TarotLibraryEntry } from "@/lib/tarot-library";
import type { TarotLibraryReading } from "@/lib/tarot-library-readings";

import styles from "./Library.module.css";
import { TarotStoryPanel } from "./TarotStoryPanel";

type DetailView = "meaning" | "scene";

type TarotDetailContentProps = {
  entry: TarotLibraryEntry;
  reading: TarotLibraryReading;
};

const detailViews = [
  { id: "meaning", label: "牌义" },
  { id: "scene", label: "场景" }
] as const;

export function TarotDetailContent({ entry, reading }: TarotDetailContentProps) {
  const idPrefix = useId();
  const [view, setView] = useState<DetailView>("meaning");
  const meaningTab = useRef<HTMLButtonElement>(null);
  const sceneTab = useRef<HTMLButtonElement>(null);

  function selectAndFocus(next: DetailView) {
    setView(next);
    (next === "meaning" ? meaningTab : sceneTab).current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    selectAndFocus(view === "meaning" ? "scene" : "meaning");
  }

  return (
    <section className={styles.detailPanelShell} aria-label="牌库详情内容">
      <div className={styles.detailViewTabs} role="tablist" aria-label="切换牌义或场景">
        {detailViews.map(({ id, label }) => {
          const isSelected = view === id;

          return (
            <button
              key={id}
              ref={id === "meaning" ? meaningTab : sceneTab}
              id={`${idPrefix}-${id}-tab`}
              className={styles.detailViewTab}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${idPrefix}-${id}-panel`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setView(id)}
              onKeyDown={handleKeyDown}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        id={`${idPrefix}-meaning-panel`}
        className={styles.detailPanel}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-meaning-tab`}
        tabIndex={0}
        hidden={view !== "meaning"}
      >
        <div className={styles.meaningReadingGrid}>
          <section className={styles.meaningReading} aria-labelledby={`${idPrefix}-upright-heading`}>
            <h2 id={`${idPrefix}-upright-heading`}>正位</h2>
            <p>{reading.upright}</p>
          </section>
          <section className={styles.meaningReading} aria-labelledby={`${idPrefix}-reversed-heading`}>
            <h2 id={`${idPrefix}-reversed-heading`}>逆位</h2>
            <p>{reading.reversed}</p>
          </section>
        </div>
      </div>

      <div
        id={`${idPrefix}-scene-panel`}
        className={styles.detailPanel}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-scene-tab`}
        tabIndex={0}
        hidden={view !== "scene"}
      >
        <TarotStoryPanel entry={entry} />
      </div>
    </section>
  );
}
