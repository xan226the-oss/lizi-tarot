"use client";

import { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { GesturePhase, PointerPosition } from "@/lib/gesture/types";

type EnergyPointerProps = {
  phase: GesturePhase;
  pointer: PointerPosition;
  grabbed?: boolean;
};

export function EnergyPointer({ phase, pointer, grabbed = false }: EnergyPointerProps) {
  const visible = phase === "SELECTING" || phase === "GRABBING";

  return (
    <div
      className={cn(
        "gesture-energy-pointer pointer-events-none absolute z-30",
        visible && "gesture-energy-pointer--visible",
        phase === "SELECTING" && "gesture-energy-pointer--selecting",
        phase === "GRABBING" && "gesture-energy-pointer--grabbing",
        grabbed && "gesture-energy-pointer--grabbed"
      )}
      style={
        {
          "--pointer-x": `${((pointer.x + 1) / 2) * 100}%`,
          "--pointer-y": `${((pointer.y + 1) / 2) * 100}%`
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span className="gesture-energy-pointer__core" />
    </div>
  );
}
