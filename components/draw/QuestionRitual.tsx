"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { GoldenDustCanvas } from "@/components/draw/GoldenDustCanvas";
import { SpreadSigil } from "@/components/draw/SpreadSigil";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { ParticleField } from "@/components/ui/ParticleField";
import { validateNormalQuestion } from "@/lib/normal-draw/validation";
import type { NormalSpread } from "@/lib/normal-draw/types";
import styles from "./NormalDraw.module.css";

type QuestionRitualProps = {
  spread: NormalSpread;
  initialQuestion?: string;
  onChangeSpread: () => void;
  onStart: (question: string) => void;
};

export function QuestionRitual({
  spread,
  initialQuestion = "",
  onChangeSpread,
  onStart
}: QuestionRitualProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState(initialQuestion);
  const [touched, setTouched] = useState(false);
  const error = touched ? validateNormalQuestion(question) : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const validationError = validateNormalQuestion(question);

    if (validationError) {
      textareaRef.current?.focus();
      return;
    }

    onStart(question.trim());
  };

  return (
    <main className={styles.page}>
      <div className={styles.milkyWay} aria-hidden="true" />
      <div className={styles.astralRings} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
      <ParticleField className={styles.particles} count={240} />
      <GoldenDustCanvas />

      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="粒子首页">
            <ConstellationLogo className={styles.logo} />
            <span>粒子</span>
          </Link>
          <button
            type="button"
            className={styles.backLink}
            onClick={onChangeSpread}
          >
            <ArrowLeft aria-hidden="true" />
            更换牌阵
          </button>
        </header>

        <section className={styles.questionStage} aria-labelledby="question-title">
          <div className={styles.spreadObservatory}>
            <div className={styles.selectedSpreadHeading}>
              <p className={styles.eyebrow}>
                <Sparkles aria-hidden="true" />
                SELECTED CONSTELLATION · {spread.cardCount} CARDS
              </p>
              <h1 id="question-title">{spread.name}</h1>
              <p>适用于{spread.useFor}</p>
            </div>

            <div className={styles.positionMap} aria-label={`${spread.name}牌位结构`}>
              <div className={styles.positionSigil}>
                <SpreadSigil spread={spread} />
              </div>
              {spread.slots.map((slot, index) => (
                <span
                  key={slot.id}
                  className={styles.positionNode}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>{slot.label}</span>
                </span>
              ))}
            </div>

            <ol className={styles.slotList}>
              {spread.slots.map((slot, index) => (
                <li key={slot.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{slot.label}</strong>
                    <p>{slot.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <form className={styles.questionConsole} onSubmit={handleSubmit}>
            <div className={styles.consoleMark} aria-hidden="true">✦</div>
            <p className={styles.consoleKicker}>INSCRIBE YOUR QUESTION</p>
            <h2>写下你真正想确认的问题</h2>
            <p className={styles.consoleHelp}>
              一个具体问题，会让每个牌位更容易形成清晰回应。
            </p>
            <label className={styles.questionLabel} htmlFor="normal-draw-question">
              你的问题
            </label>
            <div className={styles.textareaFrame}>
              <textarea
                ref={textareaRef}
                id="normal-draw-question"
                value={question}
                maxLength={240}
                rows={6}
                placeholder="例如：这段关系里，我最需要看清什么？"
                aria-describedby="normal-question-help normal-question-error"
                aria-invalid={Boolean(error)}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </div>
            <div className={styles.questionMeta}>
              <span id="normal-question-help">8–240 个字符</span>
              <span>{question.trim().length} / 240</span>
            </div>
            <p
              id="normal-question-error"
              className={styles.questionError}
              aria-live="polite"
            >
              {error ?? "\u00a0"}
            </p>
            <button type="submit" className={styles.startButton}>
              <span>开始抽牌</span>
              <Sparkles aria-hidden="true" />
            </button>
            <p className={styles.consoleNotice}>
              下一步将按牌位逐张抽牌，全部完成后统一揭示。
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
