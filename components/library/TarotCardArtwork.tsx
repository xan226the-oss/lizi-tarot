"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { TarotArtworkTone } from "@/lib/tarot-library-query";

import styles from "./Library.module.css";

type TarotCardArtworkProps = {
  src: string;
  alt: string;
  cardName: string;
  tone: TarotArtworkTone;
  sizes: string;
  priority?: boolean;
  className?: string;
};

const toneClasses: Record<TarotArtworkTone, string> = {
  major: styles.toneMajor,
  wands: styles.toneWands,
  cups: styles.toneCups,
  swords: styles.toneSwords,
  pentacles: styles.tonePentacles
};

export function TarotCardArtwork({
  src,
  alt,
  cardName,
  tone,
  sizes,
  priority = false,
  className
}: TarotCardArtworkProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const wrapperClassName = [styles.artwork, toneClasses[tone], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapperClassName}
      style={{ aspectRatio: "2 / 3" }}
      aria-busy={!loaded && !failed}
    >
      <div className={styles.artworkPlaceholder} aria-hidden="true" />

      {failed ? (
        <div className={styles.artworkFallback}>
          <Image
            src="/images/tarot/card-unavailable.svg"
            alt=""
            fill
            sizes={sizes}
            className={styles.fallbackImage}
          />
          <div className={styles.fallbackCopy}>
            <strong>{cardName}</strong>
            <span>牌面暂不可用</span>
          </div>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`${styles.artworkImage} ${loaded ? styles.artworkImageLoaded : ""}`}
        />
      )}
    </div>
  );
}
