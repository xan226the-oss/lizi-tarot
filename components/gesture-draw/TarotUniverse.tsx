"use client";

import { CSSProperties, useEffect } from "react";
import { GESTURE_TIMING } from "@/lib/gesture/config";
import {
  getRitualPlinthMode,
  isCompletedSpreadPhase
} from "@/lib/gesture/ritual-plinth";
import { getSpreadSlots } from "@/lib/gesture/spreads";
import type {
  GesturePhase,
  PointerPosition,
  ReadingResult,
  ReadingSpread
} from "@/lib/gesture/types";
import { cn } from "@/lib/utils";
import { CardOrbit } from "@/components/gesture-draw/three/CardOrbit";
import { EnergyPointer } from "@/components/gesture-draw/three/EnergyPointer";
import { StarfieldRings } from "@/components/gesture-draw/three/StarfieldRings";
import { RitualPlinth } from "@/components/gesture-draw/RitualPlinth";

type TarotUniverseProps = {
  phase: GesturePhase;
  pointer: PointerPosition;
  orbitOffset: number;
  selectedCardId: string | null;
  grabbedCardId: string | null;
  spread: ReadingSpread | null;
  results: ReadingResult[];
  currentSlotIndex: number;
  drawnCardIds: string[];
  spreadTitle: string;
  onRevealVisualComplete: () => void;
};

const phaseCopy: Partial<Record<GesturePhase, { title: string; hint: string }>> = {
  AWAKENING: {
    title: "正在唤醒星域",
    hint: "摄像头正在感应你的手势"
  },
  IDLE: {
    title: "牌群等待你的手势",
    hint: "把手放进画面 · 牌群会自动苏醒"
  },
  SHUFFLING: {
    title: "牌群正在虚空中重组",
    hint: "保持手在画面中 · 星环会展开选牌"
  },
  SELECTING: {
    title: "移动食指，选择回应你的牌",
    hint: "食指横向滑动浏览 · 两指捏合抓取"
  },
  GRABBING: {
    title: "牌面正在回应召唤",
    hint: "保持捏合 0.8 秒确认，松开取消"
  },
  PLACING: {
    title: "这一张已归于牌位",
    hint: "稍作停留 · 等待星光收束"
  },
  CONFIRMED: {
    title: "抽牌已确认",
    hint: "星域正在收束回响"
  },
  REVEALING: {
    title: "命轮正在翻转",
    hint: "所有牌位即将揭示"
  },
  RESULT: {
    title: "星域完成回响",
    hint: "本次牌阵指引已完成"
  }
};

export function TarotUniverse({
  phase,
  pointer,
  orbitOffset,
  selectedCardId,
  grabbedCardId,
  spread,
  results,
  currentSlotIndex,
  drawnCardIds,
  spreadTitle,
  onRevealVisualComplete
}: TarotUniverseProps) {
  const copy = phaseCopy[phase] ?? { title: "星域静默", hint: "等待下一次回应" };
  const plinthMode = getRitualPlinthMode(phase);

  useEffect(() => {
    if (phase !== "REVEALING") return;

    const timeoutId = window.setTimeout(
      onRevealVisualComplete,
      GESTURE_TIMING.REVEALING_MS + GESTURE_TIMING.RESULT_SETTLE_MS
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onRevealVisualComplete, phase]);

  return (
    <section
      className={cn(
        "gesture-universe relative h-full min-h-0 overflow-hidden",
        phase === "AWAKENING" && "gesture-universe--awakening",
        phase === "IDLE" && "gesture-universe--idle",
        phase === "SHUFFLING" && "gesture-universe--shuffling",
        phase === "SELECTING" && "gesture-universe--selecting",
        phase === "GRABBING" && "gesture-universe--grabbing",
        phase === "PLACING" && "gesture-universe--placing",
        phase === "REVEALING" && "gesture-universe--revealing"
      )}
      style={
        {
          "--pointer-x": `${((pointer.x + 1) / 2) * 100}%`,
          "--pointer-y": `${((pointer.y + 1) / 2) * 100}%`
        } as CSSProperties
      }
      aria-label="手势抽牌星域"
    >
      <StarfieldRings />
      <RitualPlinth spread={spread} mode={plinthMode} />
      <CardOrbit
        phase={phase}
        orbitOffset={orbitOffset}
        selectedCardId={selectedCardId}
        grabbedCardId={grabbedCardId}
        drawnCardIds={drawnCardIds}
      />
      <EnergyPointer phase={phase} pointer={pointer} grabbed={Boolean(grabbedCardId)} />

      <SpreadBoard
        spread={spread}
        results={results}
        currentSlotIndex={currentSlotIndex}
        phase={phase}
      />

      <div className="gesture-phase-copy pointer-events-none absolute inset-x-4 z-20 flex justify-center">
        <div className="gesture-phase-copy__text px-4 py-3 text-center">
          <p className="font-serif text-lg text-text-primary">{copy.title}</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {spreadTitle} · {copy.hint}
          </p>
        </div>
      </div>
    </section>
  );
}

function SpreadBoard({
  spread,
  results,
  currentSlotIndex,
  phase
}: {
  spread: ReadingSpread | null;
  results: ReadingResult[];
  currentSlotIndex: number;
  phase: GesturePhase;
}) {
  const slots = getSpreadSlots(spread);
  if (slots.length === 0) return null;

  return (
    <div
      className={cn(
        "gesture-spread-board",
        isCompletedSpreadPhase(phase) && "gesture-spread-board--complete",
        phase === "REVEALING" && "gesture-spread-board--revealing"
      )}
      aria-hidden="true"
    >
      {slots.map((slot, index) => {
        const result = results.find((item) => item.slotId === slot.id);
        const active = index === currentSlotIndex && !result;

        return (
          <div
            key={slot.id}
            className={cn(
              "gesture-spread-slot",
              result && "gesture-spread-slot--filled",
              active && "gesture-spread-slot--active"
            )}
            style={
              {
                "--slot-x": `${slot.x}%`,
                "--slot-y": `${slot.y}%`
              } as CSSProperties
            }
          >
            <span className="gesture-spread-slot__label">{slot.label}</span>
            <span className="gesture-spread-slot__card">
              {result ? (
                <>
                  <span className="gesture-spread-slot__energy" />
                  <span className="gesture-spread-slot__chosen-card">
                    <span className="gesture-spread-slot__chosen-art" />
                  </span>
                </>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
