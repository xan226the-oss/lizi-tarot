"use client";

import { CSSProperties } from "react";
import { getTarotCardById, type TarotOrientation } from "@/lib/tarot-cards";
import { cn } from "@/lib/utils";
import type { GesturePhase } from "@/lib/gesture/types";

type TarotCard3DProps = {
  cardId: string;
  phase: GesturePhase;
  selected?: boolean;
  grabbed?: boolean;
  revealed?: boolean;
  summoning?: boolean;
  subdued?: boolean;
  orientation?: TarotOrientation;
  style?: CSSProperties;
};

function getOrientationLabel(orientation: TarotOrientation) {
  return orientation === "upright" ? "正位" : "逆位";
}

export function TarotCard3D({
  cardId,
  phase,
  selected = false,
  grabbed = false,
  revealed = false,
  summoning = false,
  subdued = false,
  orientation = "upright",
  style
}: TarotCard3DProps) {
  const card = getTarotCardById(Number(cardId));

  if (!card) return null;

  return (
    <div
      className={cn(
        "gesture-tarot-card",
        selected && "gesture-tarot-card--selected",
        grabbed && "gesture-tarot-card--grabbed",
        revealed && "gesture-tarot-card--revealed",
        summoning && "gesture-tarot-card--summoning",
        subdued && "gesture-tarot-card--subdued",
        phase === "SHUFFLING" && "gesture-tarot-card--shuffle"
      )}
      style={style}
    >
      <div className="gesture-tarot-card__inner">
        <div className="gesture-tarot-card__back">
          <span className="gesture-card-back__art" aria-hidden="true" />
          <span className="gesture-tarot-card__sheen" />
        </div>
        <div className="gesture-tarot-card__face">
          <span className="text-[10px] tracking-[0.24em] text-accent-gold-70">
            {getOrientationLabel(orientation)}
          </span>
          <span className="mt-2 text-center font-serif text-xl font-semibold leading-tight text-text-primary">
            {card.name_cn}
          </span>
          <span className="mt-1 text-center font-cinzel text-[10px] tracking-[0.16em] text-text-secondary">
            {card.name_en}
          </span>
          <span className="mt-4 h-px w-12 bg-accent-gold-50" />
          <span className="mt-4 px-4 text-center text-xs leading-6 text-text-secondary">
            {orientation === "upright" ? card.meaning_upright : card.meaning_reversed}
          </span>
        </div>
      </div>
      <span className="gesture-tarot-card__edge-stars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
