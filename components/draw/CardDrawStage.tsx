"use client";

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { GoldenDustCanvas } from "@/components/draw/GoldenDustCanvas";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { ParticleField } from "@/components/ui/ParticleField";
import type {
  NormalReadingResult,
  NormalSpread
} from "@/lib/normal-draw/types";
import styles from "./NormalDraw.module.css";

type CardDrawStageProps = {
  spread: NormalSpread;
  question: string;
  deck: number[];
  results: NormalReadingResult[];
  isPlacing: boolean;
  onChoose: (cardId: number) => void;
  onBackToQuestion: () => void;
};

export function CardDrawStage({
  spread,
  question,
  deck,
  results,
  isPlacing,
  onChoose,
  onBackToQuestion
}: CardDrawStageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [candidateCount, setCandidateCount] = useState(18);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 680px)");
    const updateCount = () => setCandidateCount(query.matches ? 12 : 18);
    updateCount();
    query.addEventListener("change", updateCount);
    return () => query.removeEventListener("change", updateCount);
  }, []);

  const candidates = useMemo(
    () => deck.slice(0, candidateCount),
    [candidateCount, deck]
  );
  const currentIndex = Math.min(
    isPlacing ? Math.max(0, results.length - 1) : results.length,
    spread.cardCount - 1
  );
  const currentSlot = spread.slots[currentIndex];

  return (
    <main className={styles.page}>
      <div className={styles.milkyWay} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
      <ParticleField className={styles.particles} count={220} />
      <GoldenDustCanvas />

      <div className={styles.drawShell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="粒子首页">
            <ConstellationLogo className={styles.logo} />
            <span>粒子</span>
          </Link>
          <button
            type="button"
            className={styles.backLink}
            onClick={onBackToQuestion}
          >
            <ArrowLeft aria-hidden="true" />
            返回问题
          </button>
        </header>

        <section className={styles.drawStage} aria-labelledby="draw-stage-title">
          <div className={styles.drawHeading}>
            <p className={styles.eyebrow}>
              <Sparkles aria-hidden="true" />
              {spread.name} · {spread.cardCount} CARD RITUAL
            </p>
            <h1 ref={headingRef} id="draw-stage-title" tabIndex={-1}>
              为「{currentSlot.label}」抽第 {Math.min(results.length + 1, spread.cardCount)} / {spread.cardCount} 张
            </h1>
            <p className={styles.drawQuestion}>{question}</p>
          </div>

          <div className={styles.readingBoard}>
            <div className={styles.boardOrbit} aria-hidden="true" />
            {spread.slots.map((slot, index) => {
              const result = results[index];
              return (
                <div
                  key={slot.id}
                  className={`${styles.boardSlot} ${
                    result ? styles.boardSlotFilled : ""
                  } ${index === currentIndex ? styles.boardSlotActive : ""}`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <span className={styles.boardSlotCard} aria-hidden="true">
                    <span>✦</span>
                  </span>
                  <span className={styles.boardSlotLabel}>
                    {String(index + 1).padStart(2, "0")} · {slot.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.cardFanSection}>
            <div className={styles.drawStatus} aria-live="polite">
              <span>{isPlacing ? "牌正在进入星位" : `当前牌位：${currentSlot.label}`}</span>
              <strong>牌堆剩余 {deck.length} 张</strong>
            </div>
            <div className={styles.cardFan} aria-label="可选择的塔罗牌背">
              {candidates.map((cardId, index) => {
                const center = (candidates.length - 1) / 2;
                const offset = index - center;
                const fanStyle = {
                  "--fan-x": `${offset * (candidateCount === 12 ? 21 : 25)}px`,
                  "--fan-angle": `${offset * (candidateCount === 12 ? 1.8 : 1.45)}deg`,
                  "--fan-y": `${Math.abs(offset) * 1.7}px`,
                  "--fan-index": index
                } as CSSProperties;

                return (
                  <button
                    key={cardId}
                    type="button"
                    className={styles.fanCard}
                    style={fanStyle}
                    disabled={isPlacing}
                    aria-label={`选择第 ${index + 1} 张牌背，当前牌位 ${currentSlot.label}`}
                    onClick={() => onChoose(cardId)}
                  >
                    <span className={styles.cardBackInner}>
                      <span className={styles.cardBackOrbit} />
                      <b>✦</b>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
