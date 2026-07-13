import type { CSSProperties } from "react";
import type { NormalSpread } from "@/lib/normal-draw/types";
import styles from "./NormalDraw.module.css";

function orbitPath(spread: NormalSpread) {
  if (spread.sigil === "fork") return "M50 15 L20 78 M50 15 L80 78";
  if (spread.sigil === "rise") return "M8 80 L28 62 L42 68 L58 44 L72 34 L92 14";
  if (spread.sigil === "cross") return "M50 8 V92 M8 50 H92";
  if (spread.sigil === "arc") return "M8 26 Q50 96 92 26";
  if (spread.sigil === "grid") return "M20 20 H80 M20 50 H80 M20 80 H80 M20 20 V80 M50 20 V80 M80 20 V80";
  return "M50 8 A42 42 0 1 1 49.9 8";
}

export function SpreadSigil({ spread }: { spread: NormalSpread }) {
  const ticks = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    const inner = index % 3 === 0 ? 39 : 41;
    return {
      x1: 50 + Math.cos(angle) * inner,
      y1: 50 + Math.sin(angle) * inner,
      x2: 50 + Math.cos(angle) * 44,
      y2: 50 + Math.sin(angle) * 44
    };
  });

  return (
    <span className={styles.sigil} aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <g className={styles.sigilMotion}>
          <circle className={styles.sigilOuter} cx="50" cy="50" r="45" />
          <circle className={styles.sigilCalibration} cx="50" cy="50" r="34" />
          <path className={styles.sigilOrbit} d={orbitPath(spread)} />
          <g className={styles.sigilTicks}>
            {ticks.map((tick, index) => (
              <line key={index} className={styles.sigilTick} {...tick} />
            ))}
          </g>
          {spread.slots.map((slot, nodeIndex) => (
            <g
              key={slot.id}
              className={styles.sigilNode}
              style={{ "--node-index": nodeIndex } as CSSProperties}
              transform={`translate(${slot.x} ${slot.y})`}
            >
              <circle className={styles.sigilNodeHalo} r="4" />
              <circle className={styles.sigilNodeCore} r="1.65" />
            </g>
          ))}
        </g>
      </svg>
    </span>
  );
}
