import type { CSSProperties } from "react";
import { getSpreadSigilGeometry } from "@/lib/gesture/spread-sigil";
import type { ReadingSpread } from "@/lib/gesture/types";
import { cn } from "@/lib/utils";

const TICK_COUNT = 36;

export function SpreadSigil({ spread }: { spread: ReadingSpread }) {
  const geometry = getSpreadSigilGeometry(spread);
  const isWide = geometry.orbit === "wide";
  const center = { x: isWide ? 80 : 50, y: 50 };
  const outerRadius = { x: isWide ? 72 : 44, y: isWide ? 36 : 44 };
  const middleRadius = { x: isWide ? 62 : 37, y: isWide ? 29 : 37 };
  const innerRadius = { x: isWide ? 42 : 27, y: isWide ? 18 : 27 };
  const ticks = Array.from({ length: TICK_COUNT }, (_, index) => {
    const angle = (index / TICK_COUNT) * Math.PI * 2;
    const isCardinal = index % 3 === 0;
    const inset = isCardinal ? 4.2 : 2.2;

    return {
      x1: center.x + Math.cos(angle) * outerRadius.x,
      y1: center.y + Math.sin(angle) * outerRadius.y,
      x2: center.x + Math.cos(angle) * (outerRadius.x - inset),
      y2: center.y + Math.sin(angle) * (outerRadius.y - inset)
    };
  });

  return (
    <span
      className={cn("spread-sigil", `spread-sigil--${geometry.orbit}`)}
      aria-hidden="true"
    >
      <svg viewBox={geometry.viewBox} focusable="false">
        <g className="spread-sigil__engraving">
          <ellipse
            className="spread-sigil__orbit spread-sigil__orbit--outer"
            cx={center.x}
            cy={center.y}
            rx={outerRadius.x}
            ry={outerRadius.y}
          />
          <ellipse
            className="spread-sigil__orbit spread-sigil__orbit--calibration"
            cx={center.x}
            cy={center.y}
            rx={middleRadius.x}
            ry={middleRadius.y}
          />
          <ellipse
            className="spread-sigil__orbit spread-sigil__orbit--inner"
            cx={center.x}
            cy={center.y}
            rx={innerRadius.x}
            ry={innerRadius.y}
          />
          <ellipse
            className="spread-sigil__meridian"
            cx={center.x}
            cy={center.y}
            rx={isWide ? 24 : 18}
            ry={isWide ? 35 : 43}
            transform={`rotate(24 ${center.x} ${center.y})`}
          />
          <ellipse
            className="spread-sigil__meridian spread-sigil__meridian--counter"
            cx={center.x}
            cy={center.y}
            rx={isWide ? 24 : 18}
            ry={isWide ? 35 : 43}
            transform={`rotate(-24 ${center.x} ${center.y})`}
          />
          <line
            className="spread-sigil__axis"
            x1={center.x - outerRadius.x}
            y1={center.y}
            x2={center.x + outerRadius.x}
            y2={center.y}
          />
          <line
            className="spread-sigil__axis spread-sigil__axis--vertical"
            x1={center.x}
            y1={center.y - outerRadius.y}
            x2={center.x}
            y2={center.y + outerRadius.y}
          />
          <g className="spread-sigil__ticks">
            {ticks.map((tick, index) => (
              <line
                key={index}
                className="spread-sigil__tick"
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
              />
            ))}
          </g>
        </g>
        <g className="spread-sigil__hub">
          <circle cx={center.x} cy={center.y} r={isWide ? 7 : 6} />
          <circle cx={center.x} cy={center.y} r={isWide ? 3.2 : 2.8} />
          <circle className="spread-sigil__core" cx={center.x} cy={center.y} r="1.15" />
        </g>
        {geometry.points.map((point, index) => (
          <g
            key={`${point.x}-${point.y}`}
            className="spread-sigil__point"
            style={{ "--point-index": index } as CSSProperties}
          >
            <circle cx={point.x} cy={point.y} r="3.8" />
            <circle cx={point.x} cy={point.y} r="2" />
            <circle className="spread-sigil__core" cx={point.x} cy={point.y} r="0.85" />
          </g>
        ))}
      </svg>
    </span>
  );
}
