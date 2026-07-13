"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hand, MousePointer2, Sparkles } from "lucide-react";
import { GESTURE_TIMING, GRAB_CONFIG } from "@/lib/gesture/config";
import {
  advanceOrbitFrame,
  getPointerForOrbitCard,
  getVisibleOrbitCards,
  pointerToOrbitAngle
} from "@/lib/gesture/card-orbit";
import { normalizeClientPointer } from "@/lib/gesture/hand-geometry";
import { playGestureSound } from "@/lib/gesture/sound";
import type {
  GesturePhase,
  OrbitCardSlot,
  OrbitFrame,
  PointerPosition
} from "@/lib/gesture/types";

type ClickGestureAdapterProps = {
  phase: GesturePhase;
  pointer: PointerPosition;
  orbitOffset: number;
  orbitSpeed: number;
  selectedCardId: string | null;
  grabbedCardId: string | null;
  drawnCardIds: string[];
  onPointerChange: (pointer: PointerPosition) => void;
  onOrbitFrame: (frame: OrbitFrame) => void;
  onFistConfirmed: () => void;
  onPalmOpenConfirmed: () => void;
  onPinchConfirmed: (cardId?: string) => void;
  onPullConfirmed: () => void;
  onGrabCancelled: () => void;
  onGrabTimeout: () => void;
};

export function ClickGestureAdapter({
  phase,
  pointer,
  orbitOffset,
  orbitSpeed,
  selectedCardId,
  grabbedCardId,
  drawnCardIds,
  onPointerChange,
  onOrbitFrame,
  onFistConfirmed,
  onPalmOpenConfirmed,
  onPinchConfirmed,
  onPullConfirmed,
  onGrabCancelled,
  onGrabTimeout
}: ClickGestureAdapterProps) {
  const pointerRef = useRef(pointer);
  const offsetRef = useRef(orbitOffset);
  const speedRef = useRef(orbitSpeed);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const grabStartedAtRef = useRef<number | null>(null);
  const grabStartPointerRef = useRef<PointerPosition | null>(null);
  const pullConfirmedRef = useRef(false);
  const pressingRef = useRef(false);
  const hoverSoundRef = useRef({ cardId: "", playedAt: 0 });
  const [isPressing, setIsPressing] = useState(false);
  const slots = useMemo(() => getVisibleOrbitCards(orbitOffset), [orbitOffset]);
  const drawnCards = useMemo(() => new Set(drawnCardIds), [drawnCardIds]);

  useEffect(() => {
    pointerRef.current = pointer;
  }, [pointer]);

  useEffect(() => {
    offsetRef.current = orbitOffset;
    speedRef.current = orbitSpeed;
  }, [orbitOffset, orbitSpeed]);

  useEffect(() => {
    if (phase !== "SHUFFLING") return;

    const timeoutId = window.setTimeout(() => {
      onPalmOpenConfirmed();
    }, GESTURE_TIMING.SHUFFLING_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onPalmOpenConfirmed, phase]);

  useEffect(() => {
    if (phase !== "GRABBING") {
      grabStartedAtRef.current = null;
      grabStartPointerRef.current = null;
      pullConfirmedRef.current = false;
      setIsPressing(false);
      return;
    }

    grabStartedAtRef.current = performance.now();
    grabStartPointerRef.current = pointerRef.current;
    pullConfirmedRef.current = false;
    playGestureSound("grab");

    if (!pressingRef.current) {
      const cancelId = window.setTimeout(onGrabCancelled, 60);
      return () => {
        window.clearTimeout(cancelId);
      };
    }
  }, [onGrabCancelled, phase]);

  useEffect(() => {
    if (phase !== "SELECTING" || !selectedCardId) return;

    const now = performance.now();
    if (
      hoverSoundRef.current.cardId !== selectedCardId &&
      now - hoverSoundRef.current.playedAt > 260
    ) {
      playGestureSound("hover");
      hoverSoundRef.current = {
        cardId: selectedCardId,
        playedAt: now
      };
    }
  }, [phase, selectedCardId]);

  useEffect(() => {
    if (phase !== "SELECTING") return;

    const tick = (now: number) => {
      const last = lastTimeRef.current ?? now;
      const deltaSeconds = Math.min((now - last) / 1000, 0.04);
      lastTimeRef.current = now;

      const nextFrame = advanceOrbitFrame({
        offset: offsetRef.current,
        speed: speedRef.current,
        pointer: pointerRef.current,
        deltaSeconds,
        excludedCardIds: drawnCardIds
      });

      offsetRef.current = nextFrame.offset;
      speedRef.current = nextFrame.speed;
      onOrbitFrame(nextFrame);
      frameRef.current = window.requestAnimationFrame(tick);
    };

    lastTimeRef.current = null;
    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
    };
  }, [drawnCardIds, onOrbitFrame, phase]);

  useEffect(() => {
    if (phase !== "GRABBING") return;

    const confirmId = window.setTimeout(() => {
      if (!pullConfirmedRef.current && pressingRef.current) {
        pullConfirmedRef.current = true;
        onPullConfirmed();
      }
    }, GESTURE_TIMING.PINCH_HOLD_CONFIRM_MS);

    const timeoutId = window.setTimeout(() => {
      if (!pullConfirmedRef.current) {
        if (pressingRef.current) onGrabTimeout();
        else onGrabCancelled();
      }
    }, GESTURE_TIMING.GRABBING_MAX_WAIT_MS);

    return () => {
      window.clearTimeout(confirmId);
      window.clearTimeout(timeoutId);
    };
  }, [onGrabCancelled, onGrabTimeout, onPullConfirmed, phase]);

  const updatePointerFromEvent = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const nextPointer = normalizeClientPointer(event.clientX, event.clientY, rect);
      pointerRef.current = nextPointer;
      onPointerChange(nextPointer);

      if (phase === "GRABBING" && grabStartPointerRef.current && !pullConfirmedRef.current) {
        const pullDelta = nextPointer.y - grabStartPointerRef.current.y;
        if (pullDelta > GRAB_CONFIG.pullPointerDeltaY && grabbedCardId) {
          pullConfirmedRef.current = true;
          onPullConfirmed();
        }
      }
    },
    [grabbedCardId, onPointerChange, onPullConfirmed, phase]
  );

  const selectSlot = useCallback(
    (slot: OrbitCardSlot) => {
      const nextPointer = getPointerForOrbitCard(slot);
      pointerRef.current = nextPointer;
      offsetRef.current = orbitOffset;
      onPointerChange(nextPointer);
      onOrbitFrame({
        offset: orbitOffset,
        speed: speedRef.current,
        selectedCardId: slot.cardId,
        selectedVirtualIndex: slot.virtualIndex,
        selectedAngle: slot.angle,
        pointerAngle: pointerToOrbitAngle(nextPointer)
      });
    },
    [onOrbitFrame, onPointerChange, orbitOffset]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    updatePointerFromEvent(event);
  };

  const handleCardPointer = (
    event: React.PointerEvent<HTMLButtonElement>,
    slot: OrbitCardSlot
  ) => {
    event.stopPropagation();
    selectSlot(slot);
  };

  const handleCardPick = (event: React.MouseEvent<HTMLButtonElement>, slot: OrbitCardSlot) => {
    event.preventDefault();
    event.stopPropagation();
    if (phase !== "SELECTING" || drawnCards.has(slot.cardId)) return;

    selectSlot(slot);
    pressingRef.current = true;
    setIsPressing(true);
    onPinchConfirmed(slot.cardId);
  };

  const shouldCapturePointer = phase === "SELECTING" || phase === "GRABBING";

  return (
    <div
      className="absolute inset-0 z-20"
      onPointerMove={shouldCapturePointer ? updatePointerFromEvent : undefined}
      onPointerDown={shouldCapturePointer ? handlePointerDown : undefined}
      onPointerUp={() => {
        pressingRef.current = false;
        setIsPressing(false);
        if (phase === "GRABBING" && !pullConfirmedRef.current) onGrabCancelled();
      }}
      role="presentation"
    >
      {phase === "SELECTING" ? (
        <div className="gesture-card-hit-layer" aria-label="可选塔罗牌">
          {slots.map((slot) => {
            const isDrawn = drawnCards.has(slot.cardId);
            const isSelected = selectedCardId === slot.cardId && !isDrawn;
            const selectedScale = isSelected ? Math.min(slot.scale * 1.06, 1.18) : slot.scale;

            return (
              <button
                key={`${slot.cardId}-${slot.virtualIndex}`}
                type="button"
                className="gesture-card-hit-target"
                style={
                  {
                    "--card-x": `clamp(-46vw, ${slot.x}vw, 46vw)`,
                    "--card-y": `clamp(-8vh, ${slot.y}vh, 16vh)`,
                    "--card-z": isSelected ? "72px" : `${Math.round(slot.depth * 52)}px`,
                    "--card-scale": selectedScale,
                    "--card-rotate": isSelected ? `${slot.angle * -8}deg` : `${slot.angle * -18}deg`,
                    "--card-rotate-y": isSelected ? `${slot.angle * -8}deg` : `${slot.angle * -22}deg`,
                    zIndex: 280 + slot.zIndex
                  } as CSSProperties
                }
                disabled={isDrawn}
                aria-label={`选择第 ${slot.cardId} 张塔罗牌`}
                onPointerEnter={(event) => handleCardPointer(event, slot)}
                onPointerMove={(event) => handleCardPointer(event, slot)}
                onPointerDown={(event) => handleCardPointer(event, slot)}
                onClick={(event) => handleCardPick(event, slot)}
              />
            );
          })}
        </div>
      ) : null}

      {phase === "IDLE" ? (
        <div className="absolute inset-0 flex items-center justify-center px-5">
          <div className="flex max-w-sm flex-col items-center text-center">
            <button
              type="button"
              className="gesture-idle-sigil group relative flex h-24 w-24 items-center justify-center text-accent-gold transition duration-base hover:text-accent-gold-bright focus:outline-none focus-visible:text-accent-gold-bright active:scale-95"
              onClick={onFistConfirmed}
              aria-label="点击星核模拟握拳，开启星域"
            >
              <Hand className="relative z-10 h-8 w-8" aria-hidden="true" />
            </button>
            <div className="gesture-phase-copy__text mt-5 px-4 py-3">
              <p className="font-serif text-lg text-text-primary">等待星域感应</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                握拳 · 开启星域
              </p>
              <p className="mt-2 text-xs leading-5 text-accent-gold-70">
                点击模式只在你主动降级后启用
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "SELECTING" ? (
        <div className="pointer-events-none absolute inset-x-5 bottom-5 flex justify-center">
          <div className="gesture-inline-hint flex max-w-2xl items-center gap-3 px-4 py-3 text-sm text-text-secondary">
            <MousePointer2 className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden="true" />
            <span>移动鼠标指向牌，点击想选的牌，0.8 秒后确认。</span>
          </div>
        </div>
      ) : null}

      {phase === "GRABBING" ? (
        <div className="pointer-events-none absolute inset-x-5 bottom-5 flex justify-center">
          <div className="gesture-inline-hint flex max-w-2xl items-center gap-3 px-4 py-3 text-sm text-text-secondary">
            <Sparkles className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden="true" />
            <span>{isPressing ? "保持召唤，等待星域确认。" : "松开会取消本次抓取。"}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
