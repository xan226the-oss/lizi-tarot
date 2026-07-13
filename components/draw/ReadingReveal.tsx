import Link from "next/link";
import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { ParticleField } from "@/components/ui/ParticleField";
import { getTarotCardById } from "@/lib/tarot-cards";
import type {
  NormalReadingResult,
  NormalSpread
} from "@/lib/normal-draw/types";
import styles from "./NormalDraw.module.css";

export type InterpretationStatus = "idle" | "loading" | "success" | "error";

type ReadingRevealProps = {
  spread: NormalSpread;
  question: string;
  results: NormalReadingResult[];
  interpretationStatus: InterpretationStatus;
  interpretation: string | null;
  interpretationError: string | null;
  onGenerateInterpretation: () => void;
  onReset: () => void;
  onChangeSpread: () => void;
};

export function ReadingReveal({
  spread,
  question,
  results,
  interpretationStatus,
  interpretation,
  interpretationError,
  onGenerateInterpretation,
  onReset,
  onChangeSpread
}: ReadingRevealProps) {
  const cards = results.map((result) => ({
    result,
    card: getTarotCardById(result.cardId)
  }));
  const missingCard = cards.some(({ card }) => !card);

  return (
    <main className={styles.page}>
      <div className={styles.milkyWay} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
      <ParticleField className={styles.revealParticles} count={140} />

      <div className={styles.revealShell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="粒子首页">
            <ConstellationLogo className={styles.logo} />
            <span>粒子</span>
          </Link>
          <button type="button" className={styles.backLink} onClick={onChangeSpread}>
            <ArrowLeft aria-hidden="true" />
            更换牌阵
          </button>
        </header>

        <section className={styles.revealStage} aria-labelledby="reveal-title">
          <div className={styles.revealHeading}>
            <p className={styles.eyebrow}>
              <Sparkles aria-hidden="true" />
              CONSTELLATION REVEALED
            </p>
            <h1 id="reveal-title">{spread.name}已完成</h1>
            <p>{question}</p>
          </div>

          {missingCard ? (
            <div className={styles.revealError} role="alert">
              <p>牌面数据不完整，请重新抽牌。</p>
              <button type="button" onClick={onReset}>重新抽牌</button>
            </div>
          ) : (
            <div className={styles.revealGrid}>
              {cards.map(({ result, card }, index) => {
                if (!card) return null;
                const upright = result.orientation === "upright";
                const meaning = upright
                  ? card.meaning_upright
                  : card.meaning_reversed;

                return (
                  <article key={result.slotId} className={styles.revealCard}>
                    <div className={styles.revealCardFace}>
                      <span className={styles.revealIndex}>
                        {String(index + 1).padStart(2, "0")} · {result.slotLabel}
                      </span>
                      <div
                        className={`${styles.revealGlyph} ${
                          upright ? "" : styles.revealGlyphReversed
                        }`}
                        aria-hidden="true"
                      >
                        ✦
                      </div>
                      <h2>{card.name_cn}</h2>
                      <p className={styles.cardEnglish}>{card.name_en}</p>
                      <span className={styles.orientation}>
                        {upright ? "正位" : "逆位"}
                      </span>
                      <p className={styles.keywords}>{card.keywords.join(" · ")}</p>
                    </div>
                    <div className={styles.basicMeaning}>
                      <strong>基础牌意</strong>
                      <p>{meaning}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!missingCard ? (
            <section
              className={styles.interpretationPanel}
              aria-labelledby="normal-interpretation-title"
              aria-live="polite"
            >
              <div className={styles.interpretationHeading}>
                <Sparkles aria-hidden="true" />
                <div>
                  <p>CONSTELLATION SYNTHESIS</p>
                  <h2 id="normal-interpretation-title">综合解读</h2>
                </div>
              </div>

              {interpretationStatus === "idle" ? (
                <div className={styles.interpretationAction}>
                  <button
                    type="button"
                    className={styles.startButton}
                    onClick={onGenerateInterpretation}
                  >
                    生成综合解读
                  </button>
                  <p>点击后，本次问题与牌面信息将发送至 AI 服务生成解读。</p>
                </div>
              ) : null}

              {interpretationStatus === "loading" ? (
                <div className={styles.interpretationAction}>
                  <button type="button" className={styles.startButton} disabled>
                    正在生成综合解读…
                  </button>
                  <p>已有牌面与基础牌意会保持可见，请稍候。</p>
                </div>
              ) : null}

              {interpretationStatus === "success" && interpretation ? (
                <p className={styles.interpretationCopy}>{interpretation}</p>
              ) : null}

              {interpretationStatus === "error" ? (
                <div className={styles.interpretationError} role="alert">
                  <p>
                    {interpretationError ??
                      "综合解读暂时未能生成，完整牌阵与单张牌意仍可正常查看。"}
                  </p>
                  <button type="button" onClick={onGenerateInterpretation}>
                    重新生成
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          <div className={styles.revealActions}>
            <button type="button" className={styles.secondaryButton} onClick={onChangeSpread}>
              更换牌阵
            </button>
            <button type="button" className={styles.startButton} onClick={onReset}>
              <RotateCcw aria-hidden="true" />
              <span>重新抽牌</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
