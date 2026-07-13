import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { GoldenDustCanvas } from "@/components/draw/GoldenDustCanvas";
import { SpreadSigil } from "@/components/draw/SpreadSigil";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { ParticleField } from "@/components/ui/ParticleField";
import { NORMAL_SPREADS } from "@/lib/normal-draw/spreads";
import type { NormalSpread, NormalSpreadId } from "@/lib/normal-draw/types";
import styles from "./NormalDraw.module.css";

type SpreadAtlasProps = {
  selectedSpreadId: NormalSpreadId | null;
  onSelect: (spread: NormalSpread) => void;
  statusMessage?: string | null;
};

export function SpreadAtlas({
  selectedSpreadId,
  onSelect,
  statusMessage = null
}: SpreadAtlasProps) {
  return (
    <main className={styles.page}>
      <div className={styles.milkyWay} aria-hidden="true" />
      <div className={styles.astralRings} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
      <ParticleField className={styles.particles} count={280} />
      <GoldenDustCanvas />

      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="粒子首页">
            <ConstellationLogo className={styles.logo} />
            <span>粒子</span>
          </Link>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            返回首页
          </Link>
        </header>

        <section className={styles.atlas} aria-labelledby="spread-atlas-title">
          <div className={styles.atlasHeading}>
            <p className={styles.eyebrow}>
              <Sparkles aria-hidden="true" />
              ARCANE SPREAD ATLAS
            </p>
            <h1 id="spread-atlas-title">选择牌阵</h1>
            <p>寻找与你的问题共振的星阵，选择后再写下问题</p>
          </div>

          {statusMessage ? (
            <p className={styles.status} role="status">
              {statusMessage}
            </p>
          ) : null}

          <div className={styles.spreadGrid}>
            {NORMAL_SPREADS.map((spread, index) => {
              const selected = selectedSpreadId === spread.id;
              return (
                <button
                  key={spread.id}
                  type="button"
                  className={`${styles.spreadCard} ${
                    selected ? styles.spreadCardSelected : ""
                  }`}
                  aria-label={`${spread.name}，${spread.cardCount} 张，适用于${spread.useFor}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(spread)}
                >
                  <span className={styles.spreadMeta}>
                    {String(index + 1).padStart(2, "0")} · {spread.cardCount} 张
                  </span>
                  <SpreadSigil spread={spread} />
                  <strong>{spread.name}</strong>
                  <span className={styles.spreadUse}>适用于{spread.useFor}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.atlasHint} aria-live="polite">
            <span aria-hidden="true">✦</span>
            <strong>
              {selectedSpreadId
                ? `已选择 ${NORMAL_SPREADS.find((item) => item.id === selectedSpreadId)?.name}`
                : "悬停唤醒牌阵，点击完成选择"}
            </strong>
            <span aria-hidden="true">✦</span>
          </div>
        </section>
      </div>
    </main>
  );
}
