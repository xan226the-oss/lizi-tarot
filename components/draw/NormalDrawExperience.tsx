"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardDrawStage } from "@/components/draw/CardDrawStage";
import { QuestionRitual } from "@/components/draw/QuestionRitual";
import {
  ReadingReveal,
  type InterpretationStatus
} from "@/components/draw/ReadingReveal";
import { SpreadAtlas } from "@/components/draw/SpreadAtlas";
import { getPublicInterpretationError } from "@/lib/interpretation-error";
import { tarotCards } from "@/lib/tarot-cards";
import {
  randomNormalOrientation,
  shuffleNormalDeck
} from "@/lib/normal-draw/deck";
import { getNormalSpread } from "@/lib/normal-draw/spreads";
import {
  initialNormalDrawState,
  normalDrawReducer
} from "@/lib/normal-draw/state-machine";
import type { NormalSpread } from "@/lib/normal-draw/types";
import styles from "./NormalDraw.module.css";

export function NormalDrawExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spreadParam = searchParams.get("spread");
  const initialSpread = getNormalSpread(spreadParam);
  const [state, dispatch] = useReducer(normalDrawReducer, {
    ...initialNormalDrawState,
    phase: initialSpread ? "QUESTION" : "ATLAS",
    spread: initialSpread
  });
  const [selectedSpreadId, setSelectedSpreadId] = useState<string | null>(null);
  const [interpretationStatus, setInterpretationStatus] =
    useState<InterpretationStatus>("idle");
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);
  const selectionTimerRef = useRef<number | null>(null);
  const interpretationControllerRef = useRef<AbortController | null>(null);
  const interpretationRequestIdRef = useRef(0);
  const interpretationFingerprintRef = useRef("");

  const clearInterpretation = useCallback(() => {
    interpretationControllerRef.current?.abort();
    interpretationControllerRef.current = null;
    interpretationRequestIdRef.current += 1;
    interpretationFingerprintRef.current = "";
    setInterpretationStatus("idle");
    setInterpretation(null);
    setInterpretationError(null);
  }, []);

  useEffect(
    () => () => {
      if (selectionTimerRef.current !== null) {
        window.clearTimeout(selectionTimerRef.current);
      }
      interpretationControllerRef.current?.abort();
      interpretationRequestIdRef.current += 1;
    },
    []
  );

  useEffect(() => {
    const spread = getNormalSpread(spreadParam);
    clearInterpretation();

    if (spread) {
      dispatch({ type: "SELECT_SPREAD", spread });
      return;
    }

    if (!spreadParam) {
      dispatch({ type: "CHANGE_SPREAD" });
      setSelectedSpreadId(null);
    }
  }, [clearInterpretation, spreadParam]);

  useEffect(() => {
    if (state.phase !== "PLACING") return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const timeoutId = window.setTimeout(
      () => dispatch({ type: "PLACEMENT_SETTLED" }),
      reducedMotion ? 0 : 520
    );

    return () => window.clearTimeout(timeoutId);
  }, [state.phase, state.results.length]);

  const requestInterpretation = useCallback(async () => {
    if (state.phase !== "REVEAL" || !state.spread || state.results.length === 0) {
      return;
    }

    const fingerprint = JSON.stringify({
      question: state.question,
      spreadId: state.spread.id,
      results: state.results.map(({ cardId, orientation, slotId, slotLabel }) => ({
        cardId,
        orientation,
        slotId,
        slotLabel
      }))
    });
    if (interpretationFingerprintRef.current === fingerprint) return;
    interpretationFingerprintRef.current = fingerprint;

    interpretationControllerRef.current?.abort();
    const controller = new AbortController();
    interpretationControllerRef.current = controller;
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
          readingType: "normal",
          question: state.question,
          spreadId: state.spread.id,
          results: state.results.map(
            ({ cardId, orientation, slotId, slotLabel }) => ({
              cardId,
              orientation,
              slotId,
              slotLabel
            })
          )
        }),
        signal: controller.signal
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
        throw new Error(payload.error ?? "综合解读暂时不可用。");
      }
      if (
        controller.signal.aborted ||
        interpretationRequestIdRef.current !== requestId
      ) {
        return;
      }

      setInterpretation(payload.interpretation);
      setInterpretationStatus("success");
    } catch (error) {
      if (
        controller.signal.aborted ||
        interpretationRequestIdRef.current !== requestId
      ) {
        return;
      }
      interpretationFingerprintRef.current = "";
      setInterpretationStatus("error");
      setInterpretationError(
        getPublicInterpretationError(
          error instanceof Error ? error.message : undefined
        )
      );
    } finally {
      if (interpretationControllerRef.current === controller) {
        interpretationControllerRef.current = null;
      }
    }
  }, [state.phase, state.question, state.results, state.spread]);

  const handleSelectSpread = (spread: NormalSpread) => {
    if (selectedSpreadId) return;
    setSelectedSpreadId(spread.id);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    selectionTimerRef.current = window.setTimeout(
      () => {
        selectionTimerRef.current = null;
        router.push(`/draw?spread=${spread.id}`);
      },
      reducedMotion ? 0 : 240
    );
  };

  const handleChangeSpread = () => {
    clearInterpretation();
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
    }
    dispatch({ type: "CHANGE_SPREAD" });
    setSelectedSpreadId(null);
    router.push("/draw");
  };

  const handleBackToQuestion = () => {
    clearInterpretation();
    dispatch({ type: "BACK_TO_QUESTION" });
  };

  const handleResetReading = () => {
    clearInterpretation();
    dispatch({
      type: "RESET_READING",
      deck: shuffleNormalDeck(tarotCards.map((card) => card.id))
    });
  };

  if (state.phase === "ATLAS" || !state.spread) {
    return (
      <SpreadAtlas
        selectedSpreadId={selectedSpreadId as NormalSpread["id"] | null}
        onSelect={handleSelectSpread}
        statusMessage={
          spreadParam && !initialSpread
            ? "该牌阵不存在，请重新选择"
            : null
        }
      />
    );
  }

  if (state.phase === "QUESTION") {
    return (
      <QuestionRitual
        spread={state.spread}
        initialQuestion={state.question}
        onChangeSpread={handleChangeSpread}
        onStart={(question) =>
          dispatch({
            type: "SUBMIT_QUESTION",
            question,
            deck: shuffleNormalDeck(tarotCards.map((card) => card.id))
          })
        }
      />
    );
  }

  if (state.phase === "DRAWING" || state.phase === "PLACING") {
    return (
      <CardDrawStage
        spread={state.spread}
        question={state.question}
        deck={state.deck}
        results={state.results}
        isPlacing={state.phase === "PLACING"}
        onChoose={(cardId) =>
          dispatch({
            type: "CHOOSE_CARD",
            cardId,
            orientation: randomNormalOrientation()
          })
        }
        onBackToQuestion={handleBackToQuestion}
      />
    );
  }

  if (state.phase === "REVEAL") {
    return (
      <ReadingReveal
        spread={state.spread}
        question={state.question}
        results={state.results}
        interpretationStatus={interpretationStatus}
        interpretation={interpretation}
        interpretationError={interpretationError}
        onGenerateInterpretation={() => void requestInterpretation()}
        onReset={handleResetReading}
        onChangeSpread={handleChangeSpread}
      />
    );
  }

  return <main className={styles.page} />;
}
