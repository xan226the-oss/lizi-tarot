"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import styles from "./Library.module.css";

type TarotMeaningTabsProps = {
  upright: string;
  reversed: string;
};

type Orientation = "upright" | "reversed";

const meaningTabs = {
  upright: {
    label: "正位",
    tabId: "meaning-tab-upright",
    panelId: "meaning-panel-upright"
  },
  reversed: {
    label: "逆位",
    tabId: "meaning-tab-reversed",
    panelId: "meaning-panel-reversed"
  }
} as const;

export function TarotMeaningTabs({ upright, reversed }: TarotMeaningTabsProps) {
  const [selected, setSelected] = useState<Orientation>("upright");
  const uprightTab = useRef<HTMLButtonElement>(null);
  const reversedTab = useRef<HTMLButtonElement>(null);

  function selectAndFocus(orientation: Orientation) {
    setSelected(orientation);
    const target = orientation === "upright" ? uprightTab : reversedTab;
    target.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    selectAndFocus(selected === "upright" ? "reversed" : "upright");
  }

  return (
    <section className={styles.meaningSection} aria-labelledby="meaning-heading">
      <div className={styles.sectionHeadingRow}>
        <p className={styles.sectionIndex}>解读档案</p>
        <h2 id="meaning-heading" className={styles.sectionHeading}>
          牌义双面
        </h2>
      </div>

      <div className={styles.meaningTabList} role="tablist" aria-label="选择牌的正逆位含义">
        {(Object.keys(meaningTabs) as Orientation[]).map((orientation) => {
          const tab = meaningTabs[orientation];
          const isSelected = selected === orientation;

          return (
            <button
              key={orientation}
              ref={orientation === "upright" ? uprightTab : reversedTab}
              id={tab.tabId}
              className={styles.meaningTab}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={tab.panelId}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelected(orientation)}
              onKeyDown={handleKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {(
        [
          ["upright", upright],
          ["reversed", reversed]
        ] as const
      ).map(([orientation, meaning]) => {
        const tab = meaningTabs[orientation];
        const isSelected = selected === orientation;

        return (
          <div
            key={orientation}
            id={tab.panelId}
            className={styles.meaningPanel}
            role="tabpanel"
            aria-labelledby={tab.tabId}
            tabIndex={isSelected ? 0 : -1}
            hidden={!isSelected}
          >
            <p>{meaning}</p>
          </div>
        );
      })}
    </section>
  );
}
