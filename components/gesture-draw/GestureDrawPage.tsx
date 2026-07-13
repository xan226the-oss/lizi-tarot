"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GestureRitualRuntime } from "@/components/gesture-draw/GestureRitualRuntime";
import { QuestionInput } from "@/components/gesture-draw/QuestionInput";
import {
  ResultSpace,
  type InterpretationStatus
} from "@/components/gesture-draw/ResultSpace";
import { SpreadSelection } from "@/components/gesture-draw/SpreadSelection";
import { ParticleField } from "@/components/ui/ParticleField";
import { GESTURE_TIMING } from "@/lib/gesture/config";
import { playGestureSound } from "@/lib/gesture/sound";
import { getSpreadTitle } from "@/lib/gesture/spreads";
import { getPublicInterpretationError } from "@/lib/interpretation-error";
import {
  gestureDrawReducer,
  initialGestureDrawState
} from "@/lib/gesture/state-machine";

export function GestureDrawPage() {
  const [state, dispatch] = useReducer(gestureDrawReducer, initialGestureDrawState);
  const [interpretationStatus, setInterpretationStatus] =
    useState<InterpretationStatus>("idle");
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const interpretationRequestIdRef = useRef(0);
  const requestedReadingRef = useRef("");

  useEffect(() => {
    if (state.phase === "AWAKENING") playGestureSound("awakening");
    if (state.phase === "SHUFFLING") playGestureSound("shuffle");
    if (state.phase === "REVEALING") playGestureSound("reveal");
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "AWAKENING") return;

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "AWAKENING_COMPLETE" });
    }, GESTURE_TIMING.AWAKENING_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "PLACING") return;

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "PLACEMENT_SETTLED" });
    }, GESTURE_TIMING.PLACEMENT_SETTLE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "CONFIRMED") return;

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "START_REVEAL" });
    }, GESTURE_TIMING.FINAL_CONFIRM_HOLD_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.phase]);

  const handleUseClickMode = useCallback((message?: string) => {
    setTrackingActive(false);
    dispatch({ type: "SET_MODE", mode: "click" });
    if (message) dispatch({ type: "SET_ERROR", message });
  }, []);

  const handleCameraFallback = useCallback((message: string) => {
    setTrackingActive(false);
    dispatch({ type: "SET_MODE", mode: "click" });
    dispatch({ type: "SET_CAMERA_ERROR", message });
  }, []);

  const handleUseGestureMode = useCallback(() => {
    setTrackingActive(false);
    dispatch({ type: "SET_MODE", mode: "gesture" });
    dispatch({ type: "CLEAR_ERROR" });
    dispatch({ type: "CLEAR_CAMERA_ERROR" });
  }, []);

  const handleTrackingRestored = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const requestInterpretation = useCallback(
    async (force = false) => {
      if (!state.spread || state.results.length === 0) return;

      const readingKey = `${state.question}:${state.spread}:${state.results
        .map((result) => `${result.slotId}-${result.cardId}-${result.orientation}`)
        .join("|")}`;
      if (!force && requestedReadingRef.current === readingKey) return;
      requestedReadingRef.current = readingKey;

      const requestId = interpretationRequestIdRef.current + 1;
      interpretationRequestIdRef.current = requestId;
      setInterpretationStatus("loading");
      setInterpretation(null);
      setInterpretationError(null);

      try {
        const response = await fetch("/api/readings/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: state.question,
            spread: state.spread,
            results: state.results.map((result) => ({
              cardId: result.cardId,
              orientation: result.orientation,
              slotId: result.slotId,
              slotLabel: result.slotLabel
            }))
          })
        });
        const responseText = await response.text();
        let payload: { interpretation?: string; error?: string } = {};

        try {
          payload = JSON.parse(responseText) as {
            interpretation?: string;
            error?: string;
          };
        } catch {
          payload = {};
        }

        if (!response.ok || !payload.interpretation) {
          throw new Error(
            payload.error ?? "综合解读暂时不可用，完整牌阵仍可正常查看。"
          );
        }

        if (interpretationRequestIdRef.current !== requestId) return;
        setInterpretation(payload.interpretation);
        setInterpretationStatus("success");
      } catch (error) {
        if (interpretationRequestIdRef.current !== requestId) return;
        setInterpretationStatus("error");
        setInterpretationError(
          getPublicInterpretationError(error instanceof Error ? error.message : undefined)
        );
      }
    },
    [state.question, state.results, state.spread]
  );

  useEffect(() => {
    if (state.phase !== "REVEALING") return;
    void requestInterpretation();
  }, [requestInterpretation, state.phase]);

  const handleReset = useCallback(() => {
    interpretationRequestIdRef.current += 1;
    requestedReadingRef.current = "";
    setInterpretationStatus("idle");
    setInterpretation(null);
    setInterpretationError(null);
    dispatch({ type: "RESET_TO_QUESTION" });
  }, []);

  const drawnCardIds = useMemo(
    () => state.results.map((result) => result.cardId),
    [state.results]
  );
  const renderGestureRuntime = (showUniverse: boolean) => (
    <GestureRitualRuntime
      showUniverse={showUniverse}
      phase={state.phase}
      mode={state.mode}
      grabbedCardId={state.grabbedCardId}
      spread={state.spread}
      results={state.results}
      currentSlotIndex={state.currentSlotIndex}
      drawnCardIds={drawnCardIds}
      spreadTitle={getSpreadTitle(state.spread)}
      onFistConfirmed={() => dispatch({ type: "FIST_CONFIRMED" })}
      onPalmOpenConfirmed={() => dispatch({ type: "SHUFFLE_VISUAL_COMPLETE" })}
      onPinchConfirmed={(cardId) =>
        dispatch({ type: "PINCH_CONFIRMED", selectedCardId: cardId })
      }
      onGrabCancelled={() => dispatch({ type: "GRAB_CANCELLED" })}
      onPullConfirmed={() => dispatch({ type: "PULL_CONFIRMED" })}
      onGrabTimeout={() => dispatch({ type: "GRAB_TIMEOUT" })}
      onError={(message) => dispatch({ type: "SET_ERROR", message })}
      onTrackingChange={setTrackingActive}
      onTrackingRestored={handleTrackingRestored}
      onFallbackMode={handleCameraFallback}
      onRevealVisualComplete={() => dispatch({ type: "REVEAL_VISUAL_COMPLETE" })}
    />
  );

  if (state.phase === "QUESTION") {
    return (
      <>
        <QuestionInput
          mode={state.mode}
          cameraError={state.cameraError}
          onSubmit={(question) => dispatch({ type: "SUBMIT_QUESTION", question })}
          onUseClickMode={() => handleUseClickMode("已切换到点击模式")}
          onUseGestureMode={handleUseGestureMode}
        />
        {renderGestureRuntime(false)}
      </>
    );
  }

  if (state.phase === "SPREAD") {
    return (
      <>
        <SpreadSelection
          question={state.question}
          mode={state.mode}
          cameraError={state.cameraError}
          onSelect={(spread) => dispatch({ type: "SELECT_SPREAD", spread })}
          onUseClickMode={() => handleUseClickMode("已切换到点击模式")}
          onUseGestureMode={handleUseGestureMode}
        />
        {renderGestureRuntime(false)}
      </>
    );
  }

  return (
    <main className="gesture-ritual-page relative h-[100dvh] overflow-hidden bg-bg-base bg-starfield-radial">
      <ParticleField className="opacity-45" count={96} />
      <div className="star-vignette pointer-events-none absolute inset-0 z-[1]" />

      <div className="gesture-ritual-frame relative z-10 flex h-full min-h-0 w-full flex-col">
        <header className="gesture-ritual-header grid h-[76px] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:h-[88px] sm:px-7">
          <Link href="/" className="inline-flex min-w-0">
            <Button variant="ghost" className="gesture-nav-button px-3">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回首页
            </Button>
          </Link>

          <div className="gesture-ritual-question min-w-0 text-center">
            <div className="mt-0 flex min-w-0 items-center justify-center gap-3 sm:mt-1">
              <Sparkles className="hidden h-4 w-4 shrink-0 text-accent-gold sm:block" aria-hidden="true" />
              <p className="truncate font-serif text-base font-semibold leading-tight text-text-primary sm:text-2xl">
                {state.phase === "RESULT" ? "命轮已揭示" : state.question}
              </p>
              <Sparkles className="hidden h-4 w-4 shrink-0 text-accent-gold sm:block" aria-hidden="true" />
            </div>
          </div>

          <div className="gesture-header-controls flex items-center justify-end gap-3">
            <span className="gesture-sensor-status hidden items-center gap-2 text-[11px] text-text-secondary md:inline-flex" aria-live="polite">
              <span
                className={`gesture-sensor-status__dot ${trackingActive ? "is-active" : ""}`}
                aria-hidden="true"
              />
              {state.mode === "click"
                ? "点击模式"
                : trackingActive
                  ? "手势已连接"
                  : "等待手势"}
            </span>
            {state.mode === "gesture" ? (
              <button
                type="button"
                className="gesture-mode-pill inline-flex items-center gap-2 rounded-sm px-3 py-2 text-xs text-text-secondary"
                onClick={() => handleUseClickMode("已切换到点击模式")}
              >
                <Camera className="h-4 w-4 text-accent-gold" aria-hidden="true" />
                改用点击模式
              </button>
            ) : (
              <button
                type="button"
                className="gesture-mode-pill inline-flex items-center gap-2 rounded-sm px-3 py-2 text-xs text-text-secondary"
                onClick={handleUseGestureMode}
              >
                <Camera className="h-4 w-4 text-accent-gold" aria-hidden="true" />
                重试摄像头
              </button>
            )}
          </div>
        </header>

        <div className="gesture-ritual-body relative min-h-0 flex-1 px-3 pb-3 sm:px-6 sm:pb-5">
        {state.phase === "RESULT" && state.results.length > 0 ? (
          <div className="h-full min-h-0">
            <ResultSpace
              question={state.question}
              spread={state.spread}
              results={state.results}
              interpretationStatus={interpretationStatus}
              interpretation={interpretation}
              interpretationError={interpretationError}
              onRetryInterpretation={() => void requestInterpretation(true)}
              onReset={handleReset}
            />
          </div>
        ) : (
          <div className="relative h-full min-h-0">
            {renderGestureRuntime(true)}
          </div>
        )}

        {state.cameraError &&
        state.mode === "click" &&
        (state.phase === "AWAKENING" || state.phase === "IDLE") ? (
          <div className="gesture-error-toast absolute inset-x-4 bottom-20 z-40 mx-auto max-w-2xl rounded-sm border border-[color:var(--state-error-border)] bg-bg-base-70 px-4 py-3 text-center text-sm text-[color:var(--state-error-text)] sm:bottom-24">
            {state.cameraError}。当前已进入点击模式；点右上角“重试摄像头”会重新启动手势识别。
          </div>
        ) : null}

        {state.error ? (
          <div className="gesture-error-toast absolute inset-x-4 bottom-5 z-40 mx-auto max-w-2xl rounded-sm border border-[color:var(--state-error-border)] bg-bg-base-70 px-4 py-3 text-center text-sm text-[color:var(--state-error-text)]">
            {state.error}
          </div>
        ) : null}
        </div>
      </div>
    </main>
  );
}
