"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, Sparkles } from "lucide-react";
import { AmbientTarotBackdrop } from "@/components/hub/AmbientTarotBackdrop";
import { SpreadSigil } from "@/components/gesture-draw/SpreadSigil";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { ParticleField } from "@/components/ui/ParticleField";
import { getSpreadSigilGeometry } from "@/lib/gesture/spread-sigil";
import { SPREAD_LAYOUTS } from "@/lib/gesture/spreads";
import type { InteractionMode, ReadingSpread } from "@/lib/gesture/types";
import styles from "./QuestionInput.module.css";

type SpreadSelectionProps = {
  question: string;
  mode: InteractionMode;
  cameraError: string | null;
  onSelect: (spread: ReadingSpread) => void;
  onUseClickMode: () => void;
  onUseGestureMode: () => void;
};

const spreadOptions: ReadingSpread[] = ["three", "five"];

export function SpreadSelection({
  question,
  mode,
  cameraError,
  onSelect,
  onUseClickMode,
  onUseGestureMode
}: SpreadSelectionProps) {
  return (
    <main className={styles.page}>
      <Image
        src="/images/hub-starfield.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.backgroundImage}
        aria-hidden="true"
      />
      <AmbientTarotBackdrop className={styles.ambientCards} />
      <div className={styles.atmosphere} aria-hidden="true" />
      <ParticleField className={styles.particles} count={240} />

      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.navRow}>
            <Link href="/" className={styles.brandLink} aria-label="粒子首页">
              <ConstellationLogo className={styles.brandLogo} />
              <span>粒子</span>
            </Link>

            <div className={styles.navActions}>
              <Link href="/" className={styles.navButton} aria-label="返回首页">
                <ArrowLeft className={styles.actionIcon} aria-hidden="true" />
                返回首页
              </Link>
              {mode === "gesture" ? (
                <button
                  type="button"
                  className={styles.modePill}
                  onClick={onUseClickMode}
                  aria-label="改用点击模式"
                >
                  <Camera className={styles.actionIcon} aria-hidden="true" />
                  改用点击模式
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.modePill}
                  onClick={onUseGestureMode}
                  aria-label="重试摄像头"
                >
                  <Camera className={styles.actionIcon} aria-hidden="true" />
                  重试摄像头
                </button>
              )}
            </div>
          </div>
        </header>

        <section className={styles.stage} aria-label="选择抽牌牌阵">
          <div className="spread-stage">
            <div className="spread-stage__heading">
              <p>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                选择一种回应方式
              </p>
              <h1>选择牌阵</h1>
            </div>

            {cameraError ? (
              <p className="spread-stage__camera-status" role="status">
                摄像头暂不可用，当前可直接点击选择；右上角可重试。
              </p>
            ) : null}

            <div className="spread-stage__options">
              {spreadOptions.map((spread) => {
                const layout = SPREAD_LAYOUTS[spread];
                const geometry = getSpreadSigilGeometry(spread);

                return (
                  <button
                    key={spread}
                    type="button"
                    className="spread-stage__option"
                    onClick={() => onSelect(spread)}
                  >
                    <SpreadSigil spread={spread} />
                    <strong>{geometry.label}</strong>
                    <span>{layout.subtitle}</span>
                  </button>
                );
              })}
            </div>

            <div className="spread-stage__question">
              <span>你的问题</span>
              <p>{question}</p>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <span aria-hidden="true" />
          <p>选择后会进入真实摄像头手势感应流程</p>
          <span aria-hidden="true" />
        </footer>
      </div>
    </main>
  );
}
