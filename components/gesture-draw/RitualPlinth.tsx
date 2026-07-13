import type { CSSProperties } from "react";
import type { RitualPlinthMode } from "@/lib/gesture/ritual-plinth";
import type { ReadingSpread } from "@/lib/gesture/types";
import { cn } from "@/lib/utils";

export function RitualPlinth({
  spread,
  mode,
  ambient = false
}: {
  spread: ReadingSpread | null;
  mode: RitualPlinthMode;
  ambient?: boolean;
}) {
  if (!spread || mode === "hidden") return null;

  const points = spread === "three" ? 3 : 5;

  return (
    <div
      className={cn(
        "ritual-plinth",
        `ritual-plinth--${spread}`,
        `ritual-plinth--${mode}`,
        ambient && "ritual-plinth--ambient"
      )}
      aria-hidden="true"
    >
      <span className="ritual-plinth__beam" />
      <span className="ritual-plinth__mist" />
      <span className="ritual-plinth__ring ritual-plinth__ring--outer" />
      <span className="ritual-plinth__ring ritual-plinth__ring--middle" />
      <span className="ritual-plinth__ring ritual-plinth__ring--inner" />
      <span className="ritual-plinth__engraving">
        <span className="ritual-plinth__ticks" />
        <span className="ritual-plinth__axis ritual-plinth__axis--horizontal" />
        <span className="ritual-plinth__axis ritual-plinth__axis--vertical" />
        <span className="ritual-plinth__core" />
      </span>
      <span className="ritual-plinth__track">
        {Array.from({ length: points }, (_, index) => (
          <i key={index} style={{ "--plinth-point": index } as CSSProperties} />
        ))}
      </span>
      <span className="ritual-plinth__dust">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
