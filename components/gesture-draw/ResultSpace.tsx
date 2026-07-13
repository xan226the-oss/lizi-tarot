"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RitualPlinth } from "@/components/gesture-draw/RitualPlinth";
import { getTarotCardById } from "@/lib/tarot-cards";
import { getSpreadTitle } from "@/lib/gesture/spreads";
import type { ReadingResult, ReadingSpread } from "@/lib/gesture/types";
import { cn } from "@/lib/utils";

export type InterpretationStatus = "idle" | "loading" | "success" | "error";

type ResultSpaceProps = {
  question: string;
  spread: ReadingSpread | null;
  results: ReadingResult[];
  interpretationStatus?: InterpretationStatus;
  interpretation?: string | null;
  interpretationError?: string | null;
  onRetryInterpretation?: () => void;
  onReset: () => void;
};

function getOrientationLabel(orientation: ReadingResult["orientation"]) {
  return orientation === "upright" ? "正位" : "逆位";
}

function getCoreResponse(meaning: string) {
  const firstSentence = meaning.trim().split(/[。！？]/)[0] || meaning;
  return firstSentence.length > 42 ? `${firstSentence.slice(0, 42)}…` : firstSentence;
}

export function ResultSpace({
  question,
  spread,
  results,
  interpretationStatus = "idle",
  interpretation,
  interpretationError,
  onRetryInterpretation,
  onReset
}: ResultSpaceProps) {
  const isFiveCardSpread = spread === "five";
  const answerLabel = isFiveCardSpread ? "五张牌共同回应" : "三张牌共同回应";

  return (
    <section className="gesture-reading relative flex h-full min-h-0 w-full flex-col">
      <RitualPlinth spread={spread} mode="active" ambient />
      <header className="gesture-reading__header">
        <div className="gesture-reading__eyebrow">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {getSpreadTitle(spread)} · 完整牌阵
        </div>
        <h1>{question}</h1>
        <p>{answerLabel}</p>
      </header>

      <div
        className={cn(
          "gesture-reading__tableau",
          isFiveCardSpread
            ? "gesture-reading__tableau--five"
            : "gesture-reading__tableau--three"
        )}
        aria-label={`${getSpreadTitle(spread)}完整牌阵`}
      >
        {results.map((result, index) => {
          const card = getTarotCardById(Number(result.cardId));
          if (!card) return null;

          const meaning =
            result.orientation === "upright"
              ? card.meaning_upright
              : card.meaning_reversed;
          const fan = [
            { x: 18, y: 58, rotate: -12 },
            { x: 34, y: 49, rotate: -6 },
            { x: 50, y: 45, rotate: 0 },
            { x: 66, y: 49, rotate: 6 },
            { x: 82, y: 58, rotate: 12 }
          ][index];

          return (
            <article
              key={`${result.slotId}-${result.cardId}`}
              className="gesture-reading-card"
              style={
                {
                  "--result-x": `${isFiveCardSpread && fan ? fan.x : result.position.x}%`,
                  "--result-y": `${isFiveCardSpread && fan ? fan.y : result.position.y}%`,
                  "--result-rotate": `${isFiveCardSpread && fan ? fan.rotate : 0}deg`,
                  "--reveal-index": index
                } as CSSProperties
              }
            >
              <span className="gesture-reading-card__glow" aria-hidden="true" />
              <div className="gesture-reading-card__frame">
                <div className="gesture-reading-card__meta">
                  <span>{result.slotLabel}</span>
                  <strong>{getOrientationLabel(result.orientation)}</strong>
                </div>
                <span className="gesture-reading-card__mark" aria-hidden="true">✦</span>
                <h2>{card.name_cn}</h2>
                <p className="gesture-reading-card__english">{card.name_en}</p>
                <div className="gesture-reading-card__divider" aria-hidden="true" />
                <p className="gesture-reading-card__meaning">{getCoreResponse(meaning)}</p>
                <p className="gesture-reading-card__keywords">{card.keywords.join(" · ")}</p>
              </div>
            </article>
          );
        })}
      </div>

      <section className="gesture-reading__synthesis" aria-live="polite">
        <div className="gesture-reading__synthesis-title">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>综合牌意</span>
        </div>

        <div className="gesture-reading__synthesis-copy">
          {interpretationStatus === "loading" || interpretationStatus === "idle" ? (
            <p className="gesture-reading__loading">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              正在把每个牌位串成同一个答案…
            </p>
          ) : null}

          {interpretationStatus === "success" && interpretation ? (
            <p>{interpretation}</p>
          ) : null}

          {interpretationStatus === "error" ? (
            <div className="gesture-reading__error">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{interpretationError ?? "综合解读暂时没有返回，单张牌意仍可正常查看。"}</p>
              {onRetryInterpretation ? (
                <button type="button" onClick={onRetryInterpretation}>
                  重新解读
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="gesture-reading__actions">
          <Button type="button" variant="secondary" onClick={onReset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            再抽一次
          </Button>
          <Link href="/" className="inline-flex">
            <Button type="button" variant="ghost">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回首页
            </Button>
          </Link>
        </div>
      </section>
    </section>
  );
}
